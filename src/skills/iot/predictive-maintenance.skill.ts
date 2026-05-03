/**
 * Predictive Maintenance Skill
 * Predicts device failures based on historical data
 */

interface DeviceHistory {
  failures: number;
  slowResponses: number;
  lastFailure: number | null;
  lastStatus: string;
  uptime: number;
}

interface StateStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface SkillContext {
  stateStore?: StateStore;
  event?: {
    deviceId?: string;
    device?: string;
    status?: string;
    responseTime?: number;
  };
}

const skill = {
  id: 'predictive-maintenance',
  name: 'Predictive Maintenance',
  triggers: ['event:device-status', 'cron:*/1h', 'event:watchdog.tick'],
  riskLevel: 'medium',
  canAutoFix: false,
  run: function(ctx: SkillContext): Record<string, unknown> {
    const stateStore = ctx.stateStore;
    const deviceHistory = (stateStore?.get('deviceHistory') as Record<string, DeviceHistory>) || {};
    
    const deviceId = ctx.event?.deviceId || ctx.event?.device || 'main';
    const status = ctx.event?.status || 'online';
    const responseTime = (ctx.event?.responseTime as number) || 0;
    
    if (!deviceHistory[deviceId]) {
      deviceHistory[deviceId] = {
        failures: 0,
        slowResponses: 0,
        lastFailure: null,
        lastStatus: 'unknown',
        uptime: Date.now()
      };
    }
    
    const dh = deviceHistory[deviceId];
    dh.lastStatus = status;
    
    if (status === 'offline' || status === 'error') {
      dh.failures++;
      dh.lastFailure = Date.now();
    }
    
    if (responseTime > 1000) {
      dh.slowResponses++;
    }
    
    const healthScore = Math.max(0, 100 - (dh.failures * 10) - (dh.slowResponses * 2));
    const needsMaintenance = healthScore < 70;
    
    return {
      ok: true,
      deviceId,
      healthScore,
      failures: dh.failures,
      slowResponses: dh.slowResponses,
      needsMaintenance,
      recommendation: needsMaintenance ? 'Schedule maintenance soon' : 'Device healthy',
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;