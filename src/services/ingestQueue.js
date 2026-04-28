'use strict';
const EventEmitter = require('events');
const { getValidator } = require('./sensorValidator');

const logger = {
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

class IngestQueue extends EventEmitter {
  constructor(options = {}) {
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
      errors: 0
    };
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushInterval);
    logger.info('[IngestQueue] Started (maxSize=' + this.maxSize + ', flushInterval=' + this.flushInterval + 'ms)');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('[IngestQueue] Stopped. Stats:', this.stats);
  }

  enqueue(deviceId, readings) {
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      this.stats.rejected++;
      return { ok: false, code: 'INVALID_READINGS' };
    }

    if (this.queue.length >= this.maxSize) {
      this.stats.rejected++;
      this.emit('overflow', { deviceId: deviceId, readings: readings, queueSize: this.queue.length });
      return { ok: false, code: 'QUEUE_FULL', queueSize: this.queue.length };
    }

    const validator = getValidator();
    const result = validator.processReadings(readings);

    if (result.rejected.length > 0) {
      this.stats.rejected += result.rejected.length;
      this.emit('validationError', { rejected: result.rejected });
    }

    if (result.outliers.length > 0) {
      this.emit('outlierDetected', { outliers: result.outliers });
    }

    if (result.spikes.length > 0) {
      this.emit('spikeDetected', { spikes: result.spikes });
    }

    if (result.validated.length === 0) {
      return { ok: false, code: 'ALL_READINGS_INVALID', stats: result.stats };
    }

    const entry = {
      deviceId: deviceId,
      readings: result.validated,
      timestamp: Date.now(),
      retries: 0,
      quality: result.stats
    };

    this.queue.push(entry);
    this.stats.enqueued++;

    if (this.queue.length >= this.batchSize && !this.processing) {
      this.flush();
    }

    return { ok: true, queued: readings.length, queueSize: this.queue.length };
  }

  async flush() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    const deviceReadings = {};

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      if (!deviceReadings[entry.deviceId]) {
        deviceReadings[entry.deviceId] = [];
      }
      for (let j = 0; j < entry.readings.length; j++) {
        const reading = entry.readings[j];
        deviceReadings[entry.deviceId].push({
          sensor_type: reading.sensor_type,
          value: reading.value,
          unit: reading.unit,
          timestamp: entry.timestamp
        });
      }
    }

    try {
      await this.processBatch(deviceReadings);
      this.stats.processed = this.stats.processed + batch.length;
      this.emit('flushed', { count: batch.length });
    } catch (err) {
      logger.error('[IngestQueue] Flush error:', err.message);
      this.stats.errors = this.stats.errors + 1;
      for (let k = 0; k < batch.length; k++) {
        const batchEntry = batch[k];
        if (batchEntry.retries < 3) {
          batchEntry.retries = batchEntry.retries + 1;
          this.queue.unshift(batchEntry);
        }
      }
      this.emit('error', err);
    } finally {
      this.processing = false;
    }
  }

  async processBatch(deviceReadings) {
    const keys = Object.keys(deviceReadings);
    const db = require('../config/database');

    for (let i = 0; i < keys.length; i++) {
      const deviceId = keys[i];
      const readings = deviceReadings[deviceId];

      for (let j = 0; j < readings.length; j++) {
        const reading = readings[j];
        try {
          const id = deviceId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          db.runQuery(
            'INSERT INTO sensor_readings (id, sensor_type, value, timestamp) VALUES (?, ?, ?, datetime(?, \'unixepoch\'))',
            [id, reading.sensor_type, reading.value, Math.floor(Date.now() / 1000)]
          );
        } catch (err) {
          logger.warn('[IngestQueue] Insert error:', err.message);
        }
      }
    }
  }

  getStats() {
    return {
      enqueued: this.stats.enqueued,
      processed: this.stats.processed,
      rejected: this.stats.rejected,
      errors: this.stats.errors,
      queueSize: this.queue.length,
      processing: this.processing
    };
  }

  getQueueSize() {
    return this.queue.length;
  }

  isFull() {
    return this.queue.length >= this.maxSize;
  }
}

function getInstance(options) {
  if (!global.ingestQueue) {
    global.ingestQueue = new IngestQueue(options);
  }
  return global.ingestQueue;
}

function getQueue() {
  return global.ingestQueue;
}

module.exports = { IngestQueue: IngestQueue, getInstance: getInstance, getQueue: getQueue };