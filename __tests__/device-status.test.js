/**
 * Unit Tests - Device Status Service
 * Test tính toán trạng thái online/offline, timeout
 */

const deviceStatus = require('../src/services/deviceStatusService');

describe('Device Status Service - Online/Offline Calculation', () => {
  describe('calculateDeviceStatus', () => {
    it('should return "unknown" when lastSeen is null', () => {
      const status = deviceStatus.calculateDeviceStatus(null);
      expect(status).toBe('unknown');
    });

    it('should return "unknown" when lastSeen is undefined', () => {
      const status = deviceStatus.calculateDeviceStatus(undefined);
      expect(status).toBe('unknown');
    });

    it('should return "unknown" when lastSeen is empty string', () => {
      const status = deviceStatus.calculateDeviceStatus('');
      expect(status).toBe('unknown');
    });

    it('should return "online" when last seen recently', () => {
      const recentTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const status = deviceStatus.calculateDeviceStatus(recentTime);
      expect(status).toBe('online');
    });

    it('should return "offline" when last seen超过 timeout', () => {
      const oldTime = new Date(Date.now() - 600000).toISOString(); // 10 minutes ago
      const status = deviceStatus.calculateDeviceStatus(oldTime, 300000); // 5 min timeout
      expect(status).toBe('offline');
    });

    it('should return "online" at exact timeout boundary', () => {
      const boundaryTime = new Date(Date.now() - 300000).toISOString(); // exactly 5 min ago
      const status = deviceStatus.calculateDeviceStatus(boundaryTime, 300000);
      expect(status).toBe('online');
    });

    it('should return "offline" just after timeout', () => {
      const justOverTimeout = new Date(Date.now() - 300001).toISOString(); // just over 5 min
      const status = deviceStatus.calculateDeviceStatus(justOverTimeout, 300000);
      expect(status).toBe('offline');
    });
  });

  describe('getDeviceStatusInfo', () => {
    it('should return complete status info', () => {
      const device = { last_seen: new Date().toISOString() };
      const info = deviceStatus.getDeviceStatusInfo(device);
      
      expect(info).toHaveProperty('status');
      expect(info).toHaveProperty('lastSeen');
      expect(info).toHaveProperty('timeSinceLastSeen');
      expect(info).toHaveProperty('isTimeout');
      expect(info).toHaveProperty('isStale');
    });

    it('should detect stale device (超过 half timeout)', () => {
      const halfTimeout = Date.now() - 180000; // 3 minutes (half of 5 min)
      const device = { last_seen: new Date(halfTimeout).toISOString() };
      const info = deviceStatus.getDeviceStatusInfo(device);
      
      expect(info.isStale).toBe(true);
    });

    it('should detect timeout device', () => {
      const overTimeout = Date.now() - 400000; // over 5 minutes
      const device = { last_seen: new Date(overTimeout).toISOString() };
      const info = deviceStatus.getDeviceStatusInfo(device);
      
      expect(info.isTimeout).toBe(true);
      expect(info.status).toBe('offline');
    });
  });

  describe('getTimeoutByDeviceType', () => {
    it('should return 5 min for ESP32', () => {
      expect(deviceStatus.getTimeoutByDeviceType('ESP32')).toBe(300000);
    });

    it('should return 3 min for ESP8266', () => {
      expect(deviceStatus.getTimeoutByDeviceType('ESP8266')).toBe(180000);
    });

    it('should return 10 min for Arduino', () => {
      expect(deviceStatus.getTimeoutByDeviceType('Arduino')).toBe(600000);
    });

    it('should return 1 min for Raspberry Pi', () => {
      expect(deviceStatus.getTimeoutByDeviceType('Raspberry Pi')).toBe(60000);
    });

    it('should return 1 min for Gateway', () => {
      expect(deviceStatus.getTimeoutByDeviceType('Gateway')).toBe(60000);
    });

    it('should return default for unknown type', () => {
      expect(deviceStatus.getTimeoutByDeviceType('UnknownDevice')).toBe(300000);
    });
  });

  describe('calculateBatchStatus', () => {
    it('should calculate status for multiple devices', () => {
      const devices = [
        { id: '1', type: 'ESP32', last_seen: new Date().toISOString() },
        { id: '2', type: 'ESP8266', last_seen: new Date(Date.now() - 600000).toISOString() },
        { id: '3', type: 'Sensor', last_seen: null }
      ];
      
      const result = deviceStatus.calculateBatchStatus(devices);
      
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('online');
      expect(result[1].status).toBe('offline');
      expect(result[2].status).toBe('unknown');
    });

    it('should add time_since_last_seen to each device', () => {
      const devices = [
        { id: '1', type: 'ESP32', last_seen: new Date().toISOString() }
      ];
      
      const result = deviceStatus.calculateBatchStatus(devices);
      
      expect(result[0]).toHaveProperty('time_since_last_seen');
      expect(result[0]).toHaveProperty('is_stale');
      expect(result[0]).toHaveProperty('is_timeout');
    });
  });

  describe('getDeviceStatistics', () => {
    it('should calculate correct statistics', () => {
      const devices = [
        { status: 'online', is_stale: false, is_timeout: false },
        { status: 'online', is_stale: true, is_timeout: false },
        { status: 'offline', is_stale: true, is_timeout: true },
        { status: 'unknown', is_stale: false, is_timeout: false }
      ];
      
      const stats = deviceStatus.getDeviceStatistics(devices);
      
      expect(stats.total).toBe(4);
      expect(stats.online).toBe(2);
      expect(stats.offline).toBe(1);
      expect(stats.unknown).toBe(1);
      expect(stats.stale).toBe(2);
      expect(stats.timeout).toBe(1);
      expect(stats.onlineRate).toBe(50);
      expect(stats.offlineRate).toBe(25);
    });

    it('should handle empty devices array', () => {
      const stats = deviceStatus.getDeviceStatistics([]);
      
      expect(stats.total).toBe(0);
      expect(stats.onlineRate).toBe(0);
      expect(stats.offlineRate).toBe(0);
    });
  });

  describe('needsAttention', () => {
    it('should return true for offline device', () => {
      const device = { status: 'offline', is_stale: false };
      expect(deviceStatus.needsAttention(device)).toBe(true);
    });

    it('should return true for stale device', () => {
      const device = { status: 'online', is_stale: true };
      expect(deviceStatus.needsAttention(device)).toBe(true);
    });

    it('should return false for healthy device', () => {
      const device = { status: 'online', is_stale: false };
      expect(deviceStatus.needsAttention(device)).toBe(false);
    });
  });

  describe('getDevicesNeedingAttention', () => {
    it('should filter devices needing attention', () => {
      const devices = [
        { id: '1', status: 'online', is_stale: false },
        { id: '2', status: 'offline', is_stale: true },
        { id: '3', status: 'online', is_stale: true },
        { id: '4', status: 'online', is_stale: false }
      ];
      
      const result = deviceStatus.getDevicesNeedingAttention(devices);
      
      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual(['2', '3']);
    });
  });
});

describe('Device Status Service - Constants', () => {
  it('should have correct default timeout', () => {
    expect(deviceStatus.DEFAULT_TIMEOUT_MS).toBe(300000); // 5 minutes
  });
});