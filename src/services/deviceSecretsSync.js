'use strict';

class DeviceSecretsSync {
  constructor(opts) {
    if (!opts || !opts.gasClient) throw new Error('gasClient required');

    this.gasClient = opts.gasClient;
    this.syncInterval = opts.syncIntervalMs || 3600000;
    this.logger = opts.logger || console;

    this.secrets = new Map();
    this.lastSyncAt = null;
    this.lastSyncCount = 0;
    this._timer = null;
    this._pendingSync = false;
  }

  async syncNow() {
    try {
      const r = await this.gasClient._call('admin_sync_device_secrets', {});
      if (!r.ok) {
        this.logger.warn('DeviceSecretsSync', 'pull_failed', { code: r.code });
        return { ok: false, code: r.code };
      }

      const items = (r.payload && r.payload.device_secrets) || [];
      let added = 0, updated = 0, skipped = 0;

      for (const item of items) {
        if (!item.device_id || !item.secret) {
          skipped++;
          continue;
        }
        const existing = this.secrets.get(item.device_id);
        this.secrets.set(item.device_id, item.secret);
        if (existing) {
          if (existing !== item.secret) updated++;
        } else {
          added++;
        }
      }

      this.lastSyncAt = new Date();
      this.lastSyncCount = items.length;

      this.logger.info('DeviceSecretsSync', 'synced',
        { total: items.length, added, updated, skipped });

      return { ok: true, total: items.length, added, updated, skipped };
    } catch (e) {
      this.logger.error('DeviceSecretsSync', 'sync_error', { error: String(e) });
      return { ok: false, code: 'SYNC_ERROR', error: String(e) };
    }
  }

  start() {
    if (this._timer) return;
    this.syncNow().catch(e => { console.error(e); });
    this._timer = setInterval(() => {
      this.syncNow().catch(e => { console.error(e); });
    }, this.syncInterval);
    this._timer.unref && this._timer.unref();
    this.logger.info('DeviceSecretsSync', 'started', { interval_ms: this.syncInterval });
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async lookup(deviceId) {
    const secret = this.secrets.get(deviceId);
    if (!secret) {
      if (!this.lastSyncAt) {
        await this.syncNow();
        const retry = this.secrets.get(deviceId);
        if (retry) return { secret: retry };
      }
      return null;
    }
    return { secret };
  }

  getStats() {
    return {
      total_secrets: this.secrets.size,
      last_sync_at: this.lastSyncAt,
      last_sync_count: this.lastSyncCount
    };
  }
}

module.exports = DeviceSecretsSync;