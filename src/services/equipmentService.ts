/**
 * Equipment Service - Quản lý máy móc thiết bị
 * V5.1.0 - Converted to TypeScript - Phase 1
 * 
 * 5S Framework: Sort, Set in Order, Shine, Standardize, Sustain
 * PDCA: Plan, Do, Check, Act
 * 
 * Features:
 * - Equipment inventory management
 * - Preventive maintenance scheduling
 * - Usage tracking and assignment
 * - Depreciation calculation
 * - Cost tracking and analytics
 * - AI-powered maintenance prediction
 * - QR code traceability
 * - Integration with labor and crop modules
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

export interface EquipmentTypeConfig {
  label: string;
  icon: string;
  category: string;
}

export interface EquipmentStatusConfig {
  label: string;
  color: string;
}

export interface MaintenanceTypeConfig {
  label: string;
  icon: string;
}

export interface Equipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
  farm_id?: string;
  status: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  location?: string;
  assigned_to?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  qr_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  description: string;
  cost?: number;
  performed_by?: string;
  performed_date: string;
  next_due_date?: string;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  equipment_id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  hours_used?: number;
  location?: string;
  purpose?: string;
  created_at: string;
}

export interface CreateEquipmentData {
  equipment_name: string;
  equipment_type: string;
  farm_id?: string;
  purchase_date?: string;
  purchase_price?: number;
  location?: string;
  notes?: string;
}

export interface CreateMaintenanceData {
  equipment_id: string;
  maintenance_type: string;
  description: string;
  cost?: number;
  performed_by?: string;
  performed_date?: string;
  next_due_date?: string;
}

export const EQUIPMENT_TYPES: Record<string, EquipmentTypeConfig> = {
  tractor: { label: 'Máy kéo', icon: '🚜', category: 'vehicle' },
  harvester: { label: 'Máy gặt đập', icon: '🌾', category: 'vehicle' },
  sprayer: { label: 'Máy phun', icon: '💨', category: 'machine' },
  irrigation_pump: { label: 'Máy bơm nước', icon: '💧', category: 'machine' },
  seeder: { label: 'Máy gieo hạt', icon: '🌱', category: 'machine' },
  plow: { label: 'Máy cày', icon: '翻', category: 'machine' },
  trailer: { label: 'Xe moóc', icon: '🚛', category: 'vehicle' },
  truck: { label: 'Xe tải', icon: '🛻', category: 'vehicle' },
  generator: { label: 'Máy phát điện', icon: '⚡', category: 'power' },
  tools: { label: 'Dụng cụ', icon: '🔧', category: 'tools' },
  sensor: { label: 'Cảm biến', icon: '📡', category: 'iot' },
  drone: { label: 'Máy bay nông nghiệp', icon: '🛸', category: 'iot' }
};

export const EQUIPMENT_STATUS: Record<string, EquipmentStatusConfig> = {
  active: { label: 'Hoạt động', color: 'green' },
  under_maintenance: { label: 'Đang bảo trì', color: 'orange' },
  broken: { label: 'Hỏng', color: 'red' },
  retired: { label: 'Ngưng sử dụng', color: 'gray' },
  available: { label: 'Sẵn sàng', color: 'blue' },
  in_use: { label: 'Đang sử dụng', color: 'purple' }
};

export const MAINTENANCE_TYPES: Record<string, MaintenanceTypeConfig> = {
  preventive: { label: 'Bảo trì phòng ngừa', icon: '🛡️' },
  corrective: { label: 'Sửa chữa', icon: '🔧' },
  predictive: { label: 'Bảo trì dự đoán', icon: '🤖' },
  inspection: { label: 'Kiểm tra', icon: '🔍' },
  oil_change: { label: 'Thay dầu', icon: '🛢️' },
  calibration: { label: 'Hiệu chuẩn', icon: '📏' }
};

export function createEquipment(data: CreateEquipmentData): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  const qrCode = `EQP-${id.substring(0, 8).toUpperCase()}`;

  db.run(`
    INSERT INTO equipment (
      id, equipment_name, equipment_type, farm_id, status, purchase_date,
      purchase_price, current_value, location, qr_code, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.equipment_name,
    data.equipment_type,
    data.farm_id || null,
    'available',
    data.purchase_date || null,
    data.purchase_price || null,
    data.purchase_price || null,
    data.location || null,
    qrCode,
    data.notes || null,
    now,
    now
  ]);

  logger.info(`Tạo thiết bị mới: ${data.equipment_name} (${id})`);
  return id;
}

export function getEquipment(equipmentId: string): Equipment | null {
  return db.get('SELECT * FROM equipment WHERE id = ?', [equipmentId]) as Equipment | null;
}

export function getEquipmentByFarm(farmId: string): Equipment[] {
  return db.all('SELECT * FROM equipment WHERE farm_id = ? ORDER BY equipment_type, equipment_name', [farmId]) as Equipment[];
}

export function getEquipmentByType(farmId: string, equipmentType: string): Equipment[] {
  return db.all('SELECT * FROM equipment WHERE farm_id = ? AND equipment_type = ?', [farmId, equipmentType]) as Equipment[];
}

export function updateEquipment(equipmentId: string, data: Partial<CreateEquipmentData & { status: string; current_value: number }>): boolean {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.equipment_name !== undefined) { updates.push('equipment_name = ?'); values.push(data.equipment_name); }
    if (data.equipment_type !== undefined) { updates.push('equipment_type = ?'); values.push(data.equipment_type); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.current_value !== undefined) { updates.push('current_value = ?'); values.push(data.current_value); }
    if (data.location !== undefined) { updates.push('location = ?'); values.push(data.location); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(equipmentId);

    db.run(`UPDATE equipment SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('Update equipment error:', error.message);
    return false;
  }
}

export function deleteEquipment(equipmentId: string): boolean {
  try {
    db.run('DELETE FROM equipment_maintenance WHERE equipment_id = ?', [equipmentId]);
    db.run('DELETE FROM equipment_usage WHERE equipment_id = ?', [equipmentId]);
    db.run('DELETE FROM equipment WHERE id = ?', [equipmentId]);
    return true;
  } catch (error: any) {
    logger.error('Delete equipment error:', error.message);
    return false;
  }
}

export function recordMaintenance(data: CreateMaintenanceData): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  const performedDate = data.performed_date || now.split('T')[0];

  db.run(`
    INSERT INTO equipment_maintenance (
      id, equipment_id, maintenance_type, description, cost,
      performed_by, performed_date, next_due_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.equipment_id,
    data.maintenance_type,
    data.description,
    data.cost || null,
    data.performed_by || null,
    performedDate,
    data.next_due_date || null,
    now
  ]);

  const equipment = getEquipment(data.equipment_id);
  if (equipment) {
    db.run('UPDATE equipment SET last_maintenance = ?, next_maintenance = ?, status = ?, updated_at = ? WHERE id = ?',
      [performedDate, data.next_due_date || null, 'available', new Date().toISOString(), data.equipment_id]);
  }

  logger.info(`Ghi nhận bảo trì cho thiết bị: ${data.equipment_id}`);
  return id;
}

export function getMaintenanceHistory(equipmentId: string): MaintenanceRecord[] {
  return db.all('SELECT * FROM equipment_maintenance WHERE equipment_id = ? ORDER BY performed_date DESC', [equipmentId]) as MaintenanceRecord[];
}

export function getUpcomingMaintenance(farmId: string): (Equipment & { next_maintenance: string })[] {
  return db.all(`
    SELECT e.*, e.next_maintenance 
    FROM equipment e 
    WHERE e.farm_id = ? AND e.next_maintenance IS NOT NULL
    AND e.next_maintenance <= date('now', '+7 days')
    ORDER BY e.next_maintenance
  `, [farmId]) as (Equipment & { next_maintenance: string })[];
}

export function startUsage(equipmentId: string, userId?: string, purpose?: string): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO equipment_usage (id, equipment_id, user_id, start_time, purpose, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, equipmentId, userId || null, now, purpose || null, now]);

  db.run('UPDATE equipment SET status = ?, updated_at = ? WHERE id = ?', ['in_use', new Date().toISOString(), equipmentId]);

  return id;
}

export function endUsage(usageId: string): boolean {
  try {
    const usage = db.get('SELECT * FROM equipment_usage WHERE id = ?', [usageId]) as UsageRecord | undefined;
    if (!usage) return false;

    const endTime = new Date().toISOString();
    const startTime = new Date(usage.start_time);
    const hoursUsed = (new Date(endTime).getTime() - startTime.getTime()) / 3600000;

    db.run('UPDATE equipment_usage SET end_time = ?, hours_used = ? WHERE id = ?', 
      [endTime, hoursUsed.toFixed(2), usageId]);

    if (usage.equipment_id) {
      db.run('UPDATE equipment SET status = ?, updated_at = ? WHERE id = ?', ['available', new Date().toISOString(), usage.equipment_id]);
    }

    return true;
  } catch (error: any) {
    logger.error('End usage error:', error.message);
    return false;
  }
}

export function getEquipmentStats(farmId: string): {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalMaintenanceCost: number;
} {
  const equipment = getEquipmentByFarm(farmId);
  
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalMaintenanceCost = 0;

  for (const eq of equipment) {
    byStatus[eq.status] = (byStatus[eq.status] || 0) + 1;
    byType[eq.equipment_type] = (byType[eq.equipment_type] || 0) + 1;
  }

  const maintenance = db.all('SELECT SUM(cost) as total FROM equipment_maintenance em JOIN equipment e ON em.equipment_id = e.id WHERE e.farm_id = ?', [farmId]) as Array<{ total: number }>;
  if (maintenance[0]?.total) {
    totalMaintenanceCost = maintenance[0].total;
  }

  return {
    total: equipment.length,
    byStatus,
    byType,
    totalMaintenanceCost
  };
}

export function calculateDepreciation(equipmentId: string, method: 'straight-line' | 'declining' = 'straight-line'): number | null {
  const equipment = getEquipment(equipmentId);
  if (!equipment || !equipment.purchase_price) return null;

  const purchaseDate = equipment.purchase_date ? new Date(equipment.purchase_date) : new Date();
  const yearsUsed = (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const usefulLife = 10;
  const salvageValue = equipment.purchase_price * 0.1;

  if (method === 'straight-line') {
    const annualDepreciation = (equipment.purchase_price - salvageValue) / usefulLife;
    return Math.max(0, equipment.purchase_price - (annualDepreciation * yearsUsed));
  } else {
    const rate = 2 / usefulLife;
    return Math.max(salvageValue, equipment.purchase_price * Math.pow(1 - rate, yearsUsed));
  }
}

export default {
  createEquipment,
  getEquipment,
  getEquipmentByFarm,
  getEquipmentByType,
  updateEquipment,
  deleteEquipment,
  recordMaintenance,
  getMaintenanceHistory,
  getUpcomingMaintenance,
  startUsage,
  endUsage,
  getEquipmentStats,
  calculateDepreciation
};