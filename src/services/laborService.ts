/**
 * Labor Service - Quản lý nhân công nông nghiệp
 * V5.1.0 - Modern and Scientific Features
 */

import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, getDatabase } from '../config/database';
import logger from '../config/logger';

const db = getDatabase();

interface PositionConfig {
  label: string;
  icon: string;
  level: string;
}

interface SkillConfig {
  label: string;
  multiplier: number;
}

interface TaskConfig {
  label: string;
  icon: string;
  category: string;
}

const WORKER_POSITION_LIST: Record<string, PositionConfig> = {
  manager: { label: 'Quản lý', icon: '👨‍💼', level: 'senior' },
  supervisor: { label: 'Giám sát', icon: '👷', level: 'mid' },
  worker: { label: 'Công nhân', icon: '👨‍🌾', level: 'junior' },
  technician: { label: 'Kỹ thuật viên', icon: '🔧', level: 'mid' },
  driver: { label: 'Tài xế', icon: '🚜', level: 'junior' },
  guard: { label: 'Bảo vệ', icon: '👮', level: 'junior' }
};

const SKILL_LEVEL_MAP: Record<string, SkillConfig> = {
  junior: { label: 'Mới vào', multiplier: 1.0 },
  mid: { label: 'Có kinh nghiệm', multiplier: 1.2 },
  senior: { label: 'Kinh nghiệm cao', multiplier: 1.5 },
  expert: { label: 'Chuyên gia', multiplier: 2.0 }
};

const TASK_TYPE_LIST: Record<string, TaskConfig> = {
  planting: { label: 'Gieo trồng', icon: '🌱', category: 'crop' },
  fertilizing: { label: 'Bón phân', icon: '🌿', category: 'crop' },
  spraying: { label: 'Phun thuốc', icon: '💧', category: 'crop' },
  harvesting: { label: 'Thu hoạch', icon: '🌾', category: 'crop' },
  pruning: { label: 'Cắt tỉa', icon: '✂️', category: 'crop' },
  irrigation: { label: 'Tưới nước', icon: '🚿', category: 'maintenance' },
  feeding: { label: 'Cho ăn', icon: '🐟', category: 'aquaculture' },
  cleaning: { label: 'Vệ sinh', icon: '🧹', category: 'maintenance' },
  repair: { label: 'Sửa chữa', icon: '🔧', category: 'maintenance' },
  monitoring: { label: 'Giám sát', icon: '👁️', category: 'other' }
};

interface WorkerData {
  worker_name: string;
  worker_code?: string;
  position?: string;
  farm_id?: string;
  phone?: string;
  email?: string;
  skill_level?: string;
  daily_rate?: number;
  status?: string;
}

interface Worker {
  id: string;
  worker_name: string;
  worker_code: string;
  position: string;
  farm_id: string;
  phone: string;
  email: string;
  skill_level: string;
  daily_rate: number;
  status: string;
  created_at: string;
}

function createWorker(data: WorkerData): Worker {
  if (!data || !data.worker_name) {
    throw new Error('Missing required field: worker_name');
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  const workerCode = data.worker_code || 'WRK-' + Date.now().toString(36).toUpperCase();

  const values = [
    id,
    data.worker_name,
    workerCode,
    data.position || 'worker',
    data.farm_id || 'default',
    data.phone || '',
    data.email || '',
    data.skill_level || 'junior',
    data.daily_rate || 0,
    data.status || 'active',
    now,
    now
  ];

  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run(
      `INSERT INTO workers (id, worker_name, worker_code, position, farm_id, phone, email, skill_level, daily_rate, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );

    return {
      id,
      worker_name: data.worker_name,
      worker_code: workerCode,
      position: data.position || 'worker',
      farm_id: data.farm_id || 'default',
      phone: data.phone || '',
      email: data.email || '',
      skill_level: data.skill_level || 'junior',
      daily_rate: data.daily_rate || 0,
      status: data.status || 'active',
      created_at: now
    };
  } catch (error) {
    logger.error('[Labor] Create worker error:', error);
    throw error;
  }
}

function getWorkers(farmId?: string, options?: { position?: string; status?: string }): Worker[] {
  let query = 'SELECT * FROM workers';
  const params: unknown[] = [];

  if (farmId || options?.position || options?.status) {
    const conditions: string[] = [];
    if (farmId) {
      conditions.push('farm_id = ?');
      params.push(farmId);
    }
    if (options?.position) {
      conditions.push('position = ?');
      params.push(options.position);
    }
    if (options?.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  return getAll(query, params) as Worker[];
}

function getWorkerById(id: string): Worker | null {
  const result = getOne('SELECT * FROM workers WHERE id = ?', [id]);
  return result as Worker | null;
}

function updateWorker(id: string, updates: Partial<WorkerData>): Worker | null {
  const existing = getWorkerById(id);
  if (!existing) return null;

  const fields = Object.keys(updates).filter(k => k !== 'id');
  if (fields.length === 0) return existing;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f as keyof WorkerData]);

  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run(`UPDATE workers SET ${setClause}, updated_at = datetime("now") WHERE id = ?`, [...values, id]);
    return getWorkerById(id);
  } catch (error) {
    logger.error('[Labor] Update worker error:', error);
    return null;
  }
}

function deleteWorker(id: string): boolean {
  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run('DELETE FROM workers WHERE id = ?', [id]);
    return true;
  } catch (error) {
    logger.error('[Labor] Delete worker error:', error);
    return false;
  }
}

function recordAttendance(workerId: string, date: string, status: string, notes?: string): boolean {
  const id = uuidv4();
  try {
    const dbObj = db as { run: (sql: string, params: unknown[]) => void };
    dbObj.run(
      'INSERT INTO worker_attendance (id, worker_id, date, status, notes, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [id, workerId, date, status, notes || '']
    );
    return true;
  } catch (error) {
    logger.error('[Labor] Record attendance error:', error);
    return false;
  }
}

function getAttendance(workerId: string, startDate: string, endDate: string) {
  return getAll(
    'SELECT * FROM worker_attendance WHERE worker_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
    [workerId, startDate, endDate]
  );
}

export {
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  recordAttendance,
  getAttendance,
  WORKER_POSITION_LIST as WORKER_POSITIONS,
  SKILL_LEVEL_MAP as SKILL_LEVELS,
  TASK_TYPE_LIST as TASK_TYPES
};