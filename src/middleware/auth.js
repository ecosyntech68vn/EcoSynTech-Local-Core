/**
 * @fileoverview Authentication middleware for EcoSynTech Local Core
 * @description Provides JWT authentication, account lockout, and HMAC verification
 * @module middleware/auth
 * @requires jsonwebtoken
 * @requires crypto
 * @requires config/logger
 * @see {@link https://github.com/ecosyntech68vn/EcoSynTech-Local-Core}
 * @copyright 2026 EcoSynTech
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');
const db = require('../config/database');

/**
 * @typedef {Object} User
 * @property {string} id - User unique identifier
 * @property {string} email - User email address
 * @property {string} role - User role (admin, manager, user)
 */

/**
 * @typedef {Object} TokenPayload
 * @property {string} sub - Subject (user ID)
 * @property {string} email - User email
 * @property {string} role - User role
 * @property {string} [type] - Token type (refresh)
 */

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

const refreshTokenStore = new Map();
const REFRESH_TOKEN_MAX = 1000;

const failedLoginAttempts = new Map();
const lockedAccounts = new Map();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function storeRefreshToken(userId, token, ip, userAgent) {
  try {
    db.saveRefreshToken(userId, token, ip, userAgent, 7);
  } catch (err) {
    logger.warn('[Auth] DB save refresh token failed, using memory fallback');
    const hash = hashToken(token);
    refreshTokenStore.set(userId, {
      hash,
      created: Date.now(),
      rotationCount: 0
    });
  }
}

function verifyRefreshToken(userId, token) {
  try {
    if (db.verifyRefreshToken(userId, token)) {
      return true;
    }
  } catch (err) {
    logger.debug('[Auth] DB verify refresh token failed, trying memory');
  }
  
  const stored = refreshTokenStore.get(userId);
  if (!stored) return false;
  
  const hash = hashToken(token);
  return stored.hash === hash;
}

function rotateRefreshToken(userId, oldToken) {
  let newToken;
  
  try {
    newToken = generateRefreshToken({ id: userId });
    const result = db.rotateRefreshToken(userId, oldToken, newToken, null, null);
    if (result) {
      return newToken;
    }
  } catch (err) {
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

function revokeRefreshToken(userId, token) {
  try {
    db.revokeRefreshToken(userId, token);
  } catch (err) {
    logger.debug('[Auth] DB revoke refresh token failed');
  }
  
  refreshTokenStore.delete(userId);
  logger.info('[Auth] Refresh token revoked for user:', userId);
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function recordFailedLogin(userId) {
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

function checkAccountLocked(userId) {
  const lockUntil = lockedAccounts.get(userId);
  if (lockUntil && lockUntil > Date.now()) {
    const remainingSeconds = Math.ceil((lockUntil - Date.now()) / 1000);
    return remainingSeconds;
  }
  if (lockUntil) {
    lockedAccounts.delete(userId);
    failedLoginAttempts.delete(userId);
  }
  return 0;
}

function clearFailedLogins(userId) {
  failedLoginAttempts.delete(userId);
  lockedAccounts.delete(userId);
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }

  // Check session timeout
  if (decoded.iat && SESSION_TIMEOUT > 0) {
    const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
    if (tokenAge > SESSION_TIMEOUT) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
  }

  req.user = decoded;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// API Key authentication for devices
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const { getOne } = require('../config/database');
  const keyRecord = getOne('SELECT * FROM api_keys WHERE key = ? AND expires_at > datetime("now")', [apiKey]);

  if (!keyRecord) {
    const apiPreview = (typeof apiKey === 'string') ? apiKey.substring(0, 8) : 'unknown';
    logger.warn(`[Auth] Invalid API key: ${apiPreview}...`);
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.apiKey = keyRecord;
  req.deviceId = keyRecord.device_id;
  next();
}

// HMAC signature authentication for ESP32
function hmacAuth(req, res, next) {
  const signature = req.headers['x-ecosyntech-signature'];
  if (!signature) {
    return res.status(401).json({ ok: false, error: 'Missing signature' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }
  next();
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  storeRefreshToken,
  recordFailedLogin,
  checkAccountLocked,
  clearFailedLogins,
  auth,
  optionalAuth,
  requireRole,
  requireAdmin,
  apiKeyAuth,
  hmacAuth
};
