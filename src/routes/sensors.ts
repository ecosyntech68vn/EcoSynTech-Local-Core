import express, { Router, Request, Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import logger from '../config/logger';
import * as telemetryCache from '../services/cacheRedisOrMemory';
import { asyncHandler } from '../middleware/errorHandler';

const router: Router = express.Router();

let cache: ReturnType<typeof telemetryCache.getCache> | null = null;
const CACHE_TTL = parseInt(process.env.SENSORS_CACHE_TTL || '30000');

interface Sensor {
  id: string;
  type: string;
  value: number;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  timestamp: string;
}

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!cache) cache = await telemetryCache.getCache();
  const cacheKey = 'sensors:all';
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    res.json(cachedData);
    return;
  }

  const sensors = getAll('SELECT * FROM sensors ORDER BY type') as Sensor[];

  const result: Record<string, { value: number; unit: string; min: number | null; max: number | null; timestamp: string }> = {};
  sensors.forEach(sensor => {
    result[sensor.type] = {
      value: sensor.value,
      unit: sensor.unit,
      min: sensor.min_value,
      max: sensor.max_value,
      timestamp: sensor.timestamp
    };
  });

  await cache.set(cacheKey, result, CACHE_TTL);
  res.json(result);
}));

router.get('/latest', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!cache) cache = await telemetryCache.getCache();
  const cacheKey = 'sensors:latest';
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    res.json(cachedData);
    return;
  }

  const sensors = getAll('SELECT * FROM sensors ORDER BY type') as Sensor[];
  const devices = getAll('SELECT * FROM devices') as Array<{ name: string; status: string }>;

  const result = {
    temperature: null as number | null,
    humidity: null as number | null,
    devices: devices.map(d => ({ name: d.name, status: d.status }))
  };

  sensors.forEach(sensor => {
    if (sensor.type === 'temperature') result.temperature = sensor.value;
    if (sensor.type === 'humidity') result.humidity = sensor.value;
  });

  await cache.set(cacheKey, result, 10000);
  res.json(result);
}));

router.post('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, value, unit, min_value, max_value } = req.body;
  
  if (!type || value === undefined) {
    res.status(400).json({ error: 'type and value are required' });
    return;
  }

  const existing = getOne('SELECT id FROM sensors WHERE type = ?', [type]);
  
  if (existing) {
    runQuery('UPDATE sensors SET value = ?, min_value = ?, max_value = ?, timestamp = ? WHERE type = ?',
      [value, min_value || null, max_value || null, new Date().toISOString(), type]);
  } else {
    runQuery('INSERT INTO sensors (id, type, value, unit, min_value, max_value, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [require('uuid').v4(), type, value, unit || '', min_value || null, max_value || null, new Date().toISOString()]);
  }

  if (cache) {
    await cache.invalidate('sensors:*');
  }

  res.json({ success: true, type, value });
}));

router.get('/history/:type', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  
  const readings = getAll('SELECT * FROM sensor_readings WHERE sensor_type = ? ORDER BY timestamp DESC LIMIT ?', 
    [type, limit]) as Array<{ id: string; sensor_type: string; value: number; timestamp: string }>;

  res.json({
    sensor: type,
    count: readings.length,
    readings: readings.map(r => ({ value: r.value, timestamp: r.timestamp }))
  });
}));

export default router;