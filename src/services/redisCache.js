/**
 * Redis Cache Service - Distributed caching với Redis
 * V5.1.0 - Hỗ trợ Redis + Memory cache fallback
 * 
 * Features:
 * - Redis distributed cache với auto fallback
 * - LRU eviction policy
 * - Key patterns với wildcards
 * - Cache invalidation theo prefix/pattern
 * - TTL với flexible configuration
 * - Connection health monitoring
 */

const logger = require('../config/logger');

const DEFAULT_TTL = 300;
const DEFAULT_MAX_RETRIES = 3;

let redisClient = null;
let isConnected = false;
let useMemoryFallback = true;

const memoryCache = new Map();
const memoryStats = { hits: 0, misses: 0 };

let initAttempted = false;

async function initRedis(config = {}) {
  if (initAttempted) return false;
  initAttempted = true;
  
  const redisConfig = {
    url: `redis://${config.host || process.env.REDIS_HOST || 'localhost'}:${config.port || parseInt(process.env.REDIS_PORT || '6379', 10)}`,
    password: config.password || process.env.REDIS_PASSWORD || undefined,
    database: config.db || parseInt(process.env.REDIS_DB || '0', 10),
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries > 2) {
          return new Error('Max retries exceeded');
        }
        return 500;
      }
    }
  };

  try {
    const { createClient } = require('redis');
    redisClient = createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      logger.warn('Redis connection failed: ' + err.message);
      isConnected = false;
    });
    
    await redisClient.connect();
    isConnected = true;
    useMemoryFallback = false;
    logger.info('Redis cache service initialized');
    
    return true;
  } catch (err) {
    logger.warn('Redis not available, using memory fallback: ' + err.message);
    useMemoryFallback = true;
    if (redisClient) {
      try { await redisClient.disconnect(); } catch {}
    }
    return false;
  }
}

async function get(key) {
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
  } catch (err) {
    logger.warn('Redis get error: ' + err.message);
    return memoryGet(key);
  }
}

async function set(key, value, ttl = DEFAULT_TTL) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memorySet(key, value, ttl * 1000);
  }
  
  try {
    await redisClient.setEx(key, ttl, serialized);
    return true;
  } catch (err) {
    logger.warn('Redis set error: ' + err.message);
    memorySet(key, value, ttl * 1000);
    return false;
  }
}

async function del(key) {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryDelete(key);
  }
  
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    logger.warn('Redis del error: ' + err.message);
    return memoryDelete(key);
  }
}

async function exists(key) {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryHas(key);
  }
  
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (err) {
    return memoryHas(key);
  }
}

async function getByPattern(pattern) {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryGetByPattern(pattern);
  }
  
  try {
    const keys = await redisClient.keys(pattern);
    const result = {};
    for (const key of keys) {
      const value = await get(key);
      if (value !== null) result[key] = value;
    }
    return result;
  } catch (err) {
    logger.warn('Redis keys error: ' + err.message);
    return memoryGetByPattern(pattern);
  }
}

async function invalidatePattern(pattern) {
  if (!redisClient || !isConnected || useMemoryFallback) {
    return memoryInvalidatePattern(pattern);
  }
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return keys.length;
  } catch (err) {
    logger.warn('Redis invalidate pattern error: ' + err.message);
    return 0;
  }
}

async function invalidateByPrefix(prefix) {
  return invalidatePattern(prefix + '*');
}

async function flush() {
  if (!redisClient || !isConnected || useMemoryFallback) {
    memoryCache.clear();
    return true;
  }
  
  try {
    await redisClient.flushDb();
    return true;
  } catch (err) {
    logger.warn('Redis flush error: ' + err.message);
    memoryCache.clear();
    return false;
  }
}

function memoryGet(key) {
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

function memorySet(key, value, ttl) {
  if (memoryCache.size >= 1000) {
    let oldestKey = null;
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

function memoryDelete(key) {
  return memoryCache.delete(key);
}

function memoryHas(key) {
  const item = memoryCache.get(key);
  if (!item) return false;
  if (Date.now() > item.expires) {
    memoryCache.delete(key);
    return false;
  }
  return true;
}

function memoryGetByPattern(pattern) {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  const result = {};
  for (const [key, item] of memoryCache) {
    if (regex.test(key) && Date.now() <= item.expires) {
      result[key] = item.value;
    }
  }
  return result;
}

function memoryInvalidatePattern(pattern) {
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

function getStats() {
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

async function cached(key, fn, ttl = DEFAULT_TTL) {
  const cachedValue = await get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }
  
  const value = await fn();
  if (value !== undefined) {
    await set(key, value, ttl);
  }
  return value;
}

async function close() {
  if (redisClient && isConnected) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

module.exports = {
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