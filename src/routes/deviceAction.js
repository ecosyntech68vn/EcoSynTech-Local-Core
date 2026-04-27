'use strict';
const express = require('express');
const router = express.Router();
const { getAll, runQuery } = require('../config/database');

const VALID_TYPES = ['temp', 'humidity', 'soil_moisture', 'light',
  'co2', 'pressure', 'pH', 'tds', 'do',
  'ec', 'water_level'];

router.post('/', async (req, res) => {
  const action = req.body.action || (req.body.payload && req.body.payload.action);
  if (!action) {
    return res.signedJson({ ok: false, code: 'NO_ACTION' });
  }

  const handlers = {
    'log_data': handleLogData,
    'heartbeat': handleHeartbeat,
    'get_config': handleGetConfig,
    'status': handleStatus
  };

  const handler = handlers[action];
  if (!handler) {
    return res.signedJson({ ok: false, code: 'UNSUPPORTED_ACTION', action });
  }

  try {
    const result = await handler(req);
    res.signedJson(result);
  } catch (e) {
    console.error('[deviceAction]', action, e);
    res.signedJson({ ok: false, code: 'HANDLER_ERROR', error: String(e.message || e) });
  }
});

async function handleLogData(req) {
  const payload = req.body.payload || req.body;
  const readings = payload.readings || req.body.readings || [];

  if (!Array.isArray(readings) || readings.length === 0) {
    return { ok: false, code: 'NO_READINGS' };
  }

  const deviceId = req.deviceId;
  let written = 0, rejected = 0;

  for (const r of readings) {
    if (VALID_TYPES.indexOf(r.sensor_type) < 0) {
      rejected++;
      continue;
    }
    if (typeof r.value !== 'number' || isNaN(r.value)) {
      rejected++;
      continue;
    }

    const sensorType = r.sensor_type;
    const value = r.value;
    const unit = r.unit || '';
    const ts = r.event_ts || new Date().toISOString();

    const existing = getAll('SELECT id FROM sensors WHERE type = ?', [sensorType]);
    if (existing.length > 0) {
      runQuery(
        'UPDATE sensors SET value = ?, timestamp = ? WHERE type = ?',
        [value, ts, sensorType]
      );
    } else {
      runQuery(
        'INSERT INTO sensors (id, type, value, unit, timestamp, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`sensor-${Date.now()}-${written}`, sensorType, value, unit, ts, 0, 100]
      );
    }
    written++;
  }

  return {
    ok: true,
    code: 'OK',
    written,
    rejected,
    received: readings.length
  };
}

async function handleHeartbeat(req) {
  const payload = req.body.payload || req.body;
  const deviceId = req.deviceId;

  const existing = getAll('SELECT id FROM devices WHERE id = ?', [deviceId]);
  if (existing.length > 0) {
    runQuery(
      'UPDATE devices SET status = ?, last_seen = ?, config = ? WHERE id = ?',
      [
        'online',
        new Date().toISOString(),
        JSON.stringify({
          fw_version: payload.fw_version,
          uptime_sec: payload.uptime_sec,
          rssi: payload.rssi,
          battery_v: payload.battery_v,
          free_heap: payload.free_heap
        }),
        deviceId
      ]
    );
  } else {
    runQuery(
      'INSERT INTO devices (id, name, type, status, last_seen, config) VALUES (?, ?, ?, ?, ?, ?)',
      [
        deviceId,
        'ESP32-' + deviceId.slice(-4),
        'esp32',
        'online',
        new Date().toISOString(),
        JSON.stringify({
          fw_version: payload.fw_version,
          uptime_sec: payload.uptime_sec,
          rssi: payload.rssi,
          battery_v: payload.battery_v,
          free_heap: payload.free_heap
        })
      ]
    );
  }

  return {
    ok: true,
    code: 'OK',
    server_time: new Date().toISOString(),
    sync_required: false
  };
}

async function handleGetConfig(req) {
  return {
    ok: true,
    code: 'OK',
    config_version: 1,
    sensor_interval_sec: 60,
    server_time: new Date().toISOString()
  };
}

async function handleStatus(req) {
  const deviceId = req.deviceId;
  const deviceRows = getAll('SELECT * FROM devices WHERE id = ?', [deviceId]);

  if (deviceRows.length === 0) {
    return { ok: false, code: 'DEVICE_NOT_FOUND' };
  }

  const d = deviceRows[0];
  return {
    ok: true,
    code: 'OK',
    server_time: new Date().toISOString(),
    web_version: process.env.npm_package_version || 'dev',
    device_status: d.status,
    last_seen: d.last_seen
  };
}

module.exports = router;