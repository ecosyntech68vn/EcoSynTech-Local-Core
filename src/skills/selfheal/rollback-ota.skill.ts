interface SkillContext {
  event?: {
    deviceId?: string;
    data?: {
      deviceId?: string;
    };
  };
}

interface SkillResult {
  ok: boolean;
  deviceId: string | null;
  action: string;
  requiresApproval: boolean;
  timestamp: string;
}

const skill = {
  id: 'rollback-ota',
  name: 'Rollback OTA',
  triggers: ['event:ota.failed', 'event:device.bricked', 'event:watchdog.tick'],
  riskLevel: 'high',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const deviceId = ctx.event?.deviceId || ctx.event?.data?.deviceId || null;

    return {
      ok: Boolean(deviceId),
      deviceId,
      action: 'rollback-ota',
      requiresApproval: true,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;