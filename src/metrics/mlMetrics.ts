// Lightweight in-process ML metrics registry
// Tracks per-model call counts and latency distributions for health/observability.

const SNAPSHOT_TTL_MS = 5 * 60 * 1000; // 5 minutes heatmap-ish freshness (not strictly used here)

export interface ModelEventStats {
  count: number;
  totalMs: number;
}

export interface ModelStats {
  calls: number;
  totalMs: number;
  events: Record<string, ModelEventStats>;
}

export interface ModelSnapshot {
  calls: number;
  avgLatencyMs: number;
  events: Record<string, { count: number; avgMs: number }>;
}

export interface MetricsSnapshot {
  timestamp: string;
  models: Record<string, ModelSnapshot>;
}

const store: { models: Record<string, ModelStats> } = {
  models: {}
};

function _ensureModel(model: string): ModelStats {
  if (!store.models[model]) {
    store.models[model] = { calls: 0, totalMs: 0, events: {} };
  }
  return store.models[model];
}

export function record(model: string, event: string, durationMs: number): void {
  const m = _ensureModel(model);
  m.calls += 1;
  m.totalMs += durationMs;
  if (!m.events[event]) m.events[event] = { count: 0, totalMs: 0 };
  m.events[event].count += 1;
  m.events[event].totalMs += durationMs;
}

export function getSnapshot(): MetricsSnapshot {
  const out: Record<string, ModelSnapshot> = {};
  for (const [model, stats] of Object.entries(store.models)) {
    const avg = stats.calls > 0 ? stats.totalMs / stats.calls : 0;
    const events: Record<string, { count: number; avgMs: number }> = {};
    for (const [ev, evStats] of Object.entries(stats.events)) {
      events[ev] = {
        count: evStats.count,
        avgMs: evStats.totalMs / (evStats.count || 1)
      };
    }
    out[model] = {
      calls: stats.calls,
      avgLatencyMs: avg,
      events
    };
  }
  return {
    timestamp: new Date().toISOString(),
    models: out
  };
}

export function reset(): void {
  store.models = {};
}

export default {
  record,
  getSnapshot,
  reset
};