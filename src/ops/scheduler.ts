import * as fs from 'fs';
import * as path from 'path';

export interface SchedulerConfig {
  defaultInterval?: number;
}

export interface SkillMetrics {
  ticks: number;
  skillsRun: number;
  skillsFailed: number;
  lastTick: string | null;
  uptime: number;
}

export interface OpsContext {
  baseUrl: string;
  packageVersion: string;
  config: Record<string, unknown>;
}

export interface OpsInput {
  registry: Map<string, { id: string; run: (ctx: unknown) => unknown }>;
  stateStore: { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
  context: OpsContext;
}

const INTERVALS: Record<string, number> = {
  critical: 60000,
  high: 300000,
  medium: 600000,
  low: 1800000,
  hourly: 3600000
};

const SKILL_PRIORITIES: Record<string, string> = {
  'version-drift-detect': 'high',
  'config-drift-detect': 'high',
  'ws-heartbeat': 'critical',
  'mqtt-watch': 'critical',
  'alert-deduper': 'medium',
  'incident-correlator': 'medium',
  'retry-job': 'high',
  'reconnect-bridge': 'critical',
  'clear-cache': 'low',
  'auto-acknowledge': 'low',
  'rules-engine': 'medium',
  'schedules-engine': 'medium',
  'build-test-gate': 'hourly',
  'approval-gate': 'critical',
  'approval-gate-advanced': 'critical',
  'rbac-guard': 'medium',
  'audit-trail': 'low',
  'secrets-check': 'hourly',
  'tenant-isolation': 'medium',
  'rate-limit-guard': 'low'
};

export interface SkillSchedulerReturn {
  start: (config?: SchedulerConfig) => void;
  stop: () => void;
  getMetrics: () => SkillMetrics;
  getSkills: () => { id: string; priority: string }[];
  running: boolean;
  metrics: SkillMetrics;
}

export function SkillScheduler(ops: OpsInput, logger: unknown): SkillSchedulerReturn {
  const scheduledJobs = new Map<string, unknown>();
  const metrics: SkillMetrics = {
    ticks: 0,
    skillsRun: 0,
    skillsFailed: 0,
    lastTick: null,
    uptime: Date.now()
  };
  let running = false;
  let intervalId: NodeJS.Timeout | null = null;

  function getIntervalForSkill(skillId: string): number {
    const priority = SKILL_PRIORITIES[skillId] || 'medium';
    return INTERVALS[priority] || INTERVALS.medium;
  }

  function getSkillsByPriority(): { skill: { id: string; run: (ctx: unknown) => unknown }; priority: string }[] {
    const skills: { skill: { id: string; run: (ctx: unknown) => unknown }; priority: string }[] = [];
    const priorities = ['critical', 'high', 'medium', 'low', 'hourly'];
    
    for (let i = 0; i < priorities.length; i++) {
      const priority = priorities[i];
      const prioritySkills: { skill: { id: string; run: (ctx: unknown) => unknown }; priority: string }[] = [];
      const regSkills = ops.registry.values();
      for (const skill of regSkills) {
        const p = SKILL_PRIORITIES[skill.id] || 'medium';
        if (p === priority) {
          prioritySkills.push({ skill, priority });
        }
      }
      skills.push(...prioritySkills);
    }
    return skills;
  }

  async function tick(): Promise<{ ticks: number; skillsRun: number; failed: number; elapsed: number }> {
    return new Promise(function(resolve) {
      const start = Date.now();
      metrics.ticks++;
      metrics.lastTick = new Date().toISOString();

      if (logger && (logger as { info?: (msg: string) => void }).info) {
        (logger as { info: (msg: string) => void }).info('[Scheduler] Tick #' + metrics.ticks + ' started');
      }

      const skillsToRun = getSkillsByPriority();
      let skillsRun = 0;
      let failed = 0;

      let idx = 0;
      function runNext(): void {
        if (idx >= skillsToRun.length) {
          metrics.skillsRun += skillsRun;
          metrics.skillsFailed += failed;
          const elapsed = Date.now() - start;
          if (logger && (logger as { info?: (msg: string) => void }).info) {
            (logger as { info: (msg: string) => void }).info('[Scheduler] Tick complete: ' + skillsRun + ' skills, ' + failed + ' failed, ' + elapsed + 'ms');
          }
          resolve({
            ticks: metrics.ticks,
            skillsRun,
            failed,
            elapsed
          });
          return;
        }

        const item = skillsToRun[idx];
        idx++;
        const skill = item.skill;
        const priority = item.priority;

        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            const result = skill.run({
              event: { type: 'scheduler.tick', priority, retry: retryCount },
              logger,
              stateStore: ops.stateStore,
              baseUrl: ops.context.baseUrl,
              packageVersion: ops.context.packageVersion,
              config: ops.context.config
            });

            if (result && (result as { ok: boolean }).ok === false && retryCount < maxRetries - 1) {
              retryCount++;
              continue;
            }
            
            if (result && (result as { ok: boolean }).ok === false) {
              failed++;
            }
            skillsRun++;
            break;
          } catch (err: unknown) {
            retryCount++;
            if (retryCount >= maxRetries) {
              failed++;
              const errorMessage = err instanceof Error ? err.message : String(err);
              if (logger && (logger as { error?: (msg: string) => void }).error) {
                (logger as { error: (msg: string) => void }).error('[Scheduler] Skill ' + skill.id + ' failed after ' + maxRetries + ' retries: ' + errorMessage);
              }
            }
          }
        }

        setImmediate(runNext);
      }

      runNext();
    });
  }

  function start(config?: SchedulerConfig): void {
    if (running) return;
    running = true;

    const defaultInterval = (config && config.defaultInterval) ? config.defaultInterval : 600000;

    intervalId = setInterval(function() {
      tick();
    }, defaultInterval);

    if (logger && (logger as { info?: (msg: string) => void }).info) {
      (logger as { info: (msg: string) => void }).info('[Scheduler] Started with interval ' + (defaultInterval / 1000 / 60) + ' minutes');
    }
  }

  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    running = false;
    if (logger && (logger as { info?: (msg: string) => void }).info) {
      (logger as { info: (msg: string) => void }).info('[Scheduler] Stopped');
    }
  }

  function getMetrics(): SkillMetrics {
    return {
      ticks: metrics.ticks,
      skillsRun: metrics.skillsRun,
      skillsFailed: metrics.skillsFailed,
      lastTick: metrics.lastTick,
      uptime: metrics.uptime
    };
  }

  return {
    start,
    stop,
    getMetrics,
    getSkills: () => {
      return getSkillsByPriority().map(item => ({ id: item.skill.id, priority: item.priority }));
    },
    get running() { return running; },
    get metrics() { return metrics; }
  };
}

export interface HotReloadConfig {
  registry: Map<string, unknown>;
  orchestrator: unknown;
}

export function SkillHotReloader(config: HotReloadConfig, logger: unknown) {
  let watcher: fs.FSWatcher | null = null;

  function watch(): void {
    const skillsDir = path.join(process.cwd(), 'src', 'skills');
    
    try {
      watcher = fs.watch(skillsDir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
          if (logger && (logger as { info?: (msg: string) => void }).info) {
            (logger as { info: (msg: string) => void }).info('[HotReload] File changed: ' + filename);
          }
        }
      });
    } catch (err) {
      if (logger && (logger as { warn?: (msg: string) => void }).warn) {
        (logger as { warn: (msg: string) => void }).warn('[HotReload] Failed to watch: ' + (err as Error).message);
      }
    }
  }

  function stop(): void {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
  }

  return { watch, stop };
}

export default { SkillScheduler, SkillHotReloader };