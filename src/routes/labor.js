const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validateMiddleware } = require('../middleware/validation');
const laborService = require('../services/laborService');

router.get('/positions', auth, async (req, res) => {
  try {
    res.json({ ok: true, data: laborService.WORKER_POSITIONS });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/skill-levels', auth, async (req, res) => {
  try {
    res.json({ ok: true, data: laborService.SKILL_LEVELS });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/task-types', auth, async (req, res) => {
  try {
    res.json({ ok: true, data: laborService.TASK_TYPES });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/workers', auth, validateMiddleware('labor.workerCreate'), async (req, res) => {
  try {
    const worker = laborService.createWorker(req.body);
    res.status(201).json({ ok: true, data: worker });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    // Infer status: bad input -> 400, otherwise 500
    let status = 500;
    if (typeof message === 'string') {
      const low = message.toLowerCase();
      if (low.includes('missing') || low.includes('invalid') || low.includes('required') || low.includes('cannot')) {
        status = 400;
      }
    }
    res.status(status).json({ ok: false, error: message });
  }
});

router.get('/workers', auth, async (req, res) => {
  try {
    const { farm_id, position, status } = req.query;
    const workers = laborService.getWorkers(farm_id, position, status);
    res.json({ ok: true, data: workers });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/workers/:id', auth, async (req, res) => {
  try {
    const worker = laborService.getWorkerById(req.params.id);
    if (!worker) return res.status(404).json({ ok: false, error: 'Không tìm thấy công nhân' });
    res.json({ ok: true, data: worker });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.put('/workers/:id', auth, validateMiddleware('labor.workerUpdate'), async (req, res) => {
  try {
    const worker = laborService.updateWorker(req.params.id, req.body);
    if (!worker) return res.status(404).json({ ok: false, error: 'Không tìm thấy công nhân' });
    res.json({ ok: true, data: worker });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/shifts', auth, validateMiddleware('labor.shiftCreate'), async (req, res) => {
  try {
    const shift = laborService.createShift(req.body);
    res.status(201).json({ ok: true, data: shift });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/shifts', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const shifts = laborService.getShifts(farm_id);
    res.json({ ok: true, data: shifts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/attendance/check-in', auth, validateMiddleware('labor.attendanceCheckIn'), async (req, res) => {
  try {
    const { worker_id, shift_id, location_in, notes } = req.body;
    if (!worker_id) return res.status(400).json({ ok: false, error: 'worker_id là bắt buộc' });
    const result = laborService.checkIn(worker_id, { shift_id, location_in, notes });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/attendance/check-out', auth, validateMiddleware('labor.attendanceCheckOut'), async (req, res) => {
  try {
    const { worker_id, break_start, break_end, location_out, notes } = req.body;
    if (!worker_id) return res.status(400).json({ ok: false, error: 'worker_id là bắt buộc' });
    const result = laborService.checkOut(worker_id, { break_start, break_end, location_out, notes });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/attendance', auth, async (req, res) => {
  try {
    const { farm_id, start_date, end_date, worker_id } = req.query;
    const attendance = laborService.getAttendance(farm_id, start_date, end_date, worker_id);
    res.json({ ok: true, data: attendance });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/tasks', auth, async (req, res) => {
  try {
    const task = laborService.createTask(req.body);
    res.status(201).json({ ok: true, data: task });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/tasks', auth, async (req, res) => {
  try {
    const { farm_id, status, crop_id, start_date, end_date } = req.query;
    const tasks = laborService.getTasks(farm_id, status, crop_id, start_date, end_date);
    res.json({ ok: true, data: tasks });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/tasks/:id/assign', auth, async (req, res) => {
  try {
    const { worker_ids } = req.body;
    if (!worker_ids || !Array.isArray(worker_ids)) {
      return res.status(400).json({ ok: false, error: 'worker_ids phải là array' });
    }
    const result = laborService.assignTask(req.params.id, worker_ids);
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/tasks/:id/complete', auth, async (req, res) => {
  try {
    const { worker_id, hours_worked, productivity_score, notes } = req.body;
    const result = laborService.completeTask(req.params.id, worker_id, hours_worked, productivity_score, notes);
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/tasks/:id/assignments', auth, async (req, res) => {
  try {
    const assignments = laborService.getTaskAssignments(req.params.id);
    res.json({ ok: true, data: assignments });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/payroll', auth, async (req, res) => {
  try {
    const payroll = laborService.createPayroll(req.body);
    if (payroll.error) return res.status(400).json({ ok: false, error: payroll.error });
    res.status(201).json({ ok: true, data: payroll });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/payroll', auth, async (req, res) => {
  try {
    const { farm_id, worker_id, period_start, period_end } = req.query;
    const payroll = laborService.getPayroll(farm_id, worker_id, period_start, period_end);
    res.json({ ok: true, data: payroll });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/performance', auth, async (req, res) => {
  try {
    const evaluation = laborService.createPerformanceEvaluation(req.body);
    res.status(201).json({ ok: true, data: evaluation });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/performance/:workerId', auth, async (req, res) => {
  try {
    const performance = laborService.getWorkerPerformance(req.params.workerId);
    res.json({ ok: true, data: performance });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/cost-by-crop', auth, async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;
    const cost = laborService.getLaborCostByCrop(farm_id, start_date, end_date);
    res.json({ ok: true, data: cost });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;
    const stats = laborService.getLaborStats(farm_id, start_date, end_date);
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict-demand/:cropId', auth, async (req, res) => {
  try {
    const { days } = req.query;
    const prediction = laborService.predictLaborDemand(req.params.cropId, parseInt(days) || 30);
    res.json({ ok: true, data: prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
