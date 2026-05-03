/**
 * Log Rotator Skill
 * Rotates log files to manage disk space
 */

import * as fs from 'fs';
import * as path from 'path';

interface LogFile {
  name: string;
  path: string;
  stat: fs.Stats;
}

interface SkillContext {
  config?: Record<string, unknown>;
}

interface SkillResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  filesTotal?: number;
  totalSize?: number;
  rotated?: number;
  error?: string;
  timestamp: string;
}

const skill = {
  id: 'log-rotator',
  name: 'Log Rotator',
  triggers: ['cron:*/24h', 'event:log.rotate'],
  riskLevel: 'low',
  canAutoFix: true,
  run: function(ctx: SkillContext): SkillResult {
    const logDir = path.join(process.cwd(), 'logs');
    const maxFiles = 10;
    const maxSize = 10 * 1024 * 1024;

    try {
      if (!fs.existsSync(logDir)) {
        return { ok: true, skipped: true, reason: 'No log directory', timestamp: new Date().toISOString() };
      }

      const files = fs.readdirSync(logDir)
        .filter((f) => f.endsWith('.log'))
        .map((f) => ({
          name: f,
          path: path.join(logDir, f),
          stat: fs.statSync(path.join(logDir, f))
        }));

      let totalSize = 0;
      for (const file of files) {
        totalSize += file.stat.size;
      }

      let rotated = 0;
      if (files.length > maxFiles || totalSize > maxSize) {
        files.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);
        
        while (files.length > maxFiles || totalSize > maxSize) {
          const oldest = files.shift();
          if (oldest) {
            try {
              fs.unlinkSync(oldest.path);
              totalSize -= oldest.stat.size;
              rotated++;
            } catch (e) { /* ignore */ }
          }
        }
      }

      return {
        ok: true,
        filesTotal: files.length,
        totalSize,
        rotated,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e), timestamp: new Date().toISOString() };
    }
  }
};

export = skill;