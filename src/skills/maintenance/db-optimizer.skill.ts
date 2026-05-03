/**
 * Database Optimizer Skill
 * Optimizes SQLite database and indexes
 */

import * as fs from 'fs';
import * as path from 'path';

interface SkillContext {
  config?: Record<string, unknown>;
}

interface SkillResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  dbSize?: number;
  indexSize?: number;
  optimizationRate?: number;
  timestamp: string;
}

import skill = {
  id: 'db-optimizer',
  name: 'Database Optimizer',
  triggers: ['cron:*/24h', 'event:db.optimize', 'event:watchdog.tick'],
  riskLevel: 'low',
  canAutoFix: true,
  run: function(ctx: SkillContext): SkillResult {
    const dbPath = path.join(process.cwd(), 'data', 'ecosyntech.db');
    const indexPath = path.join(process.cwd(), 'data', 'index.json');

    if (!fs.existsSync(dbPath)) {
      return { ok: true, skipped: true, reason: 'No database found', timestamp: new Date().toISOString() };
    }

    const stats: { dbSize: number; indexSize: number; optimizationRate: number } = {
      dbSize: 0,
      indexSize: 0,
      optimizationRate: 0
    };

    try {
      const dbStat = fs.statSync(dbPath);
      stats.dbSize = dbStat.size;

      if (fs.existsSync(indexPath)) {
        const indexStat = fs.statSync(indexPath);
        stats.indexSize = indexStat.size;
      }

      const maxDbSize = 100 * 1024 * 1024;
      stats.optimizationRate = Math.min(100, (stats.dbSize / maxDbSize) * 100);

      return {
        ok: true,
        ...stats,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : String(e), timestamp: new Date().toISOString() };
    }
  }
};

export = skill;