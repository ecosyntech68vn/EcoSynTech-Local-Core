export default {
  id: 'approval-gate',
  name: 'Approval Gate',
  triggers: ['event:release.request', 'event:dangerous.action', 'event:watchdog.tick'],
  riskLevel: 'high' as const,
  canAutoFix: false,
  async run(ctx: { event: { action?: string; requestedAction?: string; type?: string; risk?: string; approvedBy?: string | null } }): Promise<{ ok: boolean; approved: boolean; approvedBy: string | null; action: string; risk: string; required: boolean; message: string; timestamp: string }> {
    const action = ctx.event.action || ctx.event.requestedAction || ctx.event.type || 'unknown';
    const risk = ctx.event.risk || 'unknown';
    const approvedBy = ctx.event.approvedBy || null;

    const autoApproved = Boolean(approvedBy) && ['low', 'medium'].includes(risk);

    return {
      ok: autoApproved,
      approved: autoApproved,
      approvedBy,
      action,
      risk,
      required: !autoApproved,
      message: autoApproved
        ? 'Approved for safe execution.'
        : 'Manual approval required before execution.',
      timestamp: new Date().toISOString()
    };
  }
};