/**
 * Webhook Correlator Skill
 * Correlates webhook events for diagnosis
 */

interface SkillContext {
  event?: {
    payload?: Record<string, unknown>;
    data?: Record<string, unknown>;
    body?: Record<string, unknown>;
    source?: string;
  };
}

interface SkillResult {
  ok: boolean;
  fingerprint: string;
  source: string;
  payloadSummary: { keys: string[] };
  timestamp: string;
}

import skill = {
  id: 'webhook-correlator',
  name: 'Webhook Correlator',
  triggers: ['event:webhook.sensor-alert', 'event:webhook.device-status', 'event:webhook.rule-triggered', 'event:webhook.schedule-run'],
  riskLevel: 'medium',
  canAutoFix: false,
  async run(ctx: SkillContext): Promise<SkillResult> {
    const payload = ctx.event?.payload || ctx.event?.data || ctx.event?.body || {};
    const source = ctx.event?.source || 'webhook';

    const fingerprint = JSON.stringify({
      source,
      type: (payload?.type as string) || (payload?.eventType as string) || 'unknown',
      deviceId: (payload?.deviceId as string) || (payload?.id as string) || null,
      ruleId: payload?.ruleId || null,
      scheduleId: payload?.scheduleId || null
    });

    return {
      ok: true,
      fingerprint,
      source,
      payloadSummary: { keys: Object.keys(payload || {}) },
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;