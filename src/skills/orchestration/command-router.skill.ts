interface SkillContext {
  event?: {
    deviceId?: string;
    command?: string;
    data?: {
      deviceId?: string;
      command?: string;
    };
  };
}

interface SkillResult {
  ok: boolean;
  deviceId: string | null;
  command: string | null;
  action: string;
  requiresApproval: boolean;
  timestamp: string;
}

const skill = {
  id: 'command-router',
  name: 'Command Router',
  triggers: ['event:device.command', 'route:/api/devices', 'route:/api/device-mgmt', 'event:watchdog.tick'],
  riskLevel: 'high',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const deviceId = ctx.event?.deviceId || ctx.event?.data?.deviceId || null;
    const command = ctx.event?.command || ctx.event?.data?.command || null;

    return {
      ok: Boolean(deviceId && command),
      deviceId,
      command,
      action: 'route-command',
      requiresApproval: true,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;