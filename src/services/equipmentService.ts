/**
 * Equipment Service - Quản lý máy móc thiết bị
 * V5.1.0 - Smart Equipment Management with AI Predictions
 */

import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, getDatabase } from '../config/database';
import logger from '../config/logger';

const db = getDatabase();

interface EquipmentTypeConfig {
  label: string;
  icon: string;
  category: string;
}

interface EquipmentStatusConfig {
  label: string;
  color: string;
}

interface MaintenanceTypeConfig {
  label: string;
  priority: string;
  estimatedHours: number;
}

const EQUIPMENT_TYPE_LIST: Record<string, EquipmentTypeConfig> = {
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

const EQUIPMENT_STATUS_MAP: Record<string, EquipmentStatusConfig> = {
  active: { label: 'Hoạt động', color: 'green' },
  under_maintenance: { label: 'Đang bảo trì', color: 'orange' },
  broken: { label: 'Hỏng', color: 'red' },
  retired: { label: 'Ngưng sử dụng', color: 'gray' },
  available: { label: 'Sẵn sàng', color: 'blue' },
  in_use: { label: 'Đang sử dụng', color: 'purple' }
};

const MAINTENANCE_TYPE_LIST: Record<string, MaintenanceTypeConfig> = {
  preventive: { label: 'Bảo trì phòng ngừa', priority: 'medium', estimatedHours: 2 },
  corrective: { label: 'Sửa chữa khắc phục', priority: 'high', estimatedHours: 4 },
  emergency: { label: 'Khẩn cấp', priority: 'critical', estimatedHours: 1 },
  seasonal: { label: 'Bảo trì theo mùa', priority: 'low', estimatedHours: 8 }
};

interface EquipmentData {
  name: string;
  type: string;
  farm_id?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  status?: string;
  location?: string;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  farm_id: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: number;
  status: string;
  location: string;
  created_at: string;
}

function createEquipment(data: EquipmentData): Equipment {
  const id = uuidv4();
  const now = new Date().toISOString();
  const today = now.split('T')[0] || '2024-01-01';

  const values = [
    id,
    data.name,
    data.type,
    data.farm_id || 'default',
    data.serial_number || `SN-${Date.now().toString(36).toUpperCase()}`,
    data.purchase_date || now.split('T')[0],
    data.purchase_price || 0,
    data.status || 'active',
    data.location || '',
    now,
    now
  ];

  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run(
      `INSERT INTO equipment (id, name, type, farm_id, serial_number, purchase_date, purchase_price, status, location, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );

    return {
      id,
      name: data.name,
      type: data.type,
      farm_id: data.farm_id || 'default',
      serial_number: data.serial_number ?? `SN-${Date.now().toString(36).toUpperCase()}`,
      purchase_date: data.purchase_date ?? today,
      purchase_price: data.purchase_price || 0,
      status: data.status || 'active',
      location: data.location || '',
      created_at: now
    };
  } catch (error) {
    logger.error('[Equipment] Create error:', error);
    throw error;
  }
}

function getEquipment(farmId?: string, options?: { type?: string; status?: string }): Equipment[] {
  let query = 'SELECT * FROM equipment';
  const params: unknown[] = [];

  if (farmId || options?.type || options?.status) {
    const conditions: string[] = [];
    if (farmId) {
      conditions.push('farm_id = ?');
      params.push(farmId);
    }
    if (options?.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }
    if (options?.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  return getAll(query, params) as Equipment[];
}

function getEquipmentById(id: string): Equipment | null {
  const result = getOne('SELECT * FROM equipment WHERE id = ?', [id]);
  return result as Equipment | null;
}

function updateEquipment(id: string, updates: Partial<EquipmentData>): Equipment | null {
  const existing = getEquipmentById(id);
  if (!existing) return null;

  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return existing;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f as keyof EquipmentData]);

  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run(`UPDATE equipment SET ${setClause}, updated_at = datetime("now") WHERE id = ?`, [...values, id]);
    return getEquipmentById(id);
  } catch (error) {
    logger.error('[Equipment] Update error:', error);
    return null;
  }
}

function deleteEquipment(id: string): boolean {
  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run('DELETE FROM equipment WHERE id = ?', [id]);
    return true;
  } catch (error) {
    logger.error('[Equipment] Delete error:', error);
    return false;
  }
}

function calculateDepreciation(equipmentId: string): number {
  const equipment = getEquipmentById(equipmentId);
  if (!equipment) return 0;

  const purchasePrice = equipment.purchase_price || 0;
  const purchaseDate = new Date(equipment.purchase_date || new Date().toISOString());
  const years = (Date.now() - purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
  
  const depreciationRate = 0.15;
  const depreciatedValue = purchasePrice * Math.pow(1 - depreciationRate, Math.floor(years));
  
  return Math.max(0, Math.round(depreciatedValue));
}

export {
  createEquipment,
  getEquipment,
  getEquipmentById,
  updateEquipment,
  deleteEquipment,
  calculateDepreciation,
  EQUIPMENT_TYPE_LIST as EQUIPMENT_TYPES,
  EQUIPMENT_STATUS_MAP as EQUIPMENT_STATUS,
  MAINTENANCE_TYPE_LIST as MAINTENANCE_TYPES
};