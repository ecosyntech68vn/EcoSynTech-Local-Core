'use strict';

interface SyncOptions {
  gasClient: unknown;
  syncIntervalMs?: number;
  logger?: typeof console;
}

interface SyncResult {
  ok: boolean;
  code?: string;
  total?: number;
  added?: number;
  updated?: number;
  skipped?: number;
}

interface GasClientLike {
  _call(action: string, payload: Record<string, unknown>): Promise<{ ok: boolean; code?: string; payload?: { device_secrets: Array<{ device_id: string; secret: string }> } }>;
}

class DeviceSecretsSync {
  gasClient: GasClientLike;
  syncInterval: number;
  logger: typeof console;
  secrets: Map<string, string>;
  lastSyncAt: Date | null;
  lastSyncCount: number;
  private _timer: NodeJS.Timeout | null;
  private _pendingSync: boolean;

  constructor(opts: SyncOptions) {
    if (!opts || !opts.gasClient) throw new Error('gasClient required');

    this.gasClient = opts.gasClient as GasClientLike;
    this.syncInterval = opts.syncIntervalMs || 3600000;
    this.logger = opts.logger || console;

    this.secrets = new Map();
    this.lastSyncAt = null;
    this.lastSyncCount = 0;
    this._timer = null;
    this._pendingSync = false;
  }

  async syncNow(): Promise<SyncResult> {
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
      const errMsg = e instanceof Error ? e.message : 'Unknown';
      this.logger.error('DeviceSecretsSync', 'sync_error', { error: errMsg });
      return { ok: false, code: 'SYNC_ERROR' };
    }
  }

  startAutoSync() {
    if (this._timer) {
      this.logger.warn('DeviceSecretsSync', 'already_running');
      return;
    }

    this.logger.info('DeviceSecretsSync', 'auto_sync_started', { intervalMs: this.syncInterval });

    this._timer = setInterval(() => {
      if (!this._pendingSync) {
        this._pendingSync = true;
        this.syncNow().finally(() => {
          this._pendingSync = false;
        });
      }
    }, this.syncInterval);
  }

  stopAutoSync() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this.logger.info('DeviceSecretsSync', 'auto_sync_stopped');
    }
  }

  getSecret(deviceId: string): string | undefined {
    return this.secrets.get(deviceId);
  }

  setSecret(deviceId: string, secret: string): void {
    this.secrets.set(deviceId, secret);
  }

  hasSecret(deviceId: string): boolean {
    return this.secrets.has(deviceId);
  }

  getStats() {
    return {
      totalSecrets: this.secrets.size,
      lastSyncAt: this.lastSyncAt?.toISOString(),
      lastSyncCount: this.lastSyncCount,
      autoSyncEnabled: this._timer !== null,
      syncIntervalMs: this.syncInterval
    };
  }

  clear() {
    this.secrets.clear();
    this.logger.info('DeviceSecretsSync', 'cleared');
  }
}

export default DeviceSecretsSync;