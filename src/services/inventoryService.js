/**
 * Inventory Service - Quản lý kho vật liệu nông nghiệp
 * V5.1.0
 * 
 * Features:
 * - Quản lý kho vật tư (hạt giống, phân bón, thuốc, thức ăn)
 * - Theo dõi tồn kho theo lô
 * - Nhập/xuất kho với transaction history
 * - Cảnh báo tồn kho thấp
 * - Tích hợp với farm activities để trừ khi sử dụng
 * - Traceability vật tư: dùng lô nào cho vụ nào
 */

const { v4: uuidv4 } = require('uuid');
const { getOne, getAll, db } = require('../config/database');
const logger = require('../config/logger');
const alertService = require('./alertService');

const INVENTORY_CATEGORIES = {
  seeds: { label: 'Hạt giống', icon: '🌱', unit: 'kg' },
  fertilizer: { label: 'Phân bón', icon: '🌿', unit: 'kg' },
  pesticide: { label: 'Thuốc BVTV', icon: '💧', unit: 'lit' },
  herbicide: { label: 'Thuốc cỏ', icon: '🌾', unit: 'lit' },
  fungicide: { label: 'Thuốc trừ nấm', icon: '🍄', unit: 'lit' },
  feed: { label: 'Thức ăn chăn nuôi', icon: '🐄', unit: 'kg' },
  veterinary: { label: 'Thuốc thú y', icon: '💉', unit: 'lit' },
  other: { label: 'Vật tư khác', icon: '📦', unit: 'pcs' }
};

const TRANSACTION_TYPES = {
  import: { label: 'Nhập kho', icon: '📥' },
  export: { label: 'Xuất kho', icon: '📤' },
  adjustment: { label: 'Điều chỉnh', icon: '🔄' },
  return: { label: 'Trả lại', icon: '↩️' },
  discard: { label: 'Hủy bỏ', icon: '🗑️' }
};

function createItem(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const category = INVENTORY_CATEGORIES[data.category] 
    ? data.category 
    : 'other';
  const defaultUnit = INVENTORY_CATEGORIES[category]?.unit || 'pcs';

  db.run(`
    INSERT INTO inventory_items (
      id, farm_id, item_code, item_name, item_name_vi, category, unit,
      min_stock_alert, current_stock, cost_per_unit, supplier, supplier_contact,
      expiry_days, storage_conditions, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.item_code || `ITEM-${Date.now()}`,
    data.item_name, data.item_name_vi || data.item_name, category,
    data.unit || defaultUnit, data.min_stock_alert || 10, 
    data.current_stock || 0, data.cost_per_unit || 0,
    data.supplier || '', data.supplier_contact || '',
    data.expiry_days || null, data.storage_conditions || '',
    data.notes || '', 'active', now, now
  ]);

  logger.info(`Tạo vật tư mới: ${data.item_name} (${category})`);

  return getOne('SELECT * FROM inventory_items WHERE id = ?', [id]);
}

function getItems(farmId = null, category = null, status = null) {
  let query = 'SELECT * FROM inventory_items WHERE 1=1';
  const params = [];

  if (farmId) {
    query += ' AND farm_id = ?';
    params.push(farmId);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY category, item_name';
  return getAll(query, params);
}

function getItemById(itemId) {
  return getOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
}

function updateItem(itemId, data) {
  const existing = getOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
  if (!existing) return null;

  const updates = [];
  const params = [];

  if (data.item_name) { updates.push('item_name = ?'); params.push(data.item_name); }
  if (data.item_name_vi) { updates.push('item_name_vi = ?'); params.push(data.item_name_vi); }
  if (data.unit) { updates.push('unit = ?'); params.push(data.unit); }
  if (data.min_stock_alert !== undefined) { updates.push('min_stock_alert = ?'); params.push(data.min_stock_alert); }
  if (data.cost_per_unit !== undefined) { updates.push('cost_per_unit = ?'); params.push(data.cost_per_unit); }
  if (data.supplier) { updates.push('supplier = ?'); params.push(data.supplier); }
  if (data.supplier_contact) { updates.push('supplier_contact = ?'); params.push(data.supplier_contact); }
  if (data.expiry_days) { updates.push('expiry_days = ?'); params.push(data.expiry_days); }
  if (data.storage_conditions) { updates.push('storage_conditions = ?'); params.push(data.storage_conditions); }
  if (data.notes) { updates.push('notes = ?'); params.push(data.notes); }
  if (data.status) { updates.push('status = ?'); params.push(data.status); }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(itemId);

  db.run(`UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`, params);

  return getOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
}

function deleteItem(itemId) {
  const existing = getOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
  if (!existing) return false;

  db.run('UPDATE inventory_items SET status = ? WHERE id = ?', ['deleted', itemId]);
  logger.info(`Xóa vật tư: ${itemId}`);
  return true;
}

function importStock(data) {
  const item = getOne('SELECT * FROM inventory_items WHERE id = ?', [data.item_id]);
  if (!item) throw new Error('Không tìm thấy vật tư');

  const transId = uuidv4();
  const now = new Date().toISOString();
  const transDate = data.transaction_date || now.split('T')[0];
  const totalCost = (data.quantity || 0) * (data.unit_cost || item.cost_per_unit || 0);

  db.run(`
    INSERT INTO inventory_transactions (
      id, farm_id, item_id, transaction_type, quantity, unit, unit_cost,
      total_cost, transaction_date, reference_number, source_type, source_id,
      performed_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    transId, data.farm_id || null, data.item_id, 'import',
    data.quantity, item.unit, data.unit_cost || item.cost_per_unit,
    totalCost, transDate, data.reference_number || '',
    data.source_type || '', data.source_id || '',
    data.performed_by || '', data.notes || '', now
  ]);

  const newStock = (item.current_stock || 0) + (data.quantity || 0);
  db.run('UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ?',
    [newStock, now, data.item_id]);

  if (data.create_batch && data.expiry_date) {
    createBatch({
      farm_id: data.farm_id,
      item_id: data.item_id,
      quantity_initial: data.quantity,
      quantity_remaining: data.quantity,
      unit_cost: data.unit_cost || item.cost_per_unit,
      import_date: transDate,
      expiry_date: data.expiry_date,
      supplier_batch: data.supplier_batch || ''
    });
  }

  logger.info(`Nhập kho: ${item.item_name} +${data.quantity} ${item.unit}`);

  return {
    transaction_id: transId,
    item_id: data.item_id,
    item_name: item.item_name,
    quantity: data.quantity,
    new_stock: newStock,
    transaction_date: transDate
  };
}

function exportStock(data) {
  const item = getOne('SELECT * FROM inventory_items WHERE id = ?', [data.item_id]);
  if (!item) throw new Error('Không tìm thấy vật tư');

  if ((item.current_stock || 0) < (data.quantity || 0)) {
    throw new Error(`Tồn kho không đủ: ${item.current_stock} ${item.unit} < ${data.quantity}`);
  }

  const transId = uuidv4();
  const now = new Date().toISOString();
  const transDate = data.transaction_date || now.split('T')[0];
  const totalCost = (data.quantity || 0) * (item.cost_per_unit || 0);

  db.run(`
    INSERT INTO inventory_transactions (
      id, farm_id, item_id, transaction_type, quantity, unit, unit_cost,
      total_cost, transaction_date, reference_number, source_type, source_id,
      performed_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    transId, data.farm_id || null, data.item_id, 'export',
    data.quantity, item.unit, item.cost_per_unit,
    totalCost, transDate, data.reference_number || '',
    data.source_type || 'crop', data.source_id || '',
    data.performed_by || '', data.notes || '', now
  ]);

  const newStock = (item.current_stock || 0) - (data.quantity || 0);
  db.run('UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ?',
    [newStock, now, data.item_id]);

  const batch = getOne(
    'SELECT * FROM inventory_batches WHERE item_id = ? AND quantity_remaining > 0 AND status = ? ORDER BY import_date ASC LIMIT 1',
    [data.item_id, 'active']
  );

  if (batch) {
    const usedQty = Math.min(data.quantity || 0, batch.quantity_remaining);
    db.run(
      'UPDATE inventory_batches SET quantity_remaining = quantity_remaining - ?, updated_at = ? WHERE id = ?',
      [usedQty, now, batch.id]
    );
  }

  if (data.source_type && data.source_id) {
    logUsageInActivity(data.item_id, data.source_type, data.source_id, data.quantity, data.notes);
  }

  logger.info(`Xuất kho: ${item.item_name} -${data.quantity} ${item.unit}`);

  return {
    transaction_id: transId,
    item_id: data.item_id,
    item_name: item.item_name,
    quantity: data.quantity,
    new_stock: newStock,
    transaction_date: transDate
  };
}

function logUsageInActivity(itemId, sourceType, sourceId, quantity, notes) {
  const item = getOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
  if (!item) return;

  const inputs = [{
    name: item.item_name,
    quantity: quantity,
    unit: item.unit,
    category: item.category
  }];

  const { getOne: getOneDB, runQuery } = require('../config/database');

  const activityType = item.category === 'seeds' ? 'seeding' :
    item.category === 'fertilizer' ? 'fertilizer' :
      item.category === 'pesticide' || item.category === 'herbicide' || item.category === 'fungicide' ? 'spray' :
        item.category === 'feed' ? 'feeding' : 'other';

  const activityName = `${INVENTORY_CATEGORIES[item.category]?.label || 'Vật tư'}: ${item.item_name}`;

  try {
    const { farmActivityService } = require('./farmActivityService');
    farmActivityService.createActivity({
      source_type: sourceType,
      source_id: sourceId,
      activity_type: activityType,
      activity_name: activityName,
      activity_date: new Date().toISOString().split('T')[0],
      description: `Sử dụng vật tư: ${quantity} ${item.unit}`,
      inputs: inputs,
      dosage: quantity.toString(),
      unit: item.unit,
      cost: quantity * (item.cost_per_unit || 0),
      notes: notes
    });
  } catch (err) {
    logger.warn(`Không ghi nhận vào farm activities: ${err.message}`);
  }
}

function getTransactions(itemId = null, farmId = null, startDate = null, endDate = null) {
  let query = 'SELECT it.*, ii.item_name, ii.category, ii.unit FROM inventory_transactions it LEFT JOIN inventory_items ii ON it.item_id = ii.id WHERE 1=1';
  const params = [];

  if (itemId) {
    query += ' AND it.item_id = ?';
    params.push(itemId);
  }
  if (farmId) {
    query += ' AND it.farm_id = ?';
    params.push(farmId);
  }
  if (startDate) {
    query += ' AND it.transaction_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND it.transaction_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY it.transaction_date DESC, it.created_at DESC';
  return getAll(query, params);
}

function createBatch(data) {
  const batchId = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO inventory_batches (
      id, farm_id, item_id, batch_code, import_date, expiry_date,
      quantity_initial, quantity_remaining, unit_cost, supplier_batch,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId, data.farm_id || null, data.item_id,
    data.batch_code || `BATCH-${Date.now()}`,
    data.import_date || now.split('T')[0],
    data.expiry_date || null,
    data.quantity_initial || 0,
    data.quantity_remaining || data.quantity_initial || 0,
    data.unit_cost || 0,
    data.supplier_batch || '',
    'active', now, now
  ]);

  logger.info(`Tạo lô vật tư: ${data.batch_code}`);

  return getOne('SELECT * FROM inventory_batches WHERE id = ?', [batchId]);
}

function getBatches(itemId = null, farmId = null) {
  let query = 'SELECT ib.*, ii.item_name, ii.category FROM inventory_batches ib LEFT JOIN inventory_items ii ON ib.item_id = ii.id WHERE 1=1';
  const params = [];

  if (itemId) {
    query += ' AND ib.item_id = ?';
    params.push(itemId);
  }
  if (farmId) {
    query += ' AND ib.farm_id = ?';
    params.push(farmId);
  }

  query += ' ORDER BY ib.import_date DESC';
  return getAll(query, params);
}

function getLowStockItems(farmId = null) {
  let query = `
    SELECT * FROM inventory_items 
    WHERE current_stock <= min_stock_alert AND status = 'active'`;
  const params = [];

  if (farmId) {
    query += ' AND farm_id = ?';
    params.push(farmId);
  }

  query += ' ORDER BY current_stock ASC';

  const items = getAll(query, params);

  if (items.length > 0) {
    try {
      alertService.sendAlert({
        type: 'low_stock',
        title: '⚠️ Cảnh báo tồn kho thấp',
        message: `${items.length} vật tư có tồn kho thấp:\n${items.map(i => `- ${i.item_name}: ${i.current_stock} ${i.unit}`).join('\n')}`,
        priority: 'high'
      });
    } catch (err) {
      logger.warn(`Không gửi được cảnh báo: ${err.message}`);
    }
  }

  return items;
}

function getInventoryStats(farmId = null) {
  let baseWhere = farmId ? `WHERE farm_id = ? AND status = 'active'` : `WHERE status = 'active'`;
  let params = farmId ? [farmId] : [];
  
  const totalItems = getOne(`SELECT COUNT(*) as count FROM inventory_items ${baseWhere}`, params);
  
  const byCategory = getAll(`
    SELECT category, 
           COUNT(*) as item_count, 
           COALESCE(SUM(current_stock), 0) as total_quantity,
           COALESCE(SUM(current_stock * cost_per_unit), 0) as total_value
    FROM inventory_items 
    WHERE ${farmId ? 'farm_id = ? AND' : ''} status = 'active'
    GROUP BY category
  `, farmId ? [farmId] : []);
  
  const totalValue = getOne(`
    SELECT COALESCE(SUM(current_stock * cost_per_unit), 0) as total 
    FROM inventory_items 
    WHERE ${farmId ? 'farm_id = ? AND' : ''} status = 'active'
  `, farmId ? [farmId] : []);
  
  const lowStock = getOne(`
    SELECT COUNT(*) as count 
    FROM inventory_items 
    WHERE ${farmId ? 'farm_id = ? AND' : ''} (current_stock IS NULL OR current_stock <= COALESCE(min_stock_alert, 10)) AND status = 'active'
  `, farmId ? [farmId] : []);

  const expiringSoon = getOne(`
    SELECT COUNT(*) as count FROM inventory_batches ib
    LEFT JOIN inventory_items ii ON ib.item_id = ii.id
    WHERE ib.status = 'active' AND ib.quantity_remaining > 0
    AND ib.expiry_date IS NOT NULL 
    AND date(ib.expiry_date) <= date('now', '+30 days')
    ${farmId ? `AND ii.farm_id = '${farmId}'` : ''}
  `);

  return {
    total_items: totalItems?.count || 0,
    total_value: totalValue?.total || 0,
    by_category: byCategory,
    low_stock_count: lowStock?.count || 0,
    expiring_soon_count: expiringSoon?.count || 0
  };
}

function getItemUsageBySource(itemId, sourceType, sourceId) {
  return getAll(`
    SELECT * FROM inventory_transactions 
    WHERE item_id = ? AND source_type = ? AND source_id = ?
    ORDER BY transaction_date DESC
  `, [itemId, sourceType, sourceId]);
}

function createSupplier(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`
    INSERT INTO inventory_suppliers (
      id, farm_id, supplier_code, supplier_name, contact_name, phone, email,
      address, tax_code, payment_terms, rating, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.supplier_code || `SUP-${Date.now()}`,
    data.supplier_name, data.contact_name || '', data.phone || '', data.email || '',
    data.address || '', data.tax_code || '', data.payment_terms || '',
    data.rating || 3, data.notes || '', 'active', now, now
  ]);
  logger.info(`Tạo nhà cung cấp: ${data.supplier_name}`);
  return getOne('SELECT * FROM inventory_suppliers WHERE id = ?', [id]);
}

function getSuppliers(farmId = null) {
  let query = 'SELECT * FROM inventory_suppliers WHERE status = ?';
  const params = ['active'];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  query += ' ORDER BY supplier_name';
  return getAll(query, params);
}

function updateSupplierRating(supplierId, orderValue) {
  const supplier = getOne('SELECT * FROM inventory_suppliers WHERE id = ?', [supplierId]);
  if (!supplier) return;
  
  const newTotalOrders = (supplier.total_orders || 0) + 1;
  const newTotalValue = (supplier.total_value || 0) + (orderValue || 0);
  
  db.run(`
    UPDATE inventory_suppliers SET 
      total_orders = ?, total_value = ?, updated_at = ?
    WHERE id = ?
  `, [newTotalOrders, newTotalValue, new Date().toISOString(), supplierId]);
}

function createPurchaseOrder(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  db.run(`
    INSERT INTO purchase_orders (
      id, farm_id, order_number, supplier_id, order_date, expected_delivery_date,
      status, total_amount, items_json, notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, orderNumber, data.supplier_id,
    data.order_date || now.split('T')[0], data.expected_delivery_date || null,
    'pending', data.total_amount || 0, JSON.stringify(data.items || []),
    data.notes || '', data.created_by || '', now, now
  ]);

  (data.items || []).forEach(item => {
    const itemId = getOne('SELECT id FROM inventory_items WHERE item_name = ?', [item.item_name])?.id;
    db.run(`
      INSERT INTO purchase_order_items (
        id, order_id, item_id, item_name, quantity_ordered, unit, unit_price, total_price, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuidv4(), id, itemId || null, item.item_name, item.quantity, item.unit || 'kg', item.unit_price || 0, item.total_price || 0, 'pending', now]);
  });

  if (data.supplier_id) {
    updateSupplierRating(data.supplier_id, data.total_amount);
  }

  logger.info(`Tạo đơn đặt hàng: ${orderNumber}`);
  return getOne('SELECT * FROM purchase_orders WHERE id = ?', [id]);
}

function getPurchaseOrders(farmId = null, status = null) {
  let query = `
    SELECT po.*, s.supplier_name 
    FROM purchase_orders po 
    LEFT JOIN inventory_suppliers s ON po.supplier_id = s.id
    WHERE 1=1`;
  const params = [];
  if (farmId) { query += ' AND po.farm_id = ?'; params.push(farmId); }
  if (status) { query += ' AND po.status = ?'; params.push(status); }
  query += ' ORDER BY po.order_date DESC';
  return getAll(query, params);
}

function receivePurchaseOrder(orderId, receivedItems) {
  const order = getOne('SELECT * FROM purchase_orders WHERE id = ?', [orderId]);
  if (!order) throw new Error('Không tìm thấy đơn hàng');

  const now = new Date().toISOString();
  
  (receivedItems || []).forEach(item => {
    db.run('UPDATE purchase_order_items SET quantity_received = ?, status = ? WHERE id = ?',
      [item.quantity_received, item.quantity_received >= item.quantity_ordered ? 'received' : 'partial', item.item_id]);

    if (item.quantity_received > 0) {
      importStock({
        item_id: item.item_id,
        quantity: item.quantity_received,
        unit_cost: item.unit_price,
        transaction_date: now.split('T')[0],
        reference_number: `PO-${order.order_number}`,
        create_batch: true,
        source_type: 'purchase_order',
        source_id: orderId
      });
    }
  });

  const allReceived = getAll('SELECT * FROM purchase_order_items WHERE order_id = ?', [orderId]);
  const allComplete = allReceived.every(i => i.status === 'received');
  const anyReceived = allReceived.some(i => i.quantity_received > 0);
  
  let newStatus = order.status;
  if (allComplete) newStatus = 'completed';
  else if (anyReceived) newStatus = 'partial';
  
  db.run('UPDATE purchase_orders SET status = ?, actual_delivery_date = ?, updated_at = ? WHERE id = ?',
    [newStatus, now.split('T')[0], now, orderId]);

  logger.info(`Nhận hàng PO: ${order.order_number}, status: ${newStatus}`);
  return { success: true, status: newStatus };
}

function createAudit(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const auditCode = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  db.run(`
    INSERT INTO inventory_audits (
      id, farm_id, audit_code, audit_date, audit_type, status, total_items,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, auditCode, data.audit_date || now.split('T')[0],
    data.audit_type || 'full', 'in_progress', data.total_items || 0,
    data.created_by || '', now, now
  ]);

  const items = getItems(data.farm_id, null, 'active');
  items.forEach(item => {
    db.run(`
      INSERT INTO inventory_audit_items (
        id, audit_id, item_id, system_quantity, physical_quantity, difference, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuidv4(), id, item.id, item.current_stock, null, null, 'pending', now]);
  });

  db.run('UPDATE inventory_audits SET total_items = ? WHERE id = ?', [items.length, id]);

  logger.info(`Tạo phiếu kiểm kê: ${auditCode}`);
  return { audit_id: id, audit_code: auditCode, total_items: items.length };
}

function submitAuditResult(auditId, results) {
  const audit = getOne('SELECT * FROM inventory_audits WHERE id = ?', [auditId]);
  if (!audit) throw new Error('Không tìm thấy phiếu kiểm kê');

  const now = new Date().toISOString();
  let matched = 0, discrepancies = 0;

  (results || []).forEach(r => {
    const diff = (r.physical_quantity || 0) - (r.system_quantity || 0);
    db.run(`
      UPDATE inventory_audit_items SET 
        physical_quantity = ?, difference = ?, status = ?, notes = ?
      WHERE id = ?
    `, [r.physical_quantity, diff, Math.abs(diff) < 0.01 ? 'matched' : 'discrepancy', r.notes || '', r.audit_item_id]);

    if (Math.abs(diff) < 0.01) matched++;
    else discrepancies++;
  });

  db.run(`
    UPDATE inventory_audits SET 
      status = ?, matched_items = ?, discrepancies = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `, ['completed', matched, discrepancies, audit.notes || '', now, auditId]);

  if (discrepancies > 0) {
    alertService.sendAlert({
      type: 'inventory_discrepancy',
      title: '⚠️ Phát hiện chênh lệch kiểm kê',
      message: `Phiếu ${audit.audit_code}: ${discrepancies} mặt hàng có chênh lệch`,
      priority: 'medium'
    });
  }

  logger.info(`Hoàn thành kiểm kê: ${audit.audit_code}, discrepancies: ${discrepancies}`);
  return { matched, discrepancies };
}

function getAuditHistory(farmId = null) {
  let query = 'SELECT * FROM inventory_audits WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  query += ' ORDER BY audit_date DESC';
  return getAll(query, params);
}

function predictDemand(itemId, months = 3) {
  const item = getOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
  if (!item) return null;

  const usageHistory = getAll(`
    SELECT strftime('%Y-%m', transaction_date) as month, 
           SUM(quantity) as total_quantity
    FROM inventory_transactions
    WHERE item_id = ? AND transaction_type = 'export'
    AND transaction_date >= date('now', '-12 months')
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `, [itemId]);

  if (usageHistory.length < 3) {
    return { 
      item_name: item.item_name, 
      message: 'Chưa đủ dữ liệu để dự báo (cần ít nhất 3 tháng)',
      recommended_order: item.min_stock_alert || 10
    };
  }

  const avgMonthly = usageHistory.reduce((sum, u) => sum + (u.total_quantity || 0), 0) / usageHistory.length;
  const trend = calculateTrend(usageHistory.map(u => u.total_quantity));
  const predictedDemand = avgMonthly * months * (1 + trend);
  const recommendedOrder = Math.max(0, predictedDemand - (item.current_stock || 0));

  const seasonFactor = getSeasonalFactor();
  const seasonalPrediction = predictedDemand * seasonFactor;

  return {
    item_name: item.item_name,
    current_stock: item.current_stock,
    avg_monthly_usage: Math.round(avgMonthly * 10) / 10,
    trend: Math.round(trend * 100) / 100,
    predicted_demand_3month: Math.round(predictedDemand),
    seasonal_prediction: Math.round(seasonalPrediction),
    recommended_order: Math.ceil(recommendedOrder),
    season_factor: seasonFactor,
    next_order_date: calculateReorderDate(item, recommendedOrder, avgMonthly)
  };
}

function calculateTrend(values) {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  return avgY > 0 ? slope / avgY : 0;
}

function getSeasonalFactor() {
  const month = new Date().getMonth();
  const rainyMonths = [5, 6, 7, 8, 9];
  if (rainyMonths.includes(month)) return 1.3;
  if (month === 10 || month === 11) return 1.1;
  return 1.0;
}

function calculateReorderDate(item, orderQty, avgMonthly) {
  if (avgMonthly <= 0 || orderQty <= 0) return null;
  const daysUntilStockout = (item.current_stock || 0) / (avgMonthly / 30);
  const deliveryDays = 7;
  const reorderDate = new Date();
  reorderDate.setDate(reorderDate.getDate() + Math.max(0, daysUntilStockout - deliveryDays));
  return reorderDate.toISOString().split('T')[0];
}

function getUsageByCrop(farmId = null) {
  let query = `
    SELECT 
      it.item_id,
      ii.item_name,
      ii.category,
      it.source_id,
      cp.crop_name as crop_name,
      SUM(it.quantity) as total_quantity,
      SUM(it.total_cost) as total_value,
      COUNT(DISTINCT it.source_id) as batch_count
    FROM inventory_transactions it
    LEFT JOIN inventory_items ii ON it.item_id = ii.id
    LEFT JOIN crop_plantings cp ON it.source_type = 'crop' AND it.source_id = cp.id
    WHERE it.transaction_type = 'export' AND it.source_type = 'crop'
  `;
  const params = [];
  if (farmId) { query += ' AND it.farm_id = ?'; params.push(farmId); }
  query += ' GROUP BY it.item_id, it.source_id ORDER BY total_value DESC';
  return getAll(query, params);
}

function getUsageByPeriod(farmId = null, startDate = null, endDate = null) {
  let query = `
    SELECT 
      strftime('%Y-%m', it.transaction_date) as period,
      ii.category,
      ii.item_name,
      SUM(it.quantity) as quantity,
      SUM(it.total_cost) as value
    FROM inventory_transactions it
    LEFT JOIN inventory_items ii ON it.item_id = ii.id
    WHERE it.transaction_type = 'export'
  `;
  const params = [];
  if (farmId) { query += ' AND it.farm_id = ?'; params.push(farmId); }
  if (startDate) { query += ' AND it.transaction_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND it.transaction_date <= ?'; params.push(endDate); }
  query += ' GROUP BY period, ii.category, ii.item_name ORDER BY period DESC, value DESC';
  return getAll(query, params);
}

function getExpiringItems(days = 30, farmId = null) {
  let query = `
    SELECT ib.*, ii.item_name, ii.category, ii.unit
    FROM inventory_batches ib
    LEFT JOIN inventory_items ii ON ib.item_id = ii.id
    WHERE ib.status = 'active' AND ib.quantity_remaining > 0
    AND ib.expiry_date IS NOT NULL 
    AND date(ib.expiry_date) <= date('now', '+' || ? || ' days')
  `;
  const params = [days];
  if (farmId) { query += ' AND ii.farm_id = ?'; params.push(farmId); }
  query += ' ORDER BY ib.expiry_date ASC';
  return getAll(query, params);
}

function createAlert(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`
    INSERT INTO inventory_alerts (
      id, farm_id, item_id, alert_type, title, message, threshold_value, current_value, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.farm_id || null, data.item_id || null, data.alert_type,
    data.title, data.message, data.threshold_value || null, data.current_value || null, now
  ]);
  return { id, ...data };
}

function getActiveAlerts(farmId = null, unresolved = true) {
  let query = 'SELECT ia.*, ii.item_name FROM inventory_alerts ia LEFT JOIN inventory_items ii ON ia.item_id = ii.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND ia.farm_id = ?'; params.push(farmId); }
  if (unresolved) { query += ' AND ia.is_resolved = 0'; }
  query += ' ORDER BY ia.created_at DESC';
  return getAll(query, params);
}

function resolveAlert(alertId, resolvedBy) {
  const now = new Date().toISOString();
  db.run('UPDATE inventory_alerts SET is_resolved = 1, resolved_at = ?, resolved_by = ? WHERE id = ?',
    [now, resolvedBy || 'system', alertId]);
  return { success: true, resolved_at: now };
}

function getPriceHistory(itemId) {
  return getAll(`
    SELECT transaction_date, unit_cost, total_cost, quantity, reference_number
    FROM inventory_transactions
    WHERE item_id = ? AND transaction_type = 'import'
    ORDER BY transaction_date DESC
    LIMIT 20
  `, [itemId]);
}

function getAverageCost(itemId) {
  const result = getOne(`
    SELECT AVG(unit_cost) as avg_cost, MIN(unit_cost) as min_cost, MAX(unit_cost) as max_cost
    FROM inventory_transactions
    WHERE item_id = ? AND transaction_type = 'import'
  `, [itemId]);
  return result;
}

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  importStock,
  exportStock,
  getTransactions,
  createBatch,
  getBatches,
  getLowStockItems,
  getInventoryStats,
  getItemUsageBySource,
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder,
  createAudit,
  submitAuditResult,
  getAuditHistory,
  predictDemand,
  getUsageByCrop,
  getUsageByPeriod,
  getExpiringItems,
  createAlert,
  getActiveAlerts,
  resolveAlert,
  getPriceHistory,
  getAverageCost,
  INVENTORY_CATEGORIES,
  TRANSACTION_TYPES
};