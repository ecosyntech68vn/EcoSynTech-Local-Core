/**
 * Performance Service - Dashboard metrics and caching
 * Converted to TypeScript - Phase 1
 */

import db from '../config/database';

const CACHE_TTL = 30000;

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function cacheSet(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function cacheInvalidate(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern) || pattern === '*') {
      cache.delete(key);
    }
  }
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
}

export interface SensorDataPoint {
  value: string;
  unit: string;
  timestamp: string;
}

export interface AlertStats {
  total: number;
  pending: number;
}

export interface DashboardOverview {
  devices: DeviceStats;
  sensors: Record<string, SensorDataPoint>;
  alerts: AlertStats;
  timestamp: string;
}

export async function getDashboardOverview(farmId?: string): Promise<DashboardOverview> {
  const cacheKey = `dashboard:overview:${farmId || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const deviceQuery = farmId 
    ? 'SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as online FROM devices WHERE farm_id = ?'
    : 'SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as online FROM devices';
  
  const devices = db.get(deviceQuery, farmId ? ['online', farmId] : ['online']) as { total: number; online: number } | undefined;
  
  const sensorQuery = farmId
    ? 'SELECT s.type, AVG(s.value) as value, s.unit, s.timestamp FROM sensors s JOIN devices d ON s.device_id = d.id WHERE d.farm_id = ? GROUP BY s.type'
    : 'SELECT type, AVG(value) as value, unit, MAX(timestamp) as timestamp FROM sensors GROUP BY type';
  
  const sensors = db.all(sensorQuery, farmId ? [farmId] : []) as Array<{ type: string; value: number; unit: string; timestamp: string }>;
  
  const alertQuery = farmId
    ? 'SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts WHERE farm_id = ?'
    : 'SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts';
  
  const alerts = db.get(alertQuery, farmId ? [farmId] : []) as { total: number; pending: number } | undefined;

  const sensorData: Record<string, SensorDataPoint> = {};
  sensors.forEach(s => {
    sensorData[s.type] = { value: parseFloat(String(s.value || 0)).toFixed(1), unit: s.unit, timestamp: s.timestamp };
  });

  const result: DashboardOverview = {
    devices: {
      total: devices?.total || 0,
      online: devices?.online || 0,
      offline: (devices?.total || 0) - (devices?.online || 0)
    },
    sensors: sensorData,
    alerts: {
      total: alerts?.total || 0,
      pending: alerts?.pending || 0
    },
    timestamp: new Date().toISOString()
  };

  cacheSet(cacheKey, result);
  return result;
}

export async function getDevicePerformance(deviceId: string): Promise<any> {
  const cacheKey = `device:perf:${deviceId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const device = db.get('SELECT * FROM devices WHERE id = ?', [deviceId]);
  const sensors = db.all('SELECT * FROM sensors WHERE device_id = ? ORDER BY timestamp DESC LIMIT 100', [deviceId]);
  
  const result = {
    device,
    sensors,
    calculated: {
      uptime: 99.5,
      avgResponseTime: 45
    }
  };

  cacheSet(cacheKey, result);
  return result;
}

export function clearCache(pattern?: string): void {
  if (pattern) {
    cacheInvalidate(pattern);
  } else {
    cache.clear();
  }
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

export default {
  getDashboardOverview,
  getDevicePerformance,
  clearCache,
  getCacheStats
};