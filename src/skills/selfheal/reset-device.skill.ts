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
  id: 'reset-device',
  name: 'Reset Device',
  triggers: ['event:device.offline', 'event:device.unresponsive'],
  riskLevel: 'high',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const deviceId = ctx.event?.deviceId || ctx.event?.data?.deviceId || null;

    return {
      ok: Boolean(deviceId),
      deviceId,
      action: 'reset-device',
      requiresApproval: true,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;