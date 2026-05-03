/**
 * Equipment Service - Quản lý máy móc thiết bị
 * V5.1.0 - Smart Equipment Management with AI Predictions
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
const { getOne, getAll, getDatabase } = require('../config/database');
import logger from '../config/logger';

const db = getDatabase();

// Equipment Categories
const EQUIPMENT_TYPES = {
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

const EQUIPMENT_STATUS = {
  active: { label: 'Hoạt động', color: 'green' },
  under_maintenance: { label: 'Đang bảo trì', color: 'orange' },
  broken: { label: 'Hỏng', color: 'red' },
  retired: { label: 'Ngưng sử dụng', color: 'gray' },
  available: { label: 'Sẵn sàng', color: 'blue' },
  in_use: { label: 'Đang sử dụng', color: 'purple' }
};

const MAINTENANCE_TYPES = {
  preventive: { label: 'Bảo trì phòng ngừa', icon: '🛡️' },
  corrective: { label: 'Sửa chữa', icon: '🔧' },
  predictive: { label: 'Bảo trì dự đoán', icon: '🤖' },
  inspection: { label: 'Kiểm tra', icon: '🔍' },
  oil_change: { label: 'Thay dầu', icon: '🛢️' },
  calibration: { label: 'Hiệu chuẩn', icon: '📏' }
};

// ========== CATEGORY FUNCTIONS ==========

/**
 * Tạo danh mục thiết bị mới
 * @param {Object} data - Dữ liệu danh mục
 * @param {string} [data.farm_id] - ID farm
 * @param {string} [data.category_code] - Mã danh mục
 * @param {string} data.category_name - Tên danh mục
 * @param {string} [data.category_name_vi] - Tên tiếng Việt
 * @param {string} [data.category_type] - Loại danh mục
 * @param {string} [data.description] - Mô tả
 * @returns {Object} Danh mục đã tạo
 */
function createCategory(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const categoryCode = data.category_code || 'CAT-' + Date.now().toString(36).toUpperCase();

  const values = [
    id, data.farm_id || null, categoryCode, data.category_name,
    data.category_name_vi || data.category_name, data.category_type,
    data.parent_category_id || null, data.description || '',
    data.icon || '', data.status || 'active', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO equipment_categories (
      id, farm_id, category_code, category_name, category_name_vi,
      category_type, parent_category_id, description, icon, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  logger.info('Tạo danh mục thiết bị: ' + data.category_name + ' (' + categoryCode + ')');
  return getOne('SELECT * FROM equipment_categories WHERE id = ?', [id]);
}

/**
 * Lấy danh sách danh mục thiết bị
 * @param {string} [farmId] - ID farm
 * @param {string} [type] - Loại danh mục
 * @returns {Array<Object>} Danh sách danh mục
 */
function getCategories(farmId, type) {
  let query = 'SELECT * FROM equipment_categories WHERE status = ?';
  const params = ['active'];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  if (type) { query += ' AND category_type = ?'; params.push(type); }
  query += ' ORDER BY category_name';
  return getAll(query, params);
}

// ========== EQUIPMENT INVENTORY FUNCTIONS ==========

/**
 * Tạo thiết bị mới
 * @param {Object} data - Dữ liệu thiết bị
 * @param {string} data.equipment_name - Tên thiết bị (bắt buộc)
 * @param {string} [data.farm_id] - ID farm
 * @param {string} [data.equipment_code] - Mã thiết bị
 * @param {string} [data.category_id] - ID danh mục
 * @param {string} [data.brand] - Hãng
 * @param {string} [data.model] - Model
 * @param {number} [data.purchase_price] - Giá mua
 * @param {string} [data.status] - Trạng thái
 * @returns {Object} Thiết bị đã tạo
 */
function createEquipment(data) {
  if (!data || !data.equipment_name) {
    throw new Error('Missing required field: equipment_name');
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  const equipmentCode = data.equipment_code || 'EQP-' + Date.now().toString(36).toUpperCase();
  const currentValue = data.purchase_price || 0;

  const values = [
    id,
    data.farm_id || null,
    equipmentCode,
    data.equipment_name,
    data.equipment_name_vi || data.equipment_name,
    data.category_id || null,
    data.brand || '',
    data.model || '',
    data.serial_number || '',
    data.purchase_date || null,
    data.purchase_price || 0,
    currentValue,
    data.location || '',
    data.status || 'active',
    data.condition || 'good',
    data.year_of_manufacture || '',
    data.warranty_expiry || null,
    data.fuel_type || '',
    data.capacity || '',
    data.power_rating || '',
    data.image_url || '',
    data.qr_code || '',
    data.notes || '',
    now,
    now
  ];

  db.run(
    `INSERT INTO equipment_inventory (
      id, farm_id, equipment_code, equipment_name, equipment_name_vi,
      category_id, brand, model, serial_number, purchase_date, purchase_price,
      current_value, location, status, condition, year_of_manufacture,
      warranty_expiry, fuel_type, capacity, power_rating, image_url, qr_code,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  // Create initial depreciation record
  if (data.purchase_price && data.purchase_price > 0) {
    try {
      createDepreciation({
        equipment_id: id,
        purchase_price: data.purchase_price,
        useful_life_years: data.useful_life_years || 5,
        salvage_value: data.salvage_value || 0
      });
    } catch (depError) {
      logger.warn('Failed to create depreciation record:', depError.message);
    }
  }

  logger.info('Tạo thiết bị mới: ' + data.equipment_name + ' (' + equipmentCode + ')');
  return getOne('SELECT * FROM equipment_inventory WHERE id = ?', [id]);
}

/**
 * Lấy danh sách thiết bị
 * @param {string} [farmId] - ID farm
 * @param {string} [categoryId] - ID danh mục
 * @param {string} [status] - Trạng thái (active, idle, maintenance, retired)
 * @returns {Array<Object>} Danh sách thiết bị
 */
function getEquipment(farmId, categoryId, status) {
  let query = 'SELECT ei.*, ec.category_name FROM equipment_inventory ei LEFT JOIN equipment_categories ec ON ei.category_id = ec.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND ei.farm_id = ?'; params.push(farmId); }
  if (categoryId) { query += ' AND ei.category_id = ?'; params.push(categoryId); }
  if (status) { query += ' AND ei.status = ?'; params.push(status); }
  query += ' ORDER BY ei.equipment_name';
  return getAll(query, params);
}

function getEquipmentById(equipmentId) {
  return getOne('SELECT * FROM equipment_inventory WHERE id = ?', [equipmentId]);
}

function updateEquipment(equipmentId, data) {
  const existing = getOne('SELECT * FROM equipment_inventory WHERE id = ?', [equipmentId]);
  if (!existing) return null;

  const updates = [];
  const params = [];
  const fields = ['equipment_name', 'equipment_name_vi', 'category_id', 'brand', 'model', 'serial_number', 'location', 'status', 'condition', 'fuel_type', 'capacity', 'power_rating', 'notes'];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (data.current_value !== undefined) {
    updates.push('current_value = ?');
    params.push(data.current_value);
  }

  if (updates.length === 0) return existing;
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(equipmentId);

  db.run('UPDATE equipment_inventory SET ' + updates.join(', ') + ' WHERE id = ?', params);
  return getOne('SELECT * FROM equipment_inventory WHERE id = ?', [equipmentId]);
}

function deleteEquipment(equipmentId) {
  const existing = getOne('SELECT * FROM equipment_inventory WHERE id = ?', [equipmentId]);
  if (!existing) return false;
  db.run('UPDATE equipment_inventory SET status = ? WHERE id = ?', ['retired', equipmentId]);
  return true;
}

// ========== MAINTENANCE FUNCTIONS ==========

function createMaintenanceSchedule(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const scheduleCode = data.schedule_code || 'SCH-' + Date.now().toString(36).toUpperCase();
  const nextDate = data.next_maintenance_date || calculateNextMaintenanceDate(data.frequency_days || 30);

  const values = [
    id, data.farm_id || null, data.equipment_id, scheduleCode,
    data.maintenance_type, data.description || '', data.frequency_days || 30,
    data.last_maintenance_date || null, nextDate, data.estimated_hours || 0,
    data.estimated_cost || 0, data.priority || 'normal',
    data.assigned_technician_id || null, data.status || 'active',
    data.auto_trigger ? 1 : 0, data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO equipment_maintenance_schedules (
      id, farm_id, equipment_id, schedule_code, maintenance_type, description,
      frequency_days, last_maintenance_date, next_maintenance_date, estimated_hours,
      estimated_cost, priority, assigned_technician_id, status, auto_trigger, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  logger.info('Tạo lịch bảo trì: ' + scheduleCode + ' cho thiết bị ' + data.equipment_id);
  return getOne('SELECT * FROM equipment_maintenance_schedules WHERE id = ?', [id]);
}

function calculateNextMaintenanceDate(frequencyDays) {
  const date = new Date();
  date.setDate(date.getDate() + frequencyDays);
  return date.toISOString().split('T')[0];
}

function getMaintenanceSchedules(farmId, equipmentId, status) {
  let query = 'SELECT ems.*, ei.equipment_name FROM equipment_maintenance_schedules ems LEFT JOIN equipment_inventory ei ON ems.equipment_id = ei.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND ems.farm_id = ?'; params.push(farmId); }
  if (equipmentId) { query += ' AND ems.equipment_id = ?'; params.push(equipmentId); }
  if (status) { query += ' AND ems.status = ?'; params.push(status); }
  query += ' ORDER BY ems.next_maintenance_date ASC';
  return getAll(query, params);
}

function createMaintenanceRecord(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const totalCost = (data.labor_cost || 0) + (data.parts_cost || 0);
  const nextDate = data.next_maintenance_date || calculateNextMaintenanceDate(90);

  const values = [
    id, data.farm_id || null, data.equipment_id, data.schedule_id || null,
    data.maintenance_type, data.maintenance_date || now.split('T')[0],
    data.technician_id || null, data.description || '', data.work_performed || '',
    data.parts_replaced || '', data.labor_hours || 0, data.labor_cost || 0,
    data.parts_cost || 0, totalCost, nextDate, 'completed',
    data.attachments || '', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO equipment_maintenance_records (
      id, farm_id, equipment_id, schedule_id, maintenance_type, maintenance_date,
      technician_id, description, work_performed, parts_replaced, labor_hours,
      labor_cost, parts_cost, total_cost, next_maintenance_date, status, attachments,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  // Update equipment condition
  if (data.equipment_id) {
    db.run('UPDATE equipment_inventory SET condition = ?, updated_at = ? WHERE id = ?', 
      [data.condition || 'good', now, data.equipment_id]);
  }

  // Update schedule if exists
  if (data.schedule_id) {
    db.run('UPDATE equipment_maintenance_schedules SET last_maintenance_date = ?, next_maintenance_date = ?, updated_at = ? WHERE id = ?',
      [now.split('T')[0], nextDate, now, data.schedule_id]);
  }

  logger.info('Ghi nhận bảo trì cho thiết bị: ' + data.equipment_id);
  return getOne('SELECT * FROM equipment_maintenance_records WHERE id = ?', [id]);
}

function getMaintenanceRecords(farmId, equipmentId, startDate, endDate) {
  let query = 'SELECT emr.*, ei.equipment_name, lw.worker_name as technician_name FROM equipment_maintenance_records emr LEFT JOIN equipment_inventory ei ON emr.equipment_id = ei.id LEFT JOIN labor_workers lw ON emr.technician_id = lw.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND emr.farm_id = ?'; params.push(farmId); }
  if (equipmentId) { query += ' AND emr.equipment_id = ?'; params.push(equipmentId); }
  if (startDate) { query += ' AND emr.maintenance_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND emr.maintenance_date <= ?'; params.push(endDate); }
  query += ' ORDER BY emr.maintenance_date DESC';
  return getAll(query, params);
}

// ========== USAGE LOG FUNCTIONS ==========

function logUsage(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const startTime = data.start_time || now;
  const endTime = data.end_time;
  
  let duration = 0;
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    duration = (end - start) / (1000 * 60 * 60);
  }

  const values = [
    id, data.farm_id || null, data.equipment_id, data.worker_id || null,
    data.task_id || null, data.crop_id || null, startTime, endTime,
    Math.round(duration * 100) / 100, data.operation_type || '',
    data.location_area || '', data.fuel_consumed || 0, data.distance_km || 0,
    endTime ? 'completed' : 'active', data.notes || '', now
  ];

  db.run(
    `INSERT INTO equipment_usage_logs (
      id, farm_id, equipment_id, worker_id, task_id, crop_id, start_time,
      end_time, duration_hours, operation_type, location_area, fuel_consumed,
      distance_km, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  // Update equipment status
  if (!endTime) {
    db.run('UPDATE equipment_inventory SET status = ?, updated_at = ? WHERE id = ?', ['in_use', now, data.equipment_id]);
  }

  logger.info('Ghi nhận sử dụng thiết bị: ' + data.equipment_id);
  return getOne('SELECT * FROM equipment_usage_logs WHERE id = ?', [id]);
}

function getUsageLogs(farmId, equipmentId, workerId, cropId) {
  let query = 'SELECT eul.*, ei.equipment_name, lw.worker_name, c.name_vi as crop_name FROM equipment_usage_logs eul LEFT JOIN equipment_inventory ei ON eul.equipment_id = ei.id LEFT JOIN labor_workers lw ON eul.worker_id = lw.id LEFT JOIN crops c ON eul.crop_id = c.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND eul.farm_id = ?'; params.push(farmId); }
  if (equipmentId) { query += ' AND eul.equipment_id = ?'; params.push(equipmentId); }
  if (workerId) { query += ' AND eul.worker_id = ?'; params.push(workerId); }
  if (cropId) { query += ' AND eul.crop_id = ?'; params.push(cropId); }
  query += ' ORDER BY eul.start_time DESC';
  return getAll(query, params);
}

// ========== ASSIGNMENT FUNCTIONS ==========

function assignEquipment(data) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const values = [
    id, data.farm_id || null, data.equipment_id, data.worker_id || null,
    data.crop_id || null, data.area_id || null, data.assigned_date || now.split('T')[0],
    data.return_date || null, data.purpose || '', 'assigned', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO equipment_assignments (
      id, farm_id, equipment_id, worker_id, crop_id, area_id, assigned_date,
      return_date, purpose, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  // Update equipment status
  db.run('UPDATE equipment_inventory SET status = ?, updated_at = ? WHERE id = ?', 
    ['in_use', now, data.equipment_id]);

  logger.info('Phân công thiết bị: ' + data.equipment_id + ' cho worker: ' + (data.worker_id || 'N/A'));
  return getOne('SELECT * FROM equipment_assignments WHERE id = ?', [id]);
}

function returnEquipment(assignmentId) {
  const assignment = getOne('SELECT * FROM equipment_assignments WHERE id = ?', [assignmentId]);
  if (!assignment) return null;

  const now = new Date().toISOString();
  db.run('UPDATE equipment_assignments SET return_date = ?, status = ?, updated_at = ? WHERE id = ?',
    [now.split('T')[0], 'returned', now, assignmentId]);

  // Update equipment status to available
  db.run('UPDATE equipment_inventory SET status = ?, condition = ?, updated_at = ? WHERE id = ?',
    ['available', 'good', now, assignment.equipment_id]);

  return getOne('SELECT * FROM equipment_assignments WHERE id = ?', [assignmentId]);
}

function getAssignments(farmId, equipmentId, workerId, status) {
  let query = 'SELECT ea.*, ei.equipment_name, lw.worker_name, c.name_vi as crop_name FROM equipment_assignments ea LEFT JOIN equipment_inventory ei ON ea.equipment_id = ei.id LEFT JOIN labor_workers lw ON ea.worker_id = lw.id LEFT JOIN crops c ON ea.crop_id = c.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND ea.farm_id = ?'; params.push(farmId); }
  if (equipmentId) { query += ' AND ea.equipment_id = ?'; params.push(equipmentId); }
  if (workerId) { query += ' AND ea.worker_id = ?'; params.push(workerId); }
  if (status) { query += ' AND ea.status = ?'; params.push(status); }
  query += ' ORDER BY ea.assigned_date DESC';
  return getAll(query, params);
}

// ========== DEPRECIATION FUNCTIONS ==========

function createDepreciation(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const purchasePrice = data.purchase_price || 0;
  const usefulLife = data.useful_life_years || 5;
  const salvageValue = data.salvage_value || 0;
  const annualDepreciation = usefulLife > 0 ? (purchasePrice - salvageValue) / usefulLife : 0;

  const values = [
    id, data.farm_id || null, data.equipment_id, 'straight_line', usefulLife,
    salvageValue, annualDepreciation, 0, purchasePrice - annualDepreciation,
    now.split('T')[0], calculateNextMaintenanceDate(365), '', now, now
  ];

  db.run(
    `INSERT INTO equipment_depreciation (
      id, farm_id, equipment_id, depreciation_method, useful_life_years,
      salvage_value, annual_depreciation, accumulated_depreciation, current_book_value,
      calculation_date, next_calculation_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM equipment_depreciation WHERE id = ?', [id]);
}

function updateDepreciation(equipmentId) {
  const dep = getOne('SELECT * FROM equipment_depreciation WHERE equipment_id = ?', [equipmentId]);
  if (!dep) return null;

  const now = new Date();
  const calcDate = new Date(dep.calculation_date);
  const yearsElapsed = (now - calcDate) / (365 * 24 * 60 * 60 * 1000);
  const accumulatedDep = Math.min(yearsElapsed * dep.annual_depreciation, dep.purchase_price - dep.salvage_value);
  const currentBook = Math.max(dep.purchase_price - accumulatedDep, dep.salvage_value);
  const nextCalc = new Date(now);
  nextCalc.setFullYear(nextCalc.getFullYear() + 1);

  db.run(
    `UPDATE equipment_depreciation SET 
      accumulated_depreciation = ?, current_book_value = ?, 
      calculation_date = ?, next_calculation_date = ?, updated_at = ? 
    WHERE id = ?`,
    [Math.round(accumulatedDep * 100) / 100, Math.round(currentBook * 100) / 100,
     now.toISOString().split('T')[0], nextCalc.toISOString().split('T')[0], now.toISOString(), dep.id]
  );

  // Update equipment current value
  db.run('UPDATE equipment_inventory SET current_value = ?, updated_at = ? WHERE id = ?',
    [Math.round(currentBook * 100) / 100, now.toISOString(), equipmentId]);

  return getOne('SELECT * FROM equipment_depreciation WHERE id = ?', [dep.id]);
}

function getDepreciation(equipmentId) {
  return getOne('SELECT ed.*, ei.equipment_name, ei.purchase_price FROM equipment_depreciation ed LEFT JOIN equipment_inventory ei ON ed.equipment_id = ei.id WHERE ed.equipment_id = ?', [equipmentId]);
}

// ========== COST TRACKING FUNCTIONS ==========

function trackCost(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const totalCost = (data.fuel_cost || 0) + (data.maintenance_cost || 0) + 
                   (data.labor_cost || 0) + (data.parts_cost || 0) +
                   (data.depreciation_cost || 0) + (data.insurance_cost || 0) + (data.other_cost || 0);

  const values = [
    id, data.farm_id || null, data.equipment_id, data.cost_type,
    data.period_start, data.period_end, data.fuel_cost || 0, data.maintenance_cost || 0,
    data.labor_cost || 0, data.parts_cost || 0, data.depreciation_cost || 0,
    data.insurance_cost || 0, data.other_cost || 0, totalCost, data.notes || '', now
  ];

  db.run(
    `INSERT INTO equipment_cost_tracking (
      id, farm_id, equipment_id, cost_type, period_start, period_end,
      fuel_cost, maintenance_cost, labor_cost, parts_cost, depreciation_cost,
      insurance_cost, other_cost, total_cost, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM equipment_cost_tracking WHERE id = ?', [id]);
}

function getCostByEquipment(farmId, equipmentId, startDate, endDate) {
  let query = 'SELECT ect.*, ei.equipment_name FROM equipment_cost_tracking ect LEFT JOIN equipment_inventory ei ON ect.equipment_id = ei.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND ect.farm_id = ?'; params.push(farmId); }
  if (equipmentId) { query += ' AND ect.equipment_id = ?'; params.push(equipmentId); }
  if (startDate) { query += ' AND ect.period_start >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND ect.period_end <= ?'; params.push(endDate); }
  query += ' ORDER BY ect.period_start DESC';
  return getAll(query, params);
}

// ========== AI MAINTENANCE PREDICTION ==========

function predictMaintenance(equipmentId, daysAhead = 30) {
  const equipment = getOne('SELECT * FROM equipment_inventory WHERE id = ?', [equipmentId]);
  if (!equipment) return { error: 'Equipment not found' };

  // Get maintenance history
  const history = getAll('SELECT * FROM equipment_maintenance_records WHERE equipment_id = ? ORDER BY maintenance_date DESC LIMIT 10', [equipmentId]);
  
  // Get usage hours
  const usage = getAll('SELECT SUM(duration_hours) as total_hours FROM equipment_usage_logs WHERE equipment_id = ?', [equipmentId]);
  const totalHours = (usage[0] && usage[0].total_hours) || 0;

  // Calculate predicted failure probability based on:
  // 1. Age of equipment
  // 2. Usage hours
  // 3. Maintenance history frequency
  // 4. Current condition
  
  let riskScore = 0;
  const now = new Date();
  
  // Age factor
  if (equipment.purchase_date) {
    const purchaseDate = new Date(equipment.purchase_date);
    const ageYears = (now - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
    riskScore += Math.min(ageYears * 10, 30);
  }

  // Usage hours factor (assuming 1000 hours/year is normal)
  if (totalHours > 1000) {
    riskScore += Math.min((totalHours - 1000) / 100, 20);
  }

  // Maintenance frequency
  if (history.length > 5) {
    riskScore += 15;
  }

  // Condition factor
  const conditionScores = { good: 0, fair: 15, poor: 30, critical: 50 };
  riskScore += conditionScores[equipment.condition] || 0;

  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 70) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';

  // Recommended maintenance date
  const recommendedDate = new Date();
  if (riskLevel === 'critical') recommendedDate.setDate(recommendedDate.getDate() + 7);
  else if (riskLevel === 'high') recommendedDate.setDate(recommendedDate.getDate() + 14);
  else recommendedDate.setDate(recommendedDate.getDate() + 30);

  // Estimate cost based on historical average
  const avgCost = history.length > 0 
    ? history.reduce((sum, h) => sum + (h.total_cost || 0), 0) / history.length 
    : equipment.purchase_price ? equipment.purchase_price * 0.1 : 500000;

  return {
    equipment_id: equipmentId,
    equipment_name: equipment.equipment_name,
    risk_level: riskLevel,
    risk_score: Math.round(riskScore),
    total_hours_used: Math.round(totalHours),
    maintenance_count: history.length,
    recommended_maintenance_date: recommendedDate.toISOString().split('T')[0],
    estimated_cost: Math.round(avgCost),
    prediction_confidence: history.length > 5 ? 'high' : 'medium',
    factors: {
      age_factor: ageYears ? Math.round(ageYears * 10) : 0,
      usage_factor: totalHours > 1000 ? Math.round((totalHours - 1000) / 100) : 0,
      condition_factor: conditionScores[equipment.condition] || 0
    }
  };
}

// ========== STATISTICS FUNCTIONS ==========

/**
 * Lấy thống kê thiết bị
 * @param {string} [farmId] - ID farm
 * @param {string} [startDate] - Ngày bắt đầu
 * @param {string} [endDate] - Ngày kết thúc
 * @returns {Object} Thống kê thiết bị
 */
function getEquipmentStats(farmId, startDate, endDate) {
  const stats = {
    total_equipment: 0,
    active_equipment: 0,
    under_maintenance: 0,
    broken: 0,
    available: 0,
    in_use: 0,
    total_usage_hours: 0,
    total_maintenance_cost: 0,
    total_fuel_cost: 0,
    upcoming_maintenance: 0,
    predicted_failures: 0
  };

  // Equipment counts
  const equipment = getAll('SELECT status, COUNT(*) as count FROM equipment_inventory WHERE farm_id = ? GROUP BY status', [farmId]);
  equipment.forEach(e => {
    stats.total_equipment += e.count;
    if (e.status === 'active') stats.active_equipment += e.count;
    if (e.status === 'under_maintenance') stats.under_maintenance += e.count;
    if (e.status === 'broken') stats.broken += e.count;
    if (e.status === 'available') stats.available += e.count;
    if (e.status === 'in_use') stats.in_use += e.count;
  });

  // Usage hours
  const usage = getAll('SELECT SUM(duration_hours) as total FROM equipment_usage_logs WHERE farm_id = ?', [farmId]);
  stats.total_usage_hours = Math.round((usage[0] && usage[0].total) || 0);

  // Maintenance costs
  const maintCosts = getAll('SELECT SUM(total_cost) as total FROM equipment_maintenance_records WHERE farm_id = ?', [farmId]);
  stats.total_maintenance_cost = Math.round((maintCosts[0] && maintCosts[0].total) || 0);

  // Fuel costs
  const fuelCosts = getAll('SELECT SUM(fuel_cost) as total FROM equipment_cost_tracking WHERE farm_id = ?', [farmId]);
  stats.total_fuel_cost = Math.round((fuelCosts[0] && fuelCosts[0].total) || 0);

  // Upcoming maintenance (next 30 days)
  const upcoming = getAll("SELECT COUNT(*) as count FROM equipment_maintenance_schedules WHERE farm_id = ? AND next_maintenance_date <= date('now', '+30 days')", [farmId]);
  stats.upcoming_maintenance = (upcoming[0] && upcoming[0].count) || 0;

  // Predicted failures (high/critical risk)
  const equipmentList = getAll('SELECT id FROM equipment_inventory WHERE farm_id = ?', [farmId]);
  let predictedFailures = 0;
  equipmentList.forEach(e => {
    const pred = predictMaintenance(e.id, 30);
    if (pred.risk_level === 'high' || pred.risk_level === 'critical') {
      predictedFailures++;
    }
  });
  stats.predicted_failures = predictedFailures;

  return stats;
}

// ========== QR CODE FUNCTIONS ==========

function generateEquipmentQR(equipmentId) {
  const equipment = getOne('SELECT * FROM equipment_inventory WHERE id = ?', [equipmentId]);
  if (!equipment) return null;

  const qrData = JSON.stringify({
    type: 'EQUIPMENT',
    id: equipment.equipment_code,
    name: equipment.equipment_name,
    brand: equipment.brand,
    model: equipment.model,
    status: equipment.status,
    condition: equipment.condition,
    purchase_date: equipment.purchase_date,
    warranty: equipment.warranty_expiry
  });

  return qrData;
}

// ========== EXPORT ALL FUNCTIONS ==========

module.exports = {
export default module.exports;
  EQUIPMENT_TYPES,
  EQUIPMENT_STATUS,
  MAINTENANCE_TYPES,
  
  // Categories
  createCategory,
  getCategories,
  
  // Equipment Inventory
  createEquipment,
  getEquipment,
  getEquipmentById,
  updateEquipment,
  deleteEquipment,
  
  // Maintenance
  createMaintenanceSchedule,
  getMaintenanceSchedules,
  createMaintenanceRecord,
  getMaintenanceRecords,
  
  // Usage
  logUsage,
  getUsageLogs,
  
  // Assignment
  assignEquipment,
  returnEquipment,
  getAssignments,
  
  // Depreciation
  createDepreciation,
  updateDepreciation,
  getDepreciation,
  
  // Cost Tracking
  trackCost,
  getCostByEquipment,
  
  // AI Prediction
  predictMaintenance,
  
  // Statistics
  getEquipmentStats,
  
  // QR Code
  generateEquipmentQR
};