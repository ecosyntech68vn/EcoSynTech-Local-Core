export interface SyncConfig {
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  conflictResolution: string;
}

export interface SyncState {
  lastSync: string | null;
  pendingChanges: unknown[];
  syncStatus: string;
  offline: boolean;
  conflicts: unknown[];
  stats: {
    uploaded: number;
    downloaded: number;
    conflicts: number;
  };
}

export interface SyncChange {
  id?: string;
  table: string;
  operation: string;
  recordId: string;
  data: Record<string, unknown>;
  timestamp: string;
  error?: string;
}

import hybridSync = {
  id: 'hybrid-sync',
  name: 'Hybrid Sync Module',
  version: '2.3.2',
  description: 'Edge SQLite + Cloud Sync - Offline-first data synchronization',
  
  config: {
    syncInterval: 300000,
    maxRetries: 3,
    retryDelay: 5000,
    batchSize: 100,
    conflictResolution: 'last-write-wins'
  } as SyncConfig,
  
  state: null as SyncState | null,
  
  init: function(ctx?: unknown): typeof hybridSync {
    this.state = {
      lastSync: null,
      pendingChanges: [],
      syncStatus: 'idle',
      offline: true,
      conflicts: [],
      stats: { uploaded: 0, downloaded: 0, conflicts: 0 }
    };
    return this;
  },
  
  isOnline: function(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },
  
  getPendingChanges: function(db: unknown, since?: string): SyncChange[] {
    since = since || new Date(0).toISOString();
    const changes: SyncChange[] = [];
    
    if (db && (db as { prepare?: (query: string) => { all: (since: string, limit: number) => unknown[] } }).prepare) {
      try {
        const query = 'SELECT * FROM sync_queue WHERE timestamp > ? ORDER BY timestamp ASC LIMIT ?';
        const rows = (db as { prepare: (query: string) => { all: (since: string, limit: number) => unknown[] } }).prepare(query).all(since, this.config.batchSize);
        
        rows.forEach(function(row: unknown) {
          const r = row as { id: string; table: string; operation: string; record_id: string; data: string; timestamp: string };
          changes.push({
            id: r.id,
            table: r.table,
            operation: r.operation,
            recordId: r.record_id,
            data: JSON.parse(r.data || '{}'),
            timestamp: r.timestamp
          });
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        changes.push({ error: errorMessage, table: '', operation: '', recordId: '', data: {}, timestamp: '' } as SyncChange);
      }
    }
    
    return changes;
  },
  
  queueChange: function(db: unknown, table: string, operation: string, recordId: string, data: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    
    if (db && (db as { run: (sql: string, params: unknown[]) => void }).run) {
      try {
        (db as { run: (sql: string, params: unknown[]) => void }).run(
          'INSERT INTO sync_queue (table, operation, record_id, data, timestamp) VALUES (?, ?, ?, ?, ?)',
          [table, operation, recordId, JSON.stringify(data), timestamp]
        );
      } catch (e: unknown) {
        console.error('Failed to queue change:', e);
      }
    }
    
    if (this.state) {
      this.state.pendingChanges.push({ table, operation, recordId, data, timestamp });
    }
  },
  
  sync: async function(db: unknown): Promise<{ success: boolean; uploaded: number; downloaded: number; conflicts: number }> {
    if (!this.isOnline()) {
      return { success: false, uploaded: 0, downloaded: 0, conflicts: 0 };
    }
    
    if (this.state) {
      this.state.syncStatus = 'syncing';
    }
    
    const pending = this.getPendingChanges(db);
    let uploaded = 0;
    let conflicts = 0;
    
    for (const change of pending) {
      try {
        await this.uploadChange(change);
        uploaded++;
      } catch (e) {
        if ((e as { conflict?: boolean }).conflict) {
          conflicts++;
        }
      }
    }
    
    if (this.state) {
      this.state.lastSync = new Date().toISOString();
      this.state.pendingChanges = [];
      this.state.syncStatus = 'idle';
      this.state.stats.uploaded += uploaded;
      this.state.stats.conflicts += conflicts;
    }
    
    return { success: true, uploaded, downloaded: 0, conflicts };
  },
  
  uploadChange: async function(change: SyncChange): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  },
  
  resolveConflict: function(local: unknown, remote: unknown): unknown {
    if (this.config.conflictResolution === 'last-write-wins') {
      return remote;
    }
    return local;
  },
  
  getStats: function(): SyncState['stats'] | null {
    return this.state ? this.state.stats : null;
  },
  
  getStatus: function(): string {
    return this.state ? this.state.syncStatus : 'unknown';
  }
};

export default hybridSync;