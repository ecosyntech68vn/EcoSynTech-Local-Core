/**
 * Labor Service - Quản lý nhân công nông nghiệp
 * V5.1.0 - Converted to TypeScript - Phase 1
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

export interface PositionConfig {
  label: string;
  icon: string;
  level: string;
}

export interface SkillLevelConfig {
  label: string;
  multiplier: number;
}

export interface TaskTypeConfig {
  label: string;
  icon: string;
  category: string;
}

export interface Worker {
  id: string;
  farm_id?: string;
  worker_code: string;
  worker_name: string;
  worker_name_vi?: string;
  identity_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  birth_date?: string;
  gender?: string;
  position?: string;
  skill_level?: string;
  salary?: number;
  start_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  worker_id: string;
  task_type: string;
  description?: string;
  date: string;
  hours_worked?: number;
  productivity?: number;
  location?: string;
  crop_id?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  hours_worked?: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface CreateWorkerData {
  worker_name: string;
  farm_id?: string;
  worker_code?: string;
  worker_name_vi?: string;
  identity_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  birth_date?: string;
  gender?: string;
  position?: string;
  skill_level?: string;
  salary?: number;
  start_date?: string;
  notes?: string;
}

export interface RecordTaskData {
  worker_id: string;
  task_type: string;
  description?: string;
  date?: string;
  hours_worked?: number;
  productivity?: number;
  location?: string;
  crop_id?: string;
}

export interface RecordAttendanceData {
  worker_id: string;
  date?: string;
  check_in?: string;
  check_out?: string;
  hours_worked?: number;
  status?: string;
  notes?: string;
}

export const WORKER_POSITIONS: Record<string, PositionConfig> = {
  manager: { label: 'Quản lý', icon: '👨‍💼', level: 'senior' },
  supervisor: { label: 'Giám sát', icon: '👷', level: 'mid' },
  worker: { label: 'Công nhân', icon: '👨‍🌾', level: 'junior' },
  technician: { label: 'Kỹ thuật viên', icon: '🔧', level: 'mid' },
  driver: { label: 'Tài xế', icon: '🚜', level: 'junior' },
  guard: { label: 'Bảo vệ', icon: '👮', level: 'junior' }
};

export const SKILL_LEVELS: Record<string, SkillLevelConfig> = {
  junior: { label: 'Mới vào', multiplier: 1.0 },
  mid: { label: 'Có kinh nghiệm', multiplier: 1.2 },
  senior: { label: 'Kinh nghiệm cao', multiplier: 1.5 },
  expert: { label: 'Chuyên gia', multiplier: 2.0 }
};

export const TASK_TYPES: Record<string, TaskTypeConfig> = {
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

export function createWorker(data: CreateWorkerData): string {
  if (!data || !data.worker_name) {
    throw new Error('Missing required field: worker_name');
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  const workerCode = data.worker_code || 'WRK-' + Date.now().toString(36).toUpperCase();

  db.run(`
    INSERT INTO workers (
      id, farm_id, worker_code, worker_name, worker_name_vi, identity_number,
      phone, email, address, birth_date, gender, position, skill_level,
      salary, start_date, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.farm_id || null,
    workerCode,
    data.worker_name,
    data.worker_name_vi || data.worker_name,
    data.identity_number || '',
    data.phone || '',
    data.email || '',
    data.address || '',
    data.birth_date || null,
    data.gender || '',
    data.position || 'worker',
    data.skill_level || 'junior',
    data.salary || 0,
    data.start_date || now.split('T')[0],
    'active',
    data.notes || null,
    now,
    now
  ]);

  logger.info(`Tạo worker mới: ${data.worker_name} (${id})`);
  return id;
}

export function getWorker(workerId: string): Worker | null {
  return db.get('SELECT * FROM workers WHERE id = ?', [workerId]) as Worker | null;
}

export function getWorkersByFarm(farmId: string): Worker[] {
  return db.all('SELECT * FROM workers WHERE farm_id = ? AND status = ? ORDER BY position, worker_name', [farmId, 'active']) as Worker[];
}

export function getWorkersByPosition(farmId: string, position: string): Worker[] {
  return db.all('SELECT * FROM workers WHERE farm_id = ? AND position = ?', [farmId, position]) as Worker[];
}

export function updateWorker(workerId: string, data: Partial<CreateWorkerData>): boolean {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    Object.keys(data).forEach(key => {
      if (key !== 'farm_id' && (data as any)[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push((data as any)[key]);
      }
    });

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(workerId);

    db.run(`UPDATE workers SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('Update worker error:', error.message);
    return false;
  }
}

export function deleteWorker(workerId: string): boolean {
  try {
    db.run('UPDATE workers SET status = ?, updated_at = ? WHERE id = ?', ['inactive', new Date().toISOString(), workerId]);
    return true;
  } catch (error: any) {
    logger.error('Delete worker error:', error.message);
    return false;
  }
}

export function recordTask(data: RecordTaskData): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO labor_tasks (
      id, worker_id, task_type, description, date, hours_worked,
      productivity, location, crop_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.worker_id,
    data.task_type,
    data.description || null,
    data.date || now.split('T')[0],
    data.hours_worked || 0,
    data.productivity || null,
    data.location || null,
    data.crop_id || null,
    now
  ]);

  logger.info(`Ghi nhận task cho worker: ${data.worker_id}`);
  return id;
}

export function getTasksByWorker(workerId: string): TaskRecord[] {
  return db.all('SELECT * FROM labor_tasks WHERE worker_id = ? ORDER BY date DESC', [workerId]) as TaskRecord[];
}

export function getTasksByDate(farmId: string, date: string): TaskRecord[] {
  return db.all(`
    SELECT lt.*, w.worker_name, w.position 
    FROM labor_tasks lt
    JOIN workers w ON lt.worker_id = w.id
    WHERE w.farm_id = ? AND lt.date = ?
    ORDER BY lt.task_type
  `, [farmId, date]) as TaskRecord[];
}

export function recordAttendance(data: RecordAttendanceData): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  const date = data.date || now.split('T')[0];

  db.run(`
    INSERT INTO labor_attendance (
      id, worker_id, date, check_in, check_out, hours_worked, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.worker_id,
    date,
    data.check_in || null,
    data.check_out || null,
    data.hours_worked || 0,
    data.status || 'present',
    data.notes || null,
    now
  ]);

  return id;
}

export function getAttendanceByWorker(workerId: string): AttendanceRecord[] {
  return db.all('SELECT * FROM labor_attendance WHERE worker_id = ? ORDER BY date DESC', [workerId]) as AttendanceRecord[];
}

export function getAttendanceByDate(farmId: string, date: string): (AttendanceRecord & { worker_name: string })[] {
  return db.all(`
    SELECT la.*, w.worker_name, w.position
    FROM labor_attendance la
    JOIN workers w ON la.worker_id = w.id
    WHERE w.farm_id = ? AND la.date = ?
    ORDER BY w.position, w.worker_name
  `, [farmId, date]) as (AttendanceRecord & { worker_name: string })[];
}

export function getLaborStats(farmId: string): {
  totalWorkers: number;
  activeWorkers: number;
  totalTasks: number;
  pendingTasks: number;
  attendanceRate: number;
} {
  const workers = getWorkersByFarm(farmId);
  
  const tasks = db.all('SELECT COUNT(*) as total FROM labor_tasks lt JOIN workers w ON lt.worker_id = w.id WHERE w.farm_id = ?', [farmId]) as Array<{ total: number }>;
  
  const attendance = db.all(`
    SELECT COUNT(*) as present, COUNT(*) as total
    FROM labor_attendance la
    JOIN workers w ON la.worker_id = w.id
    WHERE w.farm_id = ? AND la.date = date('now')
  `, [farmId]) as Array<{ present: number; total: number }>;

  return {
    totalWorkers: workers.length,
    activeWorkers: workers.filter(w => w.status === 'active').length,
    totalTasks: tasks[0]?.total || 0,
    pendingTasks: 0,
    attendanceRate: attendance[0]?.total ? (attendance[0].present / attendance[0].total) * 100 : 0
  };
}

export function calculateWorkerProductivity(workerId: string, startDate?: string, endDate?: string): number {
  const tasks = getTasksByWorker(workerId);
  const filteredTasks = tasks.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  if (filteredTasks.length === 0) return 0;

  const totalProductivity = filteredTasks.reduce((sum, t) => sum + (t.productivity || 0), 0);
  return totalProductivity / filteredTasks.length;
}

export default {
  createWorker,
  getWorker,
  getWorkersByFarm,
  getWorkersByPosition,
  updateWorker,
  deleteWorker,
  recordTask,
  getTasksByWorker,
  getTasksByDate,
  recordAttendance,
  getAttendanceByWorker,
  getAttendanceByDate,
  getLaborStats,
  calculateWorkerProductivity
};