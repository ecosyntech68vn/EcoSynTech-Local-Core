/**
 * Memory Cache Service - LRU in-memory caching
 * Converted to TypeScript - Phase 1
 */

import logger from '../config/logger';

const DEFAULT_TTL = 60 * 1000;
const DEFAULT_MAX_SIZE = 100;

export interface CacheItem<T = any> {
  value: T;
  expires: number;
  accessed: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
}

export class MemoryCacheClass {
  private ttl: number;
  private maxSize: number;
  private cache: Map<string, CacheItem>;
  private hits: number;
  private misses: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || DEFAULT_TTL;
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      let lruKey: string | null = null;
      let oldestTime = Date.now();
      for (const [k, v] of this.cache) {
        if (v.accessed < oldestTime) {
          oldestTime = v.accessed;
          lruKey = k;
        }
      }
      if (lruKey) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl || this.ttl),
      accessed: Date.now()
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      this.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    item.accessed = Date.now();
    this.hits++;
    return item.value;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%'
    };
  }

  getSize(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  prune(): number {
    let pruned = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }
}

export const MemoryCache = new MemoryCacheClass();

export function createCache(options?: CacheOptions): MemoryCacheClass {
  return new MemoryCacheClass(options);
}

export function getCacheStats(): CacheStats {
  return MemoryCache.getStats();
}

export function clearCache(): void {
  MemoryCache.clear();
}

export default {
  MemoryCache,
  createCache,
  getCacheStats,
  clearCache
};