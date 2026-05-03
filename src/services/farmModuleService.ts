/**
 * Farm Module Service - Quản lý module nông nghiệp đa dạng
 * V5.1.0 - Converted to TypeScript - Phase 1
 * 
 * Modules:
 * - crops: Cây trồng đồng ruộng
 * - aquaculture: Thủy sản (tôm, cá)
 * - greenhouse: Nhà màng
 * - hydroponics: Thủy canh
 * - livestock: Chăn nuôi
 * - aeroponics: Khí canh
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

export interface FarmModule {
  id: string;
  name: string;
  name_en: string;
  icon: string;
  color: string;
  description: string;
  primary_table: string;
  source_type: string;
  stages: string[];
  activities: string[];
}

export interface ModuleData {
  id: string;
  module_id: string;
  farm_id: string;
  name: string;
  status: string;
  area?: number;
  area_unit?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateModuleData {
  module_id: string;
  farm_id: string;
  name: string;
  area?: number;
  area_unit?: string;
  metadata?: Record<string, any>;
  status?: string;
}

export const FARM_MODULES: Record<string, FarmModule> = {
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
    description: 'Nuôi tôm, cá, cua, ốc',
    primary_table: 'aquaculture',
    source_type: 'aquaculture',
    stages: ['giai_con', 'nuoi_1', 'nuoi_2', 'nuoi_3', 'thu_hoach'],
    activities: ['cho_an', 'thay_nuoc', 'kiem_tra', 'phong_benh', 'thu_hoach']
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Nhà màng',
    name_en: 'Greenhouse',
    icon: '🏡',
    color: '#f59e0b',
    description: 'Trồng trong nhà kính, nhà màng',
    primary_table: 'greenhouse_plantings',
    source_type: 'greenhouse',
    stages: ['gây_giong', 'chăm_soc', 'thu_hoach'],
    activities: ['tưới', 'bón_phân', 'kiểm_tra', 'điều_chỉnh_nhiệt']
  },
  hydroponics: {
    id: 'hydroponics',
    name: 'Thủy canh',
    name_en: 'Hydroponics',
    icon: '💧',
    color: '#06b6d4',
    description: 'Trồng rau thủy canh',
    primary_table: 'hydroponics_systems',
    source_type: 'hydroponics',
    stages: ['cây_giống', 'giai_đoạn_1', 'giai_đoạn_2', 'thu_hoach'],
    activities: ['điều_chỉnh_pH', 'bón_phân', 'kiểm_tra_EC', 'thu_hoach']
  },
  livestock: {
    id: 'livestock',
    name: 'Chăn nuôi',
    name_en: 'Livestock',
    icon: '🐄',
    color: '#ef4444',
    description: 'Nuôi gia súc, gia cầm',
    primary_table: 'livestock_herds',
    source_type: 'livestock',
    stages: ['giai_con', 'nuoi_grow', 'cho_sua', 'thu_hoach'],
    activities: ['cho_ăn', 'tiêm_phòng', 'vệ_sinh', 'chăm_sóc']
  }
};

export function getModules(): FarmModule[] {
  return Object.values(FARM_MODULES);
}

export function getModule(moduleId: string): FarmModule | undefined {
  return FARM_MODULES[moduleId];
}

export function createModuleInstance(data: CreateModuleData): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO farm_modules (
      id, module_id, farm_id, name, status, area, area_unit, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.module_id,
    data.farm_id,
    data.name,
    'active',
    data.area || null,
    data.area_unit || null,
    JSON.stringify(data.metadata || {}),
    now,
    now
  ]);

  logger.info(`[FarmModule] Created: ${data.module_id} instance ${id}`);
  return id;
}

export function getModuleInstances(farmId: string, moduleId?: string): ModuleData[] {
  if (moduleId) {
    return db.all('SELECT * FROM farm_modules WHERE farm_id = ? AND module_id = ?', [farmId, moduleId]) as ModuleData[];
  }
  return db.all('SELECT * FROM farm_modules WHERE farm_id = ?', [farmId]) as ModuleData[];
}

export function updateModuleInstance(instanceId: string, data: Partial<CreateModuleData>): boolean {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) { updates.push('name = ?'); values.push(data.name); }
    if (data.area !== undefined) { updates.push('area = ?'); values.push(data.area); }
    if (data.status) { updates.push('status = ?'); values.push(data.status); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(instanceId);

    db.run(`UPDATE farm_modules SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('[FarmModule] Update error:', error.message);
    return false;
  }
}

export function deleteModuleInstance(instanceId: string): boolean {
  try {
    db.run('UPDATE farm_modules SET status = ?, updated_at = ? WHERE id = ?', ['deleted', new Date().toISOString(), instanceId]);
    return true;
  } catch (error: any) {
    logger.error('[FarmModule] Delete error:', error.message);
    return false;
  }
}

export function getFarmModuleStats(farmId: string): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const [moduleId, module] of Object.entries(FARM_MODULES)) {
    const instances = db.all('SELECT COUNT(*) as count FROM farm_modules WHERE farm_id = ? AND module_id = ? AND status = ?', 
      [farmId, moduleId, 'active']) as Array<{ count: number }>;
    stats[moduleId] = instances[0]?.count || 0;
  }
  
  return stats;
}

export default {
  getModules,
  getModule,
  createModuleInstance,
  getModuleInstances,
  updateModuleInstance,
  deleteModuleInstance,
  getFarmModuleStats
};