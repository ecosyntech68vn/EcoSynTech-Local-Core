'use strict';

import { getAll, getOne, runQuery } from '../config/database';

let logger: typeof console = console;
try { logger = require('../../config/logger'); } catch (e) { logger = console; }

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => {
      (acc as Record<string, unknown>)[k] = sortKeysDeep((obj as Record<string, unknown>)[k]);
      return acc;
    }, {});
  }
  return obj;
}

interface QualityRule {
  min: number;
  max: number;
  unit: string;
  required: boolean;
}

interface ValidationResult {
  valid: boolean;
  quality: string;
  reason: string;
  unit?: string;
}

export interface DataQualityResult {
  score: number;
  grade: string;
  totalSensors: number;
  validSensors: number;
  issuesCount: number;
  details: Record<string, unknown>;
  timestamp: string;
  meetsMinimumQuality: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  predictionType?: string;
  modelId?: string;
  inputHash?: string;
  outputHash?: string;
  qualityScore?: number;
  qualityGrade?: string;
  inputSources?: string[];
  dataClassification?: string;
}

interface FreshnessResult {
  freshness: Record<string, { ageMinutes: number | null; fresh: boolean | null; ageSeconds: number | null }>;
  overall: string;
  maxAgeMinutes: number;
  timestamp: string;
}

const DATA_QUALITY_RULES: Record<string, QualityRule> = {
  soil: { min: 0, max: 100, unit: '%', required: false },
  temperature: { min: -10, max: 60, unit: '°C', required: false },
  humidity: { min: 0, max: 100, unit: '%', required: false },
  water: { min: 0, max: 100, unit: '%', required: false },
  light: { min: 0, max: 100000, unit: 'lux', required: false },
  ph: { min: 0, max: 14, unit: 'pH', required: false },
  rainfall: { min: 0, max: 500, unit: 'mm', required: false },
  co2: { min: 200, max: 10000, unit: 'ppm', required: false }
};

const DATA_CLASSIFICATION: Record<string, string> = {
  sensor_reading: 'Operational',
  device_telemetry: 'Operational',
  prediction_input: 'Internal',
  prediction_output: 'Internal',
  ai_feedback: 'Internal',
  anomaly: 'Confidential',
  recommendation: 'Internal'
};

class AITelemetryService {
  qualityRules: Record<string, QualityRule>;
  classification: Record<string, string>;
  predictionAuditTrail: AuditEntry[];
  AUDIT_MAX: number;
  enabled: boolean;

  constructor() {
    this.qualityRules = DATA_QUALITY_RULES;
    this.classification = DATA_CLASSIFICATION;
    this.predictionAuditTrail = [];
    this.AUDIT_MAX = 500;
    this.enabled = true;
  }

  validateSensorValue(type: string, value: unknown): ValidationResult {
    const rule = this.qualityRules[type];
    if (!rule) return { valid: true, quality: 'unknown', reason: 'no_rule_defined' };
    if (value === null || value === undefined) {
      return { valid: !rule.required, quality: 'missing', reason: 'value_missing' };
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { valid: false, quality: 'invalid', reason: 'not_a_number' };
    }
    if (numValue < rule.min || numValue > rule.max) {
      return { valid: false, quality: 'out_of_range', reason: `out_of_range [${rule.min}-${rule.max}]`, unit: rule.unit };
    }
    return { valid: true, quality: 'good', reason: 'within_expected_range' };
  }

  assessDataQuality(sensorData: Record<string, unknown>): DataQualityResult {
    const results: Record<string, unknown> = {};
    let overallScore = 100;
    let issuesCount = 0;
    let validCount = 0;

    for (const [type, value] of Object.entries(sensorData)) {
      const result = this.validateSensorValue(type, value);
      results[type] = {
        value,
        ...result,
        rule: this.qualityRules[type] || null
      };

      if (result.quality === 'good') {
        validCount++;
      } else if (result.quality === 'missing') {
        overallScore -= 0;
      } else if (result.quality === 'out_of_range' || result.quality === 'invalid') {
        overallScore -= 25;
        issuesCount++;
      } else if (result.quality === 'unknown') {
        overallScore -= 0;
      }
    }

    overallScore = Math.max(0, Math.min(100, overallScore));
    const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : 'D';

    return {
      score: overallScore,
      grade,
      totalSensors: Object.keys(sensorData).length,
      validSensors: validCount,
      issuesCount,
      details: results,
      timestamp: new Date().toISOString(),
      meetsMinimumQuality: overallScore >= 60
    };
  }

  getClassification(dataType: string): string {
    return this.classification[dataType] || 'Unknown';
  }

  logPredictionAudit(entry: Partial<AuditEntry>): AuditEntry {
    const auditEntry: AuditEntry = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.predictionAuditTrail.push(auditEntry);
    if (this.predictionAuditTrail.length > this.AUDIT_MAX) {
      this.predictionAuditTrail.shift();
    }
    try {
      runQuery(
        `INSERT INTO ai_prediction_audit (id, prediction_type, model_id, input_hash, output_hash, quality_score, quality_grade, input_sources, data_classification, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
        [
          auditEntry.id,
          entry.predictionType || 'unknown',
          entry.modelId || null,
          entry.inputHash || null,
          entry.outputHash || null,
          entry.qualityScore || null,
          entry.qualityGrade || null,
          JSON.stringify(entry.inputSources || []),
          entry.dataClassification || 'Internal'
        ]
      );
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      logger.warn('[AITelemetry] Audit DB write failed:', errMsg);
    }
    return auditEntry;
  }

  getRecentAudit(n = 20): unknown[] {
    try {
      const rows = getAll(
        'SELECT * FROM ai_prediction_audit ORDER BY created_at DESC LIMIT ?',
        [Math.min(n, 100)]
      );
      return rows;
    } catch (e: unknown) {
      return this.predictionAuditTrail.slice(-n);
    }
  }

  getAuditLog(): AuditEntry[] {
    return this.predictionAuditTrail.slice();
  }

  enrichSensorData(sensorData: Record<string, unknown>, farmId = 'default'): Record<string, unknown> {
    const enriched = { ...sensorData };
    const timestamp = new Date().toISOString();
    const deviceCount = this._getDeviceCount(farmId);
    const onlineCount = this._getOnlineDeviceCount(farmId);

    enriched._meta = {
      timestamp,
      farmId,
      deviceCount,
      onlineCount,
      onlineRatio: deviceCount > 0 ? (onlineCount / deviceCount) : 0,
      dataClassification: this.getClassification('prediction_input'),
      quality: this.assessDataQuality(sensorData)
    };

    return enriched;
  }

  _getDeviceCount(_farmId: string): number {
    try {
      const row = getOne('SELECT COUNT(*) as count FROM devices');
      return row?.count || 0;
    } catch (e: unknown) { return 0; }
  }

  _getOnlineDeviceCount(_farmId: string): number {
    try {
      const row = getOne('SELECT COUNT(*) as count FROM devices WHERE status = \'online\'');
      return row?.count || 0;
    } catch (e: unknown) { return 0; }
  }

  hashData(data: unknown): string | null {
    try {
      const str = JSON.stringify(sortKeysDeep(data));
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    } catch (e: unknown) { return null; }
  }

  getSensorHistory(type: string, hours = 24, limit = 100): unknown[] {
    try {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      return getAll(
        'SELECT * FROM sensor_readings WHERE sensor_type = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT ?',
        [type, since, Math.min(limit, 1000)]
      );
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      logger.warn('[AITelemetry] Sensor history query failed:', errMsg);
      return [];
    }
  }

  getAggregatedSensors(_farmId = 'default', hours = 24): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    const types = ['soil', 'temperature', 'humidity', 'water', 'light', 'ph'];

    for (const type of types) {
      try {
        const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
        const row = getOne(
          `SELECT AVG(value) as avg, MIN(value) as min, MAX(value) as max, COUNT(*) as count
           FROM sensor_readings WHERE sensor_type = ? AND timestamp > ?`,
          [type, since]
        );
        if (row?.count > 0) {
          results[type] = {
            avg: parseFloat(row.avg?.toFixed(2)),
            min: parseFloat(row.min?.toFixed(2)),
            max: parseFloat(row.max?.toFixed(2)),
            count: row.count,
            unit: this.qualityRules[type]?.unit || ''
          };
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : 'Unknown';
        logger.warn(`[AITelemetry] Aggregated query for ${type} failed:`, errMsg);
      }
    }
    return results;
  }

  checkDataFreshness(sensorData: Record<string, unknown>, maxAgeMinutes = 60): FreshnessResult {
    const freshness: Record<string, { ageMinutes: number | null; fresh: boolean | null; ageSeconds: number | null }> = {};
    const now = Date.now();

    for (const [type, entry] of Object.entries(sensorData)) {
      if (entry && typeof entry === 'object' && 'timestamp' in entry) {
        const timestamp = (entry as { timestamp: string }).timestamp;
        const ageMs = now - new Date(timestamp).getTime();
        const ageMinutes = ageMs / 60000;
        freshness[type] = {
          ageMinutes: Math.round(ageMinutes),
          fresh: ageMinutes <= maxAgeMinutes,
          ageSeconds: Math.round(ageMs / 1000)
        };
      } else {
        freshness[type] = {
          ageMinutes: null,
          fresh: null,
          ageSeconds: null
        };
      }
    }

    const allFresh = Object.values(freshness).every(f => f.fresh === true);
    const anyStale = Object.values(freshness).some(f => f.fresh === false);

    return {
      freshness,
      overall: allFresh ? 'fresh' : anyStale ? 'stale' : 'unknown',
      maxAgeMinutes,
      timestamp: new Date().toISOString()
    };
  }

  getDataGovernanceReport(): Record<string, unknown> {
    try {
      const totalDevices = getOne('SELECT COUNT(*) as count FROM devices');
      const onlineDevices = getOne('SELECT COUNT(*) as count FROM devices WHERE status = \'online\'');
      const totalSensorReadings = getOne('SELECT COUNT(*) as count FROM sensor_readings');
      const recentPredictions = getOne('SELECT COUNT(*) as count FROM ai_prediction_audit WHERE created_at > datetime("now", "-24 hours")');
      const recentFeedback = getOne('SELECT COUNT(*) as count FROM ai_feedback WHERE created_at > datetime("now", "-7 days")');
      const anomalies = getOne('SELECT COUNT(*) as count FROM anomalies WHERE detected_at > datetime("now", "-24 hours")');

      return {
        timestamp: new Date().toISOString(),
        devices: {
          total: totalDevices?.count || 0,
          online: onlineDevices?.count || 0,
          onlineRatio: totalDevices?.count > 0 ? ((onlineDevices?.count / totalDevices?.count) * 100).toFixed(1) + '%' : 'N/A'
        },
        telemetry: {
          totalReadings: totalSensorReadings?.count || 0
        },
        ai: {
          predictions24h: recentPredictions?.count || 0,
          feedback7d: recentFeedback?.count || 0,
          anomalies24h: anomalies?.count || 0
        },
        governanceStatus: 'operational',
        dataClassification: { ...this.classification },
        qualityRules: Object.keys(this.qualityRules)
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      logger.warn('[AITelemetry] Governance report failed:', errMsg);
      return { error: errMsg, timestamp: new Date().toISOString() };
    }
  }
}

export default new AITelemetryService();