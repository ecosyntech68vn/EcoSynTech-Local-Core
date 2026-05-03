interface SkillContext {
  event?: {
    job?: { attempts?: number };
    data?: { attempts?: number };
  };
}

interface SkillResult {
  ok: boolean;
  action: string;
  attempts: number;
  timestamp: string;
}

const skill = {
  id: 'retry-job',
  name: 'Retry Job',
  triggers: ['event:job.failed', 'event:watchdog.tick'],
  riskLevel: 'low',
  canAutoFix: true,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const job = ctx.event?.job || ctx.event?.data || {};
    const attempts = Number(job?.attempts || 0);

    return {
      ok: true,
      action: attempts < 3 ? 'retry' : 'escalate',
      attempts,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;