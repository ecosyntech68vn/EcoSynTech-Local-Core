/**
 * Device Action Router
 * Handles device commands and actions
 */

import express, { Router, Request, Response } from 'express';
import { getAll, runQuery } from '../config/database';

import router = Router();

import VALID_TYPES = ['temp', 'humidity', 'soil_moisture', 'light',
  'co2', 'pressure', 'pH', 'tds', 'do',
  'ec', 'water_level'];

interface Reading {
  sensor_type: string;
  value: number;
  unit?: string;
}

interface DeviceRequest extends Request {
  deviceId?: string;
  signedJson?: (data: unknown) => void;
}

router.post('/', async (req: DeviceRequest, res: Response) => {
  const action = req.body.action || (req.body.payload && req.body.payload.action);
  if (!action) {
    return res.signedJson ? res.signedJson({ ok: false, code: 'NO_ACTION' }) : res.json({ ok: false, code: 'NO_ACTION' });
  }

  const handlers: Record<string, (req: DeviceRequest) => Promise<unknown>> = {
    'log_data': handleLogData,
    'heartbeat': handleHeartbeat,
    'get_config': handleGetConfig,
    'status': handleStatus
  };

  const handler = handlers[action];
  if (!handler) {
    return res.signedJson ? res.signedJson({ ok: false, code: 'UNSUPPORTED_ACTION', action }) : res.json({ ok: false, code: 'UNSUPPORTED_ACTION', action });
  }

  try {
    const result = await handler(req);
    if (res.signedJson) {
      res.signedJson(result);
    } else {
      res.json(result);
    }
  } catch (e) {
    console.error('[deviceAction]', action, e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.signedJson ? res.signedJson({ ok: false, code: 'HANDLER_ERROR', error: errorMessage }) : res.json({ ok: false, code: 'HANDLER_ERROR', error: errorMessage });
  }
});

async function handleLogData(req: DeviceRequest): Promise<{ ok: boolean; written?: number; rejected?: number; code?: string }> {
  const payload = req.body.payload || req.body;
  const readings: Reading[] = payload.readings || req.body.readings || [];

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

    try {
      runQuery(
        'INSERT INTO sensor_data (device_id, sensor_type, value, unit, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [deviceId, r.sensor_type, r.value, r.unit || null]
      );
      written++;
    } catch (e) {
      rejected++;
    }
  }

  return { ok: true, written, rejected };
}

async function handleHeartbeat(req: DeviceRequest): Promise<{ ok: boolean; timestamp: string }> {
  const deviceId = req.deviceId;
  runQuery('UPDATE devices SET last_seen = datetime("now"), status = "online" WHERE id = ?', [deviceId]);
  return { ok: true, timestamp: new Date().toISOString() };
}

async function handleGetConfig(req: DeviceRequest): Promise<{ ok: boolean; config: Record<string, unknown> }> {
  const deviceId = req.deviceId;
  const device = getAll('SELECT config FROM devices WHERE id = ?', [deviceId]);
  return { ok: true, config: (device[0] as { config?: Record<string, unknown> })?.config || {} };
}

async function handleStatus(req: DeviceRequest): Promise<{ ok: boolean; status: string }> {
  return { ok: true, status: 'online' };
}

export = router;