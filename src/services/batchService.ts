/**
 * Batch Service - Tích hợp truy xuất nguồn gốc với cây trồng và thủy sản
 * V5.1.0 - Kết nối dữ liệu gieo trồng/nuôi nấng với traceability và supply chain
 * Converted to TypeScript - Phase 1
 * 
 * Features:
 * - Tự động tạo traceability batch khi khởi động vụ mới
 * - Đồng bộ dữ liệu timeline từ crop/aquaculture sang traceability
 * - Liên kết với supply chain khi thu hoạch
 * - Tạo QR code với dữ liệu đầy đủ từ chu kỳ nuôi trồng
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import db from '../config/database';

export interface ProductTypeConfig {
  label: string;
  icon: string;
}

export interface StageTypeConfig {
  label: string;
  order: number;
}

export interface BatchResult {
  existing?: boolean;
  batch_id: string;
  batch_code?: string;
}

export interface TraceabilityBatch {
  id: string;
  batch_code: string;
  product_name: string;
  product_type: string;
  quantity: number;
  unit: string;
  farm_name: string;
  zone: string;
  seed_variety: string;
  planting_date: string;
  expected_harvest: string | null;
  status: string;
  metadata: string;
  source_type: string;
  source_planting_id?: string;
  source_aquaculture_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CropPlanting {
  id: string;
  crop_id: string;
  crop_name?: string;
  crop_name_vi?: string;
  name?: string;
  name_vi?: string;
  category: string;
  area: number;
  area_unit: string;
  zone: string;
  planting_date: string;
  expected_harvest_date: string;
  kc_initial?: number;
  kc_mid?: number;
  kc_end?: number;
}

export interface Aquaculture {
  id: string;
  name: string;
  name_vi: string;
  category: string;
  growth_days?: number;
}

export const PRODUCT_TYPES: Record<string, ProductTypeConfig> = {
  vegetable: { label: 'Rau củ', icon: '🥬' },
  fruit: { label: 'Trái cây', icon: '🍎' },
  herb: { label: 'Thảo dược', icon: '🌿' },
  grain: { label: 'Ngũ cốc', icon: '🌾' },
  aquaculture: { label: 'Thủy sản', icon: '🐟' },
  livestock: { label: 'Chăn nuôi', icon: '🐄' }
};

export const STAGE_TYPES: Record<string, StageTypeConfig> = {
  preparation: { label: 'Chuẩn bị', order: 1 },
  seeding: { label: 'Gieo hạt/Con giống', order: 2 },
  nursing: { label: 'Nuôi ươm/Cây con', order: 3 },
  growing: { label: 'Sinh trưởng', order: 4 },
  flowering: { label: 'Ra hoa/Phát triển', order: 5 },
  fruiting: { label: 'Kết quả/Nuôi trưởng', order: 6 },
  harvesting: { label: 'Thu hoạch', order: 7 },
  processing: { label: 'Chế biến', order: 8 },
  packaging: { label: 'Đóng gói', order: 9 },
  storage: { label: 'Lưu trữ', order: 10 },
  transport: { label: 'Vận chuyển', order: 11 }
};

function generateBatchCode(productName: string): string {
  const prefix = productName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function mapCategoryToProductType(category: string): string {
  const mapping: Record<string, string> = {
    vegetable: 'vegetable',
    fruit: 'fruit',
    herb: 'herb',
    grain: 'grain',
    aquaculture: 'aquaculture',
    livestock: 'livestock'
  };
  return mapping[category?.toLowerCase()] || 'vegetable';
}

function createInitialStages(batchId: string, sourceType: string, sourceData: any): void {
  const stages = Object.entries(STAGE_TYPES).map(([key, value]) => ({
    batch_id: batchId,
    stage_type: key,
    stage_name: value.label,
    stage_order: value.order,
    status: 'pending' as const,
    notes: '',
    source_type: sourceType,
    created_at: new Date().toISOString()
  }));

  for (const stage of stages) {
    db.run(`
      INSERT INTO traceability_stages (
        id, batch_id, stage_type, stage_name, stage_order, status, notes,
        source_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuidv4(),
      stage.batch_id,
      stage.stage_type,
      stage.stage_name,
      stage.stage_order,
      stage.status,
      stage.notes,
      stage.source_type,
      stage.created_at
    ]);
  }
}

export function createBatchFromPlanting(plantingId: string): BatchResult {
  const planting = db.get(`
    SELECT cp.*, c.name as crop_name, c.name_vi, c.category, c.kc_initial, c.kc_mid, c.kc_end
    FROM crop_plantings cp 
    LEFT JOIN crops c ON cp.crop_id = c.id
    WHERE cp.id = ?
  `, [plantingId]) as CropPlanting | undefined;

  if (!planting) {
    throw new Error('Không tìm thấy lô trồng');
  }

  const existingBatch = db.get(
    'SELECT id FROM traceability_batches WHERE source_planting_id = ?',
    [plantingId]
  ) as { id: string } | undefined;

  if (existingBatch) {
    return { existing: true, batch_id: existingBatch.id };
  }

  const batchCode = generateBatchCode(planting.crop_name || 'CROP');
  const batchId = uuidv4();
  const now = new Date().toISOString();

  const productType = mapCategoryToProductType(planting.category);

  db.run(`
    INSERT INTO traceability_batches (
      id, batch_code, product_name, product_type, quantity, unit,
      farm_name, zone, seed_variety, planting_date, expected_harvest,
      status, metadata, source_type, source_planting_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId, batchCode, (planting as any).crop_name_vi || planting.crop_name || 'Cây trồng',
    productType, planting.area || 0, planting.area_unit || 'm2',
    process.env.FARM_NAME || 'EcoSynTech Farm', planting.zone || '',
    planting.crop_name || '', planting.planting_date, planting.expected_harvest_date,
    'active', JSON.stringify({
      crop_id: planting.crop_id,
      category: planting.category,
      kc_initial: planting.kc_initial,
      kc_mid: planting.kc_mid,
      kc_end: planting.kc_end
    }), 'crop', plantingId, now, now
  ]);

  createInitialStages(batchId, 'crop', planting);

  logger.info(`Tạo traceability batch từ lô trồng: ${batchCode}, planting: ${plantingId}`);

  return { batch_id: batchId, batch_code: batchCode };
}

export function createBatchFromAquaculture(aquacultureId: string): BatchResult {
  const aquaculture = db.get(`
    SELECT a.*, ao.name as species_name, ao.name_vi, ao.category, ao.growth_days
    FROM aquaculture_spawning a
    LEFT JOIN aquaculture ao ON a.species_id = ao.id
    WHERE a.id = ?
  `, [aquacultureId]) as (Aquaculture & any) | undefined;

  if (!aquaculture) {
    const aquaDirect = db.get(`
      SELECT * FROM aquaculture WHERE id = ?
    `, [aquacultureId]) as Aquaculture | undefined;
    
    if (!aquaDirect) {
      throw new Error('Không tìm thấy thông tin thủy sản');
    }

    const batchCode = generateBatchCode(aquaDirect.name_vi || 'AQUA');
    const batchId = uuidv4();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO traceability_batches (
        id, batch_code, product_name, product_type, quantity, unit,
        farm_name, zone, seed_variety, planting_date, expected_harvest,
        status, metadata, source_type, source_aquaculture_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batchId, batchCode, aquaDirect.name_vi || aquaDirect.name,
      'aquaculture', 0, 'con',
      process.env.FARM_NAME || 'EcoSynTech Farm', '', aquaDirect.name,
      now.split('T')[0], null,
      'active', JSON.stringify({
        species_id: aquaDirect.id,
        category: aquaDirect.category,
        growth_days: aquaDirect.growth_days
      }), 'aquaculture', aquacultureId, now, now
    ]);

    return { batch_id: batchId, batch_code: batchCode };
  }

  const existingBatch = db.get(
    'SELECT id FROM traceability_batches WHERE source_aquaculture_id = ?',
    [aquacultureId]
  ) as { id: string } | undefined;

  if (existingBatch) {
    return { existing: true, batch_id: existingBatch.id };
  }

  const batchCode = generateBatchCode(aquaculture.name_vi || 'AQUA');
  const batchId = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO traceability_batches (
      id, batch_code, product_name, product_type, quantity, unit,
      farm_name, zone, seed_variety, planting_date, expected_harvest,
      status, metadata, source_type, source_aquaculture_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId, batchCode, aquaculture.name_vi || aquaculture.name,
    'aquaculture', aquaculture.initial_quantity || 0, 'con',
    process.env.FARM_NAME || 'EcoSynTech Farm', aquaculture.pond || '',
    aquaculture.name_vi || '', aquaculture.spawning_date, aquaculture.expected_harvest,
    'active', JSON.stringify({
      species_id: aquaculture.species_id,
      category: aquaculture.category,
      growth_days: aquaculture.growth_days
    }), 'aquaculture', aquacultureId, now, now
  ]);

  createInitialStages(batchId, 'aquaculture', aquaculture);

  logger.info(`Tạo traceability batch từ aquaculture: ${batchCode}, aquaculture: ${aquacultureId}`);

  return { batch_id: batchId, batch_code: batchCode };
}

export function getBatchById(batchId: string): TraceabilityBatch | null {
  return db.get('SELECT * FROM traceability_batches WHERE id = ?', [batchId]) as TraceabilityBatch | null;
}

export function getBatchesByFarm(farmId: string): TraceabilityBatch[] {
  return db.all('SELECT * FROM traceability_batches WHERE farm_id = ? ORDER BY created_at DESC', [farmId]) as TraceabilityBatch[];
}

export function updateBatchStatus(batchId: string, status: string): boolean {
  try {
    db.run('UPDATE traceability_batches SET status = ?, updated_at = ? WHERE id = ?', 
      [status, new Date().toISOString(), batchId]);
    return true;
  } catch (error: any) {
    logger.error('Update batch status error:', error.message);
    return false;
  }
}

export function deleteBatch(batchId: string): boolean {
  try {
    db.run('DELETE FROM traceability_stages WHERE batch_id = ?', [batchId]);
    db.run('DELETE FROM traceability_batches WHERE id = ?', [batchId]);
    return true;
  } catch (error: any) {
    logger.error('Delete batch error:', error.message);
    return false;
  }
}

export function syncTimelineToTraceability(plantingId: string): { success: boolean; error?: string } {
  try {
    const planting = db.get('SELECT * FROM crop_plantings WHERE id = ?', [plantingId]) as CropPlanting | undefined;
    if (!planting) {
      return { success: false, error: 'Planting not found' };
    }

    const batch = db.get('SELECT * FROM traceability_batches WHERE source_planting_id = ?', [plantingId]) as TraceabilityBatch | undefined;
    if (!batch) {
      return { success: false, error: 'Batch not found' };
    }

    if (planting.planting_date) {
      db.run('UPDATE traceability_batches SET planting_date = ?, updated_at = ? WHERE id = ?',
        [planting.planting_date, new Date().toISOString(), batch.id]);
    }

    if (planting.expected_harvest_date) {
      db.run('UPDATE traceability_batches SET expected_harvest = ?, updated_at = ? WHERE id = ?',
        [planting.expected_harvest_date, new Date().toISOString(), batch.id]);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export default {
  createBatchFromPlanting,
  createBatchFromAquaculture,
  getBatchById,
  getBatchesByFarm,
  updateBatchStatus,
  deleteBatch,
  syncTimelineToTraceability
};