import express, { Router, Request, Response } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { auth as authenticate } from '../middleware/auth';
import { verifyAuditChain } from '../middleware/audit-tamper-proof';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

router.get('/ip-whitelist', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const ips = getAll('SELECT * FROM ip_whitelist ORDER BY created_at DESC');
  res.json({ success: true, ips });
}));

router.post('/ip-whitelist', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ip, description, expires_at } = req.body;
  const id = uuidv4();
  
  runQuery(
    'INSERT INTO ip_whitelist (id, ip, description, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, ip, description, expires_at, new Date().toISOString()]
  );
  
  res.json({ success: true, id, message: 'IP added to whitelist' });
}));

router.delete('/ip-whitelist/:id', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  runQuery('DELETE FROM ip_whitelist WHERE id = ?', [id]);
  res.json({ success: true, message: 'IP removed from whitelist' });
}));

router.get('/audit-logs', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { action, user_id } = req.query;
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];
  
  if (action) { sql += ' AND action = ?'; params.push(action); }
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  
  sql += ' ORDER BY timestamp DESC LIMIT 100';
  const logs = getAll(sql, params);
  res.json({ success: true, logs });
}));

router.get('/audit-verify', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await verifyAuditChain();
  res.json({ success: true, ...result });
}));

router.get('/sessions', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.query;
  let sql = 'SELECT id, user_id, ip, user_agent, last_activity, created_at FROM sessions';
  const params: unknown[] = [];
  
  if (user_id) { sql += ' WHERE user_id = ?'; params.push(user_id); }
  
  sql += ' ORDER BY last_activity DESC LIMIT 50';
  const sessions = getAll(sql, params);
  res.json({ success: true, sessions });
}));

router.delete('/sessions/:id', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  runQuery('DELETE FROM sessions WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Session terminated' });
}));

router.get('/api-keys', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const keys = getAll('SELECT id, key, name, permissions, expires_at, created_at FROM api_keys ORDER BY created_at DESC');
  res.json({ success: true, keys });
}));

router.post('/api-keys', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, permissions, expires_at } = req.body;
  const id = uuidv4();
  const key = 'ekt_' + uuidv4().replace(/-/g, '');
  
  runQuery(
    'INSERT INTO api_keys (id, key, name, permissions, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, key, name, JSON.stringify(permissions || []), expires_at, new Date().toISOString()]
  );
  
  res.json({ success: true, key, name, id });
}));

router.delete('/api-keys/:id', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  runQuery('DELETE FROM api_keys WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'API key revoked' });
}));

export default router;