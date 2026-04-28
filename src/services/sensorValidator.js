/**
 * Sensor Data Validation & Outlier Detection Service
 * 
 * Provides:
 * - Schema validation for sensor readings
 * - Range validation based on sensor type
 * - Statistical outlier detection (Z-score)
 * - Spike detection for sudden changes
 * - Data quality flagging
 */

const SENSOR_RANGES = {
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

const OUTLIER_Z_THRESHOLD = 3;
const SPIKE_DELTA_PERCENT = 50;

class SensorValidator {
  constructor() {
    this.readingHistory = new Map();
    this.maxHistoryPerSensor = 100;
  }

  validateReading(sensorType, value, timestamp) {
    const issues = [];
    const warnings = [];
    let isValid = true;

    const range = SENSOR_RANGES[sensorType];

    if (!range) {
      warnings.push(`Unknown sensor type: ${sensorType}`);
      return { valid: true, issues: [], warnings, value };
    }

    if (typeof value !== 'number' || isNaN(value)) {
      issues.push(`Invalid value: not a number`);
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

  addToHistory(sensorType, value, timestamp) {
    const key = sensorType;
    if (!this.readingHistory.has(key)) {
      this.readingHistory.set(key, []);
    }

    const history = this.readingHistory.get(key);
    history.push({ value, timestamp });

    if (history.length > this.maxHistoryPerSensor) {
      history.shift();
    }
  }

  getHistory(sensorType) {
    return this.readingHistory.get(sensorType) || [];
  }

  detectOutlier(sensorType, value) {
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
      zScore: zScore.toFixed(2),
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      threshold: OUTLIER_Z_THRESHOLD
    };
  }

  detectSpike(sensorType, value) {
    const history = this.getHistory(sensorType);
    if (history.length < 2) {
      return { isSpike: false, reason: 'insufficient_history' };
    }

    const lastValue = history[history.length - 1].value;
    if (lastValue === 0) {
      return { isSpike: false, reason: 'previous_zero' };
    }

    const deltaPercent = Math.abs((value - lastValue) / lastValue) * 100;

    return {
      isSpike: deltaPercent > SPIKE_DELTA_PERCENT,
      deltaPercent: deltaPercent.toFixed(1),
      previousValue: lastValue,
      threshold: SPIKE_DELTA_PERCENT
    };
  }

  processReadings(readings) {
    const validated = [];
    const rejected = [];
    const outliers = [];
    const spikes = [];

    for (const reading of readings) {
      const { sensor, value, timestamp } = reading;

      const validation = this.validateReading(sensor, value, timestamp);
      const outlier = this.detectOutlier(sensor, value);
      const spike = this.detectSpike(sensor, value);

      if (validation.valid) {
        this.addToHistory(sensor, value, timestamp);

        validated.push({
          ...reading,
          quality: this.getQualityFlag(validation, outlier, spike),
          outlier: outlier.isOutlier,
          spike: spike.isSpike
        });

        if (outlier.isOutlier) {
          outliers.push({ sensor, value, ...outlier });
        }
        if (spike.isSpike) {
          spikes.push({ sensor, value, ...spike });
        }
      } else {
        rejected.push({
          ...reading,
          issues: validation.issues
        });
      }
    }

    return {
      validated,
      rejected,
      outliers,
      spikes,
      stats: {
        total: readings.length,
        validated: validated.length,
        rejected: rejected.length,
        outliers: outliers.length,
        spikes: spikes.length
      }
    };
  }

  getQualityFlag(validation, outlier, spike) {
    if (!validation.valid) return 'invalid';
    if (outlier.isOutlier && spike.isSpike) return 'poor';
    if (outlier.isOutlier || spike.isSpike) return 'fair';
    if (validation.warnings.length > 0) return 'good';
    return 'excellent';
  }

  getSensorStats(sensorType) {
    const history = this.getHistory(sensorType);
    if (history.length === 0) {
      return null;
    }

    const values = history.map(h => h.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      count: values.length,
      min: min.toFixed(2),
      max: max.toFixed(2),
      mean: mean.toFixed(2),
      range: SENSOR_RANGES[sensorType]
    };
  }
}

let validatorInstance = null;

function getValidator() {
  if (!validatorInstance) {
    validatorInstance = new SensorValidator();
  }
  return validatorInstance;
}

module.exports = {
  SensorValidator,
  getValidator,
  SENSOR_RANGES
};