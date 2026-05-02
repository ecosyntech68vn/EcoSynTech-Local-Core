'use strict';

import logger from '../config/logger';

interface SkillMetadata {
  category?: string;
  [key: string]: unknown;
}

interface Skill {
  name: string;
  handler: (context: unknown) => Promise<unknown>;
  metadata: SkillMetadata;
  enabled: boolean;
  lastUsed: string | null;
  successCount: number;
  failCount: number;
}

interface SkillMapping {
  skill: string;
  weight: number;
  priority: string;
}

interface ExecutionResult {
  success: boolean;
  skill: string;
  result?: unknown;
  duration?: number;
  error?: string;
  metadata?: SkillMetadata;
}

interface HistoryEntry {
  skill: string;
  context: unknown;
  result: string;
  duration: number;
  success: boolean;
  timestamp: string;
}

class SkillRegistry {
  skills: Map<string, Skill>;
  agentSkillMap: Map<string, SkillMapping[]>;
  skillHistory: HistoryEntry[];

  constructor() {
    this.skills = new Map();
    this.agentSkillMap = new Map();
    this.skillHistory = [];
    this.initDefaultMappings();
  }

  initDefaultMappings() {
    this.agentSkillMap.set('system_health', [
      { skill: 'system-health-scorer', weight: 1.0, priority: 'high' },
      { skill: 'auto-backup', weight: 0.8, priority: 'medium' },
      { skill: 'cleanup-agent', weight: 0.6, priority: 'low' }
    ]);

    this.agentSkillMap.set('security_monitor', [
      { skill: 'intrusion-detector', weight: 1.0, priority: 'critical' },
      { skill: 'vuln-scanner', weight: 0.9, priority: 'high' },
      { skill: 'audit-trail', weight: 0.7, priority: 'medium' }
    ]);

    this.agentSkillMap.set('performance_tuner', [
      { skill: 'db-optimizer', weight: 1.0, priority: 'high' },
      { skill: 'cleanup-agent', weight: 0.8, priority: 'medium' },
      { skill: 'log-rotator', weight: 0.6, priority: 'low' }
    ]);

    this.agentSkillMap.set('alert_aggregator', [
      { skill: 'alert-deduper', weight: 1.0, priority: 'high' },
      { skill: 'incident-correlator', weight: 0.9, priority: 'high' }
    ]);

    this.agentSkillMap.set('irrigation', [
      { skill: 'water-optimization', weight: 1.0, priority: 'high' },
      { skill: 'weather-decision', weight: 0.8, priority: 'medium' }
    ]);

    this.agentSkillMap.set('climate', [
      { skill: 'weather-decision', weight: 1.0, priority: 'high' },
      { skill: 'crop-growth-tracker', weight: 0.7, priority: 'medium' }
    ]);

    this.agentSkillMap.set('pest_control', [
      { skill: 'pest-alert', weight: 1.0, priority: 'critical' },
      { skill: 'fertilizer-scheduler', weight: 0.6, priority: 'low' }
    ]);

    this.agentSkillMap.set('energy_saver', [
      { skill: 'energy-saver', weight: 1.0, priority: 'high' }
    ]);
  }

  registerSkill(name: string, handler: (context: unknown) => Promise<unknown>, metadata: SkillMetadata = {}) {
    this.skills.set(name, {
      name,
      handler,
      metadata,
      enabled: true,
      lastUsed: null,
      successCount: 0,
      failCount: 0
    });
    logger.info(`[SkillRegistry] Registered skill: ${name}`);
  }

  getSkillsForAgent(agentName: string): SkillMapping[] {
    return this.agentSkillMap.get(agentName) || [];
  }

  async executeSkill(skillName: string, context: unknown): Promise<ExecutionResult> {
    const skill = this.skills.get(skillName);
    if (!skill || !skill.enabled) {
      return { success: false, skill: skillName, error: 'Skill not found or disabled' };
    }

    try {
      const startTime = Date.now();
      const result = await skill.handler(context);
      const duration = Date.now() - startTime;

      skill.lastUsed = new Date().toISOString();
      skill.successCount++;

      this.logExecution(skillName, context, result, duration, true);

      return {
        success: true,
        skill: skillName,
        result,
        duration,
        metadata: skill.metadata
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      skill.failCount++;
      this.logExecution(skillName, context, errMsg, 0, false);

      return {
        success: false,
        skill: skillName,
        error: errMsg,
        metadata: skill.metadata
      };
    }
  }

  logExecution(skillName: string, context: unknown, result: unknown, duration: number, success: boolean) {
    this.skillHistory.push({
      skill: skillName,
      context: this.sanitizeContext(context),
      result: typeof result === 'object' ? 'object' : String(result),
      duration,
      success,
      timestamp: new Date().toISOString()
    });

    if (this.skillHistory.length > 1000) {
      this.skillHistory = this.skillHistory.slice(-500);
    }
  }

  sanitizeContext(context: unknown): unknown {
    const sanitized = { ...context as Record<string, unknown> };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) sanitized[field] = '***';
    });
    return sanitized;
  }

  getSkillStats() {
    const stats: Record<string, unknown> = {};
    for (const [name, skill] of this.skills) {
      stats[name] = {
        enabled: skill.enabled,
        lastUsed: skill.lastUsed,
        successCount: skill.successCount,
        failCount: skill.failCount,
        successRate: skill.successCount / (skill.successCount + skill.failCount || 1) * 100
      };
    }
    return stats;
  }

  getSkillHistory(limit = 50): HistoryEntry[] {
    return this.skillHistory.slice(-limit);
  }

  enableSkill(skillName: string): boolean {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.enabled = true;
      return true;
    }
    return false;
  }

  disableSkill(skillName: string): boolean {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.enabled = false;
      return true;
    }
    return false;
  }

  mapAgentToSkills(agentName: string, skillMappings: SkillMapping[]) {
    this.agentSkillMap.set(agentName, skillMappings);
  }
}

interface OrchestrationOptions {
  parallel?: boolean;
  timeout?: number;
}

export interface OrchestrationResult {
  agent: string;
  context?: unknown;
  executed?: number;
  successful?: number;
  results?: ExecutionResult[];
  recommendations: Array<{ type: string; message: string }>;
  message?: string;
  actions?: unknown[];
}

class SkillOrchestrator {
  registry: SkillRegistry;
  executionQueue: unknown[];
  isProcessing: boolean;

  constructor() {
    this.registry = new SkillRegistry();
    this.executionQueue = [];
    this.isProcessing = false;
    this.loadSkills();
  }

  loadSkills() {
    const skillLoaders = [
      { name: 'system-health-scorer', file: '../skills/analysis/system-health-scorer.skill', optional: true },
      { name: 'auto-backup', file: '../skills/analysis/auto-backup.skill', optional: true },
      { name: 'cleanup-agent', file: '../skills/maintenance/cleanup-agent.skill', optional: true },
      { name: 'intrusion-detector', file: '../skills/defense/intrusion-detector.skill', optional: true },
      { name: 'vuln-scanner', file: '../skills/security/vuln-scanner.skill', optional: true },
      { name: 'audit-trail', file: '../skills/governance/audit-trail.skill', optional: true },
      { name: 'db-optimizer', file: '../skills/maintenance/db-optimizer.skill', optional: true },
      { name: 'log-rotator', file: '../skills/maintenance/log-rotator.skill', optional: true },
      { name: 'alert-deduper', file: '../skills/data/alert-deduper.skill', optional: true },
      { name: 'incident-correlator', file: '../skills/data/incident-correlator.skill', optional: true },
      { name: 'water-optimization', file: '../skills/agriculture/water-optimization.skill', optional: true },
      { name: 'weather-decision', file: '../skills/agriculture/weather-decision.skill', optional: true },
      { name: 'crop-growth-tracker', file: '../skills/agriculture/crop-growth-tracker.skill', optional: true },
      { name: 'pest-alert', file: '../skills/agriculture/pest-alert.skill', optional: true },
      { name: 'fertilizer-scheduler', file: '../skills/agriculture/fertilizer-scheduler.skill', optional: true },
      { name: 'energy-saver', file: '../skills/iot/energy-saver.skill', optional: true }
    ];

    skillLoaders.forEach(({ name, file, optional }) => {
      try {
        const skillModule = require(file);
        const handler = skillModule.execute || skillModule.handler || skillModule;
        this.registry.registerSkill(name, handler, { category: name.split('-')[0] });
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : 'Unknown';
        if (!optional) {
          logger.warn(`[SkillOrchestrator] Failed to load skill ${name}: ${errMsg}`);
        }
      }
    });
  }

  async orchestrate(agentName: string, context: unknown, options: OrchestrationOptions = {}): Promise<OrchestrationResult> {
    const { parallel = false, timeout = 5000 } = options;

    const skillMappings = this.registry.getSkillsForAgent(agentName);
    if (skillMappings.length === 0) {
      return { agent: agentName, actions: [], message: 'No skills mapped', recommendations: [] };
    }

    const results: Array<ExecutionResult & { weight: number }> = [];

    if (parallel) {
      const promises = skillMappings.map(async ({ skill, weight }) => {
        try {
          const result = await this.executeWithTimeout(skill, context, timeout);
          return { weight, ...result };
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : 'Unknown';
          return { weight, success: false, error: errMsg, skill };
        }
      });
      results.push(...await Promise.all(promises));
    } else {
      for (const { skill, weight, priority } of skillMappings) {
        if (priority === 'critical' || priority === 'high') {
          try {
            const result = await this.executeWithTimeout(skill, context, timeout);
            results.push({ weight, ...result });
            if (result.success && priority === 'critical') break;
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : 'Unknown';
            results.push({ skill, weight, success: false, error: errMsg });
          }
        }
      }
    }

    const successful = results.filter(r => r.success);
    return {
      agent: agentName,
      context,
      executed: results.length,
      successful: successful.length,
      results: results.filter(r => r.success),
      recommendations: this.generateRecommendations(results)
    };
  }

  async executeWithTimeout(skillName: string, context: unknown, timeout: number): Promise<ExecutionResult> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Skill execution timeout')), timeout);
    });

    const executionPromise = this.registry.executeSkill(skillName, context);

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  generateRecommendations(results: Array<ExecutionResult & { weight: number }>) {
    const recommendations: Array<{ type: string; message: string }> = [];
    
    const successRate = results.filter(r => r.success).length / results.length;
    if (successRate < 0.5) {
      recommendations.push({
        type: 'optimization',
        message: 'Low skill success rate - consider checking skill configurations'
      });
    }

    const criticalFails = results.filter(r => !r.success && r.error);
    if (criticalFails.length > 0) {
      recommendations.push({
        type: 'alert',
        message: `${criticalFails.length} skills failed - review error logs`
      });
    }

    return recommendations;
  }

  getStats() {
    return {
      registered: this.registry.skills.size,
      mappings: this.registry.agentSkillMap.size,
      history: this.registry.skillHistory.length,
      stats: this.registry.getSkillStats()
    };
  }
}

let orchestrator: SkillOrchestrator | null = null;

function getOrchestrator(): SkillOrchestrator {
  if (!orchestrator) {
    orchestrator = new SkillOrchestrator();
  }
  return orchestrator;
}

export {
  SkillOrchestrator,
  SkillRegistry,
  getOrchestrator
};