export default {
  id: 'reset-device',
  name: 'Reset Device',
  triggers: ['event:device.offline', 'event:device.unresponsive'],
  riskLevel: 'high' as const,
  canAutoFix: false,
  async run(ctx: { event: { deviceId?: string; data?: { deviceId?: string } } }): Promise<{ ok: boolean; deviceId: string | null; action: string; requiresApproval: boolean; timestamp: string }> {
    const deviceId = ctx.event.deviceId || ctx.event.data?.deviceId || null;

    return {
      ok: Boolean(deviceId),
      deviceId,
      action: 'reset-device',
      requiresApproval: true,
      timestamp: new Date().toISOString()
    };
  }
};