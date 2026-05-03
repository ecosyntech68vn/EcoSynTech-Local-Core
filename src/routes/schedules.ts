import express, { Router, Request, Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';
import { broadcast } from '../websocket';

const router: Router = express.Router();

interface Schedule {
  id: string;
  name: string;
  time: string;
  duration: number;
  zones: string;
  enabled: number;
  days: string;
}

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schedules = getAll('SELECT * FROM automation_schedules ORDER BY name') as Schedule[];
  
  const result = schedules.map(schedule => ({
    id: schedule.id,
    name: schedule.name,
    schedule_type: schedule.time,
    action: schedule.zones ? JSON.parse(schedule.zones) : null,
    cron_expression: schedule.days ? JSON.parse(schedule.days) : null,
    enabled: !!schedule.enabled,
    status: schedule.zones
  }));
  
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schedule = getOne('SELECT * FROM automation_schedules WHERE id = ?', [req.params.id]) as Schedule | null;
  
  if (!schedule) {
    res.status(404).json({ error: 'Schedule not found' });
    return;
  }
  
  res.json({
    id: schedule.id,
    name: schedule.name,
    schedule_type: schedule.time,
    action: schedule.zones ? JSON.parse(schedule.zones) : null,
    cron_expression: schedule.days ? JSON.parse(schedule.days) : null,
    enabled: !!schedule.enabled
  });
}));

router.post('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, schedule_type, action, cron_expression, interval_minutes, device_id } = req.body;
  
  if (!name || !schedule_type) {
    res.status(400).json({ error: 'name and schedule_type are required' });
    return;
  }
  
  const id = `sched-${Date.now()}`;
  const now = new Date().toISOString();
  
  runQuery(`
    INSERT INTO automation_schedules (id, name, schedule_type, device_id, action, cron_expression, interval_minutes, enabled, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, name, schedule_type, device_id || null, JSON.stringify(action || {}), cron_expression || null, interval_minutes || null, 1, 'active', now, now]);
  
  res.status(201).json({ ok: true, data: { id, name } });
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, schedule_type, action, cron_expression, interval_minutes, enabled, status } = req.body;
  
  const existing = getOne('SELECT id FROM automation_schedules WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Schedule not found' });
    return;
  }
  
  const updates: string[] = [];
  const params: unknown[] = [];
  
  if (name) { updates.push('name = ?'); params.push(name); }
  if (schedule_type) { updates.push('schedule_type = ?'); params.push(schedule_type); }
  if (action) { updates.push('action = ?'); params.push(JSON.stringify(action)); }
  if (cron_expression) { updates.push('cron_expression = ?'); params.push(cron_expression); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (status) { updates.push('status = ?'); params.push(status); }
  
  params.push(new Date().toISOString());
  params.push(req.params.id);
  
  runQuery(`UPDATE automation_schedules SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, params);
  
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  runQuery('DELETE FROM automation_schedules WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default router;