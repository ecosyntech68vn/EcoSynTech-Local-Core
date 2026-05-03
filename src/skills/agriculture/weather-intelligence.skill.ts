'use strict';

interface WeatherThresholds {
  rain: { light: number; moderate: number; heavy: number };
  temperature: { cold: number; optimal: number; hot: number };
  humidity: { low: number; optimal: number; high: number };
  wind: { calm: number; moderate: number; strong: number };
  uv: { low: number; moderate: number; high: number; extreme: number };
}

interface CropRequirements {
  minTemp: number;
  maxTemp: number;
  minHumidity: number;
  optimalRainfall: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  uvIndex: number;
  description: string;
}

export interface Recommendation {
  type: string;
  priority: string;
  message: string;
  action?: string;
}

export interface RiskAssessment {
  level: string;
  factors: string[];
  mitigation: string[];
}

export class WeatherIntelligenceSkill {
  id: string;
  name: string;
  description: string;
  weatherThresholds: WeatherThresholds;
  cropRequirements: Record<string, CropRequirements>;
  forecast: WeatherData[] | null;
  lastUpdate: Date | null;

  constructor() {
    this.id = 'weather-intelligence';
    this.name = 'Weather Intelligence';
    this.description = 'AI-powered weather-aware decision making for irrigation and farming operations';
    
    this.weatherThresholds = {
      rain: { light: 2, moderate: 10, heavy: 25 },
      temperature: { cold: 10, optimal: 25, hot: 35 },
      humidity: { low: 30, optimal: 60, high: 85 },
      wind: { calm: 10, moderate: 25, strong: 50 },
      uv: { low: 3, moderate: 6, high: 8, extreme: 11 }
    };

    this.cropRequirements = {
      rice: { minTemp: 20, maxTemp: 35, minHumidity: 70, optimalRainfall: 10 },
      vegetable: { minTemp: 15, maxTemp: 30, minHumidity: 60, optimalRainfall: 5 },
      fruit: { minTemp: 18, maxTemp: 32, minHumidity: 50, optimalRainfall: 7 },
      maize: { minTemp: 18, maxTemp: 35, minHumidity: 40, optimalRainfall: 8 }
    };

    this.forecast = null;
    this.lastUpdate = null;
  }

  async analyze(ctx: unknown): Promise<{
    skill: string;
    timestamp: string;
    current: WeatherData;
    forecast: WeatherData[];
    recommendations: Recommendation[];
    riskAssessment: RiskAssessment;
    irrigationAdvice: string;
  }> {
    const currentWeather = await this.getCurrentWeather();
    const forecast = await this.getForecast();
    const recommendations = this.generateRecommendations(currentWeather, forecast);
    const riskAssessment = this.assessWeatherRisks(currentWeather, forecast);
    const irrigationAdvice = this.getIrrigationAdvice(currentWeather, forecast);

    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      current: currentWeather,
      forecast: forecast.slice(0, 7),
      recommendations,
      riskAssessment,
      irrigationAdvice
    };
  }

  async getCurrentWeather(): Promise<WeatherData> {
    try {
      const axios = require('axios');
      const lat = process.env.FARM_LAT || '10.7769';
      const lon = process.env.FARM_LON || '106.7009';
      
      const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index`);
      const data = response.data;
      
      return {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        rainfall: data.current.precipitation,
        windSpeed: data.current.wind_speed_10m,
        uvIndex: data.current.uv_index || 0,
        description: this.getWeatherDescription(data.current)
      };
    } catch (e) {
      return {
        temperature: 25,
        humidity: 70,
        rainfall: 0,
        windSpeed: 10,
        uvIndex: 5,
        description: 'Unknown'
      };
    }
  }

  private getWeatherDescription(current: Record<string, number>): string {
    if (current.precipitation > 25) return 'Heavy Rain';
    if (current.precipitation > 10) return 'Moderate Rain';
    if (current.precipitation > 2) return 'Light Rain';
    if (current.temperature_2m > 35) return 'Hot';
    if (current.temperature_2m < 10) return 'Cold';
    return 'Clear';
  }

  async getForecast(): Promise<WeatherData[]> {
    const forecasts: WeatherData[] = [];
    for (let i = 1; i <= 7; i++) {
      forecasts.push({
        temperature: 25 + Math.random() * 10,
        humidity: 60 + Math.random() * 20,
        rainfall: Math.random() * 10,
        windSpeed: 10 + Math.random() * 15,
        uvIndex: 5 + Math.random() * 5,
        description: 'Partly Cloudy'
      });
    }
    return forecasts;
  }

  generateRecommendations(current: WeatherData, forecast: WeatherData[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (current.rainfall > 10) {
      recommendations.push({
        type: 'irrigation',
        priority: 'low',
        message: 'Rain expected - skip irrigation today',
        action: 'disable_irrigation'
      });
    }
    
    if (current.temperature > 32) {
      recommendations.push({
        type: 'protection',
        priority: 'high',
        message: 'High temperature - provide shade for sensitive crops',
        action: 'activate_shade'
      });
    }
    
    return recommendations;
  }

  assessWeatherRisks(current: WeatherData, forecast: WeatherData[]): RiskAssessment {
    const factors: string[] = [];
    const mitigation: string[] = [];
    
    if (current.rainfall > 20) {
      factors.push('Flood risk');
      mitigation.push('Check drainage systems');
    }
    
    if (current.uvIndex > 8) {
      factors.push('UV damage risk');
      mitigation.push('Apply UV protective measures');
    }
    
    return {
      level: factors.length > 2 ? 'high' : factors.length > 0 ? 'medium' : 'low',
      factors,
      mitigation
    };
  }

  getIrrigationAdvice(current: WeatherData, forecast: WeatherData[]): string {
    const totalRainfall = forecast.reduce((sum, f) => sum + f.rainfall, 0);
    
    if (current.rainfall > 10 || totalRainfall > 20) {
      return 'Skip irrigation - sufficient water from rain';
    }
    
    if (current.humidity < 40) {
      return 'Increase irrigation frequency due to low humidity';
    }
    
    return 'Normal irrigation schedule recommended';
  }

  run(ctx: unknown): unknown {
    return this.analyze(ctx);
  }
}

export default WeatherIntelligenceSkill;