/**
 * ============================================================================
 * Device Webhook Router
 * ============================================================================
 * Merged from webhook.js + webhooks.js (Frugal Innovation)
 * 
 * Purpose:
 *   - Receive data from ESP32 devices
 *   - Handle device commands
 *   - Process sensor alerts
 * 
 * Endpoints:
 *   POST /api/webhook/esp32    - Device data from ESP32
 *   POST /api/webhook/batch    - Batch info from ESP32
 *   POST /api/webhook/command  - Send command to ESP32
 *   GET  /api/webhook/command/:deviceId - Fetch pending commands
 *   POST /api/webhook/command-result - Report command result
 *   POST /api/webhook/sensor-alert - Sensor alert webhook
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { runQuery, getOne, getAll } = require('../config/database');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const HMAC_SECRET = process.env.HMAC_SECRET || 'CEOTAQUANGTHUAN_TADUYANH_CTYTNHHDUYANH_ECOSYNTECH_2026';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'webhook-secret';

function computeHmacSha256(message, key) {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function canonicalStringify(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

function verifyEsp32Signature(req, res, next) {
  const signature = req.headers['x-ecosyntech-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const payload = canonicalStringify(req.body);
  const expectedSignature = computeHmacSha256(payload, HMAC_SECRET);
  
  if (signature !== expectedSignature) {
    logger.warn('[Webhook] Invalid ESP32 signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-ecosyntech-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

// POST /api/webhook/esp32 - Nhận data từ ESP32 V8.5.0
router.post('/esp32', verifyEsp32Signature, asyncHandler(async (req, res) => {
  const { device_id, sensors, timestamp, batch_id } = req.body;
  
  if (!device_id) {
    return res.status(400).json({ error: 'Missing device_id' });
  }
  
  const insertSensor = `
    INSERT INTO sensor_readings (sensor_type, value, timestamp) 
    VALUES (?, ?, ?)
  `;
  
  const insertBatch = `
    INSERT INTO tb_batches (batch_code, product_name, status, created_at)
    VALUES (?, ?, 'active', ?)
    ON CONFLICT(batch_code) DO UPDATE SET updated_at = ?
  `;
  
  if (sensors && Array.isArray(sensors)) {
    for (const sensor of sensors) {
      try {
        runQuery(insertSensor, [sensor.type, sensor.value, timestamp || new Date().toISOString()]);
      } catch (e) {
        logger.debug('Sensor insert:', e.message);
      }
    }
  }
  
  if (batch_id) {
    try {
      runQuery(insertBatch, [batch_id, `Batch-${batch_id}`, new Date().toISOString(), new Date().toISOString()]);
    } catch (e) {
      logger.debug('Batch insert:', e.message);
    }
  }
  
  runQuery('UPDATE devices SET last_seen = ?, status = "online" WHERE id = ?', 
    [new Date().toISOString(), device_id]);
  
  res.json({ success: true, device_id, received: sensors?.length || 0 });
}));

// POST /api/webhook/batch - Nhận batch info từ ESP32
router.post('/batch', verifyEsp32Signature, asyncHandler(async (req, res) => {
  const { batch_code, stage, quantity, quality, notes } = req.body;
  
  if (!batch_code) {
    return res.status(400).json({ error: 'Missing batch_code' });
  }
  
  runQuery(`
    INSERT INTO tb_batches (batch_code, status, created_at, updated_at)
    VALUES (?, 'active', datetime('now'), datetime('now'))
    ON CONFLICT(batch_code) DO UPDATE SET updated_at = datetime('now')
  `, [batch_code]);
  
  runQuery(`
    INSERT INTO tb_batch_events (batch_id, event_type, note, event_time)
    VALUES (?, ?, ?, datetime('now'))
  `, [batch_code, stage || 'update', notes || '']);
  
  res.json({ success: true, batch_code });
}));

// POST /api/webhook/command - Gửi command tới ESP32
router.post('/command', verifyEsp32Signature, asyncHandler(async (req, res) => {
  const { device_id, action, params } = req.body;
  
  if (!device_id || !action) {
    return res.status(400).json({ error: 'Missing device_id or action' });
  }
  
  const commandId = crypto.randomUUID();
  
  runQuery(`
    INSERT INTO commands (id, device_id, command, params, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', datetime('now'))
  `, [commandId, device_id, action, JSON.stringify(params || {})]);
  
  res.json({ success: true, command_id: commandId, device_id, action });
}));

// GET /api/webhook/command/:deviceId - ESP32 fetch pending commands
router.get('/command/:deviceId', verifyEsp32Signature, asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  
  const commands = getAll(`
    SELECT id, command, params, created_at 
    FROM commands 
    WHERE device_id = ? AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT 10
  `, [deviceId]);
  
  res.json({ device_id: deviceId, commands });
}));

// POST /api/webhook/command-result - ESP32 report command result
router.post('/command-result', verifyEsp32Signature, asyncHandler(async (req, res) => {
  const { command_id, status, result } = req.body;
  
  if (!command_id) {
    return res.status(400).json({ error: 'Missing command_id' });
  }
  
  runQuery(`
    UPDATE commands 
    SET status = ?, result = ?, completed_at = datetime('now')
    WHERE id = ?
  `, [status || 'completed', JSON.stringify(result || {}), command_id]);
  
  res.json({ success: true, command_id, status: status || 'completed' });
}));

// POST /api/webhook/sensor-alert - Sensor alert webhook
router.post('/sensor-alert', verifyWebhookSignature, asyncHandler(async (req, res) => {
  const { sensor, value, severity, message } = req.body;
  
  if (!sensor || value === undefined) {
    return res.status(400).json({ error: 'Missing sensor or value' });
  }
  
  const id = crypto.randomUUID();
  
  runQuery(`
    INSERT INTO alerts (id, type, severity, sensor, value, message, timestamp)
    VALUES (?, 'webhook', ?, ?, ?, ?, datetime('now'))
  `, [id, severity || 'warning', sensor, value, message || `Sensor ${sensor} alert`]);
  
  res.json({ success: true, webhookId: id, alert: { sensor, value, severity } });
}));

module.exports = router;