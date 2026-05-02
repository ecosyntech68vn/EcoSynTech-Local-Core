import logger from '../config/logger';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export const DEVICE_LIMITS: Record<string, number> = {
  free: 100,
  basic: 500,
  premium: 2000,
  enterprise: 10000
};

export const DEFAULT_LIMIT = 100;
export const WINDOW_MS = 60 * 1000;

export function getDeviceTier(deviceId: string): string {
  return 'free';
}

export function rateLimitPerDevice(req: any, res: any, next: any): void {
  const deviceId = req.headers['x-device-id'] || req.ip;
  const tier = getDeviceTier(deviceId);
  const limit = (DEVICE_LIMITS[tier] ?? DEFAULT_LIMIT) as number;
  
  const key = `ratelimit:${deviceId}`;
  const now = Date.now();
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 0, resetAt: now + WINDOW_MS });
  }
  
  const rl = rateLimits.get(key)!;
  
  if (now > rl.resetAt) {
    rl.count = 0;
    rl.resetAt = now + WINDOW_MS;
  }
  
  rl.count++;
  
  const remaining = Math.max(0, limit - rl.count);
  const resetSeconds = Math.ceil((rl.resetAt - now) / 1000);
  
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetSeconds.toString());
  
  if (rl.count > limit) {
    logger.warn(`[RateLimit] Device ${deviceId} exceeded limit: ${rl.count}/${limit}`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: resetSeconds
    });
  }
  
  next();
}

function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, rl] of rateLimits) {
    if (now > rl.resetAt) {
      rateLimits.delete(key);
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupRateLimits, 60000);
}

export default {
  rateLimitPerDevice,
  getDeviceTier,
  DEVICE_LIMITS
};