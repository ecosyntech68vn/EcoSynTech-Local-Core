import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, runQuery } from '../config/database';
import { validateMiddleware } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import authMiddleware from '../middleware/auth';
import { generateRefreshToken, storeRefreshToken, verifyRefreshToken, rotateRefreshToken, generateAccessToken } from '../middleware/auth';
import config from '../config';
import logger from '../config/logger';

const authenticate = (authMiddleware as any).auth || ((req: any, res: any, next: any) => next());

router.post('/register', validateMiddleware('auth.register'), asyncHandler(async (req: any, res: any) => {
  const { email, password, name } = req.body;
  
  const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `user-${Date.now()}`;
  
  runQuery(
    'INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [id, email, hashedPassword, name, 'user']
  );
  
  const token = jwt.sign(
    { sub: id, id, email, name, role: 'user' },
    (config as any).jwt?.secret || 'default-secret',
    { expiresIn: (config as any).jwt?.expiresIn || '1h' }
  );
  
  const refreshToken = generateRefreshToken({ id });
  storeRefreshToken(id, refreshToken);
  
  logger.info(`User registered: ${email}`);
  
  res.status(201).json({
    user: { id, email, name, role: 'user' },
    token,
    refreshToken
  });
}));

router.post('/login', validateMiddleware('auth.login'), asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;
  
  const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { sub: user.id, id: user.id, email: user.email, name: user.name, role: user.role },
    (config as any).jwt?.secret || 'default-secret',
    { expiresIn: (config as any).jwt?.expiresIn || '1h' }
  );
  
  logger.info(`User logged in: ${email}`);
  
  const loginRefreshToken = generateRefreshToken({ id: user.id });
  storeRefreshToken(user.id, loginRefreshToken);
  
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
    refreshToken: loginRefreshToken
  });
}));

router.get('/me', authenticate, asyncHandler(async (req: any, res: any) => {
  const user = getOne('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
}));

router.put('/me', authenticate, asyncHandler(async (req: any, res: any) => {
  const { name, password } = req.body;
  
  if (name) {
    runQuery('UPDATE users SET name = ?, updated_at = datetime("now") WHERE id = ?', [name, req.user.id]);
  }
  
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    runQuery('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [hashedPassword, req.user.id]);
  }
  
  const user = getOne('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id]);
  
  res.json(user);
}));

router.post('/refresh', asyncHandler(async (req: any, res: any) => {
  const { userId, refreshToken } = req.body;
  if (!userId || !refreshToken) {
    return res.status(400).json({ error: 'Missing userId or refreshToken' });
  }
  if (!verifyRefreshToken(userId, refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  const user = getOne('SELECT id, email, name, role FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const newRefresh = rotateRefreshToken(userId, refreshToken);
  if (!newRefresh) return res.status(401).json({ error: 'Refresh rotation failed' });
  const newAccess = generateAccessToken(user);
  res.json({ token: newAccess, refreshToken: newRefresh });
}));

export default router;