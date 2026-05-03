export default {
  id: 'rollback-ota',
  name: 'Rollback OTA',
  triggers: ['event:ota.failed', 'event:device.bricked', 'event:watchdog.tick'],
  riskLevel: 'high' as const,
  canAutoFix: false,
  async run(ctx: { event: { deviceId?: string; data?: { deviceId?: string } } }): Promise<{ ok: boolean; deviceId: string | null; action: string; requiresApproval: boolean; timestamp: string }> {
    const deviceId = ctx.event.deviceId || ctx.event.data?.deviceId || null;

    return {
      ok: Boolean(deviceId),
      deviceId,
      action: 'rollback-ota',
      requiresApproval: true,
      timestamp: new Date().toISOString()
    };
  }
};