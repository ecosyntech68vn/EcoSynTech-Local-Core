/**
 * Cleanup Agent Skill
 * Periodic cleanup of temp files, logs, and cache
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface CleanTarget {
  path: string;
  maxAge: number;
}

interface SkillContext {
  config?: Record<string, unknown>;
}

interface SkillResult {
  ok: boolean;
  cleaned: number;
  freed: number;
  errors: string[];
  timestamp: string;
}

import skill = {
  id: 'cleanup-agent',
  name: 'Cleanup Agent',
  triggers: ['cron:*/24h', 'event:cleanup.request', 'event:disk.low'],
  riskLevel: 'low',
  canAutoFix: true,
  run: function(ctx: SkillContext): SkillResult {
    const cleanTargets: CleanTarget[] = [
      { path: path.join(process.cwd(), 'data', 'temp'), maxAge: 24 * 3600000 },
      { path: path.join(process.cwd(), 'logs'), maxAge: 7 * 24 * 3600000 },
      { path: path.join(process.cwd(), 'data', 'cache'), maxAge: 2 * 3600000 }
    ];

    let cleaned = 0;
    let freed = 0;
    const errors: string[] = [];

    for (const target of cleanTargets) {
      try {
        if (!fs.existsSync(target.path)) continue;

        const files = fs.readdirSync(target.path);
        const now = Date.now();

        for (const file of files) {
          try {
            const filePath = path.join(target.path, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) continue;

            const age = now - stat.mtimeMs;
            if (age > target.maxAge) {
              const size = stat.size;
              fs.unlinkSync(filePath);
              cleaned++;
              freed += size;
            }
          } catch (e) {
            errors.push(`Failed to process ${file}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } catch (e) {
        errors.push(`Failed to clean ${target.path}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      ok: errors.length === 0,
      cleaned,
      freed,
      errors,
      timestamp: new Date().toISOString()
    };
  }
};

export = skill;