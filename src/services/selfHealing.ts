/**
 * Self-Healing Service
 * Automatic recovery and health monitoring
 * Converted to TypeScript - Phase 1
 */

import logger from '../config/logger';

export interface HealthCheckResult {
  healthy: boolean;
  result?: any;
  error?: string;
}

export interface CheckMetrics {
  lastCheck: string | null;
  status: 'unknown' | 'healthy' | 'unhealthy';
  duration?: number;
  consecutiveFailures: number;
}

export interface SelfHealMetrics {
  restarts: number;
  errors: string[];
  lastError: string | null;
  uptime: number;
  checks: Record<string, CheckMetrics>;
}

export interface RecoveryAction {
  (): Promise<void>;
}

const METRICS: SelfHealMetrics = {
  restarts: 0,
  errors: [],
  lastError: null,
  uptime: Date.now(),
  checks: {}
};

const SELF_HEAL_ENABLED = process.env.SELF_HEAL_ENABLED !== 'false';

export function healthCheck(name: string, fn: () => Promise<any>): () => Promise<HealthCheckResult> {
  METRICS.checks[name] = {
    lastCheck: null,
    status: 'unknown',
    consecutiveFailures: 0
  };
  
  return async () => {
    const start = Date.now();
    try {
      const result = await fn();
      METRICS.checks[name] = {
        lastCheck: new Date().toISOString(),
        status: 'healthy',
        duration: Date.now() - start,
        consecutiveFailures: 0
      };
      return { healthy: true, result };
    } catch (error: any) {
      const check = METRICS.checks[name];
      if (check) {
        check.consecutiveFailures++;
        check.lastCheck = new Date().toISOString();
        check.status = 'unhealthy';
        
        if (check.consecutiveFailures >= 3) {
          logger.error(`[SelfHeal] ${name} failed ${check.consecutiveFailures} times`);
          await triggerRecovery(name);
        }
      }
      
      return { healthy: false, error: error.message };
    }
  };
}

async function triggerRecovery(name: string): Promise<void> {
  const recoveryActions: Record<string, RecoveryAction> = {
    database: async () => {
      logger.info('[SelfHeal] Attempting database recovery...');
      const db = require('../config/database');
      try {
        db.saveDatabase();
        logger.info('[SelfHeal] Database saved');
      } catch (e: any) {
        logger.error('[SelfHeal] DB save failed:', e.message);
      }
    },
    cache: async () => {
      logger.info('[SelfHeal] Clearing cache...');
      const cache = require('../services/cacheService');
      cache.stopCache?.();
      logger.info('[SelfHeal] Cache stopped');
    },
    scheduler: async () => {
      logger.info('[SelfHeal] Restarting scheduler...');
      try {
        const serverModule = require('../../server');
        const ops = serverModule.getOps?.();
        if (ops?.getScheduler) {
          const scheduler = ops.getScheduler();
          if (scheduler) {
            scheduler.stop?.();
            scheduler.start?.();
            METRICS.restarts++;
          }
        }
      } catch (e) {
        logger.warn('[SelfHeal] Scheduler recovery not available');
      }
    },
    redis: async () => {
      logger.info('[SelfHeal] Reconnecting Redis...');
      const redis = require('./redisCache');
      try {
        await redis.close?.();
        await redis.initRedis?.();
        logger.info('[SelfHeal] Redis reconnected');
      } catch (e: any) {
        logger.error('[SelfHeal] Redis recovery failed:', e.message);
      }
    }
  };
  
  const action = recoveryActions[name];
  if (action) {
    try {
      await action();
      logger.info(`[SelfHeal] ${name} recovered`);
    } catch (e: any) {
      logger.error(`[SelfHeal] ${name} recovery failed:`, e.message);
      METRICS.errors.push(`${name}: ${e.message}`);
    }
  }
}

export function getMetrics(): SelfHealMetrics {
  return {
    ...METRICS,
    uptime: Date.now() - METRICS.uptime
  };
}

export function getCheckStatus(name: string): CheckMetrics | undefined {
  return METRICS.checks[name];
}

export function resetMetrics(): void {
  METRICS.restarts = 0;
  METRICS.errors = [];
  METRICS.lastError = null;
  METRICS.uptime = Date.now();
}

export function isEnabled(): boolean {
  return SELF_HEAL_ENABLED;
}

export function resetCheck(name: string): void {
  if (METRICS.checks[name]) {
    METRICS.checks[name].consecutiveFailures = 0;
    METRICS.checks[name].status = 'unknown';
  }
}

export default {
  healthCheck,
  getMetrics,
  getCheckStatus,
  resetMetrics,
  isEnabled,
  resetCheck
};