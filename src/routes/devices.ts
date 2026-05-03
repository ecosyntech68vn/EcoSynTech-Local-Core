import express, { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../config/database';
import logger from '../config/logger';
import * as cacheModule from '../services/cacheRedisOrMemory';
import { auth } from '../middleware/auth';

import router: Router = express.Router();

import DEVICES_CACHE_TTL = parseInt(process.env.DEVICES_CACHE_TTL || '60000', 10);

import deviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('ESP32', 'ESP8266', 'Arduino', 'Raspberry Pi', 'Sensor', 'Gateway', 'Other').required(),
  zone: Joi.string().max(50).default('default'),
  location: Joi.string().max(200).optional(),
  metadata: Joi.object().optional(),
  config: Joi.object().optional()
});

import updateDeviceSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  zone: Joi.string().max(50).optional(),
  location: Joi.string().max(200).optional(),
  status: Joi.string().valid('online', 'offline', 'maintenance', 'error').optional(),
  metadata: Joi.object().optional()
});

interface Device {
  id: string;
  name: string;
  type: string;
  zone: string;
  status: string;
  config: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
  metadata: string;
  [key: string]: unknown;
}

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'devices:all';
    const cache = await cacheModule.getCache();
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const devices = getAll(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM rules WHERE enabled = 1) as active_rules
      FROM devices d
      ORDER BY d.last_seen DESC
    `) as Device[];

    const response = {
      success: true,
      count: devices.length,
      devices: devices.map(d => ({
        ...d,
        config: JSON.parse(d.config || '{}'),
        metadata: JSON.parse(d.metadata || '{}')
      }))
    };

    await cache.set(cacheKey, response, DEVICES_CACHE_TTL);
    res.json(response);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Devices] List error:', errorMessage);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const device = getOne('SELECT * FROM devices WHERE id = ?', [id]) as Device | null;
    
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    res.json({
      success: true,
      device: {
        ...device,
        config: JSON.parse(device.config || '{}'),
        metadata: JSON.parse(device.metadata || '{}')
      }
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Devices] Get error:', errorMessage);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = deviceSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    
    runQuery(`
      INSERT INTO devices (id, name, type, zone, location, status, config, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, value.name, value.type, value.zone, value.location || null, 'offline', JSON.stringify(value.config || {}), JSON.stringify(value.metadata || {}), now, now]);

    const device = getOne('SELECT * FROM devices WHERE id = ?', [id]) as Device | null;
    
    const cache = await cacheModule.getCache();
    await cache.invalidate('devices:*');

    res.status(201).json({ success: true, device });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Devices] Create error:', errorMessage);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { error, value } = updateDeviceSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const existing = getOne('SELECT id FROM devices WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (value.name !== undefined) { updates.push('name = ?'); params.push(value.name); }
    if (value.zone !== undefined) { updates.push('zone = ?'); params.push(value.zone); }
    if (value.location !== undefined) { updates.push('location = ?'); params.push(value.location); }
    if (value.status !== undefined) { updates.push('status = ?'); params.push(value.status); }
    if (value.metadata !== undefined) { updates.push('metadata = ?'); params.push(JSON.stringify(value.metadata)); }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    runQuery(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params);

    const device = getOne('SELECT * FROM devices WHERE id = ?', [id]) as Device | null;
    
    const cache = await cacheModule.getCache();
    await cache.invalidate('devices:*');

    res.json({ success: true, device });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Devices] Update error:', errorMessage);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const existing = getOne('SELECT id FROM devices WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    runQuery('DELETE FROM devices WHERE id = ?', [id]);

    const cache = await cacheModule.getCache();
    await cache.invalidate('devices:*');

    res.json({ success: true, message: 'Device deleted' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Devices] Delete error:', errorMessage);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

router.post('/:id/command', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { command, params } = req.body;

    const device = getOne('SELECT id, status FROM devices WHERE id = ?', [id]) as { id: string; status: string } | null;
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const commandId = uuidv4();
    const now = new Date().toISOString();

    runQuery(`
      INSERT INTO commands (id, device_id, command, params, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [commandId, id, command, JSON.stringify(params || {}), 'pending', now]);

    res.json({ 
      success: true, 
      commandId, 
      status: 'pending',
      message: 'Command sent to device'
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Devices] Command error:', errorMessage);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

export default router;