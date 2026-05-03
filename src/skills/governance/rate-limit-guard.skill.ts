interface SkillContext {
  event?: {
    rate?: { requestsPerMinute: number };
  };
}

interface SkillResult {
  ok: boolean;
  rate: { requestsPerMinute: number } | null;
  recommendation: string;
  timestamp: string;
}

const skill = {
  id: 'rate-limit-guard',
  name: 'Rate Limit Guard',
  triggers: ['event:watchdog.tick', 'event:request.spike'],
  riskLevel: 'medium',
  canAutoFix: true,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const rate = ctx.event?.rate || null;
    const ok = !rate || rate.requestsPerMinute < 80;

    return {
      ok,
      rate,
      recommendation: ok ? 'Rate is within normal range.' : 'Consider temporary throttling or queueing.',
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;