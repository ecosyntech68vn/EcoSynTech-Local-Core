/**
 * Retry Service - Provides retry logic with exponential backoff
 * Converted to TypeScript - Phase 1
 */

import logger from '../config/logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
  onRetry?: (info: RetryInfo) => void;
}

export interface RetryInfo {
  attempt: number;
  delay: number;
  error: string;
}

export interface RetryError {
  attempt: number;
  error: string;
  time: string;
}

import DEFAULT_MAX_RETRIES = 3;
import DEFAULT_INITIAL_DELAY = 1000;
import DEFAULT_BACKOFF_FACTOR = 2;

export class RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
  onRetry: ((info: RetryInfo) => void) | null;

  constructor(options: RetryOptions = {}) {
    this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
    this.initialDelay = options.initialDelay || DEFAULT_INITIAL_DELAY;
    this.backoffFactor = options.backoffFactor || DEFAULT_BACKOFF_FACTOR;
    this.retryableErrors = options.retryableErrors || ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'];
    this.onRetry = options.onRetry || null;
  }

  getDelay(attempt: number): number {
    return this.initialDelay * Math.pow(this.backoffFactor, attempt);
  }

  shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;
    const code = error.code || error.name;
    return this.retryableErrors.some(e => code && code.includes(e));
  }
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = new RetryConfig(options);
  let lastError: any = null;
  const errors: RetryError[] = [];

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      errors.push({ attempt, error: error.message, time: new Date().toISOString() });
      
      if (!opts.shouldRetry(error, attempt)) {
        break;
      }
      
      const delay = opts.getDelay(attempt);
      
      if (opts.onRetry) {
        opts.onRetry({ attempt, delay, error: error.message });
      } else {
        logger.warn(`[Retry] Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logger.error(`[Retry] All attempts failed after ${errors.length} tries`);
  throw lastError;
}

export function withFallback<T>(
  primaryFn: (...args: any[]) => Promise<T>,
  fallbackFn: (...args: any[]) => Promise<T>,
  options: RetryOptions = {}
): (...args: any[]) => Promise<T> {
  return async (...args: any[]) => {
    try {
      return await primaryFn(...args);
    } catch (error: any) {
      logger.warn(`[Fallback] Primary failed: ${error.message}. Using fallback...`);
      try {
        return await fallbackFn(...args);
      } catch (fallbackError: any) {
        logger.error(`[Fallback] Also failed: ${fallbackError.message}`);
        throw error;
      }
    }
  };
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
}

export function withCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  options: CircuitBreakerOptions = {}
): (...args: any[]) => Promise<T> {
  const failureThreshold = options.failureThreshold || 5;
  const resetTimeout = options.resetTimeout || 30000;
  
  let failures = 0;
  let isOpen = false;
  let lastFailure = 0;

  return async (...args: any[]) => {
    if (isOpen) {
      const now = Date.now();
      if (now - lastFailure > resetTimeout) {
        logger.info('[CircuitBreaker] Resetting after timeout');
        isOpen = false;
        failures = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn(...args);
      failures = 0;
      return result;
    } catch (error: any) {
      failures++;
      lastFailure = Date.now();
      
      if (failures >= failureThreshold) {
        isOpen = true;
        logger.error(`[CircuitBreaker] Opened after ${failures} failures`);
      }
      
      throw error;
    }
  };
}

export function createGracefulHandler(
  handler: (req: any, res: any) => Promise<void>,
  fallbackHandler: ((req: any, res: any) => Promise<void>) | null = null
): (req: any, res: any, next: any) => Promise<void> {
  return async (req: any, res: any, next: any) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      logger.error('[Graceful] Handler error:', error.message);
      
      if (fallbackHandler) {
        try {
          await fallbackHandler(req, res);
        } catch (fallbackError: any) {
          res.status(500).json({ error: 'Service temporarily unavailable' });
        }
      } else {
        next(error);
      }
    }
  };
}

export default {
  retry,
  RetryOptions: RetryConfig,
  withFallback,
  withCircuitBreaker,
  createGracefulHandler
};