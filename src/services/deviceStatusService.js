/**
 * Device Status Service - Tính toán trạng thái online/offline
 * V5.1.0 - Smart device status calculation with timeout detection
 */

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes default timeout

/**
 * Calculate device status based on last_seen timestamp
 * @param {string|null} lastSeen - ISO timestamp of last device message
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {string} 'online' | 'offline' | 'unknown'
 */
function calculateDeviceStatus(lastSeen, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
 * @param {Object} device - Device object with last_seen
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Object} Status info
 */
function getDeviceStatusInfo(device, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const status = calculateDeviceStatus(device.last_seen, timeoutMs);
  
  let timeSinceLastSeen = null;
  if (device.last_seen) {
    timeSinceLastSeen = Date.now() - new Date(device.last_seen).getTime();
  }
  
  const isTimeout = timeSinceLastSeen !== null && timeSinceLastSeen > timeoutMs;
  const isStale = timeSinceLastSeen !== null && timeSinceLastSeen > (timeoutMs / 2);
  
  return {
    status,
    lastSeen: device.last_seen,
    timeSinceLastSeen,
    isTimeout,
    isStale,
    timeoutMs
  };
}

/**
 * Calculate timeout based on device type
 * @param {string} deviceType - Type of device
 * @returns {number} Timeout in milliseconds
 */
function getTimeoutByDeviceType(deviceType) {
  const timeouts = {
    'ESP32': 300000,      // 5 minutes - battery powered
    'ESP8266': 180000,   // 3 minutes
    'Arduino': 600000,   // 10 minutes - low power
    'Raspberry Pi': 60000, // 1 minute - always on
    'Sensor': 300000,    // 5 minutes
    'Gateway': 60000,    // 1 minute
    'default': 300000    // 5 minutes default
  };
  
  return timeouts[deviceType] || timeouts.default;
}

/**
 * Batch calculate status for multiple devices
 * @param {Array} devices - Array of devices
 * @returns {Array} Devices with status added
 */
function calculateBatchStatus(devices) {
  return devices.map(device => {
    const timeout = getTimeoutByDeviceType(device.type);
    const statusInfo = getDeviceStatusInfo(device, timeout);
    return {
      ...device,
      status: statusInfo.status,
      last_seen: statusInfo.lastSeen,
      time_since_last_seen: statusInfo.timeSinceLastSeen,
      is_stale: statusInfo.isStale,
      is_timeout: statusInfo.isTimeout
    };
  });
}

/**
 * Get system-wide device statistics
 * @param {Array} devices - Array of devices with status
 * @returns {Object} Statistics
 */
function getDeviceStatistics(devices) {
  const stats = {
    total: devices.length,
    online: 0,
    offline: 0,
    unknown: 0,
    stale: 0,
    timeout: 0
  };
  
  devices.forEach(device => {
    if (device.status === 'online') stats.online++;
    else if (device.status === 'offline') stats.offline++;
    else stats.unknown++;
    
    if (device.is_stale) stats.stale++;
    if (device.is_timeout) stats.timeout++;
  });
  
  stats.onlineRate = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;
  stats.offlineRate = stats.total > 0 ? Math.round((stats.offline / stats.total) * 100) : 0;
  
  return stats;
}

/**
 * Check if device needs attention (offline or stale)
 * @param {Object} device - Device with status info
 * @returns {boolean}
 */
function needsAttention(device) {
  return device.status === 'offline' || device.is_stale === true;
}

/**
 * Get devices that need attention
 * @param {Array} devices - Array of devices with status
 * @returns {Array} Devices needing attention
 */
function getDevicesNeedingAttention(devices) {
  return devices.filter(needsAttention);
}

module.exports = {
  calculateDeviceStatus,
  getDeviceStatusInfo,
  getTimeoutByDeviceType,
  calculateBatchStatus,
  getDeviceStatistics,
  needsAttention,
  getDevicesNeedingAttention,
  DEFAULT_TIMEOUT_MS
};