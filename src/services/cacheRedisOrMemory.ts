'use strict';

interface CacheEntry {
  value: unknown;
  expires: number;
}

interface CacheClient {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

let redisClient: unknown = null;
let useRedis = false;
const memoryCache = new Map<string, CacheEntry>();

async function initRedis(): Promise<void> {
  if (redisClient || useRedis) return;
  try {
    const redis = require('redis');
    redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await (redisClient as { connect: () => Promise<void> }).connect();
    useRedis = true;
    console.info('[Cache] Redis cache initialized');
  } catch (e) {
    useRedis = false;
  }
}

async function getCache(): Promise<CacheClient> {
  if (!redisClient && !useRedis) {
    await initRedis();
  }
  return {
    async get(key: string): Promise<unknown> {
      if (useRedis && redisClient) {
        try {
          const redisCli = redisClient as { get: (key: string) => Promise<string | null> };
          const raw = await redisCli.get(key);
          if (raw) return JSON.parse(raw);
        } catch (e) { /* fallback to memory */ }
      }
      const entry = memoryCache.get(key);
      if (entry) {
        const { value, expires } = entry;
        if (Date.now() < expires) return value;
        memoryCache.delete(key);
      }
      return null;
    },
    async set(key: string, value: unknown, ttl?: number): Promise<void> {
      const ttlMs = typeof ttl === 'number' ? ttl : 60000;
      if (useRedis && redisClient) {
        try {
          const redisCli = redisClient as { setEx: (key: string, ttl: number, value: string) => Promise<void> };
          await redisCli.setEx(key, Math.ceil(ttlMs / 1000), JSON.stringify(value));
          return;
        } catch (e) {
          useRedis = false;
        }
      }
      memoryCache.set(key, {
        value,
        expires: Date.now() + ttlMs
      });
    },
    async del(key: string): Promise<void> {
      if (useRedis && redisClient) {
        try {
          const redisCli = redisClient as { del: (key: string) => Promise<number> };
          await redisCli.del(key);
        } catch (e) { /* ignore */ }
      }
      memoryCache.delete(key);
    }
  };
}

async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttl = 60000): Promise<T> {
  const cache = await getCache();
  const cached = await cache.get(key);
  if (cached !== null) {
    return cached as T;
  }
  const data = await fetchFn();
  await cache.set(key, data, ttl);
  return data;
}

async function invalidateCache(pattern: string): Promise<number> {
  const cache = await getCache();
  const keys = Array.from(memoryCache.keys()).filter(k => k.includes(pattern));
  for (const key of keys) {
    await cache.del(key);
  }
  return keys.length;
}

function getStats() {
  return {
    useRedis,
    memoryEntries: memoryCache.size,
    memoryKeys: Array.from(memoryCache.keys())
  };
}

export {
  getCache,
  getCachedData,
  invalidateCache,
  getStats,
  initRedis
};