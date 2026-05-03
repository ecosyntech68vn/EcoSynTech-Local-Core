import GeneticOptimizer from './GeneticOptimizer';
import logger from '../config/logger';

interface HistoricalData {
  soilMoistureError: number;
  rainProb: number;
  hour: number;
  actualDurationUsed: number;
  stressFlag: number;
}

async function collectHistoricalData(): Promise<HistoricalData[]> {
  try {
    const { getAll } = require('../config/database');
    
    const query = `
      SELECT 
        (50 - s.value) as soilMoistureError,
        COALESCE(w.precipitation_probability, 0) as rainProb,
        CAST(strftime('%H', h.timestamp) AS INTEGER) as hour,
        h.duration as actualDurationUsed,
        CASE 
          WHEN s.value < 25 THEN 1 
          ELSE 0 
        END as stressFlag
      FROM history h
      LEFT JOIN sensors s ON s.type = 'soil'
      LEFT JOIN weather_cache w ON 1=1
      WHERE h.action = 'auto_irrigate'
        AND h.timestamp > datetime('now', '-7 days')
      ORDER BY h.timestamp DESC
      LIMIT 100
    `;
    
    return getAll(query) as HistoricalData[];
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown';
    logger.warn('[AutoTuning] Lỗi truy vấn dữ liệu:', errMsg);
    return [];
  }
}

function generateMockData(): HistoricalData[] {
  const data: HistoricalData[] = [];
  const soilErrors = [-30, -20, -10, 0, 10, 20, 30, 40];
  const rainProbs = [0, 10, 20, 30, 50, 70, 90];
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  for (let i = 0; i < 50; i++) {
    const error = soilErrors[Math.floor(Math.random() * soilErrors.length)] ?? 0;
    const rainProb = rainProbs[Math.floor(Math.random() * rainProbs.length)] ?? 0;
    const hour = hours[Math.floor(Math.random() * hours.length)] ?? 12;
    
    const actualDuration = Math.max(0, error > 0 ? Math.round(error * 1.5) : 0);
    const stressFlag = error > 20 && actualDuration < 15 ? 1 : 0;
    
    data.push({
      soilMoistureError: error,
      rainProb,
      hour,
      actualDurationUsed: actualDuration,
      stressFlag
    });
  }
  
  return data;
}

async function tuneIrrigationSchedule(): Promise<{ success: boolean; message: string; results?: unknown }> {
  logger.info('[AutoTuning] Bắt đầu tối ưu hóa lịch tưới');
  
  let historicalData = await collectHistoricalData();
  
  if (historicalData.length < 10) {
    logger.warn('[AutoTuning] Dữ liệu lịch sử không đủ, sử dụng dữ liệu mô phỏng');
    historicalData = generateMockData();
  }
  
  const stressCount = historicalData.filter(d => d.stressFlag === 1).length;
  const avgRainProb = historicalData.reduce((sum, d) => sum + d.rainProb, 0) / historicalData.length;
  
  logger.info(`[AutoTuning] Phân tích: ${stressCount} lần cây bị stress, mưa trung bình ${avgRainProb.toFixed(1)}%`);
  
  const result = GeneticOptimizer.evolve();
  
  if (result.converged || result.generation >= 50) {
    const best = GeneticOptimizer.getBestSolution();
    logger.info(`[AutoTuning] Hoàn thành sau ${result.generation} thế hệ`);
    logger.info(`[AutoTuning] Lịch tưới tối ưu: ${best.join(' -> ')} phút`);
    
    return {
      success: true,
      message: `Đã tối ưu sau ${result.generation} thế hệ`,
      results: {
        generation: result.generation,
        schedule: best,
        fitness: result.bestFitness
      }
    };
  }
  
  return {
    success: true,
    message: `Tiến hành tối ưu hóa (thế hệ ${result.generation})`
  };
}

function getTuningStats() {
  return GeneticOptimizer.getStats();
}

function resetTuning() {
  GeneticOptimizer.reset();
  logger.info('[AutoTuning] Đã reset bộ tối ưu');
}

export {
  tuneIrrigationSchedule,
  getTuningStats,
  resetTuning,
  collectHistoricalData,
  generateMockData
};