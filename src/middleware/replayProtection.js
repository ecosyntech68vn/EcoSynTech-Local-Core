/**
 * Replay Attack Protection Middleware
 * Validates timestamp to prevent replay attacks
 */

const logger = require('../config/logger');

const TIMESTAMP_WINDOW_MS = 300000;
const recentRequests = new Map();

function replayProtection(req, res, next) {
  const timestamp = req.headers['x-request-timestamp'];
  
  if (!timestamp) {
    return next();
  }
  
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  
  if (isNaN(requestTime)) {
    return res.status(400).json({ error: 'Invalid timestamp format' });
  }
  
  if (Math.abs(now - requestTime) > TIMESTAMP_WINDOW_MS) {
    logger.warn(`[Replay] Request timestamp out of window: ${Math.abs(now - requestTime)}ms`);
    return res.status(400).json({ 
      error: 'Request timestamp expired',
      maxAge: TIMESTAMP_WINDOW_MS / 1000
    });
  }
  
  const requestHash = `${req.method}:${req.path}:${req.ip}:${timestamp}:${JSON.stringify(req.body || {})}:`;
  
  if (recentRequests.has(requestHash)) {
    logger.warn(`[Replay] Duplicate request detected`);
    return res.status(429).json({ error: 'Duplicate request detected' });
  }
  
  recentRequests.set(requestHash, now);
  
  setTimeout(() => {
    recentRequests.delete(requestHash);
  }, TIMESTAMP_WINDOW_MS);
  
  res.set('X-Request-Timestamp', now.toString());
  
  next();
}

function requireTimestamp(req, res, next) {
  const timestamp = req.headers['x-request-timestamp'];
  
  if (!timestamp) {
    return res.status(400).json({ 
      error: 'Missing required header: X-Request-Timestamp',
      hint: 'Include X-Request-Timestamp header with current Unix timestamp in milliseconds'
    });
  }
  
  next();
}

module.exports = { replayProtection, requireTimestamp };