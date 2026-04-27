'use strict';
const crypto = require('crypto');

let gasClient = null;
let deviceSecretsMap = new Map();
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const MAX_WAIT_MS = 30000; // 30 seconds max wait for first sync

class DeviceSecretsSync {
  constructor(gasHybridClient) {
    this.gasClient = gasHybridClient;
    this.syncTimer = null;
  }

  start() {
    console.log('[DeviceSecretsSync] Starting sync service...');
    this.syncNow();
    
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, SYNC_INTERVAL_MS);
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async syncNow() {
    if (isSyncing) {
      console.log('[DeviceSecretsSync] Sync already in progress, skipping...');
      return;
    }

    isSyncing = true;
    try {
      console.log('[DeviceSecretsSync] Syncing device secrets from GAS...');
      
      if (!this.gasClient || !this.gasClient.gasUrl) {
        console.warn('[DeviceSecretsSync] GAS client not configured, using fallback mode');
        this.loadFallbackSecrets();
        return;
      }

      const result = await this.gasClient.pull({ limit: 1000, type: 'device_secrets' });
      
      if (result.ok && result.payload && result.payload.devices) {
        let count = 0;
        for (const device of result.payload.devices) {
          if (device.device_id && device.secret) {
            deviceSecretsMap.set(device.device_id, device.secret);
            count++;
          }
        }
        
        global.DEVICE_SECRETS = Object.fromEntries(deviceSecretsMap);
        lastSyncTime = Date.now();
        console.log(`[DeviceSecretsSync] Synced ${count} device secrets from GAS`);
      } else {
        console.warn('[DeviceSecretsSync] Failed to pull secrets:', result);
        this.loadFallbackSecrets();
      }
    } catch (err) {
      console.error('[DeviceSecretsSync] Sync error:', err.message);
      this.loadFallbackSecrets();
    } finally {
      isSyncing = false;
    }
  }

  loadFallbackSecrets() {
    const fallback = {
      'ECOSYNTECH0001': '0123456789abcdef0123456789abcdef01234567',
      'ECOSYNTECH0002': 'fedcba9876543210fedcba9876543210fedcba98',
      'ESP32_001': 'abcdef0123456789abcdef0123456789abcdef01',
      'ESP32_002': '0123456789abcdef0123456789abcdef01234567'
    };
    
    deviceSecretsMap = new Map(Object.entries(fallback));
    global.DEVICE_SECRETS = fallback;
    console.log('[DeviceSecretsSync] Loaded fallback secrets for', deviceSecretsMap.size, 'devices');
  }

  lookup(deviceId) {
    return deviceSecretsMap.get(deviceId) || null;
  }

  getAll() {
    return Object.fromEntries(deviceSecretsMap);
  }

  getLastSyncTime() {
    return lastSyncTime;
  }

  isReady() {
    return deviceSecretsMap.size > 0;
  }

  async waitForSync(timeoutMs = MAX_WAIT_MS) {
    if (this.isReady()) return true;
    
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 1000));
      if (this.isReady()) return true;
    }
    console.warn('[DeviceSecretsSync] Timeout waiting for initial sync');
    return false;
  }
}

function createDeviceSecretsSync(gasHybridClient) {
  return new DeviceSecretsSync(gasHybridClient);
}

module.exports = {
  DeviceSecretsSync,
  createDeviceSecretsSync,
  getInstance: () => {
    if (!global.deviceSecretsSync) {
      global.deviceSecretsSync = new DeviceSecretsSync(null);
    }
    return global.deviceSecretsSync;
  }
};
