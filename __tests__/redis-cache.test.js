/**
 * Redis Cache Service Tests
 * V5.1.0 - Comprehensive test suite for Redis cache with memory fallback
 *
 * Uses PDCA methodology:
 * - Plan: Test coverage for all Redis operations
 * - Do: Execute Jest tests
 * - Check: Verify coverage and quality
 * - Act: Fix any failures
 */

const redisCache = require('../src/services/redisCache');

describe('Redis Cache Service', () => {
  const TEST_KEY = 'test:key';
  const TEST_VALUE = { data: 'test-value', number: 42 };
  const TEST_TTL = 60;

  beforeAll(async () => {
    await redisCache.initRedis({ host: 'localhost', port: 6379 });
  });

  afterAll(async () => {
    await redisCache.flush();
    await redisCache.close();
  });

  beforeEach(async () => {
    await redisCache.flush();
  });

  describe('initRedis', () => {
    it('should initialize with default config', async () => {
      const result = await redisCache.initRedis();
      expect(typeof result).toBe('boolean');
    });

    it('should handle custom host and port', async () => {
      const result = await redisCache.initRedis({ host: '127.0.0.1', port: 6379 });
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid host gracefully', async () => {
      const result = await redisCache.initRedis({ host: 'invalid-host', port: 9999 });
      expect(result).toBe(false);
    });
  });

  describe('set and get', () => {
    it('should set and get string value', async () => {
      await redisCache.set(TEST_KEY, 'test-string', TEST_TTL);
      const result = await redisCache.get(TEST_KEY);
      expect(result).toBe('test-string');
    });

    it('should set and get object value', async () => {
      await redisCache.set(TEST_KEY, TEST_VALUE, TEST_TTL);
      const result = await redisCache.get(TEST_KEY);
      expect(result).toEqual(TEST_VALUE);
    });

    it('should return null for non-existent key', async () => {
      const result = await redisCache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should set with default TTL', async () => {
      await redisCache.set(TEST_KEY, 'value');
      const result = await redisCache.get(TEST_KEY);
      expect(result).toBe('value');
    });

    it('should override existing key', async () => {
      await redisCache.set(TEST_KEY, 'first', TEST_TTL);
      await redisCache.set(TEST_KEY, 'second', TEST_TTL);
      const result = await redisCache.get(TEST_KEY);
      expect(result).toBe('second');
    });
  });

  describe('del', () => {
    it('should delete existing key', async () => {
      await redisCache.set(TEST_KEY, 'value', TEST_TTL);
      const result = await redisCache.del(TEST_KEY);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await redisCache.del('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      await redisCache.set(TEST_KEY, 'value', TEST_TTL);
      const result = await redisCache.exists(TEST_KEY);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await redisCache.exists('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getByPattern', () => {
    it('should get all keys matching pattern', async () => {
      await redisCache.set('test:key1', 'value1', TEST_TTL);
      await redisCache.set('test:key2', 'value2', TEST_TTL);
      await redisCache.set('other:key', 'value3', TEST_TTL);

      const result = await redisCache.getByPattern('test:*');
      expect(Object.keys(result).length).toBe(2);
    });

    it('should return empty object for no matches', async () => {
      const result = await redisCache.getByPattern('nonexistent:*');
      expect(result).toEqual({});
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      await redisCache.set('test:key1', 'value1', TEST_TTL);
      await redisCache.set('test:key2', 'value2', TEST_TTL);

      const count = await redisCache.invalidatePattern('test:*');
      expect(count).toBe(2);
    });

    it('should return 0 for no matches', async () => {
      const count = await redisCache.invalidatePattern('nonexistent:*');
      expect(count).toBe(0);
    });
  });

  describe('invalidateByPrefix', () => {
    it('should delete keys by prefix', async () => {
      await redisCache.set('prefix:key1', 'value1', TEST_TTL);
      await redisCache.set('prefix:key2', 'value2', TEST_TTL);

      const count = await redisCache.invalidateByPrefix('prefix');
      expect(count).toBe(2);
    });
  });

  describe('flush', () => {
    it('should clear all keys', async () => {
      await redisCache.set('key1', 'value1', TEST_TTL);
      await redisCache.set('key2', 'value2', TEST_TTL);

      const result = await redisCache.flush();
      expect(result).toBe(true);

      const keys = await redisCache.getByPattern('*');
      expect(Object.keys(keys).length).toBe(0);
    });
  });

  describe('cached (memoization)', () => {
    it('should return cached value if exists', async () => {
      await redisCache.set(TEST_KEY, 'cached-value', TEST_TTL);

      const result = await redisCache.cached(TEST_KEY, () => 'new-value');
      expect(result).toBe('cached-value');
    });

    it('should fetch and cache if not exists', async () => {
      const result = await redisCache.cached('uncached-key', async () => 'computed-value', TEST_TTL);
      expect(result).toBe('computed-value');

      const cached = await redisCache.get('uncached-key');
      expect(cached).toBe('computed-value');
    });

    it('should handle undefined return', async () => {
      const result = await redisCache.cached('undefined-key', async () => undefined, TEST_TTL);
      expect(result).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const stats = await redisCache.getStats();
      expect(stats).toHaveProperty('redis');
      expect(stats).toHaveProperty('backend');
      expect(stats).toHaveProperty('memory');
    });

    it('should track memory hits and misses', async () => {
      await redisCache.set(TEST_KEY, 'value', TEST_TTL);
      await redisCache.get(TEST_KEY);
      await redisCache.get('non-existent');

      const stats = await redisCache.getStats();
      expect(stats.memory.hits).toBeGreaterThan(0);
      expect(stats.memory.misses).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid TTL', async () => {
      await redisCache.set(TEST_KEY, 'value', -1);
      const result = await redisCache.get(TEST_KEY);
      expect(result).toBe('value');
    });

    it('should handle null value', async () => {
      await redisCache.set(TEST_KEY, null, TEST_TTL);
      const result = await redisCache.get(TEST_KEY);
      expect(result).toBeNull();
    });

    it('should handle special characters in key', async () => {
      const specialKey = 'test:key:with:special:chars';
      await redisCache.set(specialKey, 'value', TEST_TTL);
      const result = await redisCache.get(specialKey);
      expect(result).toBe('value');
    });

    it('should handle very long values', async () => {
      const longValue = 'x'.repeat(10000);
      await redisCache.set(TEST_KEY, longValue, TEST_TTL);
      const result = await redisCache.get(TEST_KEY);
      expect(result).toBe(longValue);
    });
  });

  describe('DEFAULT_TTL', () => {
    it('should have default TTL constant', () => {
      expect(redisCache.DEFAULT_TTL).toBe(300);
    });
  });
});

describe('Memory Fallback', () => {
  it('should work when Redis is unavailable', async () => {
    await redisCache.close();

    const result = await redisCache.set('memory:key', 'memory-value', 60);
    expect(result).toBe(true);

    const value = await redisCache.get('memory:key');
    expect(value).toBe('memory-value');
  });

  it('should track LRU eviction', async () => {
    for (let i = 0; i < 1005; i++) {
      await redisCache.set(`lru:key${i}`, `value${i}`, 60);
    }

    const value = await redisCache.get('lru:key0');
    expect(value).toBeNull();

    const lastValue = await redisCache.get('lru:key1004');
    expect(lastValue).toBe('value1004');
  });
});