import { execFile } from('child_process');

function runCmd(cmd: string, args: string[], cwd = process.cwd()): Promise<{ ok: boolean; code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    execFile(cmd, args, { cwd, timeout: 120000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        stdout: stdout?.toString() || '',
        stderr: stderr?.toString() || ''
      });
    });
  });
}

export default {
  id: 'build-test-gate',
  name: 'Build Test Gate',
  triggers: ['event:release.request', 'event:deploy.request', 'event:watchdog.tick'],
  riskLevel: 'high' as const,
  canAutoFix: false,
  async run(ctx: { cwd?: string }): Promise<{ ok: boolean; results: { cmd: string; args: string[]; ok: boolean; code: number; stdout: string; stderr: string }[]; timestamp: string }> {
    const cwd = ctx.cwd || process.cwd();
    const steps: [string, string[]][] = [
      ['npm', ['run', 'build']],
      ['npm', ['test']],
      ['npm', ['run', 'lint']]
    ];

    const results: { cmd: string; args: string[]; ok: boolean; code: number; stdout: string; stderr: string }[] = [];
    for (const [cmd, args] of steps) {
      const result = await runCmd(cmd, args, cwd);
      results.push({ cmd, args, ...result });
      if (!result.ok) break;
    }

    return {
      ok: results.every(r => r.ok),
      results,
      timestamp: new Date().toISOString()
    };
  }
};