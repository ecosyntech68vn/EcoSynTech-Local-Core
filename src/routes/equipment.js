const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validateMiddleware } = require('../middleware/validation');
const equipmentService = require('../services/equipmentService');

// ========== REFERENCE DATA ==========

router.get('/types', auth, async (req, res) => {
  try {
    res.json({ ok: true, data: equipmentService.EQUIPMENT_TYPES });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    res.json({ ok: true, data: equipmentService.EQUIPMENT_STATUS });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/maintenance-types', auth, async (req, res) => {
  try {
    res.json({ ok: true, data: equipmentService.MAINTENANCE_TYPES });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== CATEGORIES ==========

router.get('/categories', auth, async (req, res) => {
  try {
    const { farm_id, type } = req.query;
    const categories = equipmentService.getCategories(farm_id, type);
    res.json({ ok: true, data: categories });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/categories', auth, validateMiddleware('equipment.categoryCreate'), async (req, res) => {
  try {
    const category = equipmentService.createCategory(req.body);
    res.status(201).json({ ok: true, data: category });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== EQUIPMENT INVENTORY ==========

router.get('/', auth, async (req, res) => {
  try {
    const { farm_id, category_id, status } = req.query;
    const equipment = equipmentService.getEquipment(farm_id, category_id, status);
    res.json({ ok: true, data: equipment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Stats endpoint must be before :id route to avoid being caught as equipment ID
router.get('/stats', auth, async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;
    const stats = equipmentService.getEquipmentStats(farm_id || null, start_date, end_date);
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const equipment = equipmentService.getEquipmentById(req.params.id);
    if (!equipment) return res.status(404).json({ ok: false, error: 'Không tìm thấy thiết bị' });
    res.json({ ok: true, data: equipment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/', auth, validateMiddleware('equipment.create'), async (req, res) => {
  try {
    const equipment = equipmentService.createEquipment(req.body);
    res.status(201).json({ ok: true, data: equipment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/:id', auth, validateMiddleware('equipment.update'), async (req, res) => {
  try {
    const equipment = equipmentService.updateEquipment(req.params.id, req.body);
    if (!equipment) return res.status(404).json({ ok: false, error: 'Không tìm thấy thiết bị' });
    res.json({ ok: true, data: equipment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = equipmentService.deleteEquipment(req.params.id);
    if (!result) return res.status(404).json({ ok: false, error: 'Không tìm thấy thiết bị' });
    res.json({ ok: true, message: 'Đã ngưng sử dụng thiết bị' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== MAINTENANCE ==========

router.get('/maintenance/schedules', auth, async (req, res) => {
  try {
    const { farm_id, equipment_id, status } = req.query;
    const schedules = equipmentService.getMaintenanceSchedules(farm_id, equipment_id, status);
    res.json({ ok: true, data: schedules });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/maintenance/schedules', auth, validateMiddleware('equipment.maintenanceSchedule'), async (req, res) => {
  try {
    const schedule = equipmentService.createMaintenanceSchedule(req.body);
    res.status(201).json({ ok: true, data: schedule });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/maintenance/records', auth, async (req, res) => {
  try {
    const { farm_id, equipment_id, start_date, end_date } = req.query;
    const records = equipmentService.getMaintenanceRecords(farm_id, equipment_id, start_date, end_date);
    res.json({ ok: true, data: records });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/maintenance/records', auth, validateMiddleware('equipment.maintenanceRecord'), async (req, res) => {
  try {
    const record = equipmentService.createMaintenanceRecord(req.body);
    res.status(201).json({ ok: true, data: record });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== USAGE LOGS ==========

router.get('/usage', auth, async (req, res) => {
  try {
    const { farm_id, equipment_id, worker_id, crop_id } = req.query;
    const logs = equipmentService.getUsageLogs(farm_id, equipment_id, worker_id, crop_id);
    res.json({ ok: true, data: logs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/usage', auth, validateMiddleware('equipment.usageLog'), async (req, res) => {
  try {
    const log = equipmentService.logUsage(req.body);
    res.status(201).json({ ok: true, data: log });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== ASSIGNMENTS ==========

router.get('/assignments', auth, async (req, res) => {
  try {
    const { farm_id, equipment_id, worker_id, status } = req.query;
    const assignments = equipmentService.getAssignments(farm_id, equipment_id, worker_id, status);
    res.json({ ok: true, data: assignments });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/assignments', auth, validateMiddleware('equipment.assignment'), async (req, res) => {
  try {
    const assignment = equipmentService.assignEquipment(req.body);
    res.status(201).json({ ok: true, data: assignment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/assignments/:id/return', auth, async (req, res) => {
  try {
    const assignment = equipmentService.returnEquipment(req.params.id);
    if (!assignment) return res.status(404).json({ ok: false, error: 'Không tìm thấy phân công' });
    res.json({ ok: true, data: assignment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== DEPRECIATION ==========

router.get('/depreciation/:equipmentId', auth, async (req, res) => {
  try {
    const depreciation = equipmentService.getDepreciation(req.params.equipmentId);
    res.json({ ok: true, data: depreciation });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/depreciation/:equipmentId/calculate', auth, async (req, res) => {
  try {
    const depreciation = equipmentService.updateDepreciation(req.params.equipmentId);
    if (!depreciation) return res.status(404).json({ ok: false, error: 'Không tìm thấy thiết bị' });
    res.json({ ok: true, data: depreciation });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== COST TRACKING ==========

router.get('/costs', auth, async (req, res) => {
  try {
    const { farm_id, equipment_id, start_date, end_date } = req.query;
    const costs = equipmentService.getCostByEquipment(farm_id, equipment_id, start_date, end_date);
    res.json({ ok: true, data: costs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/costs', auth, validateMiddleware('equipment.costTracking'), async (req, res) => {
  try {
    const cost = equipmentService.trackCost(req.body);
    res.status(201).json({ ok: true, data: cost });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== AI PREDICTION ==========

router.get('/predict-maintenance/:equipmentId', auth, async (req, res) => {
  try {
    const { days } = req.query;
    const prediction = equipmentService.predictMaintenance(req.params.equipmentId, parseInt(days) || 30);
    res.json({ ok: true, data: prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== QR CODE ==========

router.get('/:id/qrcode', auth, async (req, res) => {
  try {
    const qrData = equipmentService.generateEquipmentQR(req.params.id);
    if (!qrData) return res.status(404).json({ ok: false, error: 'Không tìm thấy thiết bị' });
    res.json({ ok: true, data: qrData });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;