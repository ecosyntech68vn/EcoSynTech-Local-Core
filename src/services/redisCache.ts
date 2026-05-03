/**
 * Redis Cache Service - Distributed caching với Redis
 * V5.1.0 - Hỗ trợ Redis + Memory cache fallback
 * Converted to TypeScript - Phase 1
 * 
 * Features:
 * - Redis distributed cache với auto fallback
 * - LRU eviction policy
 * - Key patterns với wildcards
 * - Cache invalidation theo prefix/pattern
 * - TTL với flexible configuration
 * - Connection health monitoring
 */

import logger from '../config/logger';

interface IRedisClient {
  get(key: string): Promise<string | null>;
  setEx(key: string, ttl: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<number>;
  flushDb(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  quit(): Promise<void>;
  on(event: string, callback: (err?: Error) => void): void;
}

interface MemoryCacheItem {
  value: any;
  expires: number;
  accessed: number;
}

interface MemoryStats {
  hits: number;
  misses: number;
}

export interface IRedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
}

export interface ICacheStats {
  redis: boolean;
  backend: string;
  memory: {
    size: number;
    hits: number;
    misses: number;
    hitRate: string;
  };
}

export const DEFAULT_TTL = 300;
import DEFAULT_MAX_RETRIES = 3;

let redisClient: IRedisClient | null = null;
let isConnected = false;
let useMemoryFallback = true;

import memoryCache = new Map<string, MemoryCacheItem>();
import memoryStats: MemoryStats = { hits: 0, misses: 0 };

let initAttempted = false;

export async function initRedis(config: IRedisConfig = {}): Promise<boolean> {
  if (initAttempted) return false;
  initAttempted = true;
  
  const redisConfig = {
    url: `redis://${config.host || process.env.REDIS_HOST || 'localhost'}:${config.port || parseInt(process.env.REDIS_PORT || '6379', 10)}`,
    password: config.password || process.env.REDIS_PASSWORD || undefined,
    database: config.db || parseInt(process.env.REDIS_DB || '0', 10),
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries: number) => {
        if (retries > 2) {
          return new Error('Max retries exceeded');
        }
        return 500;
      }
    }
  };

  try {
    const { createClient } from('redis') as { createClient: (config: any) => IRedisClient };
    redisClient = createClient(redisConfig);
    
    redisClient.on('error', (err?: Error) => {
      logger.warn('Redis connection failed: ' + (err?.message || 'Unknown error'));
      isConnected = false;
    });
    
    await redisClient.connect();
    isConnected = true;
    useMemoryFallback = false;
    logger.info('Redis cache service initialized');
    
    return true;
  } catch (err: any) {
    logger.warn('Redis not available, using memory fallback: ' + err.message);
    useMemoryFallback = true;
    if (redisClient) {
      try { await redisClient.disconnect(); } catch {}
    }
    return false;
  }
}

export async function get(key: string): Promise<any> {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryGet(key);
  }
  
  try {
    const value = await redisClient.get(key);
    if (value !== null) {
      memoryStats.hits++;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    memoryStats.misses++;
    return null;
  } catch (err: any) {
    logger.warn('Redis get error: ' + err.message);
    return memoryGet(key);
  }
}

export async function set(key: string, value: any, ttl: number = DEFAULT_TTL): Promise<boolean> {
  const effectiveTTL = ttl > 0 ? ttl : DEFAULT_TTL;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memorySet(key, value, effectiveTTL * 1000);
  }
  
  try {
    await redisClient.setEx(key, effectiveTTL, serialized);
    return true;
  } catch (err: any) {
    logger.warn('Redis set error: ' + err.message);
    memorySet(key, value, effectiveTTL * 1000);
    return false;
  }
}

export async function del(key: string): Promise<boolean> {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryDelete(key);
  }
  
  try {
    await redisClient.del(key);
    return true;
  } catch (err: any) {
    logger.warn('Redis del error: ' + err.message);
    return memoryDelete(key);
  }
}

export async function exists(key: string): Promise<boolean> {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryHas(key);
  }
  
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (err: any) {
    return memoryHas(key);
  }
}

export async function getByPattern(pattern: string): Promise<Record<string, any>> {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryGetByPattern(pattern);
  }
  
  try {
    const keys = await redisClient.keys(pattern);
    const result: Record<string, any> = {};
    for (const key of keys) {
      const value = await get(key);
      if (value !== null) result[key] = value;
    }
    return result;
  } catch (err: any) {
    logger.warn('Redis keys error: ' + err.message);
    return memoryGetByPattern(pattern);
  }
}

export async function invalidatePattern(pattern: string): Promise<number> {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryInvalidatePattern(pattern);
  }
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return keys.length;
  } catch (err: any) {
    logger.warn('Redis invalidate pattern error: ' + err.message);
    return 0;
  }
}

export async function invalidateByPrefix(prefix: string): Promise<number> {
  return invalidatePattern(prefix + '*');
}

export async function flush(): Promise<boolean> {
  if (!redisClient || !isConnected || useMemoryFallback) {
    memoryCache.clear();
    return true;
  }
  
  try {
    await redisClient.flushDb();
    return true;
  } catch (err: any) {
    logger.warn('Redis flush error: ' + err.message);
    memoryCache.clear();
    return false;
  }
}

function memoryGet(key: string): any {
  const item = memoryCache.get(key);
  if (!item) {
    memoryStats.misses++;
    return null;
  }
  if (Date.now() > item.expires) {
    memoryCache.delete(key);
    memoryStats.misses++;
    return null;
  }
  item.accessed = Date.now();
  memoryStats.hits++;
  return item.value;
}

function memorySet(key: string, value: any, ttl: number): boolean {
  if (memoryCache.size >= 1000) {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.accessed < oldestTime) {
        oldestTime = v.accessed;
        oldestKey = k;
      }
    }
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  
  memoryCache.set(key, {
    value,
    expires: Date.now() + ttl,
    accessed: Date.now()
  });
  return true;
}

function memoryDelete(key: string): boolean {
  return memoryCache.delete(key);
}

function memoryHas(key: string): boolean {
  const item = memoryCache.get(key);
  if (!item) return false;
  if (Date.now() > item.expires) {
    memoryCache.delete(key);
    return false;
  }
  return true;
}

function memoryGetByPattern(pattern: string): Record<string, any> {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  const result: Record<string, any> = {};
  for (const [key, item] of memoryCache) {
    if (regex.test(key) && Date.now() <= item.expires) {
      result[key] = item.value;
    }
  }
  return result;
}

function memoryInvalidatePattern(pattern: string): number {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  let count = 0;
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}

export function getStats(): ICacheStats {
  const total = memoryStats.hits + memoryStats.misses;
  return {
    redis: isConnected && !useMemoryFallback,
    backend: useMemoryFallback ? 'memory' : 'redis',
    memory: {
      size: memoryCache.size,
      hits: memoryStats.hits,
      misses: memoryStats.misses,
      hitRate: total > 0 ? (memoryStats.hits / total * 100).toFixed(1) + '%' : '0%'
    }
  };
}

export async function cached<T>(key: string, fn: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T | null> {
  const cachedValue = await get(key);
  if (cachedValue !== null) {
    return cachedValue as T;
  }
  
  const value = await fn();
  if (value !== undefined) {
    await set(key, value, ttl);
  }
  return value;
}

export async function close(): Promise<void> {
  if (redisClient && isConnected) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

export default {
  initRedis,
  get,
  set,
  del,
  exists,
  getByPattern,
  invalidatePattern,
  invalidateByPrefix,
  flush,
  cached,
  getStats,
  close,
  DEFAULT_TTL
};