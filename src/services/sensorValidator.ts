/**
 * Sensor Data Validation & Outlier Detection Service
 * Converted to TypeScript - Phase 1
 * 
 * Provides:
 * - Schema validation for sensor readings
 * - Range validation based on sensor type
 * - Statistical outlier detection (Z-score)
 * - Spike detection for sudden changes
 * - Data quality flagging
 */

export interface SensorRange {
  min: number;
  max: number;
  unit: string;
  criticalMin?: number;
  criticalMax?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  value: number | null;
}

export interface OutlierResult {
  isOutlier: boolean;
  reason: string;
  zScore?: string;
  mean?: string;
  stdDev?: string;
  threshold?: number;
}

export interface SpikeResult {
  isSpike: boolean;
  reason: string;
  deltaPercent?: string;
  previousValue?: number;
  threshold?: number;
}

export interface ReadingResult {
  sensor: string;
  value: number;
  timestamp: number;
  valid: boolean;
  outlier: OutlierResult;
  spike: SpikeResult;
  issues: string[];
  warnings: string[];
}

export interface SensorReading {
  sensor: string;
  value: number;
  timestamp?: number;
}

export const SENSOR_RANGES: Record<string, SensorRange> = {
  temperature: { min: -40, max: 85, unit: '°C', criticalMin: -30, criticalMax: 70 },
  humidity: { min: 0, max: 100, unit: '%', criticalMin: 5, criticalMax: 95 },
  soil_moisture: { min: 0, max: 100, unit: '%', criticalMin: 10, criticalMax: 90 },
  soil_temperature: { min: -40, max: 85, unit: '°C', criticalMin: -20, criticalMax: 60 },
  light: { min: 0, max: 200000, unit: 'lux', criticalMin: 0, criticalMax: 100000 },
  pH: { min: 0, max: 14, unit: '', criticalMin: 3, criticalMax: 11 },
  ec: { min: 0, max: 20, unit: 'dS/m', criticalMin: 0.1, criticalMax: 15 },
  co2: { min: 0, max: 10000, unit: 'ppm', criticalMin: 250, criticalMax: 5000 },
  dissolved_oxygen: { min: 0, max: 20, unit: 'mg/L', criticalMin: 2, criticalMax: 15 },
  water_level: { min: 0, max: 100, unit: '%', criticalMin: 20, criticalMax: 95 },
  pressure: { min: 800, max: 1200, unit: 'hPa', criticalMin: 900, criticalMax: 1100 },
  wind_speed: { min: 0, max: 100, unit: 'm/s', criticalMin: 0, criticalMax: 50 },
  rainfall: { min: 0, max: 500, unit: 'mm', criticalMin: 0, criticalMax: 200 }
};

import OUTLIER_Z_THRESHOLD = 3;
import SPIKE_DELTA_PERCENT = 50;

interface HistoryEntry {
  value: number;
  timestamp: number;
}

export class SensorValidator {
  private readingHistory: Map<string, HistoryEntry[]>;
  private maxHistoryPerSensor: number;

  constructor() {
    this.readingHistory = new Map();
    this.maxHistoryPerSensor = 100;
  }

  validateReading(sensorType: string, value: number, timestamp?: number): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    const range = SENSOR_RANGES[sensorType];

    if (!range) {
      warnings.push(`Unknown sensor type: ${sensorType}`);
      return { valid: true, issues: [], warnings, value };
    }

    if (typeof value !== 'number' || isNaN(value)) {
      issues.push('Invalid value: not a number');
      isValid = false;
      return { valid: false, issues, warnings, value: null };
    }

    if (value < range.min || value > range.max) {
      issues.push(`Value ${value} out of physical range [${range.min}, ${range.max}]`);
      isValid = false;
    }

    if (range.criticalMin !== undefined && value < range.criticalMin) {
      warnings.push(`Value below critical minimum (${range.criticalMin})`);
    }

    if (range.criticalMax !== undefined && value > range.criticalMax) {
      warnings.push(`Value above critical maximum (${range.criticalMax})`);
    }

    if (!timestamp) {
      timestamp = Date.now();
    }

    return {
      valid: isValid,
      issues,
      warnings,
      value: isValid ? value : null
    };
  }

  addToHistory(sensorType: string, value: number, timestamp?: number): void {
    const key = sensorType;
    if (!this.readingHistory.has(key)) {
      this.readingHistory.set(key, []);
    }

    const history = this.readingHistory.get(key) as HistoryEntry[];
    history.push({ value, timestamp: timestamp || Date.now() });

    if (history.length > this.maxHistoryPerSensor) {
      history.shift();
    }
  }

  getHistory(sensorType: string): HistoryEntry[] {
    return this.readingHistory.get(sensorType) || [];
  }

  detectOutlier(sensorType: string, value: number): OutlierResult {
    const history = this.getHistory(sensorType);
    if (history.length < 10) {
      return { isOutlier: false, reason: 'insufficient_history' };
    }

    const values = history.map(h => h.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    if (stdDev === 0) {
      return { isOutlier: false, reason: 'no_variance' };
    }

    const zScore = Math.abs((value - mean) / stdDev);

    return {
      isOutlier: zScore > OUTLIER_Z_THRESHOLD,
      reason: zScore > OUTLIER_Z_THRESHOLD ? 'z_score_exceeded' : 'normal',
      zScore: zScore.toFixed(2),
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      threshold: OUTLIER_Z_THRESHOLD
    };
  }

  detectSpike(sensorType: string, value: number): SpikeResult {
    const history = this.getHistory(sensorType);
    if (history.length < 2) {
      return { isSpike: false, reason: 'insufficient_history' };
    }

    const lastEntry = history[history.length - 1];
    const lastValue = lastEntry?.value ?? 0;
    if (lastValue === 0) {
      return { isSpike: false, reason: 'previous_zero' };
    }

    const deltaPercent = Math.abs((value - lastValue) / lastValue) * 100;

    return {
      isSpike: deltaPercent > SPIKE_DELTA_PERCENT,
      reason: deltaPercent > SPIKE_DELTA_PERCENT ? 'delta_exceeded' : 'normal',
      deltaPercent: deltaPercent.toFixed(1),
      previousValue: lastValue,
      threshold: SPIKE_DELTA_PERCENT
    };
  }

  processReadings(readings: SensorReading[]): {
    validated: ReadingResult[];
    rejected: ReadingResult[];
    outliers: ReadingResult[];
    spikes: ReadingResult[];
  } {
    const validated: ReadingResult[] = [];
    const rejected: ReadingResult[] = [];
    const outliers: ReadingResult[] = [];
    const spikes: ReadingResult[] = [];

    for (const reading of readings) {
      const { sensor, value, timestamp } = reading;
      const ts = timestamp || Date.now();

      this.addToHistory(sensor, value, ts);

      const validation = this.validateReading(sensor, value, ts);
      const outlier = this.detectOutlier(sensor, value);
      const spike = this.detectSpike(sensor, value);

      const result: ReadingResult = {
        sensor,
        value,
        timestamp: ts,
        valid: validation.valid,
        outlier,
        spike,
        issues: validation.issues,
        warnings: validation.warnings
      };

      if (validation.valid) {
        validated.push(result);
        if (outlier.isOutlier) outliers.push(result);
        if (spike.isSpike) spikes.push(result);
      } else {
        rejected.push(result);
      }
    }

    return { validated, rejected, outliers, spikes };
  }

  sanitize(value: number | null, sensorType: string): number | null {
    if (value === null || value === undefined) return null;
    return this.validateReading(sensorType, value).value;
  }

  clearHistory(sensorType?: string): void {
    if (sensorType) {
      this.readingHistory.delete(sensorType);
    } else {
      this.readingHistory.clear();
    }
  }

  getStats(): {
    sensorTypes: number;
    totalReadings: number;
  } {
    return {
      sensorTypes: this.readingHistory.size,
      totalReadings: Array.from(this.readingHistory.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

export default new SensorValidator();