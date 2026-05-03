/**
 * Device Status Service - Tính toán trạng thái online/offline
 * V5.1.0 - Converted to TypeScript - Phase 1
 * Smart device status calculation with timeout detection
 */

export const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes default timeout

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface DeviceStatusInfo {
  status: DeviceStatus;
  lastSeen: string | null;
  timeSinceLastSeen: number | null;
  isTimeout: boolean;
  isStale: boolean;
  timeoutMs: number;
}

export interface Device {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  farm_id?: string;
  last_seen?: string;
  api_key?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  stale: number;
}

/**
 * Calculate device status based on last_seen timestamp
 */
export function calculateDeviceStatus(lastSeen: string | null | undefined, timeoutMs: number = DEFAULT_TIMEOUT_MS): DeviceStatus {
  if (!lastSeen) {
    return 'unknown';
  }
  
  const lastSeenTime = new Date(lastSeen).getTime();
  const now = Date.now();
  const timeSinceLastSeen = now - lastSeenTime;
  
  if (timeSinceLastSeen > timeoutMs) {
    return 'offline';
  }
  
  return 'online';
}

/**
 * Get device status with detailed info
 */
export function getDeviceStatusInfo(device: Device, timeoutMs: number = DEFAULT_TIMEOUT_MS): DeviceStatusInfo {
  const status = calculateDeviceStatus(device.last_seen, timeoutMs);
  
  let timeSinceLastSeen: number | null = null;
  if (device.last_seen) {
    timeSinceLastSeen = Date.now() - new Date(device.last_seen).getTime();
  }
  
  const isTimeout = timeSinceLastSeen !== null && timeSinceLastSeen > timeoutMs;
  const isStale = timeSinceLastSeen !== null && timeSinceLastSeen > (timeoutMs / 2);
  
  return {
    status,
    lastSeen: device.last_seen || null,
    timeSinceLastSeen,
    isTimeout,
    isStale,
    timeoutMs
  };
}

/**
 * Get device status with custom timeout per device type
 */
export function getDeviceStatusByType(device: Device): DeviceStatusInfo {
  const timeoutMap: Record<string, number> = {
    esp32: 300000,      // 5 minutes
    sensor: 600000,    // 10 minutes
    gateway: 180000,   // 3 minutes
    actuator: 300000,  // 5 minutes
    camera: 60000      // 1 minute
  };
  
  const deviceType = device.type || 'sensor';
  const timeoutMs = timeoutMap[deviceType] || DEFAULT_TIMEOUT_MS;
  
  return getDeviceStatusInfo(device, timeoutMs);
}

/**
 * Calculate uptime percentage
 */
export function calculateUptime(lastSeen: string | null | undefined, totalUptimeMs: number): number {
  if (!lastSeen) return 0;
  
  const lastSeenTime = new Date(lastSeen).getTime();
  const timeSinceLastSeen = Date.now() - lastSeenTime;
  
  if (timeSinceLastSeen > totalUptimeMs) return 0;
  
  const uptimeMs = totalUptimeMs - timeSinceLastSeen;
  return (uptimeMs / totalUptimeMs) * 100;
}

/**
 * Get device statistics from array
 */
export function getDeviceStats(devices: Device[]): DeviceStats {
  const stats: DeviceStats = {
    total: devices.length,
    online: 0,
    offline: 0,
    unknown: 0,
    stale: 0
  };
  
  for (const device of devices) {
    const statusInfo = getDeviceStatusByType(device);
    
    switch (statusInfo.status) {
      case 'online':
        stats.online++;
        break;
      case 'offline':
        stats.offline++;
        break;
      case 'unknown':
        stats.unknown++;
        break;
    }
    
    if (statusInfo.isStale) {
      stats.stale++;
    }
  }
  
  return stats;
}

/**
 * Check if device needs attention
 */
export function needsAttention(device: Device): boolean {
  const statusInfo = getDeviceStatusByType(device);
  return statusInfo.status === 'offline' || statusInfo.isStale;
}

/**
 * Get devices that need attention
 */
export function getDevicesNeedingAttention(devices: Device[]): Device[] {
  return devices.filter(needsAttention);
}

/**
 * Format time since last seen for display
 */
export function formatTimeSinceLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Never';
  
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

export default {
  calculateDeviceStatus,
  getDeviceStatusInfo,
  getDeviceStatusByType,
  calculateUptime,
  getDeviceStats,
  needsAttention,
  getDevicesNeedingAttention,
  formatTimeSinceLastSeen
};