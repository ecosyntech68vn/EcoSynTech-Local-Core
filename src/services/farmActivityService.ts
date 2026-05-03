/**
 * Farm Activity Service - Quản lý hoạt động nông nghiệp
 * V5.1.0 - Ghi nhận các sự kiện thủ công: phun thuốc, bón phân, cắt tỉa, tiêm phòng...
 * 
 * Features:
 * - Ghi nhận hoạt động nông nghiệp thủ công
 * - Tự động sync vào traceability stages
 * - Tích hợp với dashboard để người dùng nhập liệu
 * - Tái sử dụng dữ liệu cho báo cáo và phân tích
 */

import { v4 as uuidv4 } from 'uuid'
import { getOne, getAll, db } from '../config/database'
import logger from '../config/logger'

const ACTIVITY_TYPES = {
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

const FERTILIZER_TYPES = {
  npk: { label: 'NPK', unit: 'kg' },
  urea: { label: 'Urea', unit: 'kg' },
  dap: { label: 'DAP', unit: 'kg' },
  kali: { label: 'Kali', unit: 'kg' },
  organic: { label: 'Phân hữu cơ', unit: 'kg' },
  compost: { label: 'Compost', unit: 'kg' },
  manure: { label: 'Phân bò', unit: 'kg' },
  chicken: { label: 'Phân gà', unit: 'kg' },
  seaweed: { label: 'Rong biển', unit: 'kg' },
  bio: { label: 'Phân sinh học', unit: 'kg' }
};

const PESTICIDE_TYPES = {
  insecticide: { label: 'Thuốc trừ sâu', unit: 'lit' },
  fungicide: { label: 'Thuốc trừ nấm', unit: 'lit' },
  herbicide: { label: 'Thuốc cỏ', unit: 'lit' },
  bactericide: { label: 'Thuốc trừ vi khuẩn', unit: 'lit' },
  growth_regulator: { label: 'Chất điều hòa sinh trưởng', unit: 'lit' },
  foliar: { label: 'Phân bón lá', unit: 'lit' }
};

function createActivity(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const activityDate = data.activity_date || now.split('T')[0];

  let traceabilityBatchId = data.traceability_batch_id;

  if (!traceabilityBatchId && data.source_id) {
    const batch = data.source_type === 'crop'
      ? getOne('SELECT id FROM traceability_batches WHERE source_planting_id = ?', [data.source_id])
      : getOne('SELECT id FROM traceability_batches WHERE source_aquaculture_id = ?', [data.source_id]);
    
    if (batch) {
      traceabilityBatchId = batch.id;
    }
  }

  const inputsJson = JSON.stringify(data.inputs || []);

  db.run(`
    INSERT INTO farm_activities (
      id, farm_id, source_type, source_id, traceability_batch_id,
      activity_type, activity_name, activity_date, description,
      inputs, dosage, unit, cost, performed_by, notes, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.source_type, data.source_id,
    traceabilityBatchId, data.activity_type, data.activity_name || ACTIVITY_TYPES[data.activity_type]?.label || 'Hoạt động',
    activityDate, data.description || '', inputsJson, data.dosage || '', data.unit || '',
    data.cost || 0, data.performed_by || '', data.notes || '', 'completed', now, now
  ]);

  logger.info(`Tạo hoạt động nông nghiệp: ${data.activity_type} - ${data.activity_name}`);

  if (traceabilityBatchId) {
    addActivityToTraceability(traceabilityBatchId, data.activity_type, data.activity_name || ACTIVITY_TYPES[data.activity_type]?.label, activityDate, data.inputs, data.notes);
  }

  return {
    id,
    activity_type: data.activity_type,
    activity_name: data.activity_name || ACTIVITY_TYPES[data.activity_type]?.label,
    activity_date: activityDate,
    traceability_batch_id: traceabilityBatchId
  };
}

function addActivityToTraceability(batchId, activityType, activityName, activityDate, inputs, notes) {
  const stageType = ACTIVITY_TYPES[activityType]?.stageType || 'maintenance';
  
  const existingStage = getOne(
    'SELECT id FROM traceability_stages WHERE batch_id = ? AND stage_type = ? AND DATE(created_at) = ?',
    [batchId, stageType, activityDate]
  );

  if (existingStage) {
    const existingNotes = getOne('SELECT notes FROM traceability_stages WHERE id = ?', [existingStage.id]);
    const newNotes = existingNotes?.notes ? `${existingNotes.notes}\n- ${activityName}: ${notes || ''}` : `- ${activityName}: ${notes || ''}`;
    
    db.run('UPDATE traceability_stages SET notes = ?, updated_at = ? WHERE id = ?', 
      [newNotes, new Date().toISOString(), existingStage.id]);
    
    return { updated: true, stage_id: existingStage.id };
  }

  const maxOrder = getOne('SELECT MAX(stage_order) as max_order FROM traceability_stages WHERE batch_id = ?', [batchId]);
  
  const stageId = uuidv4();
  db.run(`
    INSERT INTO traceability_stages (
      id, batch_id, stage_name, stage_type, stage_order, description, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [stageId, batchId, activityName, stageType, (maxOrder?.max_order || 0) + 1, 
    `Hoạt động: ${activityName}`, notes || '', activityDate]);

  logger.info(`Thêm hoạt động vào traceability: ${activityName}`);

  return { created: true, stage_id: stageId };
}

function getActivitiesBySource(sourceType, sourceId) {
  return getAll(`
    SELECT * FROM farm_activities 
    WHERE source_type = ? AND source_id = ? 
    ORDER BY activity_date DESC
  `, [sourceType, sourceId]);
}

function getActivitiesByBatch(batchId) {
  return getAll(`
    SELECT * FROM farm_activities 
    WHERE traceability_batch_id = ? 
    ORDER BY activity_date DESC
  `, [batchId]);
}

function getActivitiesByFarm(farmId, filters = {}) {
  let query = 'SELECT fa.*, tb.batch_code FROM farm_activities fa LEFT JOIN traceability_batches tb ON fa.traceability_batch_id = tb.id WHERE fa.farm_id = ?';
  const params = [farmId];

  if (filters.activity_type) {
    query += ' AND fa.activity_type = ?';
    params.push(filters.activity_type);
  }
  if (filters.start_date) {
    query += ' AND fa.activity_date >= ?';
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    query += ' AND fa.activity_date <= ?';
    params.push(filters.end_date);
  }

  query += ' ORDER BY fa.activity_date DESC';

  return getAll(query, params);
}

function updateActivity(activityId, data) {
  const existing = getOne('SELECT * FROM farm_activities WHERE id = ?', [activityId]);
  if (!existing) return null;

  const updates = [];
  const params = [];

  if (data.activity_name) { updates.push('activity_name = ?'); params.push(data.activity_name); }
  if (data.activity_date) { updates.push('activity_date = ?'); params.push(data.activity_date); }
  if (data.description) { updates.push('description = ?'); params.push(data.description); }
  if (data.inputs) { updates.push('inputs = ?'); params.push(JSON.stringify(data.inputs)); }
  if (data.dosage) { updates.push('dosage = ?'); params.push(data.dosage); }
  if (data.unit) { updates.push('unit = ?'); params.push(data.unit); }
  if (data.cost !== undefined) { updates.push('cost = ?'); params.push(data.cost); }
  if (data.performed_by) { updates.push('performed_by = ?'); params.push(data.performed_by); }
  if (data.notes) { updates.push('notes = ?'); params.push(data.notes); }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(activityId);

  db.run(`UPDATE farm_activities SET ${updates.join(', ')} WHERE id = ?`, params);

  logger.info(`Cập nhật hoạt động: ${activityId}`);

  return getOne('SELECT * FROM farm_activities WHERE id = ?', [activityId]);
}

function deleteActivity(activityId) {
  const existing = getOne('SELECT * FROM farm_activities WHERE id = ?', [activityId]);
  if (!existing) return false;

  db.run('DELETE FROM farm_activities WHERE id = ?', [activityId]);

  logger.info(`Xóa hoạt động: ${activityId}`);

  return true;
}

function getActivityStats(farmId = null, period = 'month') {
  let whereClause = '';
  const params = [];

  if (farmId) {
    whereClause = ' WHERE farm_id = ?';
    params.push(farmId);
  }

  const total = getOne(`SELECT COUNT(*) as count FROM farm_activities${whereClause}`, params);

  const byType = getAll(`
    SELECT activity_type, activity_name, COUNT(*) as count, SUM(cost) as total_cost
    FROM farm_activities${whereClause ? whereClause + ' AND' : ' WHERE'} 1=1
    GROUP BY activity_type
  `, params);

  const byMonth = getAll(`
    SELECT strftime('%Y-%m', activity_date) as month, COUNT(*) as count, SUM(cost) as cost
    FROM farm_activities${whereClause ? whereClause + ' AND' : ' WHERE'} 1=1
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  const totalCost = getOne(`SELECT SUM(cost) as total FROM farm_activities${whereClause}`, params);

  return {
    total_activities: total?.count || 0,
    total_cost: totalCost?.total || 0,
    by_type: byType,
    by_month: byMonth
  };
}

function getActivitiesTimeline(sourceType, sourceId) {
  const activities = getAll(`
    SELECT fa.*, 
           tb.batch_code,
           (fa.activity_date || 'T00:00:00') as timeline_date
    FROM farm_activities fa 
    LEFT JOIN traceability_batches tb ON fa.traceability_batch_id = tb.id
    WHERE fa.source_type = ? AND fa.source_id = ?
    ORDER BY fa.activity_date ASC
  `, [sourceType, sourceId]);

  return activities.map(a => ({
    id: a.id,
    type: a.activity_type,
    name: a.activity_name,
    date: a.activity_date,
    description: a.description,
    inputs: JSON.parse(a.inputs || '[]'),
    dosage: a.dosage,
    cost: a.cost,
    performed_by: a.performed_by,
    batch_code: a.batch_code,
    icon: ACTIVITY_TYPES[a.activity_type]?.icon || '📝'
  }));
}

module.exports = {
export default module.exports;
  createActivity,
  getActivitiesBySource,
  getActivitiesByBatch,
  getActivitiesByFarm,
  updateActivity,
  deleteActivity,
  getActivityStats,
  getActivitiesTimeline,
  ACTIVITY_TYPES,
  FERTILIZER_TYPES,
  PESTICIDE_TYPES
};