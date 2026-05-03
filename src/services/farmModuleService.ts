/**
 * Farm Module Service - Quản lý module nông nghiệp đa dạng
 * V5.1.0 - Modular architecture for easy extension
 * 
 * Modules:
 * - crops: Cây trồng đồng ruộng
 * - aquaculture: Thủy sản (tôm, cá)
 * - greenhouse: Nhà màng/ greenhouse
 * - hydroponics: Thủy canh
 * - livestock: Chăn nuôi
 * - aeroponics: Khí canh
 * 
 * Features:
 * - Unified dashboard aggregation
 * - Cross-module traceability
 * - Activity tracking per module
 * - Easy to add new modules
 */

import { v4 as uuidv4 } from 'uuid'
import { getOne, getAll, db } from '../config/database'
import logger from '../config/logger'
const batchService = require('./batchService');
const farmActivityService = require('./farmActivityService');

const FARM_MODULES = {
  crops: {
    id: 'crops',
    name: 'Cây trồng',
    name_en: 'Crops',
    icon: '🌾',
    color: '#22c55e',
    description: 'Cây trồng đồng ruộng, rau màu, cây ăn quả',
    primary_table: 'crop_plantings',
    source_type: 'crop',
    stages: ['gieo_hat', 'cay_con', 'sinh_truong', 'ra_hoa', 'thu_hoach'],
    activities: ['spray', 'fertilizer', 'pruning', 'watering', 'soil_preparation', 'harvesting']
  },
  aquaculture: {
    id: 'aquaculture',
    name: 'Thủy sản',
    name_en: 'Aquaculture',
    icon: '🐟',
    color: '#0ea5e9',
    description: 'Nuôi tôm, cá, cua, ốc...',
    primary_table: 'aquaculture_spawning',
    source_type: 'aquaculture',
    stages: ['chuẩn_bị_ao', 'thả_giống', 'nuôi_ươm', 'nuôi_trưởng', 'thu_hoạch'],
    activities: ['feeding', 'water_change', 'vaccination', 'monitoring', 'harvesting', 'grading']
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Nhà màng',
    name_en: 'Greenhouse',
    icon: '🏡',
    color: '#f59e0b',
    description: 'Trồng trong nhà màng, nhà kính',
    primary_table: 'greenhouse_zones',
    source_type: 'greenhouse',
    stages: ['chuẩn_bị', 'gieo_trồng', 'chăm_sóc', 'thu_hoạch'],
    activities: ['climate_control', 'irrigation', 'fertilizer', 'spray', 'harvesting']
  },
  hydroponics: {
    id: 'hydroponics',
    name: 'Thủy canh',
    name_en: 'Hydroponics',
    icon: '💧',
    color: '#8b5cf6',
    description: 'Trồng cây không đất, dung dịch dinh dưỡng',
    primary_table: 'hydroponic_systems',
    source_type: 'hydroponics',
    stages: ['ủ_hạt', 'nảy_mầm', 'sinh_trưởng', 'thu_hoạch'],
    activities: ['nutrient_check', 'ph_adjust', 'water_cycle', 'harvesting']
  },
  livestock: {
    id: 'livestock',
    name: 'Chăn nuôi',
    name_en: 'Livestock',
    icon: '🐄',
    color: '#ef4444',
    description: 'Nuôi bò, heo, gà, cừu...',
    primary_table: 'livestock_batches',
    source_type: 'livestock',
    stages: ['thả_giống', 'nuôi_con', 'nuôi_nguồn', 'xuất_chuồng'],
    activities: ['feeding', 'vaccination', 'health_check', 'cleaning', 'medication']
  },
  aeroponics: {
    id: 'aeroponics',
    name: 'Khí canh',
    name_en: 'Aeroponics',
    icon: '💨',
    color: '#06b6d4',
    description: 'Trồng cây trong sương mù dinh dưỡng',
    primary_table: 'aeroponic_systems',
    source_type: 'aeroponics',
    stages: ['ủ_hạt', 'nảy_mầm', 'sinh_trưởng', 'thu_hoạch'],
    activities: ['mist_check', 'nutrient_cycle', 'root_check', 'harvesting']
  }
};

function getModules() {
  return FARM_MODULES;
}

function getModule(moduleId) {
  return FARM_MODULES[moduleId] || null;
}

function createModuleUnit(moduleId, data) {
  const module = FARM_MODULES[moduleId];
  if (!module) {
    throw new Error('Module không tồn tại: ' + moduleId);
  }

  const id = `${moduleId.substring(0, 4)}-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  switch (moduleId) {
  case 'crops':
    return createCropUnit(id, data, now);
  case 'aquaculture':
    return createAquacultureUnit(id, data, now);
  case 'greenhouse':
    return createGreenhouseUnit(id, data, now);
  case 'hydroponics':
    return createHydroponicUnit(id, data, now);
  case 'livestock':
    return createLivestockUnit(id, data, now);
  case 'aeroponics':
    return createAeroponicUnit(id, data, now);
  default:
    throw new Error('Module chưa được hỗ trợ: ' + moduleId);
  }
}

function createCropUnit(id, data, now) {
  db.run(`
    INSERT INTO crop_plantings (
      id, farm_id, crop_id, area, area_unit, planting_date, 
      expected_harvest_date, current_stage, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.crop_id, data.area || null, 
    data.area_unit || 'hectare', data.start_date || now.split('T')[0],
    data.expected_harvest_date, data.current_stage || 'gieo_hat', 
    data.status || 'growing', data.notes || '', now, now
  ]);

  const batchResult = batchService.createBatchFromPlanting(id);

  return {
    id,
    module: 'crops',
    batch_code: batchResult.batch_code,
    ...data
  };
}

function createAquacultureUnit(id, data, now) {
  const expectedHarvest = data.start_date 
    ? new Date(data.start_date) 
    : new Date();
  expectedHarvest.setDate(expectedHarvest.getDate() + (data.growth_days || 90));

  db.run(`
    INSERT INTO aquaculture_spawning (
      id, species_id, pond_id, farm_id, quantity, source_pool,
      spawning_date, expected_harvest_date, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.species_id, data.pond_id || '', data.farm_id || null,
    data.quantity || 0, data.source_pool || '', 
    data.start_date || now.split('T')[0], expectedHarvest.toISOString().split('T')[0],
    data.status || 'nursing', data.notes || '', now, now
  ]);

  const batchResult = batchService.createBatchFromAquaculture(id);

  return {
    id,
    module: 'aquaculture',
    batch_code: batchResult.batch_code,
    ...data
  };
}

function createGreenhouseUnit(id, data, now) {
  db.run(`
    INSERT INTO greenhouse_zones (
      id, farm_id, zone_name, area, area_unit, crop_type, 
      start_date, expected_harvest, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.name || '', data.area || null,
    data.area_unit || 'm2', data.crop_type || '', 
    data.start_date || now.split('T')[0], data.expected_harvest_date,
    data.status || 'active', data.notes || '', now, now
  ]);

  return {
    id,
    module: 'greenhouse',
    ...data
  };
}

function createHydroponicUnit(id, data, now) {
  db.run(`
    INSERT INTO hydroponic_systems (
      id, farm_id, system_name, system_type, capacity, crop_type,
      start_date, expected_harvest, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.name || '', data.system_type || 'NFT',
    data.capacity || 0, data.crop_type || '', 
    data.start_date || now.split('T')[0], data.expected_harvest_date,
    data.status || 'active', data.notes || '', now, now
  ]);

  return {
    id,
    module: 'hydroponics',
    ...data
  };
}

function createLivestockUnit(id, data, now) {
  db.run(`
    INSERT INTO livestock_batches (
      id, farm_id, animal_type, quantity, batch_name, 
      start_date, expected_out_date, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.animal_type || '', data.quantity || 0,
    data.name || '', data.start_date || now.split('T')[0], 
    data.expected_out_date, data.status || 'growing', data.notes || '', now, now
  ]);

  return {
    id,
    module: 'livestock',
    ...data
  };
}

function createAeroponicUnit(id, data, now) {
  db.run(`
    INSERT INTO aeroponic_systems (
      id, farm_id, system_name, capacity, crop_type,
      start_date, expected_harvest, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.name || '', data.capacity || 0,
    data.crop_type || '', data.start_date || now.split('T')[0],
    data.expected_harvest_date, data.status || 'active', data.notes || '', now, now
  ]);

  return {
    id,
    module: 'aeroponics',
    ...data
  };
}

function getModuleUnits(moduleId, farmId = null) {
  const module = FARM_MODULES[moduleId];
  if (!module) return [];

  let query = '';
  const params = [];

  switch (moduleId) {
  case 'crops':
    query = `SELECT cp.*, c.name as crop_name, c.name_vi, c.category 
               FROM crop_plantings cp 
               LEFT JOIN crops c ON cp.crop_id = c.id
               WHERE 1=1`;
    if (farmId) { query += ' AND cp.farm_id = ?'; params.push(farmId); }
    query += ' ORDER BY cp.created_at DESC';
    break;
  case 'aquaculture':
    query = `SELECT a.*, ao.name_vi as species_name, ao.category 
               FROM aquaculture_spawning a
               LEFT JOIN aquaculture ao ON a.species_id = ao.id
               WHERE 1=1`;
    if (farmId) { query += ' AND a.farm_id = ?'; params.push(farmId); }
    query += ' ORDER BY a.created_at DESC';
    break;
  case 'greenhouse':
    query = 'SELECT * FROM greenhouse_zones WHERE 1=1';
    if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
    query += ' ORDER BY created_at DESC';
    break;
  case 'hydroponics':
    query = 'SELECT * FROM hydroponic_systems WHERE 1=1';
    if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
    query += ' ORDER BY created_at DESC';
    break;
  case 'livestock':
    query = 'SELECT * FROM livestock_batches WHERE 1=1';
    if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
    query += ' ORDER BY created_at DESC';
    break;
  case 'aeroponics':
    query = 'SELECT * FROM aeroponic_systems WHERE 1=1';
    if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
    query += ' ORDER BY created_at DESC';
    break;
  default:
    return [];
  }

  return getAll(query, params);
}

function getModuleStats(moduleId, farmId = null) {
  const module = FARM_MODULES[moduleId];
  if (!module) return null;

  const baseQuery = farmId ? ` WHERE farm_id = '${farmId}'` : '';

  switch (moduleId) {
  case 'crops': {
    const total = getOne(`SELECT COUNT(*) as count FROM crop_plantings${baseQuery}`);
    const active = getOne(`SELECT COUNT(*) as count FROM crop_plantings${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'growing'`);
    const harvested = getOne(`SELECT COUNT(*) as count FROM crop_plantings${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'harvested'`);
    const totalArea = getOne(`SELECT SUM(area) as total FROM crop_plantings${baseQuery}`);
    return { total: total?.count || 0, active: active?.count || 0, harvested: harvested?.count || 0, total_area: totalArea?.total || 0 };
  }
  case 'aquaculture': {
    const total = getOne(`SELECT COUNT(*) as count FROM aquaculture_spawning${baseQuery}`);
    const active = getOne(`SELECT COUNT(*) as count FROM aquaculture_spawning${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'nursing'`);
    const ready = getOne(`SELECT COUNT(*) as count FROM aquaculture_spawning${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'ready'`);
    const totalQty = getOne(`SELECT SUM(quantity) as total FROM aquaculture_spawning${baseQuery}`);
    return { total: total?.count || 0, active: active?.count || 0, ready: ready?.count || 0, total_quantity: totalQty?.total || 0 };
  }
  case 'greenhouse': {
    const total = getOne(`SELECT COUNT(*) as count FROM greenhouse_zones${baseQuery}`);
    const active = getOne(`SELECT COUNT(*) as count FROM greenhouse_zones${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'active'`);
    const totalArea = getOne(`SELECT SUM(area) as total FROM greenhouse_zones${baseQuery}`);
    return { total: total?.count || 0, active: active?.count || 0, total_area: totalArea?.total || 0 };
  }
  case 'hydroponics': {
    const total = getOne(`SELECT COUNT(*) as count FROM hydroponic_systems${baseQuery}`);
    const active = getOne(`SELECT COUNT(*) as count FROM hydroponic_systems${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'active'`);
    const totalCapacity = getOne(`SELECT SUM(capacity) as total FROM hydroponic_systems${baseQuery}`);
    return { total: total?.count || 0, active: active?.count || 0, total_capacity: totalCapacity?.total || 0 };
  }
  case 'livestock': {
    const total = getOne(`SELECT COUNT(*) as count FROM livestock_batches${baseQuery}`);
    const active = getOne(`SELECT COUNT(*) as count FROM livestock_batches${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'growing'`);
    const totalQty = getOne(`SELECT SUM(quantity) as total FROM livestock_batches${baseQuery}`);
    return { total: total?.count || 0, active: active?.count || 0, total_quantity: totalQty?.total || 0 };
  }
  case 'aeroponics': {
    const total = getOne(`SELECT COUNT(*) as count FROM aeroponic_systems${baseQuery}`);
    const active = getOne(`SELECT COUNT(*) as count FROM aeroponic_systems${baseQuery ? baseQuery + ' AND' : ' WHERE'} status = 'active'`);
    return { total: total?.count || 0, active: active?.count || 0 };
  }
  default:
    return null;
  }
}

function getDashboardSummary(farmId = null) {
  const modules = Object.keys(FARM_MODULES);
  const summary = {};

  modules.forEach(moduleId => {
    summary[moduleId] = {
      ...FARM_MODULES[moduleId],
      stats: getModuleStats(moduleId, farmId),
      units: getModuleUnits(moduleId, farmId).slice(0, 5)
    };
  });

  const totalActivities = getOne(`
    SELECT COUNT(*) as count FROM farm_activities${farmId ? ` WHERE farm_id = '${farmId}'` : ''}
  `);

  const totalCost = getOne(`
    SELECT SUM(cost) as total FROM farm_activities${farmId ? ` WHERE farm_id = '${farmId}'` : ''}
  `);

  const traceabilityBatches = getOne(`
    SELECT COUNT(*) as count FROM traceability_batches${farmId ? ` WHERE farm_name = (SELECT name FROM farms WHERE id = '${farmId}')` : ''}
  `);

  return {
    modules: summary,
    overview: {
      total_modules: modules.length,
      active_modules: modules.filter(m => getModuleStats(m, farmId)?.active > 0).length,
      total_activities: totalActivities?.count || 0,
      total_cost: totalCost?.total || 0,
      traceability_batches: traceabilityBatches?.count || 0
    }
  };
}

function getModuleTimeline(moduleId, unitId) {
  const module = FARM_MODULES[moduleId];
  if (!module) return null;

  const activities = farmActivityService.getActivitiesTimeline(module.source_type, unitId);

  let stages = [];
  if (moduleId === 'crops') {
    const planting = getOne('SELECT * FROM crop_plantings WHERE id = ?', [unitId]);
    stages = planting ? [{
      type: 'planting',
      name: 'Gieo trồng',
      date: planting.planting_date,
      icon: '🌱'
    }] : [];
  }

  return {
    module: moduleId,
    unit_id: unitId,
    activities: activities,
    stages: stages
  };
}

function deleteModuleUnit(moduleId, unitId) {
  const module = FARM_MODULES[moduleId];
  if (!module) return false;

  let table = '';
  switch (moduleId) {
  case 'crops': table = 'crop_plantings'; break;
  case 'aquaculture': table = 'aquaculture_spawning'; break;
  case 'greenhouse': table = 'greenhouse_zones'; break;
  case 'hydroponics': table = 'hydroponic_systems'; break;
  case 'livestock': table = 'livestock_batches'; break;
  case 'aeroponics': table = 'aeroponic_systems'; break;
  default: return false;
  }

  db.run(`DELETE FROM ${table} WHERE id = ?`, [unitId]);
  logger.info(`Xóa ${moduleId} unit: ${unitId}`);

  return true;
}

function getTraceabilityWithModuleData(batchCode) {
  const batchData = batchService.getCompleteTraceabilityData(batchCode);
  if (!batchData) return null;

  const activities = farmActivityService.getActivitiesByBatch(batchData.id);

  return {
    ...batchData,
    activities: activities.map(a => ({
      type: a.activity_type,
      name: a.activity_name,
      date: a.activity_date,
      description: a.description,
      cost: a.cost,
      performed_by: a.performed_by
    }))
  };
}

module.exports = {
export default module.exports;
export default module.exports;
  getModules,
  getModule,
  createModuleUnit,
  getModuleUnits,
  getModuleStats,
  getDashboardSummary,
  getModuleTimeline,
  deleteModuleUnit,
  getTraceabilityWithModuleData,
  FARM_MODULES
};