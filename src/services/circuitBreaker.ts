/**
 * Circuit Breaker Pattern Implementation
 * Provides fault tolerance and resilience
 * Converted to TypeScript - Phase 1
 */

import logger from '../config/logger';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  name?: string;
}

export interface CircuitBreakerState {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  nextAttempt: number;
  lastFailure: { message: string; time: number } | null;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private name: string;
  private state: CircuitState;
  private failures: number;
  private successes: number;
  private nextAttempt: number;
  private lastFailure: { message: string; time: number } | null;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;
    this.name = options.name || 'circuit';
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.lastFailure = null;
  }

  canAttempt(): boolean {
    return Date.now() >= this.nextAttempt;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.fire(fn);
  }

  private async fire<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canAttempt()) {
      throw new Error(`Circuit ${this.name} is OPEN. Try again later.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successes++;
    
    if (this.state === 'HALF_OPEN' && this.successes >= this.successThreshold) {
      this.state = 'CLOSED';
      this.successes = 0;
      logger.info(`[CircuitBreaker] ${this.name} CLOSED (recovered)`);
    }
  }

  private onFailure(error: any): void {
    this.failures++;
    this.successes = 0;
    this.lastFailure = { message: error.message, time: Date.now() };
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(`[CircuitBreaker] ${this.name} OPENED after ${this.failures} failures`);
    }
  }

  getState(): CircuitBreakerState {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      lastFailure: this.lastFailure
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
  }

  getStateValue(): CircuitState {
    return this.state;
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return circuitBreakers.get(name) as CircuitBreaker;
}

export function listBreakers(): Record<string, CircuitBreakerState> {
  const breakers: Record<string, CircuitBreakerState> = {};
  for (const [name, breaker] of circuitBreakers) {
    breakers[name] = breaker.getState();
  }
  return breakers;
}

export function resetBreaker(name: string): boolean {
  if (circuitBreakers.has(name)) {
    circuitBreakers.get(name)?.reset();
    return true;
  }
  return false;
}

export function resetAllBreakers(): void {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
}

export default {
  CircuitBreaker,
  getBreaker,
  listBreakers,
  resetBreaker,
  resetAllBreakers
};