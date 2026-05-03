interface SkillContext {
  event?: {
    channel?: string;
    type?: string;
  };
}

interface SkillResult {
  ok: boolean;
  channel: string;
  action: string;
  recommendation: string;
  timestamp: string;
}

const skill = {
  id: 'reconnect-bridge',
  name: 'Reconnect Bridge',
  triggers: ['event:mqtt.disconnect', 'event:websocket.disconnect', 'event:watchdog.tick'],
  riskLevel: 'medium',
  canAutoFix: true,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const channel = ctx.event?.channel || (ctx.event?.type?.includes('mqtt') ? 'mqtt' : 'websocket');

    return {
      ok: true,
      channel,
      action: 'reconnect',
      recommendation: `Restart ${channel} bridge and rebind subscriptions.`,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;