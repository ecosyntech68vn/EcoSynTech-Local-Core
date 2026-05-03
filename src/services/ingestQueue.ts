/**
 * Ingest Queue - Sensor data ingestion with buffering
 * Converted to TypeScript - Phase 1
 */

import EventEmitter from 'events';
import logger from '../config/logger';
import sensorValidator from './sensorValidator';
import alertService from './alertService';

export interface SensorReading {
  deviceId: string;
  sensor: string;
  value: number;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface IngestStats {
  enqueued: number;
  processed: number;
  rejected: number;
  errors: number;
  queueSize: number;
}

export interface IngestQueueOptions {
  maxSize?: number;
  flushInterval?: number;
  batchSize?: number;
}

export class IngestQueueClass extends EventEmitter {
  private maxSize: number;
  private flushInterval: number;
  private batchSize: number;
  private queue: SensorReading[];
  private processing: boolean;
  private timer: NodeJS.Timeout | null;
  private stats: IngestStats;

  constructor(options: IngestQueueOptions = {}) {
    super();
    this.maxSize = options.maxSize || 10000;
    this.flushInterval = options.flushInterval || 5000;
    this.batchSize = options.batchSize || 100;
    this.queue = [];
    this.processing = false;
    this.timer = null;
    this.stats = {
      enqueued: 0,
      processed: 0,
      rejected: 0,
      errors: 0,
      queueSize: 0
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushInterval);
    logger.info(`[IngestQueue] Started (maxSize=${this.maxSize}, flushInterval=${this.flushInterval}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('[IngestQueue] Stopped. Stats:', this.stats);
  }

  enqueue(reading: SensorReading): boolean {
    if (this.queue.length >= this.maxSize) {
      logger.warn('[IngestQueue] Queue full, rejecting new reading');
      this.stats.rejected++;
      return false;
    }

    this.queue.push(reading);
    this.stats.enqueued++;
    this.stats.queueSize = this.queue.length;
    return true;
  }

  enqueueBatch(readings: SensorReading[]): number {
    let added = 0;
    for (const reading of readings) {
      if (this.enqueue(reading)) {
        added++;
      }
    }
    return added;
  }

  private async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    const batch = this.queue.splice(0, this.batchSize);
    this.stats.queueSize = this.queue.length;
    
    try {
      await this.processBatch(batch);
      this.stats.processed += batch.length;
    } catch (error: any) {
      logger.error('[IngestQueue] Flush error:', error.message);
      this.stats.errors += batch.length;
    }
    
    this.processing = false;
  }

  private async processBatch(readings: SensorReading[]): Promise<void> {
    const validReadings: SensorReading[] = [];
    
    for (const reading of readings) {
      const validation = sensorValidator.validateReading(reading.sensor, reading.value, reading.timestamp);
      
      if (validation.valid) {
        validReadings.push(reading);
        
        if (validation.warnings && validation.warnings.length > 0) {
          alertService.sendAlert(
            `Sensor ${reading.sensor} value ${reading.value} has warnings: ${validation.warnings.join(', ')}`,
            { type: 'SENSOR_OUTLIER', severity: 'warning', deviceId: reading.deviceId }
          );
        }
      } else {
        this.stats.rejected++;
        logger.warn(`[IngestQueue] Rejected reading: ${reading.sensor}=${reading.value}`);
      }
    }
    
    if (validReadings.length > 0) {
      this.emit('data', validReadings);
    }
  }

  getStats(): IngestStats {
    return { ...this.stats };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.stats.queueSize = 0;
    logger.info('[IngestQueue] Cleared');
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}

export const IngestQueue = new IngestQueueClass();

export default IngestQueue;