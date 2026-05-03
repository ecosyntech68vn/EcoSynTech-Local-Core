/**
 * Labor Service - Quản lý nhân công nông nghiệp
 * V5.1.0 - Modern and Scientific Features
 */

import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, getDatabase } from '../config/database';
import logger from '../config/logger';

const db = getDatabase();

const WORKER_POSITIONS = {
  manager: { label: 'Quản lý', icon: '👨‍💼', level: 'senior' },
  supervisor: { label: 'Giám sát', icon: '👷', level: 'mid' },
  worker: { label: 'Công nhân', icon: '👨‍🌾', level: 'junior' },
  technician: { label: 'Kỹ thuật viên', icon: '🔧', level: 'mid' },
  driver: { label: 'Tài xế', icon: '🚜', level: 'junior' },
  guard: { label: 'Bảo vệ', icon: '👮', level: 'junior' }
};

const SKILL_LEVELS = {
  junior: { label: 'Mới vào', multiplier: 1.0 },
  mid: { label: 'Có kinh nghiệm', multiplier: 1.2 },
  senior: { label: 'Kinh nghiệm cao', multiplier: 1.5 },
  expert: { label: 'Chuyên gia', multiplier: 2.0 }
};

const TASK_TYPES = {
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

function createWorker(data) {
  if (!data || !data.worker_name) {
    throw new Error('Missing required field: worker_name');
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  const workerCode = data.worker_code || 'WRK-' + Date.now().toString(36).toUpperCase();

  const values = [
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
    data.hourly_rate || 0,
    data.monthly_salary || 0,
    data.work_type || 'daily',
    'active',
    data.hire_date || now.split('T')[0],
    data.notes || '',
    now,
    now
  ];
  db.run(
    `INSERT INTO labor_workers (
      id, farm_id, worker_code, worker_name, worker_name_vi, identity_number, phone, email, address, birth_date, gender, position, skill_level, hourly_rate, monthly_salary, work_type, status, hire_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  logger.info('Tạo công nhân mới: ' + data.worker_name + ' (' + workerCode + ')');
  return getOne('SELECT * FROM labor_workers WHERE id = ?', [id]);
}

/**
 * Lấy danh sách công nhân
 * @param {string} [farmId] - ID farm
 * @param {string} [position] - Chức vụ
 * @param {string} [status] - Trạng thái
 * @returns {Array<Object>} Danh sách công nhân
 */
function getWorkers(farmId, position, status) {
  let query = 'SELECT * FROM labor_workers WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  if (position) { query += ' AND position = ?'; params.push(position); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY worker_name';
  return getAll(query, params);
}

function getWorkerById(workerId) {
  return getOne('SELECT * FROM labor_workers WHERE id = ?', [workerId]);
}

function updateWorker(workerId, data) {
  const existing = getOne('SELECT * FROM labor_workers WHERE id = ?', [workerId]);
  if (!existing) return null;
  const updates = [];
  const params = [];
  if (data.worker_name) { updates.push('worker_name = ?'); params.push(data.worker_name); }
  if (data.phone) { updates.push('phone = ?'); params.push(data.phone); }
  if (data.position) { updates.push('position = ?'); params.push(data.position); }
  if (data.skill_level) { updates.push('skill_level = ?'); params.push(data.skill_level); }
  if (data.hourly_rate !== undefined) { updates.push('hourly_rate = ?'); params.push(data.hourly_rate); }
  if (data.status) { updates.push('status = ?'); params.push(data.status); }
  if (updates.length === 0) return existing;
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(workerId);
  db.run('UPDATE labor_workers SET ' + updates.join(', ') + ' WHERE id = ?', params);
  return getOne('SELECT * FROM labor_workers WHERE id = ?', [workerId]);
}

function createShift(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const shiftCode = data.shift_code || 'SHIFT-' + Date.now().toString(36).toUpperCase();
  const values = [
    id,
    data.farm_id || null,
    data.shift_name,
    shiftCode,
    data.start_time,
    data.end_time,
    data.break_duration || 60,
    data.workday_mask || '1111111',
    data.is_night_shift ? 1 : 0,
    'active',
    data.notes || '',
    now,
    now
  ];
  db.run(
    `INSERT INTO labor_shifts (
      id, farm_id, shift_name, shift_code, start_time, end_time, break_duration, workday_mask, is_night_shift, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );
  return getOne('SELECT * FROM labor_shifts WHERE id = ?', [id]);
}

function getShifts(farmId) {
  let query = 'SELECT * FROM labor_shifts WHERE status = ?';
  const params = ['active'];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  query += ' ORDER BY start_time';
  return getAll(query, params);
}

function checkIn(workerId, data) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const checkInTime = now.toTimeString().split(' ')[0].substring(0, 5);
  const existing = getOne('SELECT id FROM labor_attendance WHERE worker_id = ? AND work_date = ?', [workerId, today]);
  if (existing) return { error: 'Đã check-in hôm nay rồi' };
  const worker = getOne('SELECT * FROM labor_workers WHERE id = ?', [workerId]);
  if (!worker) return { error: 'Không tìm thấy công nhân' };
  const id = uuidv4();
  db.run(
    'INSERT INTO labor_attendance (id, farm_id, worker_id, shift_id, work_date, check_in, status, location_in, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, worker.farm_id, workerId, data.shift_id || null, today, checkInTime, 'present', data.location_in || '', data.notes || '', now.toISOString()]
  );
  logger.info('Check-in: ' + worker.worker_name + ' lúc ' + checkInTime);
  return { success: true, check_in: checkInTime, date: today };
}

function checkOut(workerId, data) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const checkOutTime = now.toTimeString().split(' ')[0].substring(0, 5);
  const attendance = getOne('SELECT * FROM labor_attendance WHERE worker_id = ? AND work_date = ?', [workerId, today]);
  if (!attendance) return { error: 'Chưa check-in hôm nay' };
  if (attendance.check_out) return { error: 'Đã check-out rồi' };
  const h1 = parseInt(attendance.check_in.split(':')[0]);
  const m1 = parseInt(attendance.check_in.split(':')[1]);
  const h2 = parseInt(checkOutTime.split(':')[0]);
  const m2 = parseInt(checkOutTime.split(':')[1]);
  const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  const totalHours = Math.max(0, totalMinutes / 60 - 1);
  db.run(
    'UPDATE labor_attendance SET check_out = ?, break_start = ?, break_end = ?, total_hours = ?, location_out = ?, notes = ? WHERE id = ?',
    [checkOutTime, data.break_start || null, data.break_end || null, Math.round(totalHours * 100) / 100, data.location_out || '', data.notes || '', attendance.id]
  );
  const worker = getOne('SELECT * FROM labor_workers WHERE id = ?', [workerId]);
  logger.info('Check-out: ' + (worker ? worker.worker_name : '') + ' lúc ' + checkOutTime + ', tổng: ' + totalHours.toFixed(2) + 'h');
  return { success: true, check_out: checkOutTime, total_hours: Math.round(totalHours * 100) / 100 };
}

function getAttendance(farmId, startDate, endDate, workerId) {
  let query = 'SELECT la.*, lw.worker_name, lw.position, ls.shift_name FROM labor_attendance la LEFT JOIN labor_workers lw ON la.worker_id = lw.id LEFT JOIN labor_shifts ls ON la.shift_id = ls.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND la.farm_id = ?'; params.push(farmId); }
  if (workerId) { query += ' AND la.worker_id = ?'; params.push(workerId); }
  if (startDate) { query += ' AND la.work_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND la.work_date <= ?'; params.push(endDate); }
  query += ' ORDER BY la.work_date DESC, la.check_in DESC';
  return getAll(query, params);
}

function createTask(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const taskCode = data.task_code || 'TASK-' + Date.now().toString(36).toUpperCase();
  db.run(
    'INSERT INTO labor_tasks (id, farm_id, task_code, task_name, task_type, description, area_id, crop_id, estimated_hours, required_workers, priority, scheduled_date, start_time, end_time, status, assigned_workers, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.farm_id || null, taskCode, data.task_name, data.task_type || 'other', data.description || '', data.area_id || null, data.crop_id || null, data.estimated_hours || 0, data.required_workers || 1, data.priority || 'normal', data.scheduled_date || now.split('T')[0], data.start_time || null, data.end_time || null, 'pending', JSON.stringify(data.assigned_workers || []), data.notes || '', now, now]
  );
  logger.info('Tạo công việc: ' + data.task_name + ' (' + taskCode + ')');
  return getOne('SELECT * FROM labor_tasks WHERE id = ?', [id]);
}

function assignTask(taskId, workerIds) {
  const task = getOne('SELECT * FROM labor_tasks WHERE id = ?', [taskId]);
  if (!task) return { error: 'Không tìm thấy công việc' };
  const now = new Date().toISOString();
  const currentAssigned = JSON.parse(task.assigned_workers || '[]');
  const newAssigned = [...new Set([...currentAssigned, ...workerIds])];
  db.run('UPDATE labor_tasks SET assigned_workers = ?, status = ?, updated_at = ? WHERE id = ?', [JSON.stringify(newAssigned), newAssigned.length > 0 ? 'assigned' : 'pending', now, taskId]);
  workerIds.forEach(function(workerId) {
    const existing = getOne('SELECT id FROM labor_task_assignments WHERE task_id = ? AND worker_id = ?', [taskId, workerId]);
    if (!existing) {
      db.run('INSERT INTO labor_task_assignments (id, farm_id, task_id, worker_id, assigned_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [uuidv4(), task.farm_id, taskId, workerId, now.split('T')[0], 'assigned', now]);
    }
  });
  logger.info('Phân công ' + workerIds.length + ' người vào task ' + task.task_code);
  return { success: true, assigned_count: workerIds.length };
}

function completeTask(taskId, workerId, hoursWorked, productivityScore, notes) {
  const task = getOne('SELECT * FROM labor_tasks WHERE id = ?', [taskId]);
  if (!task) return { error: 'Không tìm thấy công việc' };
  const now = new Date().toISOString();
  db.run('UPDATE labor_tasks SET status = ?, completed_by = ?, completed_at = ?, notes = ?, updated_at = ? WHERE id = ?', ['completed', workerId, now, notes || task.notes, now, taskId]);
  if (workerId) {
    db.run('UPDATE labor_task_assignments SET hours_worked = ?, productivity_score = ?, status = ?, notes = ? WHERE task_id = ? AND worker_id = ?', [hoursWorked || 0, productivityScore || null, 'completed', notes || '', taskId, workerId]);
  }
  logger.info('Hoàn thành task: ' + task.task_code);
  return { success: true, completed_at: now };
}

/**
 * Lấy danh sách công việc
 * @param {string} [farmId] - ID farm
 * @param {string} [status] - Trạng thái
 * @param {string} [cropId] - ID cây trồng
 * @param {string} [startDate] - Ngày bắt đầu
 * @param {string} [endDate] - Ngày kết thúc
 * @returns {Array<Object>} Danh sách công việc
 */
function getTasks(farmId, status, cropId, startDate, endDate) {
  let query = 'SELECT lt.*, c.name_vi as crop_name FROM labor_tasks lt LEFT JOIN crops c ON lt.crop_id = c.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND lt.farm_id = ?'; params.push(farmId); }
  if (status) { query += ' AND lt.status = ?'; params.push(status); }
  if (cropId) { query += ' AND lt.crop_id = ?'; params.push(cropId); }
  if (startDate) { query += ' AND lt.scheduled_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND lt.scheduled_date <= ?'; params.push(endDate); }
  query += ' ORDER BY lt.scheduled_date DESC, lt.priority DESC';
  return getAll(query, params);
}

function getTaskAssignments(taskId) {
  return getAll('SELECT lta.*, lw.worker_name, lw.position, lw.skill_level FROM labor_task_assignments lta LEFT JOIN labor_workers lw ON lta.worker_id = lw.id WHERE lta.task_id = ?', [taskId]);
}

function createPayroll(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const payrollCode = 'PR-' + Date.now().toString(36).toUpperCase();
  const attendance = getAll('SELECT SUM(total_hours) as total_hours, COUNT(*) as work_days, SUM(CASE WHEN status = absent THEN 1 ELSE 0 END) as absent_days FROM labor_attendance WHERE worker_id = ? AND work_date >= ? AND work_date <= ?', [data.worker_id, data.period_start, data.period_end]);
  const worker = getOne('SELECT * FROM labor_workers WHERE id = ?', [data.worker_id]);
  if (!worker) return { error: 'Không tìm thấy công nhân' };
  const totalHours = (attendance[0] && attendance[0].total_hours) || 0;
  const workDays = (attendance[0] && attendance[0].work_days) || 0;
  const hourlyRate = worker.hourly_rate || 50000;
  const overtimeRate = hourlyRate * 1.5;
  const overtimeHours = Math.max(0, totalHours - 8 * workDays);
  const basicSalary = worker.monthly_salary || (hourlyRate * totalHours);
  const overtimePay = overtimeHours * overtimeRate;
  const totalSalary = basicSalary + overtimePay + (data.bonuses || 0) - (data.deductions || 0);
  db.run(
    'INSERT INTO labor_payroll (id, farm_id, payroll_code, worker_id, period_type, period_start, period_end, basic_salary, total_hours, hourly_rate, overtime_hours, overtime_rate, overtime_pay, bonuses, deductions, total_work_days, absent_days, late_days, net_salary, payment_status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, worker.farm_id, payrollCode, data.worker_id, data.period_type || 'monthly', data.period_start, data.period_end, basicSalary, totalHours, hourlyRate, overtimeHours, overtimeRate, overtimePay, data.bonuses || 0, data.deductions || 0, workDays, 0, 0, totalSalary, 'unpaid', data.notes || '', now, now]
  );
  logger.info('Tạo bảng lương: ' + payrollCode + ' cho ' + worker.worker_name);
  return getOne('SELECT * FROM labor_payroll WHERE id = ?', [id]);
}

function getPayroll(farmId, workerId, periodStart, periodEnd) {
  let query = 'SELECT lp.*, lw.worker_name, lw.position, lw.worker_code FROM labor_payroll lp LEFT JOIN labor_workers lw ON lp.worker_id = lw.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND lp.farm_id = ?'; params.push(farmId); }
  if (workerId) { query += ' AND lp.worker_id = ?'; params.push(workerId); }
  if (periodStart) { query += ' AND lp.period_start >= ?'; params.push(periodStart); }
  if (periodEnd) { query += ' AND lp.period_end <= ?'; params.push(periodEnd); }
  query += ' ORDER BY lp.period_end DESC, lw.worker_name';
  return getAll(query, params);
}

function createPerformanceEvaluation(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const totalScore = ((data.attendance_score || 0) * 0.2 + (data.productivity_score || 0) * 0.3 + (data.quality_score || 0) * 0.25 + (data.teamwork_score || 0) * 0.15 + (data.safety_score || 0) * 0.1);
  const rating = totalScore >= 4.5 ? 'excellent' : totalScore >= 3.5 ? 'good' : totalScore >= 2.5 ? 'average' : 'poor';
  db.run(
    'INSERT INTO labor_performance (id, farm_id, worker_id, evaluation_period, evaluation_date, attendance_score, productivity_score, quality_score, teamwork_score, safety_score, total_score, rating, strengths, improvements, evaluator, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.farm_id || null, data.worker_id, data.evaluation_period || 'monthly', data.evaluation_date || now.split('T')[0], data.attendance_score || 0, data.productivity_score || 0, data.quality_score || 0, data.teamwork_score || 0, data.safety_score || 0, totalScore, rating, data.strengths || '', data.improvements || '', data.evaluator || '', data.notes || '', now]
  );
  return { id: id, total_score: Math.round(totalScore * 100) / 100, rating: rating };
}

function getWorkerPerformance(workerId) {
  return getAll('SELECT * FROM labor_performance WHERE worker_id = ? ORDER BY evaluation_date DESC LIMIT 12', [workerId]);
}

function getLaborCostByCrop(farmId, startDate, endDate) {
  let query = 'SELECT lt.crop_id, c.name_vi as crop_name, SUM(lta.hours_worked) as total_hours, COUNT(DISTINCT lta.worker_id) as worker_count, COUNT(DISTINCT lt.id) as task_count, AVG(lta.productivity_score) as avg_productivity FROM labor_tasks lt LEFT JOIN labor_task_assignments lta ON lt.id = lta.task_id LEFT JOIN crops c ON lt.crop_id = c.id WHERE lt.status = completed';
  const params = [];
  if (farmId) { query += ' AND lt.farm_id = ?'; params.push(farmId); }
  if (startDate) { query += ' AND lt.scheduled_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND lt.scheduled_date <= ?'; params.push(endDate); }
  query += ' GROUP BY lt.crop_id ORDER BY total_hours DESC';
  return getAll(query, params);
}

/**
 * Lấy thống kê lao động
 * @param {string} [farmId] - ID farm
 * @param {string} [startDate] - Ngày bắt đầu
 * @param {string} [endDate] - Ngày kết thúc
 * @returns {Object} Thống kê lao động
 */
function getLaborStats(farmId, startDate, endDate) {
  const workers = getOne('SELECT COUNT(*) as count FROM labor_workers WHERE status = active' + (farmId ? ' AND farm_id = ?' : ''), farmId ? [farmId] : []);
  const attendance = getOne('SELECT COUNT(*) as total_shifts, SUM(total_hours) as total_hours FROM labor_attendance la WHERE 1=1' + (farmId ? ' AND la.farm_id = ?' : ''), farmId ? [farmId] : []);
  const tasks = getOne('SELECT COUNT(*) as total_tasks, SUM(CASE WHEN status = completed THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = pending THEN 1 ELSE 0 END) as pending FROM labor_tasks lt WHERE 1=1' + (farmId ? ' AND lt.farm_id = ?' : ''), farmId ? [farmId] : []);
  return {
    active_workers: (workers && workers.count) || 0,
    total_shifts: (attendance && attendance.total_shifts) || 0,
    total_hours: Math.round(((attendance && attendance.total_hours) || 0) * 100) / 100,
    total_tasks: (tasks && tasks.total_tasks) || 0,
    completed_tasks: (tasks && tasks.completed) || 0,
    pending_tasks: (tasks && tasks.pending) || 0,
    completion_rate: (tasks && tasks.total_tasks) ? Math.round((tasks.completed / tasks.total_tasks) * 100) : 0
  };
}

function predictLaborDemand(cropId, days) {
  days = days || 30;
  const tasks = getAll('SELECT task_type, COUNT(*) as count, SUM(estimated_hours) as total_hours FROM labor_tasks WHERE crop_id = ? AND status = pending AND scheduled_date <= date(now, +? || days) GROUP BY task_type', [cropId, days]);
  const neededHours = tasks.reduce(function(sum, t) { return sum + (t.total_hours || 0); }, 0);
  const avgWorkersNeeded = Math.ceil(neededHours / (days * 0.8 * 8));
  return {
    crop_id: cropId,
    period_days: days,
    task_types: tasks,
    total_estimated_hours: Math.round(neededHours),
    avg_workers_needed: avgWorkersNeeded
  };
}

module.exports = {
  createWorker: createWorker,
  getWorkers: getWorkers,
  getWorkerById: getWorkerById,
  updateWorker: updateWorker,
  createShift: createShift,
  getShifts: getShifts,
  checkIn: checkIn,
  checkOut: checkOut,
  getAttendance: getAttendance,
  createTask: createTask,
  assignTask: assignTask,
  completeTask: completeTask,
  getTasks: getTasks,
  getTaskAssignments: getTaskAssignments,
  createPayroll: createPayroll,
  getPayroll: getPayroll,
  createPerformanceEvaluation: createPerformanceEvaluation,
  getWorkerPerformance: getWorkerPerformance,
  getLaborCostByCrop: getLaborCostByCrop,
  getLaborStats: getLaborStats,
  predictLaborDemand: predictLaborDemand,
  WORKER_POSITIONS: WORKER_POSITIONS,
  SKILL_LEVELS: SKILL_LEVELS,
  TASK_TYPES: TASK_TYPES
};
export default module.exports;
