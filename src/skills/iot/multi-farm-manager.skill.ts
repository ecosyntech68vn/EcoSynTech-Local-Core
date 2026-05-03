/**
 * Multi-Farm Manager Skill
 * Manages multiple farm instances and their status
 */

interface FarmData {
  name: string;
  sensors: Record<string, unknown>;
  alerts: string[];
  lastUpdate: number | null;
}

interface StateStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface SkillContext {
  stateStore?: StateStore;
  event?: {
    farmId?: string;
    farm?: string;
    sensors?: Record<string, unknown>;
  };
}

import skill = {
  id: 'multi-farm-manager',
  name: 'Multi-Farm Manager',
  triggers: ['event:farm-status', 'cron:*/1h', 'event:watchdog.tick'],
  riskLevel: 'low',
  canAutoFix: false,
  run: function(ctx: SkillContext): Record<string, unknown> {
    const stateStore = ctx.stateStore;
    const farms = (stateStore?.get('farms') as Record<string, FarmData>) || {};
    
    const farmId = ctx.event?.farmId || ctx.event?.farm || 'farm-1';
    const sensorData = ctx.event?.sensors || {};
    
    if (!farms[farmId]) {
      farms[farmId] = {
        name: farmId,
        sensors: {},
        alerts: [],
        lastUpdate: null
      };
    }
    
    const farm = farms[farmId];
    farm.sensors = sensorData;
    farm.lastUpdate = Date.now();
    
    const statuses: Record<string, { name: string; alertCount: number; lastUpdate: number | null }> = {};
    for (const id in farms) {
      const f = farms[id];
      statuses[id] = {
        name: f.name,
        alertCount: f.alerts?.length || 0,
        lastUpdate: f.lastUpdate
      };
    }
    
    return {
      ok: true,
      farmId,
      totalFarms: Object.keys(farms).length,
      statuses,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;