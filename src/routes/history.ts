import { Router, Request, Response, NextFunction } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';

const router = Router();

interface HistoryEntry {
  id: string;
  action: string;
  trigger: string;
  status: string;
  timestamp: string;
}

interface HistoryQuery {
  from?: string;
  to?: string;
  device_id?: string;
  action?: string;
  limit?: string;
}

interface CreateHistoryBody {
  action: string;
  trigger?: string;
  status?: string;
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { from, to, device_id, action, limit: queryLimit } = req.query as HistoryQuery;
  const limit = parseInt(queryLimit || '50', 10);
  
  let sql = 'SELECT * FROM history';
  const params: (string | number)[] = [];
  const conditions: string[] = [];
  
  if (from) {
    conditions.push('timestamp >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('timestamp <= ?');
    params.push(to);
  }
  if (device_id) {
    conditions.push('trigger = ?');
    params.push(device_id);
  }
  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  const history = getAll(sql, params) as HistoryEntry[];
  
  const result = history.map(entry => ({
    id: entry.id,
    action: entry.action,
    trigger: entry.trigger,
    status: entry.status,
    timestamp: entry.timestamp
  }));
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { action, trigger, status } = req.body as CreateHistoryBody;
  
  if (!action) {
    res.status(400).json({ error: 'action is required' });
    return;
  }
  
  const id = `history-${Date.now()}`;
  
  runQuery(
    'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, datetime("now"))',
    [id, action, trigger || 'Manual', status || 'success']
  );
  
  const entry = getOne('SELECT * FROM history WHERE id = ?', [id]) as HistoryEntry;
  
  res.status(201).json({
    id: entry.id,
    action: entry.action,
    trigger: entry.trigger,
    status: entry.status,
    timestamp: entry.timestamp
  });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const entry = getOne('SELECT * FROM history WHERE id = ?', [req.params.id]);
  
  if (!entry) {
    res.status(404).json({ error: 'History entry not found' });
    return;
  }
  
  runQuery('DELETE FROM history WHERE id = ?', [req.params.id]);
  
  res.status(204).send();
}));

router.delete('/', asyncHandler(async (req: Request, res: Response) => {
  runQuery('DELETE FROM history');
  
  logger.info('All history entries cleared');
  
  res.status(204).send();
}));

export default router;