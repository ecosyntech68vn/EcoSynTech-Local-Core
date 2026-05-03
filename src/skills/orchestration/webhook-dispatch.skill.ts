interface SkillContext {
  event?: {
    target?: string;
    webhook?: string;
  };
  [key: string]: unknown;
}

interface SkillResult {
  ok: boolean;
  target: string | null;
  action: string;
  timestamp: string;
}

const skill = {
  id: 'webhook-dispatch',
  name: 'Webhook Dispatch',
  triggers: ['event:webhook.dispatch', 'event:watchdog.tick'],
  riskLevel: 'medium',
  canAutoFix: true,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const target = ctx.event?.target || ctx.event?.webhook || null;

    return {
      ok: true,
      target,
      action: 'dispatch-webhook',
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;