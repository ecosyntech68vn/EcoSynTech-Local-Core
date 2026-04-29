const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getAll, getOne, runQuery } = require('../config/database');
const inventoryService = require('../services/inventoryService');

router.get('/', auth, async (req, res) => {
  try {
    const { category, farm_id, low_stock } = req.query;
    let sql = 'SELECT * FROM inventory WHERE status = "active"';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (low_stock === 'true') { sql += ' AND quantity <= min_quantity'; }
    sql += ' ORDER BY name';
    
    const items = getAll(sql, params);
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const categories = getAll('SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL');
    res.json({ ok: true, data: categories.map(c => c.category) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    
    const logs = getAll(
      'SELECT * FROM inventory_log WHERE inventory_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ ok: true, data: { item, logs } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, unit, quantity, min_quantity, cost_per_unit, supplier, farm_id, expiry_date } = req.body;
    const id = 'inv-' + Date.now();
    runQuery(
      `INSERT INTO inventory (id, name, category, unit, quantity, min_quantity, cost_per_unit, supplier, farm_id, expiry_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [id, name, category, unit, quantity || 0, min_quantity || 0, cost_per_unit || 0, supplier, farm_id, expiry_date]
    );
    res.json({ ok: true, data: { id, name } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, unit, quantity, min_quantity, cost_per_unit, supplier, status } = req.body;
    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (unit) { updates.push('unit = ?'); params.push(unit); }
    if (quantity !== undefined) { updates.push('quantity = ?'); params.push(quantity); }
    if (min_quantity) { updates.push('min_quantity = ?'); params.push(min_quantity); }
    if (cost_per_unit) { updates.push('cost_per_unit = ?'); params.push(cost_per_unit); }
    if (supplier) { updates.push('supplier = ?'); params.push(supplier); }
    if (status) { updates.push('status = ?'); params.push(status); }
    params.push(req.params.id);
    
    runQuery(`UPDATE inventory SET ${updates.join(', ')}, updated_at = datetime("now") WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    runQuery('UPDATE inventory SET status = "inactive", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/:id/adjust', auth, async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    
    let newQty = item.quantity;
    if (type === 'in') newQty += quantity;
    else if (type === 'out') newQty -= quantity;
    else if (type === 'set') newQty = quantity;
    else return res.status(400).json({ ok: false, error: 'Invalid type' });
    
    runQuery('UPDATE inventory SET quantity = ?, updated_at = datetime("now") WHERE id = ?', [newQty, req.params.id]);
    
    const logId = 'log-' + Date.now();
    runQuery(
      'INSERT INTO inventory_log (id, inventory_id, type, quantity, notes, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [logId, req.params.id, type, quantity, notes]
    );
    
    res.json({ ok: true, data: { oldQuantity: item.quantity, newQuantity: newQty } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/stats/summary', auth, async (req, res) => {
  try {
    const total = getOne('SELECT COUNT(*) as count, SUM(quantity * cost_per_unit) as value FROM inventory WHERE status = "active"');
    const lowStock = getOne('SELECT COUNT(*) as count FROM inventory WHERE status = "active" AND quantity <= min_quantity');
    const byCategory = getAll('SELECT category, COUNT(*) as count, SUM(quantity * cost_per_unit) as value FROM inventory WHERE status = "active" GROUP BY category');
    
    res.json({
      ok: true,
      data: {
        totalItems: total?.count || 0,
        totalValue: total?.value || 0,
        lowStock: lowStock?.count || 0,
        byCategory: byCategory.reduce((acc, c) => { acc[c.category] = { count: c.count, value: c.value }; return acc; }, {})
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/items', auth, async (req, res) => {
  try {
    const { farm_id, category, status } = req.query;
    const items = inventoryService.getItems(farm_id, category, status);
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/items', auth, async (req, res) => {
  try {
    const { farm_id, item_code, item_name, item_name_vi, category, unit, min_stock_alert, cost_per_unit, supplier, supplier_contact, expiry_days, storage_conditions, notes } = req.body;
    
    if (!item_name || !category) {
      return res.status(400).json({ ok: false, error: 'item_name và category là bắt buộc' });
    }

    const item = inventoryService.createItem({
      farm_id, item_code, item_name, item_name_vi, category, unit, 
      min_stock_alert, cost_per_unit, supplier, supplier_contact, 
      expiry_days, storage_conditions, notes
    });

    res.status(201).json({ ok: true, data: item });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/import', auth, async (req, res) => {
  try {
    const { farm_id, item_id, quantity, unit_cost, transaction_date, reference_number, create_batch, expiry_date, supplier_batch, performed_by, notes } = req.body;
    
    if (!item_id || !quantity) {
      return res.status(400).json({ ok: false, error: 'item_id và quantity là bắt buộc' });
    }

    const result = inventoryService.importStock({
      farm_id, item_id, quantity, unit_cost, transaction_date,
      reference_number, create_batch, expiry_date, supplier_batch,
      performed_by, notes
    });

    res.status(201).json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/export', auth, async (req, res) => {
  try {
    const { farm_id, item_id, quantity, transaction_date, reference_number, source_type, source_id, performed_by, notes } = req.body;
    
    if (!item_id || !quantity) {
      return res.status(400).json({ ok: false, error: 'item_id và quantity là bắt buộc' });
    }

    const result = inventoryService.exportStock({
      farm_id, item_id, quantity, transaction_date,
      reference_number, source_type, source_id,
      performed_by, notes
    });

    res.status(201).json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/transactions', auth, async (req, res) => {
  try {
    const { item_id, farm_id, start_date, end_date } = req.query;
    const transactions = inventoryService.getTransactions(item_id, farm_id, start_date, end_date);
    res.json({ ok: true, data: transactions });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/batches', auth, async (req, res) => {
  try {
    const { item_id, farm_id } = req.query;
    const batches = inventoryService.getBatches(item_id, farm_id);
    res.json({ ok: true, data: batches });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/low-stock', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const items = inventoryService.getLowStockItems(farm_id);
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/stats', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const stats = inventoryService.getInventoryStats(farm_id);
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/suppliers', auth, async (req, res) => {
  try {
    const supplier = inventoryService.createSupplier(req.body);
    res.status(201).json({ ok: true, data: supplier });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/suppliers', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const suppliers = inventoryService.getSuppliers(farm_id);
    res.json({ ok: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/purchase-orders', auth, async (req, res) => {
  try {
    const order = inventoryService.createPurchaseOrder(req.body);
    res.status(201).json({ ok: true, data: order });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/purchase-orders', auth, async (req, res) => {
  try {
    const { farm_id, status } = req.query;
    const orders = inventoryService.getPurchaseOrders(farm_id, status);
    res.json({ ok: true, data: orders });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/purchase-orders/:id/receive', auth, async (req, res) => {
  try {
    const result = inventoryService.receivePurchaseOrder(req.params.id, req.body.items);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/audits', auth, async (req, res) => {
  try {
    const audit = inventoryService.createAudit(req.body);
    res.status(201).json({ ok: true, data: audit });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/audits', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const audits = inventoryService.getAuditHistory(farm_id);
    res.json({ ok: true, data: audits });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/audits/:id/submit', auth, async (req, res) => {
  try {
    const result = inventoryService.submitAuditResult(req.params.id, req.body.results);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/predict-demand/:itemId', auth, async (req, res) => {
  try {
    const prediction = inventoryService.predictDemand(req.params.itemId);
    res.json({ ok: true, data: prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/usage-by-crop', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const usage = inventoryService.getUsageByCrop(farm_id);
    res.json({ ok: true, data: usage });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/usage-by-period', auth, async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;
    const usage = inventoryService.getUsageByPeriod(farm_id, start_date, end_date);
    res.json({ ok: true, data: usage });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/expiring', auth, async (req, res) => {
  try {
    const { days, farm_id } = req.query;
    const items = inventoryService.getExpiringItems(parseInt(days) || 30, farm_id);
    res.json({ ok: true, data: items });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/alerts', auth, async (req, res) => {
  try {
    const { farm_id, unresolved } = req.query;
    const alerts = inventoryService.getActiveAlerts(farm_id, unresolved !== 'false');
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/v2/alerts/:id/resolve', auth, async (req, res) => {
  try {
    const { resolved_by } = req.body;
    const result = inventoryService.resolveAlert(req.params.id, resolved_by);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/v2/price-history/:itemId', auth, async (req, res) => {
  try {
    const history = inventoryService.getPriceHistory(req.params.itemId);
    const avgCost = inventoryService.getAverageCost(req.params.itemId);
    res.json({ ok: true, data: { history, statistics: avgCost } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;