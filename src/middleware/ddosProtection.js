/**
 * DDoS Protection Middleware
 * Progressive blocking based on request patterns
 */

const logger = require('../config/logger');

const ipRequestCounts = new Map();
const blockedIPs = new Map();

const WINDOW_MS = 60000;
const MAX_REQUESTS_NORMAL = 100;
const MAX_REQUESTS_WARNING = 200;
const MAX_REQUESTS_BLOCK = 500;
const BLOCK_DURATION_MS = 300000;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.ip || 
         req.connection?.remoteAddress;
}

function ddosProtection(req, res, next) {
  const ip = getClientIP(req);
  const now = Date.now();
  
  if (blockedIPs.has(ip)) {
    const blockData = blockedIPs.get(ip);
    if (now < blockData.unblockAt) {
      logger.warn(`[DDoS] Blocked IP accessing: ${ip} (blocked until ${new Date(blockData.unblockAt).toISOString()})`);
      return res.status(429).json({
        error: 'Too many requests. IP temporarily blocked.',
        retryAfter: Math.ceil((blockData.unblockAt - now) / 1000)
      });
    } else {
      blockedIPs.delete(ip);
      ipRequestCounts.delete(ip);
      logger.info(`[DDoS] IP unblocked: ${ip}`);
    }
  }
  
  let requestData = ipRequestCounts.get(ip);
  
  if (!requestData || now - requestData.windowStart > WINDOW_MS) {
    requestData = {
      windowStart: now,
      count: 0,
      warnLevel: 0
    };
    ipRequestCounts.set(ip, requestData);
  }
  
  requestData.count++;
  
  if (requestData.count > MAX_REQUESTS_BLOCK) {
    const unblockAt = now + BLOCK_DURATION_MS;
    blockedIPs.set(ip, { unblockAt, reason: 'DDoS threshold exceeded' });
    logger.error(`[DDoS] IP blocked for DDoS: ${ip} (${requestData.count} requests in ${WINDOW_MS}ms)`);
    ipRequestCounts.delete(ip);
    
    return res.status(429).json({
      error: 'IP blocked due to high request volume',
      blocked: true,
      retryAfter: BLOCK_DURATION_MS / 1000
    });
  }
  
  if (requestData.count > MAX_REQUESTS_WARNING && requestData.warnLevel === 0) {
    requestData.warnLevel = 1;
    logger.warn(`[DDoS] High traffic from IP: ${ip} (${requestData.count} requests)`);
  }
  
  if (requestData.count > MAX_REQUESTS_WARNING * 1.5 && requestData.warnLevel === 1) {
    requestData.warnLevel = 2;
    logger.error(`[DDoS] Very high traffic from IP: ${ip} (${requestData.count} requests)`);
  }
  
  res.set('X-RateLimit-Limit', MAX_REQUESTS_BLOCK);
  res.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_BLOCK - requestData.count));
  res.set('X-RateLimit-Reset', new Date(requestData.windowStart + WINDOW_MS).toISOString());
  
  next();
}

function clearBlocklist() {
  const before = blockedIPs.size;
  blockedIPs.clear();
  ipRequestCounts.clear();
  logger.info(`[DDoS] Blocklist cleared (${before} IPs)`);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of blockedIPs) {
    if (now >= data.unblockAt) {
      blockedIPs.delete(ip);
      ipRequestCounts.delete(ip);
    }
  }
  
  for (const [ip, data] of ipRequestCounts) {
    if (now - data.windowStart > WINDOW_MS * 2) {
      ipRequestCounts.delete(ip);
    }
  }
}, 60000);

module.exports = { 
  ddosProtection, 
  clearBlocklist,
  getClientIP,
  WINDOW_MS,
  MAX_REQUESTS_NORMAL,
  MAX_REQUESTS_WARNING,
  MAX_REQUESTS_BLOCK,
  BLOCK_DURATION_MS
};