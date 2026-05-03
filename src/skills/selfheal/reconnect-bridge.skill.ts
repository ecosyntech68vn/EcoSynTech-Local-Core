export default {
  id: 'reconnect-bridge',
  name: 'Reconnect Bridge',
  triggers: ['event:mqtt.disconnect', 'event:websocket.disconnect', 'event:watchdog.tick'],
  riskLevel: 'medium' as const,
  canAutoFix: true,
  async run(ctx: { event: { channel?: string; type?: string } }): Promise<{ ok: boolean; channel: string; action: string; recommendation: string; timestamp: string }> {
    const channel = ctx.event.channel || (ctx.event.type?.includes('mqtt') ? 'mqtt' : 'websocket');

    return {
      ok: true,
      channel,
      action: 'reconnect',
      recommendation: `Restart ${channel} bridge and rebind subscriptions.`,
      timestamp: new Date().toISOString()
    };
  }
};