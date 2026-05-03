import express, { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../config/database';
import logger from '../config/logger';
import { auth } from '../middleware/auth';
import { SmartControlEngine, AdvisoryEngine } from '../modules/iot-engine';

import router: Router = express.Router();

import ruleSchema = Joi.object({
  type: Joi.string().valid('STATIC','ADAPTIVE').optional(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  enabled: Joi.boolean().default(true),
  condition: Joi.alternatives(
    Joi.object({
      sensor: Joi.string().required(),
      operator: Joi.string().valid('<', '>', '<=', '>=', '==', '!=', 'between').required(),
      value: Joi.number().required(),
      hysteresis: Joi.number().min(0).optional()
    }),
    Joi.object({
      type: Joi.string().valid('and', 'or').required(),
      conditions: Joi.array().required()
    })
  ).required(),
  action: Joi.object({
    type: Joi.string().valid(
      'relay_on', 'relay_off', 'relay1_on', 'relay1_off', 'relay2_on', 'relay2_off',
      'relay3_on', 'relay3_off', 'relay4_on', 'relay4_off',
      'alert', 'notification', 'email', 'sms', 'webhook', 'irrigate', 'fan_on', 'fan_off'
    ).required(),
    target: Joi.string().max(100).optional(),
    durationSec: Joi.number().min(0).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    require_confirm: Joi.boolean().optional()
  }).required(),
  cooldownMinutes: Joi.number().min(0).default(30),
  hysteresis: Joi.number().min(0).optional(),
  minTriggerInterval: Joi.number().min(1).max(1440).default(5),
  timeWindow: Joi.object({
    startHour: Joi.number().min(0).max(23).optional(),
    endHour: Joi.number().min(0).max(23).optional(),
    daysOfWeek: Joi.array().items(Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')).optional()
  }).optional(),
  targetDevice: Joi.string().optional()
});

interface Rule {
  id: string;
  name: string;
  description: string | null;
  enabled: number;
  condition: string;
  action: string;
  cooldown_minutes: number;
  hysteresis: number;
  time_window: string | null;
  priority: string | null;
  target_device: string | null;
  trigger_count: number;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
}

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { enabled, priority } = req.query;
    let sql = 'SELECT * FROM automation_rules WHERE 1=1';
    const params: unknown[] = [];
    
    if (enabled !== undefined) { 
      sql += ' AND enabled = ?'; 
      params.push(enabled === 'true' ? 1 : 0); 
    }
    if (priority) { 
      sql += ' AND priority = ?'; 
      params.push(priority); 
    }
    
    sql += ' ORDER BY priority DESC, created_at DESC';
    const rules = getAll(sql, params) as Rule[];
    
    res.json({ 
      ok: true, 
      data: rules.map(r => ({
        ...r,
        enabled: r.enabled === 1,
        condition: JSON.parse(r.condition || '{}'),
        action: JSON.parse(r.action || '{}'),
        time_window: r.time_window ? JSON.parse(r.time_window) : null
      }))
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = getOne('SELECT * FROM automation_rules WHERE id = ?', [req.params.id]) as Rule | null;
    if (!rule) {
      res.status(404).json({ ok: false, error: 'Rule not found' });
      return;
    }
    res.json({ 
      ok: true, 
      data: {
        ...rule,
        enabled: rule.enabled === 1,
        condition: JSON.parse(rule.condition || '{}'),
        action: JSON.parse(rule.action || '{}'),
        time_window: rule.time_window ? JSON.parse(rule.time_window) : null
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = ruleSchema.validate(req.body);
    if (error) {
      res.status(400).json({ ok: false, error: error.details[0].message });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    
    runQuery(`
      INSERT INTO automation_rules (id, name, description, type, enabled, condition, action, cooldown_minutes, hysteresis, time_window, priority, target_device, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, value.name, value.description || null, value.type || 'STATIC', 
      value.enabled ? 1 : 0, JSON.stringify(value.condition), JSON.stringify(value.action),
      value.cooldownMinutes || 30, value.hysteresis || 0, 
      value.timeWindow ? JSON.stringify(value.timeWindow) : null,
      value.action.priority || 'medium', value.targetDevice || null, now, now
    ]);

    res.status(201).json({ ok: true, data: { id } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = ruleSchema.validate(req.body);
    if (error) {
      res.status(400).json({ ok: false, error: error.details[0].message });
      return;
    }

    const existing = getOne('SELECT id FROM automation_rules WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Rule not found' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (value.name) { updates.push('name = ?'); params.push(value.name); }
    if (value.description !== undefined) { updates.push('description = ?'); params.push(value.description); }
    if (value.enabled !== undefined) { updates.push('enabled = ?'); params.push(value.enabled ? 1 : 0); }
    if (value.condition) { updates.push('condition = ?'); params.push(JSON.stringify(value.condition)); }
    if (value.action) { updates.push('action = ?'); params.push(JSON.stringify(value.action)); }
    if (value.timeWindow) { updates.push('time_window = ?'); params.push(JSON.stringify(value.timeWindow)); }
    if (value.action?.priority) { updates.push('priority = ?'); params.push(value.action.priority); }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);
    
    runQuery(`UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ?`, params);
    
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    runQuery('DELETE FROM automation_rules WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/:id/test', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = getOne('SELECT * FROM automation_rules WHERE id = ?', [req.params.id]) as Rule | null;
    if (!rule) {
      res.status(404).json({ ok: false, error: 'Rule not found' });
      return;
    }
    
    const condition = JSON.parse(rule.condition || '{}');
    const engine = new SmartControlEngine();
    const result = await engine.evaluateCondition(condition, req.body.sensorData || {});
    
    res.json({ ok: true, data: { result, rule: rule.name } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;