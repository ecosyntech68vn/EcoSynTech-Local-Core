/**
 * Farm Activity Service - Quản lý hoạt động nông nghiệp
 * V5.1.0 - Converted to TypeScript - Phase 1
 * 
 * Features:
 * - Ghi nhận hoạt động nông nghiệp thủ công
 * - Tự động sync vào traceability stages
 * - Tích hợp với dashboard
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

export type ActivityType = 'spray' | 'fertilizer' | 'pruning' | 'vaccination' | 'watering' | 
  'soil_preparation' | 'seeding' | 'harvesting' | 'grading' | 'packaging' | 'cleaning' | 
  'monitoring' | 'pest_control' | 'drainage' | 'other';

export interface ActivityConfig {
  label: string;
  icon: string;
  category: string;
  stageType: string;
}

export interface FarmActivity {
  id: string;
  farm_id: string;
  module_id: string;
  module_instance_id: string;
  activity_type: ActivityType;
  description?: string;
  activity_date: string;
  worker_id?: string;
  quantity?: number;
  unit?: string;
  product_used?: string;
  notes?: string;
  created_at: string;
}

export interface CreateActivityData {
  farm_id: string;
  module_id: string;
  module_instance_id: string;
  activity_type: ActivityType;
  description?: string;
  activity_date?: string;
  worker_id?: string;
  quantity?: number;
  unit?: string;
  product_used?: string;
  notes?: string;
}

export const ACTIVITY_TYPES: Record<string, ActivityConfig> = {
  spray: { label: 'Phun thuốc', icon: '💧', category: 'protection', stageType: 'plant_protection' },
  fertilizer: { label: 'Bón phân', icon: '🌱', category: 'nutrition', stageType: 'fertilizing' },
  pruning: { label: 'Cắt tỉa', icon: '✂️', category: 'maintenance', stageType: 'pruning' },
  vaccination: { label: 'Tiêm phòng', icon: '💉', category: 'health', stageType: 'health_care' },
  watering: { label: 'Tưới nước', icon: '🚿', category: 'irrigation', stageType: 'irrigation' },
  soil_preparation: { label: 'Làm đất', icon: '🪴', category: 'preparation', stageType: 'preparation' },
  seeding: { label: 'Gieo trồng', icon: '🌱', category: 'planting', stageType: 'seeding' },
  harvesting: { label: 'Thu hoạch', icon: '🌾', category: 'harvest', stageType: 'harvesting' },
  grading: { label: 'Phân loại', icon: '📊', category: 'post_harvest', stageType: 'processing' },
  packaging: { label: 'Đóng gói', icon: '📦', category: 'post_harvest', stageType: 'packaging' },
  cleaning: { label: 'Vệ sinh', icon: '🧹', category: 'maintenance', stageType: 'maintenance' },
  monitoring: { label: 'Giám sát', icon: '👁️', category: 'monitoring', stageType: 'monitoring' },
  pest_control: { label: 'Phòng trừ sâu bệnh', icon: '🐛', category: 'protection', stageType: 'pest_control' },
  drainage: { label: 'Thoát nước', icon: '🌊', category: 'irrigation', stageType: 'drainage' },
  other: { label: 'Khác', icon: '📝', category: 'other', stageType: 'other' }
};

export const FERTILIZER_TYPES: Record<string, { label: string; unit: string }> = {
  npk: { label: 'NPK', unit: 'kg' },
  urea: { label: 'Urea', unit: 'kg' },
  dap: { label: 'DAP', unit: 'kg' },
  kali: { label: 'Kali', unit: 'kg' },
  organic: { label: 'Phân hữu cơ', unit: 'kg' },
  compost: { label: 'Compost', unit: 'kg' }
};

export function createActivity(data: CreateActivityData): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO farm_activities (
      id, farm_id, module_id, module_instance_id, activity_type,
      description, activity_date, worker_id, quantity, unit, product_used, notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.farm_id,
    data.module_id,
    data.module_instance_id,
    data.activity_type,
    data.description || null,
    data.activity_date || now.split('T')[0],
    data.worker_id || null,
    data.quantity || null,
    data.unit || null,
    data.product_used || null,
    data.notes || null,
    now
  ]);

  logger.info(`[Activity] Created: ${data.activity_type} for ${data.module_instance_id}`);
  return id;
}

export function getActivitiesByInstance(instanceId: string): FarmActivity[] {
  return db.all('SELECT * FROM farm_activities WHERE module_instance_id = ? ORDER BY activity_date DESC', [instanceId]) as FarmActivity[];
}

export function getActivitiesByDate(farmId: string, date: string): FarmActivity[] {
  return db.all('SELECT * FROM farm_activities WHERE farm_id = ? AND activity_date = ?', [farmId, date]) as FarmActivity[];
}

export function getActivitiesByType(farmId: string, activityType: ActivityType): FarmActivity[] {
  return db.all('SELECT * FROM farm_activities WHERE farm_id = ? AND activity_type = ? ORDER BY activity_date DESC', [farmId, activityType]) as FarmActivity[];
}

export function deleteActivity(activityId: string): boolean {
  try {
    db.run('DELETE FROM farm_activities WHERE id = ?', [activityId]);
    return true;
  } catch (error: any) {
    logger.error('[Activity] Delete error:', error.message);
    return false;
  }
}

export function getActivityStats(farmId: string): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const type of Object.keys(ACTIVITY_TYPES)) {
    const count = db.all('SELECT COUNT(*) as count FROM farm_activities WHERE farm_id = ? AND activity_type = ?', 
      [farmId, type]) as Array<{ count: number }>;
    stats[type] = count[0]?.count || 0;
  }
  
  return stats;
}

export default {
  createActivity,
  getActivitiesByInstance,
  getActivitiesByDate,
  getActivitiesByType,
  deleteActivity,
  getActivityStats
};