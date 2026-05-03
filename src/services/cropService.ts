/**
 * Crop Cycle Service - Quản lý chu kỳ cây trồng
 * V5.1.0 - Converted to TypeScript - Phase 1
 * 
 * Features:
 * - Quản lý lô trồng (crop plantings)
 * - Theo dõi giai đoạn cây trồng
 * - Tính toán KC tự động theo giai đoạn
 * - Dự báo ngày thu hoạch
 * - Tưới tiêu theo giai đoạn
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import batchService from './batchService';

export interface CropStageConfig {
  name: string;
  code: string;
  kcMin: number;
  kcMax: number;
  days: number;
}

export interface CropKCValue {
  kc: number;
  waterNeed: 'low' | 'medium' | 'high';
}

export interface CropPlanting {
  id: string;
  farm_id?: string;
  crop_id: string;
  area?: number;
  area_unit?: string;
  planting_date: string;
  expected_harvest_date?: string;
  current_stage: string;
  status: string;
  yield_expected?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Crop {
  id: string;
  name: string;
  name_vi?: string;
  category?: string;
  kc_initial?: number;
  kc_mid?: number;
  kc_end?: number;
  growth_days?: number;
  created_at: string;
}

export interface CreatePlantingData {
  farmId?: string;
  cropId: string;
  area?: number;
  areaUnit?: string;
  plantingDate?: string;
  expectedHarvestDate?: string;
  yieldExpected?: number;
  notes?: string;
}

export interface UpdatePlantingData {
  area?: number;
  current_stage?: string;
  status?: string;
  expected_harvest_date?: string;
  yield_expected?: number;
  notes?: string;
}

export const CROP_STAGES: Record<string, CropStageConfig> = {
  GIEG_HAT: { name: 'Gieo hạt', code: 'gieo_hat', kcMin: 0.3, kcMax: 0.4, days: 20 },
  CAY_CON: { name: 'Cây con', code: 'cay_con', kcMin: 0.4, kcMax: 0.8, days: 25 },
  SINH_TRUONG: { name: 'Sinh trưởng', code: 'sinh_truong', kcMin: 0.8, kcMax: 1.1, days: 30 },
  RA_HOA: { name: 'Ra hoa - Kết quả', code: 'ra_hoa', kcMin: 1.1, kcMax: 1.0, days: 30 },
  THU_HOACH: { name: 'Chín - Thu hoạch', code: 'thu_hoach', kcMin: 1.0, kcMax: 0.7, days: 15 }
};

export const CROP_KC_VALUES: Record<string, CropKCValue> = {
  gieo_hat: { kc: 0.35, waterNeed: 'low' },
  cay_con: { kc: 0.5, waterNeed: 'medium' },
  sinh_truong: { kc: 1.0, waterNeed: 'high' },
  ra_hoa: { kc: 1.1, waterNeed: 'high' },
  thu_hoach: { kc: 0.8, waterNeed: 'medium' }
};

export function createPlanting(data: CreatePlantingData): string {
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
  
  logger.info(`Tạo lô trồng mới: ${id}, crop_id: ${data.cropId}`);
  
  try {
    batchService.createBatchFromPlanting(id);
  } catch (e) {
    logger.warn('Không tạo được traceability batch:', (e as Error).message);
  }
  
  return id;
}

export function getPlanting(plantingId: string): CropPlanting | null {
  return db.get('SELECT * FROM crop_plantings WHERE id = ?', [plantingId]) as CropPlanting | null;
}

export function getPlantingsByFarm(farmId: string): CropPlanting[] {
  return db.all('SELECT * FROM crop_plantings WHERE farm_id = ? ORDER BY planting_date DESC', [farmId]) as CropPlanting[];
}

export function getPlantingsByStatus(farmId: string, status: string): CropPlanting[] {
  return db.all('SELECT * FROM crop_plantings WHERE farm_id = ? AND status = ?', [farmId, status]) as CropPlanting[];
}

export function updatePlanting(plantingId: string, data: UpdatePlantingData): boolean {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.area !== undefined) { updates.push('area = ?'); values.push(data.area); }
    if (data.current_stage !== undefined) { updates.push('current_stage = ?'); values.push(data.current_stage); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.expected_harvest_date !== undefined) { updates.push('expected_harvest_date = ?'); values.push(data.expected_harvest_date); }
    if (data.yield_expected !== undefined) { updates.push('yield_expected = ?'); values.push(data.yield_expected); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(plantingId);

    db.run(`UPDATE crop_plantings SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('Update planting error:', error.message);
    return false;
  }
}

export function deletePlanting(plantingId: string): boolean {
  try {
    db.run('DELETE FROM crop_plantings WHERE id = ?', [plantingId]);
    return true;
  } catch (error: any) {
    logger.error('Delete planting error:', error.message);
    return false;
  }
}

export function getCrop(cropId: string): Crop | null {
  return db.get('SELECT * FROM crops WHERE id = ?', [cropId]) as Crop | null;
}

export function getCropsByCategory(category: string): Crop[] {
  return db.all('SELECT * FROM crops WHERE category = ?', [category]) as Crop[];
}

export function getAllCrops(): Crop[] {
  return db.all('SELECT * FROM crops ORDER BY category, name') as Crop[];
}

export function getCurrentKC(plantingId: string): number {
  const planting = getPlanting(plantingId);
  if (!planting) return 0.5;

  const stage = planting.current_stage || 'gieo_hat';
  const kcInfo = CROP_KC_VALUES[stage];
  
  if (kcInfo) return kcInfo.kc;
  
  const crop = getCrop(planting.crop_id);
  if (!crop) return 0.5;
  
  return crop.kc_mid || 0.5;
}

export function getWaterNeed(plantingId: string): 'low' | 'medium' | 'high' {
  const planting = getPlanting(plantingId);
  if (!planting) return 'medium';

  const stage = planting.current_stage || 'gieo_hat';
  const kcInfo = CROP_KC_VALUES[stage];
  
  return kcInfo?.waterNeed || 'medium';
}

export function calculateExpectedYield(plantingId: string): number | null {
  const planting = getPlanting(plantingId);
  if (!planting || !planting.yield_expected) return null;

  const crop = getCrop(planting.crop_id);
  if (!crop) return planting.yield_expected;

  return planting.yield_expected * (crop.growth_days || 100) / 100;
}

export function updateStage(plantingId: string, newStage: string): boolean {
  const validStages = Object.keys(CROP_STAGES);
  if (!validStages.includes(newStage)) {
    logger.error('Invalid stage:', newStage);
    return false;
  }

  return updatePlanting(plantingId, { current_stage: newStage });
}

export function getPlantingsNeedingWater(farmId: string): CropPlanting[] {
  const plantings = getPlantingsByFarm(farmId);
  return plantings.filter(p => p.status === 'growing');
}

export function getCropStats(farmId: string): {
  totalPlantings: number;
  active: number;
  harvested: number;
  expectedYield: number;
} {
  const plantings = getPlantingsByFarm(farmId);
  
  return {
    totalPlantings: plantings.length,
    active: plantings.filter(p => p.status === 'growing').length,
    harvested: plantings.filter(p => p.status === 'harvested').length,
    expectedYield: plantings.reduce((sum, p) => sum + (p.yield_expected || 0), 0)
  };
}

export default {
  createPlanting,
  getPlanting,
  getPlantingsByFarm,
  getPlantingsByStatus,
  updatePlanting,
  deletePlanting,
  getCrop,
  getCropsByCategory,
  getAllCrops,
  getCurrentKC,
  getWaterNeed,
  calculateExpectedYield,
  updateStage,
  getPlantingsNeedingWater,
  getCropStats
};