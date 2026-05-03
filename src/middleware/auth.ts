/**
 * @fileoverview Authentication middleware for EcoSynTech Local Core
 * @description Provides JWT authentication, account lockout, and HMAC verification
 * @module middleware/auth
 * @requires jsonwebtoken
 * @requires crypto
 * @requires config/logger
 * @copyright 2026 EcoSynTech
 * Converted to TypeScript - Phase 1
 */

import jwt, { SignOptions, VerifyOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../config/logger';
import db from '../config/database';

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface TokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
  type?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenStore {
  hash: string;
  created: number;
  rotationCount: number;
}

export interface FailedLoginAttempt {
  count: number;
  windowStart: number;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  error?: string;
}

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

const nodeEnv = process.env.NODE_ENV || 'development';
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (nodeEnv === 'production') {
    throw new Error('FATAL: JWT_SECRET is required in production. Set JWT_SECRET environment variable.');
  }
  JWT_SECRET = 'test-secret-key-for-development-use-only';
  logger.warn('⚠️  JWT_SECRET not set. Using default secret. NOT FOR PRODUCTION.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '1800', 10);

const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION_MS = parseInt(process.env.LOGIN_LOCKOUT_DURATION || '900000', 10);
const LOCKOUT_WINDOW_MS = 300000;

const refreshTokenStore = new Map<string, RefreshTokenStore>();
const REFRESH_TOKEN_MAX = 1000;

const failedLoginAttempts = new Map<string, FailedLoginAttempt>();
const lockedAccounts = new Map<string, number>();

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function storeRefreshToken(userId: string, token: string, ip?: string, userAgent?: string): void {
  try {
    db.saveRefreshToken(userId, token, ip || '', userAgent || '', 7);
  } catch (err: any) {
    logger.warn('[Auth] DB save refresh token failed, using memory fallback');
    const hash = hashToken(token);
    refreshTokenStore.set(userId, {
      hash,
      created: Date.now(),
      rotationCount: 0
    });
  }
}

export function verifyRefreshToken(userId: string, token: string): boolean {
  try {
    if (db.verifyRefreshToken(userId, token)) {
      return true;
    }
  } catch (err: any) {
    logger.debug('[Auth] DB verify refresh token failed, trying memory');
  }
  
  const stored = refreshTokenStore.get(userId);
  if (!stored) return false;
  
  const hash = hashToken(token);
  return stored.hash === hash;
}

export function rotateRefreshToken(userId: string, oldToken: string): string | null {
  let newToken: string;
  
  try {
    newToken = generateRefreshToken({ id: userId });
    const result = db.rotateRefreshToken(userId, oldToken, newToken, undefined, undefined);
    if (result) {
      return newToken;
    }
  } catch (err: any) {
    logger.debug('[Auth] DB rotate failed, trying memory');
  }
  
  const stored = refreshTokenStore.get(userId);
  if (!stored) return null;
  
  if (stored.rotationCount >= 5) {
    logger.warn('[Auth] Max refresh token rotation reached for user:', userId);
    refreshTokenStore.delete(userId);
    return null;
  }
  
  stored.rotationCount++;
  newToken = generateRefreshToken({ id: userId });
  storeRefreshToken(userId, newToken);
  return newToken;
}

export function revokeRefreshToken(userId: string, token: string): void {
  try {
    db.revokeRefreshToken(userId, token);
  } catch (err: any) {
    logger.debug('[Auth] DB revoke refresh token failed');
  }
  
  refreshTokenStore.delete(userId);
  logger.info('[Auth] Refresh token revoked for user:', userId);
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
}

export function generateRefreshToken(user: { id: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    JWT_SECRET as string,
    { expiresIn: REFRESH_EXPIRES_IN } as SignOptions
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  } catch (err: any) {
    return null;
  }
}

export function recordFailedLogin(userId: string): number {
  const now = Date.now();
  let attempts = failedLoginAttempts.get(userId);
  if (!attempts) {
    attempts = { count: 0, windowStart: now };
  }
  
  if (now - attempts.windowStart > LOCKOUT_WINDOW_MS) {
    attempts = { count: 1, windowStart: now };
    failedLoginAttempts.set(userId, attempts);
    return 1;
  }
  
  attempts.count = attempts.count + 1;
  failedLoginAttempts.set(userId, attempts);
  
  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    lockedAccounts.set(userId, now + LOCKOUT_DURATION_MS);
    logger.warn('[Auth] Account locked due to failed attempts:', userId);
    failedLoginAttempts.delete(userId);
  }
  
  return attempts.count;
}

export function checkAccountLocked(userId: string): boolean {
  const lockUntil = lockedAccounts.get(userId);
  if (lockUntil && lockUntil > Date.now()) {
    return true;
  }
  if (lockUntil) {
    lockedAccounts.delete(userId);
    failedLoginAttempts.delete(userId);
  }
  return false;
}

export function clearFailedLogins(userId: string): void {
  failedLoginAttempts.delete(userId);
  lockedAccounts.delete(userId);
}

export function authenticate(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'No token provided' });
    return;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    return;
  }
  
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role
  };
  req.userId = payload.sub;
  
  next();
}

export function authorize(...roles: string[]) {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: 'Not authenticated' });
      return;
    }
    
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ ok: false, error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

export function optionalAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (payload) {
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
    req.userId = payload.sub;
  }
  
  next();
}

export function isAuthenticated(req: any): boolean {
  return !!req.user && !!req.user.id;
}

export function getUserRole(req: any): string | null {
  return req.user?.role || null;
}

export function hasPermission(req: any, action: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    admin: ['*'],
    manager: ['read', 'write', 'execute'],
    worker: ['read', 'execute'],
    device: ['execute']
  };
  
  const userRole = req.user?.role;
  if (!userRole) return false;
  
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes('*') || permissions.includes(action);
}

export function getJWT_SECRET(): string {
  return JWT_SECRET as string;
}

export function getJWT_EXPIRES_IN(): string {
  return JWT_EXPIRES_IN;
}

export function getREFRESH_EXPIRES_IN(): string {
  return REFRESH_EXPIRES_IN;
}

export function getSESSION_TIMEOUT(): number {
  return SESSION_TIMEOUT;
}

export function getMAX_FAILED_ATTEMPTS(): number {
  return MAX_FAILED_ATTEMPTS;
}

export function getLOCKOUT_DURATION_MS(): number {
  return LOCKOUT_DURATION_MS;
}

export {
  authenticate as default,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  SESSION_TIMEOUT,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS
};