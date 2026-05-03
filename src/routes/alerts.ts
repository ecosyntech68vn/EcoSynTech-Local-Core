import express from 'express';
import router = express.Router();
import { getAll, getOne, runQuery } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

let broadcast: any;
try {
  const ws from('../websocket');
  broadcast = ws.broadcast;
} catch (e) {
  broadcast = () => {};
}

router.get('/', asyncHandler(async (req: any, res: any) => {
  const includeAcknowledged = req.query.includeAcknowledged === 'true';
  
  let query = 'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100';
  if (!includeAcknowledged) {
    query = 'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY timestamp DESC LIMIT 100';
  }
  
  const alerts = getAll(query);
  
  const result = alerts.map((alert: any) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    sensor: alert.sensor,
    value: alert.value,
    message: alert.message,
    acknowledged: !!alert.acknowledged,
    acknowledgedAt: alert.acknowledged_at,
    timestamp: alert.timestamp
  }));
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req: any, res: any) => {
  const { type, severity, sensor, value, message } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }
  
  const id = `alert-${Date.now()}`;
  
  runQuery(
    'INSERT INTO alerts (id, type, severity, sensor, value, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
    [id, type, severity || 'info', sensor || null, value || null, message || '']
  );
  
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [id]);
  
  logger.warn(`Alert created: ${type} - ${message || 'No message'}`);
  broadcast({ type: 'alert', action: 'created', data: alert });
  
  res.status(201).json({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    sensor: alert.sensor,
    value: alert.value,
    message: alert.message,
    acknowledged: false,
    timestamp: alert.timestamp
  });
}));

router.post('/:id/acknowledge', asyncHandler(async (req: any, res: any) => {
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  runQuery(
    'UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime("now") WHERE id = ?',
    [req.params.id]
  );
  
  const updatedAlert = getOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  
  logger.info(`Alert ${req.params.id} acknowledged`);
  broadcast({ type: 'alert', action: 'acknowledged', data: updatedAlert });
  
  res.json({
    id: updatedAlert.id,
    acknowledged: !!updatedAlert.acknowledged,
    acknowledgedAt: updatedAlert.acknowledged_at
  });
}));

router.post('/acknowledge-all', asyncHandler(async (req: any, res: any) => {
  const result: any = runQuery('UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime("now") WHERE acknowledged = 0');
  
  logger.info(`${result?.changes || 0} alerts acknowledged`);
  broadcast({ type: 'alert', action: 'all-acknowledged' });
  
  res.json({ success: true, count: result?.changes || 0 });
}));

router.delete('/:id', asyncHandler(async (req: any, res: any) => {
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  runQuery('DELETE FROM alerts WHERE id = ?', [req.params.id]);
  
  res.status(204).send();
}));

router.delete('/', asyncHandler(async (req: any, res: any) => {
  const acknowledgedOnly = req.query.acknowledgedOnly === 'true';
  
  if (acknowledgedOnly) {
    runQuery('DELETE FROM alerts WHERE acknowledged = 1');
  } else {
    runQuery('DELETE FROM alerts');
  }
  
  logger.info('Alerts cleared');
  
  res.status(204).send();
}));

import { auth } from('../middleware/auth');
import { getAlertService, CONFIG } from('../services/alertService');

router.get('/notification/stats', auth, async (req: any, res: any) => {
  try {
    const alertService = getAlertService();
    const stats = alertService.getStats();
    
    res.json({
      success: true,
      stats,
      config: {
        telegram: CONFIG.telegram.enabled,
        zalo: CONFIG.zalo.enabled,
        alertEnabled: CONFIG.alertEnabled
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notification/history', auth, async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const alertService = getAlertService();
    const history = alertService.getAlertHistory(limit);
    
    res.json({
      success: true,
      history
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notification/test', auth, async (req: any, res: any) => {
  try {
    const alertService = getAlertService();
    const result = await alertService.sendAlert('SYSTEM_ERROR', {
      message: 'Test alert - hệ thống đang hoạt động bình thường'
    });
    
    res.json({
      success: result.success,
      message: result.success ? 'Test alert đã được gửi' : 'Test alert thất bại',
      details: result.results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notification/send', auth, async (req: any, res: any) => {
  try {
    const { alertType, data } = req.body;
    
    if (!alertType) {
      return res.status(400).json({ error: 'alertType is required' });
    }
    
    const alertService = getAlertService();
    const result = await alertService.sendAlert(alertType, data || {});
    
    res.json({
      success: result.success,
      results: result.results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;