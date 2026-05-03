interface SkillContext {
  event?: {
    user?: { role: string };
  };
}

interface SkillResult {
  ok: boolean;
  role: string;
  allowed: boolean;
  timestamp: string;
}

const skill = {
  id: 'rbac-guard',
  name: 'RBAC Guard',
  triggers: ['route:/api/rbac', 'route:/api/security', 'event:watchdog.tick'],
  riskLevel: 'high',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const user = ctx.event?.user || null;
    const role = user?.role || 'unknown';

    return {
      ok: role !== 'unknown',
      role,
      allowed: ['admin', 'operator', 'maintainer'].includes(role),
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;