/**
 * Anomaly Classifier Skill
 * Classifies anomalies based on sensor values
 */

interface SkillContext {
  event?: {
    data?: Record<string, unknown>;
    alert?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  };
}

interface SkillResult {
  ok: boolean;
  severity: string;
  entity: string;
  observedValue: number | null;
  timestamp: string;
}

const skill = {
  id: 'anomaly-classifier',
  name: 'Anomaly Classifier',
  triggers: ['event:alert.created', 'event:sensor-update', 'event:watchdog.tick'],
  riskLevel: 'medium',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const data = ctx.event?.data || ctx.event?.alert || ctx.event?.payload || {};
    const value = Number((data?.value ?? data?.reading) ?? NaN);

    let severity = 'low';
    if (Number.isNaN(value)) {
      severity = 'unknown';
    } else if (value > 90 || value < 10) {
      severity = 'high';
    } else if (value > 75 || value < 25) {
      severity = 'medium';
    }

    return {
      ok: severity !== 'unknown',
      severity,
      entity: (data?.deviceId as string) || (data?.sensor as string) || (data?.type as string) || 'system',
      observedValue: Number.isNaN(value) ? null : value,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;