import { getAll, getOne, runQuery } from '../config/database';
import logger from '../config/logger';
import { getBreaker } from './circuitBreaker';
import { retry, RetryInfo } from './retryService';
import fuzzyController from './IrrigationFuzzyController';

interface WeatherData {
  temp: number;
  humidity: number;
  rainfall: number;
  wind: number;
  solar?: number;
}

interface IrrigationRecommendation {
  action: string;
  duration: number;
  reason: string;
  soilMoisture?: number;
  method?: string;
  explanation?: { reason: string; duration: number; error: number; rainProb: number; hour: number; activatedRules: number };
  et0?: string;
  etc?: string;
  weatherSource?: string;
  error?: string;
}

class WaterOptimizationService {
  enabled: boolean;
  minMoisture: number;
  maxMoisture: number;
  checkIntervalMs: number;
  timer: NodeJS.Timeout | null;
  weatherBreaker: ReturnType<typeof getBreaker>;

  constructor() {
    this.enabled = process.env.WATER_OPTIMIZATION_ENABLED === 'true';
    this.minMoisture = parseFloat(process.env.WATER_MIN_MOISTURE || '30');
    this.maxMoisture = parseFloat(process.env.WATER_MAX_MOISTURE || '70');
    this.checkIntervalMs = parseInt(process.env.WATER_CHECK_INTERVAL || '300000');
    this.timer = null;
    
    this.weatherBreaker = getBreaker('water-weather', { 
      failureThreshold: 3, 
      timeout: 30000 
    });
  }

  start() {
    if (!this.enabled) {
      logger.info('[WaterOpt] Tắt ( WATER_OPTIMIZATION_ENABLED=false )');
      return;
    }
    logger.info('[WaterOpt] Khởi động tưới tiêu thông minh');
    this.scheduleCheck();
  }

  scheduleCheck() {
    this.timer = setTimeout(() => {
      this.checkAndOptimize();
      this.scheduleCheck();
    }, this.checkIntervalMs);
  }

async getCropKc(cropType: string, growthStage: string): Promise<number> {
    const defaultKc = { initial: 0.9, mid: 1.1, late: 0.8 };
    const kcValues: Record<string, Record<string, number>> = {
      rice: { initial: 0.9, mid: 1.2, late: 0.9 },
      maize: { initial: 0.9, mid: 1.15, late: 0.7 },
      vegetable: { initial: 0.9, mid: 1.1, late: 0.8 },
      fruit: { initial: 0.9, mid: 1.05, late: 0.85 },
    };
    const kc = kcValues[cropType] ?? defaultKc;
    const stage = growthStage as keyof typeof kc;
    const value = kc[stage];
    return value !== undefined ? value : kc.mid;
  }

  calculateET0(temp: number, humidity: number, wind?: number, solar?: number): number {
    if (!temp) return 4;
    const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const ea = es * (humidity / 100);
    const delta = (4098 * es) / Math.pow(temp + 237.3, 2);
    const u2 = wind || 2;
    const rs = solar || 15;
    const gamma = 0.665 * 0.001 * 101.3;
    return (0.408 * delta * es + gamma * u2 * (es - ea)) / (delta + gamma * u2 * 0.34);
  }

  async getIrrigationRecommendation(farmId: string | null = null): Promise<IrrigationRecommendation> {
    const useFuzzy = process.env.USE_FUZZY_IRRIGATION === 'true';
    
    if (useFuzzy) {
      return this.getFuzzyIrrigationRecommendation(farmId);
    }
    
    return this.getET0IrrigationRecommendation(farmId);
  }

  async getFuzzyIrrigationRecommendation(farmId: string | null = null): Promise<IrrigationRecommendation> {
    try {
      const whereClause = farmId ? 'WHERE zone LIKE ?' : '';
      const params = farmId ? [`%${farmId}%`] : [];
      const sensors = getAll(
        `SELECT type, value FROM sensors ${whereClause}`,
        params
      ) as Array<{ type: string; value: number }>;
      
      const soilMoisture = sensors.find(s => s.type === 'soil')?.value || 30;
      const weatherData = await this.getWeatherForecast();
      
      const targetMoisture = (this.minMoisture + this.maxMoisture) / 2;
      const rainProb = weatherData?.rainfall !== undefined 
        ? Math.min(100, (weatherData.rainfall > 0 ? 80 : 0))
        : 0;
      const hour = new Date().getHours();
      
      const fuzzyDuration = fuzzyController.compute(
        targetMoisture,
        soilMoisture,
        rainProb,
        hour
      );
      
      const explanation = fuzzyController.explainDecision(
        targetMoisture,
        soilMoisture,
        rainProb,
        hour
      );
      
      const action = fuzzyDuration > 0 ? 'irrigate' : 'wait';
      
      return {
        action,
        duration: fuzzyDuration,
        reason: explanation.reason,
        soilMoisture,
        method: 'fuzzy',
        explanation: explanation
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      logger.warn('[WaterOpt] Fuzzy recommendation error, fallback to ET0:', errMsg);
      return this.getET0IrrigationRecommendation(farmId);
    }
  }

  async getET0IrrigationRecommendation(farmId: string | null = null): Promise<IrrigationRecommendation> {
    try {
      const whereClause = farmId ? 'WHERE zone LIKE ?' : '';
      const params = farmId ? [`%${farmId}%`] : [];
      const sensors = getAll(
        `SELECT type, value FROM sensors ${whereClause}`,
        params
      ) as Array<{ type: string; value: number }>;
      
      const soilMoisture = sensors.find(s => s.type === 'soil')?.value || 0;
      const temperature = sensors.find(s => s.type === 'temperature')?.value || 25;
      const humidity = sensors.find(s => s.type === 'humidity')?.value || 60;
      
      const weatherData = await this.getWeatherForecast();
      const et0 = this.calculateET0(
        weatherData?.temp || temperature,
        weatherData?.humidity || humidity,
        weatherData?.wind,
        weatherData?.solar
      );
      
      const crops = getAll('SELECT * FROM crops WHERE status = "active"') as Array<{ variety?: string; planting_date?: string }>;
      let totalKc = 0;
      for (const crop of crops) {
        const stage = this.getGrowthStage(crop.planting_date);
        totalKc += await this.getCropKc(crop.variety || 'default', stage);
      }
      const avgKc = crops.length ? totalKc / crops.length : 1.0;
      const etc = et0 * avgKc;
      const irrigationNeedMm = Math.max(0, etc - (soilMoisture / 10));
      const duration = Math.round(irrigationNeedMm * 2);

      const action = soilMoisture < this.minMoisture && duration > 0 ? 'irrigate' : 'wait';
      const reason = soilMoisture < this.minMoisture 
        ? `Độ ẩm ${soilMoisture.toFixed(0)}% < ngưỡng ${this.minMoisture}%` 
        : soilMoisture > this.maxMoisture 
          ? `Độ ẩm ${soilMoisture.toFixed(0)}% > ngưỡng ${this.maxMoisture}%` 
          : 'Độ ẩm trong ngưỡng cho phép';

      return {
        action,
        duration,
        reason,
        soilMoisture,
        et0: et0.toFixed(2),
        etc: etc.toFixed(2),
        weatherSource: weatherData ? 'api' : 'sensor'
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      logger.warn('[WaterOpt] Lỗi:', errMsg);
      return { action: 'wait', duration: 0, reason: errMsg, error: errMsg };
    }
  }

  async getWeatherForecast(): Promise<WeatherData> {
    const fallbackWeather: WeatherData = {
      temp: 28,
      humidity: 70,
      rainfall: 0,
      wind: 2,
      solar: 15
    };

    try {
      return await this.weatherBreaker.execute(async () => {
        return await retry(async () => {
          const lat = process.env.FARM_LAT || '10.7769';
          const lon = process.env.FARM_LON || '106.7009';
          
          const axios = require('axios');
          const res = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&forecast_days=2&timezone=auto`,
            { timeout: 5000 }
          );
          const hourly = res.data.hourly;
          const now = new Date();
          const idx = hourly?.time?.findIndex((t: string) => new Date(t) >= now) ?? -1;
          const safeIdx = idx >= 0 ? idx : 0;
          
          return {
            temp: hourly?.temperature_2m?.[safeIdx] || fallbackWeather.temp,
            humidity: hourly?.relative_humidity_2m?.[safeIdx] || fallbackWeather.humidity,
            rainfall: hourly?.precipitation?.[safeIdx] || fallbackWeather.rainfall,
            wind: hourly?.wind_speed_10m?.[safeIdx] || fallbackWeather.wind
          };
        }, {
          maxRetries: 2,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (info: RetryInfo) => logger.warn(`[WaterOpt] Weather retry ${info.attempt}: ${info.error}`)
        });
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown';
      logger.warn(`[WaterOpt] Weather API failed, using fallback: ${errMsg}`);
      return fallbackWeather;
    }
  }

  getGrowthStage(plantingDate?: string): string {
    if (!plantingDate) return 'mid';
    const days = Math.floor((Date.now() - new Date(plantingDate).getTime()) / 86400000);
    if (days < 30) return 'initial';
    if (days < 60) return 'mid';
    return 'late';
  }

  async checkAndOptimize() {
    const rec = await this.getIrrigationRecommendation();
    if (rec.action === 'irrigate' && rec.duration > 0) {
      this.triggerIrrigation(rec);
    }
  }

  triggerIrrigation(recommendation: IrrigationRecommendation) {
    try {
      const pumpDevices = getAll('SELECT * FROM devices WHERE type = \'pump\' AND status = \'online\'') as Array<{ config?: string }>;
      for (const pump of pumpDevices) {
        const config = JSON.parse(pump.config || '{}');
        if (config.autoMode) {
          runQuery(
            'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, datetime("now"))',
            [`irrigation-${Date.now()}`, 'auto_irrigate', recommendation.reason, 'pending']
          );
          logger.info(`[WaterOpt] Tưới tự động: ${recommendation.duration} phút - ${recommendation.reason}`);
        }
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      logger.warn('[WaterOpt] Lỗi kích hoạt:', errMsg);
    }
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
  }
  
  getCircuitBreakerStatus() {
    return this.weatherBreaker.getState();
  }
}

export default new WaterOptimizationService();