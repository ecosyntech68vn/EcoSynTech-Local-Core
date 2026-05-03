/**
 * Crop Cycle Service - Quản lý chu kỳ cây trồng
 * V5.1.0 - Tương thích với database schema
 * 
 * Features:
 * - Quản lý lô trồng (crop plantings)
 * - Theo dõi giai đoạn cây trồng
 * - Tính toán KC tự động theo giai đoạn
 * - Dự báo ngày thu hoạch
 * - Tưới tiêu theo giai đoạn
 */

import { v4 as uuidv4 } from 'uuid'
import { getOne, getAll, db } from '../config/database'
import logger from '../config/logger'
import batchService from './batchService'

const CROP_STAGES = {
  GIEO_HAT: { name: 'Gieo hạt', code: 'gieo_hat', kcMin: 0.3, kcMax: 0.4, days: 20 },
  CAY_CON: { name: 'Cây con', code: 'cay_con', kcMin: 0.4, kcMax: 0.8, days: 25 },
  SINH_TRUONG: { name: 'Sinh trưởng', code: 'sinh_truong', kcMin: 0.8, kcMax: 1.1, days: 30 },
  RA_HOA: { name: 'Ra hoa - Kết quả', code: 'ra_hoa', kcMin: 1.1, kcMax: 1.0, days: 30 },
  THU_HOACH: { name: 'Chín - Thu hoạch', code: 'thu_hoach', kcMin: 1.0, kcMax: 0.7, days: 15 }
};

const CROP_KC_VALUES = {
  gieo_hat: { kc: 0.35, waterNeed: 'low' },
  cay_con: { kc: 0.5, waterNeed: 'medium' },
  sinh_truong: { kc: 1.0, waterNeed: 'high' },
  ra_hoa: { kc: 1.1, waterNeed: 'high' },
  thu_hoach: { kc: 0.8, waterNeed: 'medium' }
};

function createPlanting(data) {
  const id = `plant-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  if (!data.cropId) {
    throw new Error('crop_id là bắt buộc');
  }
  
  const plantingDate = data.plantingDate || now.split('T')[0];
  const expectedHarvestDate = data.expectedHarvestDate || null;
  
  db.run(`
    INSERT INTO crop_plantings (
      id, farm_id, crop_id, area, area_unit,
      planting_date, expected_harvest_date, current_stage,
      status, yield_expected, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farmId || null, data.cropId, data.area || null, 
    data.areaUnit || 'hectare', plantingDate, expectedHarvestDate, 'gieo_hat',
    'growing', data.yieldExpected || null, data.notes || null, now, now
  ]);
  
  const planting = getOne('SELECT * FROM crop_plantings WHERE id = ?', [id]);
  
  logger.info(`Tạo lô trồng mới: ${id}, crop_id: ${data.cropId}`);

  if (data.createTraceability !== false) {
    try {
      const batchResult = batchService.createBatchFromPlanting(id);
      logger.info(`Tạo traceability batch: ${batchResult.batch_code}`);
      return { ...enrichPlanting(planting), traceability_batch: batchResult.batch_code };
    } catch (err) {
      logger.warn(`Không tạo được traceability batch: ${err.message}`);
    }
  }
  
  return enrichPlanting(planting);
}

function updatePlantingStage(plantingId, stageCode) {
  const kcData = CROP_KC_VALUES[stageCode] || { kc: 0.5 };
  const now = new Date().toISOString();
  
  db.run(
    'UPDATE crop_plantings SET current_stage = ?, updated_at = ? WHERE id = ?',
    [stageCode, now, plantingId]
  );
  
  logger.info(`Cập nhật giai đoạn lô trồng ${plantingId}: ${stageCode}`);
  
  return { stageCode, kc: kcData.kc };
}

function getAllPlantings(farmId, status) {
  let query = `
    SELECT cp.*, c.name as crop_name, c.name_vi, c.category, c.kc_mid, c.kc_initial, c.kc_mid, c.kc_end
    FROM crop_plantings cp 
    LEFT JOIN crops c ON cp.crop_id = c.id
    WHERE 1=1`;
  const params = [];
  
  if (farmId) {
    query += ' AND cp.farm_id = ?';
    params.push(farmId);
  }
  if (status) {
    query += ' AND cp.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY cp.planting_date DESC';
  
  const plantings = getAll(query, params);
  
  return plantings.map(p => enrichPlanting(p));
}

function enrichPlanting(planting) {
  const now = new Date();
  const plantingDate = planting.planting_date ? new Date(planting.planting_date) : now;
  
  const daysSincePlanting = planting.planting_date 
    ? Math.floor((now - plantingDate) / (1000 * 60 * 60 * 24))
    : 0;
  
  const stageCode = planting.current_stage || 'gieo_hat';
  const stageInfo = Object.values(CROP_STAGES).find(s => s.code === stageCode) || CROP_STAGES.GIEO_HAT;
  const kcData = CROP_KC_VALUES[stageCode] || { kc: 0.5 };
  
  const stages = Object.values(CROP_STAGES);
  const currentStageIndex = stages.findIndex(s => s.code === stageCode);
  
  let stageProgress = 0;
  let nextStage = null;
  let daysToNextStage = 0;
  
  if (currentStageIndex >= 0 && currentStageIndex < stages.length - 1) {
    const nextStageInfo = stages[currentStageIndex + 1];
    const stageDays = stageInfo.days || 20;
    const daysInCurrentStage = daysSincePlanting % stageDays || stageDays;
    stageProgress = Math.min(100, (daysInCurrentStage / stageDays) * 100);
    nextStage = nextStageInfo.code;
    daysToNextStage = stageDays - daysInCurrentStage;
  }
  
  let daysToHarvest = 0;
  if (planting.expected_harvest_date) {
    const expectedHarvest = new Date(planting.expected_harvest_date);
    daysToHarvest = Math.ceil((expectedHarvest - now) / (1000 * 60 * 60 * 24));
  }
  
  return {
    id: planting.id,
    farm_id: planting.farm_id,
    crop_id: planting.crop_id,
    crop_name: planting.crop_name,
    crop_name_vi: planting.name_vi,
    area: planting.area,
    area_unit: planting.area_unit,
    planting_date: planting.planting_date,
    expected_harvest_date: planting.expected_harvest_date,
    actual_harvest_date: planting.actual_harvest_date,
    current_stage: stageCode,
    current_stage_name: stageInfo.name,
    status: daysToHarvest <= 0 && planting.status === 'growing' ? 'ready_harvest' : planting.status,
    yield_expected: planting.yield_expected,
    yield_actual: planting.yield_actual,
    notes: planting.notes,
    days_since_planting: Math.max(0, daysSincePlanting),
    stage_progress: Math.round(stageProgress),
    next_stage: nextStage,
    days_to_next_stage: Math.max(0, daysToNextStage),
    days_to_harvest: Math.max(0, daysToHarvest),
    kc: kcData.kc,
    water_need: kcData.waterNeed
  };
}

function calculateIrrigationNeed(plantingId, eto = 4) {
  const planting = getOne('SELECT * FROM crop_plantings WHERE id = ?', [plantingId]);
  if (!planting) return null;
  
  const stageCode = planting.current_stage || 'gieo_hat';
  const kcData = CROP_KC_VALUES[stageCode] || { kc: 0.5 };
  const kc = kcData.kc;
  const etc = eto * kc;
  
  const area = planting.area || 10000;
  const waterNeedLiters = etc * area;
  
  return {
    planting_id: plantingId,
    crop_name: planting.crop_name,
    current_stage: stageCode,
    kc: parseFloat(kc.toFixed(2)),
    eto: parseFloat(eto.toFixed(2)),
    etc: parseFloat(etc.toFixed(2)),
    water_need_liters: Math.round(waterNeedLiters),
    water_need_m3: parseFloat((waterNeedLiters / 1000).toFixed(2)),
    area: area,
    area_unit: planting.area_unit || 'm2',
    recommendation: getIrrigationRecommendation(etc, kcData.waterNeed)
  };
}

function getIrrigationRecommendation(etc, waterNeed) {
  if (waterNeed === 'low') return 'Tưới nhẹ - Đất còn ẩm';
  if (etc < 4) return 'Tưới trung bình - 20-30 phút';
  if (etc < 6) return 'Tưới đủ - 30-45 phút';
  return 'Tưới nhiều - 45-60 phút';
}

function getCropStats(farmId = null) {
  let whereClause = '';
  const params = [];
  if (farmId) {
    whereClause = ' WHERE farm_id = ?';
    params.push(farmId);
  }
  
  const total = getOne(`SELECT COUNT(*) as count FROM crop_plantings${whereClause}`, params);
  const byStatus = getAll(`
    SELECT status, COUNT(*) as count 
    FROM crop_plantings${whereClause ? whereClause + ' AND' : ' WHERE'} 1=1 GROUP BY status
  `);
  const byType = getAll(`
    SELECT c.category, c.name_vi, COUNT(*) as count, SUM(cp.area) as total_area
    FROM crop_plantings cp 
    LEFT JOIN crops c ON cp.crop_id = c.id
    ${whereClause || 'WHERE 1=1'}
    GROUP BY cp.crop_id
  `);
  const readyHarvest = getOne(
    `SELECT COUNT(*) as count FROM crop_plantings 
     WHERE expected_harvest_date <= date('now') AND status = 'growing'`
  );
  
  return {
    total: total?.count || 0,
    by_status: byStatus.reduce((acc, s) => { acc[s.status] = s.count; return acc; }, {}),
    by_type: byType,
    ready_to_harvest: readyHarvest?.count || 0
  };
}

function recordHarvest(plantingId, quantity, quality, notes, createSupplyChain = false) {
  const planting = getOne('SELECT * FROM crop_plantings WHERE id = ?', [plantingId]);
  if (!planting) return null;
  
  const harvestId = `harvest-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO crop_yields (id, crop_id, harvest_date, quantity, quality, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [harvestId, plantingId, now.split('T')[0], quantity, quality || '', notes || '']);
  
  db.run(
    'UPDATE crop_plantings SET status = ?, yield_actual = ?, actual_harvest_date = ?, updated_at = ? WHERE id = ?',
    ['harvested', quantity, now.split('T')[0], now, plantingId]
  );
  
  logger.info(`Ghi nhận thu hoạch lô trồng ${plantingId}: ${quantity} ${planting.area_unit || 'kg'}`);

  let traceabilityResult = null;
  try {
    traceabilityResult = batchService.recordHarvest(plantingId, quantity, quality);
    logger.info(`Cập nhật traceability: ${traceabilityResult.batch_code}`);
  } catch (err) {
    logger.warn(`Không cập nhật được traceability: ${err.message}`);
  }

  let supplyChainResult = null;
  if (createSupplyChain && traceabilityResult && !traceabilityResult.error) {
    try {
      supplyChainResult = batchService.linkToSupplyChain(traceabilityResult.batch_id, {
        destination: 'market',
        buyer_name: '',
        buyer_contact: '',
        price: 0
      });
      logger.info(`Tạo supply chain: ${supplyChainResult.supply_chain_id}`);
    } catch (err) {
      logger.warn(`Không tạo được supply chain: ${err.message}`);
    }
  }
  
  return { 
    harvest_id: harvestId, 
    planting_id: plantingId, 
    quantity, 
    quality, 
    harvest_date: now,
    traceability: traceabilityResult,
    supply_chain: supplyChainResult
  };
}

function getStageTimeline(plantingId) {
  const planting = getOne(`
    SELECT cp.*, c.name_vi as crop_name 
    FROM crop_plantings cp 
    LEFT JOIN crops c ON cp.crop_id = c.id
    WHERE cp.id = ?
  `, [plantingId]);
  
  if (!planting) return null;
  
  const plantingDate = planting.planting_date ? new Date(planting.planting_date) : new Date();
  
  const stages = Object.values(CROP_STAGES);
  const timeline = stages.map(stageInfo => {
    const startDate = new Date(plantingDate);
    startDate.setDate(startDate.getDate() + stageInfo.days);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + stageInfo.days);
    
    const kcData = CROP_KC_VALUES[stageInfo.code] || { kc: 0.5 };
    
    return {
      stage: stageInfo.name,
      code: stageInfo.code,
      kc: kcData.kc,
      water_need: kcData.waterNeed,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      duration_days: stageInfo.days
    };
  });
  
  return {
    planting_id: plantingId,
    crop_name: planting.crop_name,
    planting_date: planting.planting_date,
    expected_harvest_date: planting.expected_harvest_date,
    timeline
  };
}

function advanceStage(plantingId) {
  const planting = getOne('SELECT * FROM crop_plantings WHERE id = ?', [plantingId]);
  if (!planting) return null;
  
  const stages = Object.values(CROP_STAGES);
  const currentIndex = stages.findIndex(s => s.code === planting.current_stage);
  
  if (currentIndex >= stages.length - 1) {
    return { error: 'Đã ở giai đoạn cuối cùng', current_stage: planting.current_stage };
  }
  
  const nextStage = stages[currentIndex + 1];
  const now = new Date().toISOString();
  
  db.run(
    'UPDATE crop_plantings SET current_stage = ?, updated_at = ? WHERE id = ?',
    [nextStage.code, now, plantingId]
  );
  
  logger.info(`Chuyển giai đoạn lô trồng ${plantingId}: ${planting.current_stage} → ${nextStage.code}`);
  
  return { 
    success: true, 
    previous_stage: planting.current_stage, 
    current_stage: nextStage.code,
    stage_name: nextStage.name
  };
}

module.exports = {
  createPlanting,
  updatePlantingStage,
  getAllPlantings,
  enrichPlanting,
  calculateIrrigationNeed,
  getCropStats,
  recordHarvest,
  getStageTimeline,
  advanceStage,
  CROP_STAGES,
  CROP_KC_VALUES
};