/**
 * WebSocket Heartbeat Watch Skill
 * Monitors WebSocket connection health
 */

interface StateStore {
  get(key: string): unknown;
}

interface SkillContext {
  stateStore?: StateStore;
}

interface SkillResult {
  ok: boolean;
  lastBeat: number | null;
  staleForMs: number | null;
  recommendation: string;
  timestamp: string;
}

import skill = {
  id: 'ws-heartbeat',
  name: 'WebSocket Heartbeat Watch',
  triggers: ['event:websocket.tick', 'event:watchdog.tick', 'route:/ws'],
  riskLevel: 'low',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const beats = (ctx.stateStore?.get('beats') as Record<string, number>) || {};
    const lastBeat = beats.websocket || null;
    const staleForMs = lastBeat ? Date.now() - lastBeat : null;
    const ok = typeof staleForMs === 'number' ? staleForMs < 60000 : false;

    return {
      ok,
      lastBeat,
      staleForMs,
      recommendation: ok ? 'WS healthy' : 'WebSocket heartbeat missing/stale. Check reconnect logic and /ws consumers.',
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;