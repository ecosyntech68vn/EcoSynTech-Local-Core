/**
 * MQTT Watch Skill
 * Monitors MQTT broker connection health
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
  autoFix: { action: string; note: string } | null;
  timestamp: string;
}

import skill = {
  id: 'mqtt-watch',
  name: 'MQTT Watch',
  triggers: ['event:mqtt.tick', 'cron:*/1m', 'event:watchdog.tick'],
  riskLevel: 'medium',
  canAutoFix: true,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const beats = (ctx.stateStore?.get('beats') as Record<string, number>) || {};
    const lastBeat = beats.mqtt || null;
    const staleForMs = lastBeat ? Date.now() - lastBeat : null;
    const ok = typeof staleForMs === 'number' ? staleForMs < 90000 : false;

    return {
      ok,
      lastBeat,
      staleForMs,
      autoFix: ok ? null : {
        action: 'reconnect-mqtt',
        note: 'Reconnect MQTT bridge and re-subscribe topics.'
      },
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;