interface SkillContext {
  event?: {
    alert?: { id?: string; severity?: string };
    data?: { id?: string; severity?: string };
    severity?: string;
    duplicate?: boolean;
  };
}

interface SkillResult {
  ok: boolean;
  alertId: string | null;
  action: string;
  timestamp: string;
}

const skill = {
  id: 'auto-acknowledge',
  name: 'Auto Acknowledge',
  triggers: ['event:alert.created', 'event:alert.duplicate', 'event:watchdog.tick'],
  riskLevel: 'low',
  canAutoFix: true,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const alert = ctx.event?.alert || ctx.event?.data || {};
    const severity = alert?.severity || ctx.event?.severity || 'low';
    const shouldAck = severity === 'low' || ctx.event?.duplicate === true;

    return {
      ok: true,
      alertId: alert?.id || null,
      action: shouldAck ? 'acknowledge' : 'leave-open',
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;