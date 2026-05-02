'use strict';

import os from 'os';
import { AIManager } from './AIManager';
import { getOrchestrator } from './skillOrchestrator';
import logger from '../config/logger';

interface HistoryEntry {
  agent: string;
  input: Record<string, unknown>;
  output: unknown;
  outcome: string;
  timestamp: number;
}

interface PatternStats {
  success: number;
  total: number;
}

interface AgentStats {
  successCount: number;
  totalCount: number;
  avgOutcome: number;
}

class ContextualLearning {
  history: HistoryEntry[];
  maxHistory: number;
  patterns: Map<string, PatternStats>;
  learnedThresholds: Map<string, number>;

  constructor(options: { maxHistory?: number } = {}) {
    this.history = [];
    this.maxHistory = options.maxHistory || 1000;
    this.patterns = new Map();
    this.learnedThresholds = new Map();
  }

  record(agentName: string, input: Record<string, unknown>, output: unknown, outcome: string) {
    this.history.push({
      agent: agentName,
      input: this.sanitize(input),
      output,
      outcome,
      timestamp: Date.now()
    });

    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory / 2);
    }

    this.learn(input, output, outcome);
  }

  sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'number') sanitized[k] = v;
      else if (typeof v === 'string') sanitized[k] = v.substring(0, 50);
    }
    return sanitized;
  }

  learn(input: Record<string, unknown>, _output: unknown, outcome: string) {
    if (outcome === 'success') {
      const key = this.extractPatternKey(input);
      const current = this.patterns.get(key) || { success: 0, total: 0 };
      current.success++;
      current.total++;
      this.patterns.set(key, current);
    }
  }

  extractPatternKey(input: Record<string, unknown>): string {
    const keys = Object.keys(input).sort().slice(0, 3);
    return keys.map(k => `${k}:${input[k]}`).join('|');
  }

  getLearnedThreshold(agentName: string, metric: string): number | undefined {
    const key = `${agentName}:${metric}`;
    return this.learnedThresholds.get(key);
  }

  adaptThreshold(agentName: string, metric: string, currentValue: number, suggestedThreshold: number): number {
    const key = `${agentName}:${metric}`;
    const recent = this.history
      .filter(h => h.agent === agentName)
      .slice(-50)
      .map(h => h.input[metric])
      .filter((v): v is number => v !== undefined);

    if (recent.length >= 10) {
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const adaptedThreshold = Math.round((suggestedThreshold * 0.7) + (avg * 0.3));
      this.learnedThresholds.set(key, adaptedThreshold);
      return adaptedThreshold;
    }

    return suggestedThreshold;
  }

  getInsights() {
    const agentStats: Record<string, AgentStats> = {};

    for (const entry of this.history) {
      if (!agentStats[entry.agent]) {
        agentStats[entry.agent] = { successCount: 0, totalCount: 0, avgOutcome: 0 };
      }
      const stats = agentStats[entry.agent];
      if (stats) {
        stats.totalCount++;
        if (entry.outcome === 'success') stats.successCount++;
      }
    }

    return {
      agents: Object.keys(agentStats),
      stats: agentStats,
      patternCount: this.patterns.size,
      thresholdCount: this.learnedThresholds.size
    };
  }

  getHistory(agentName?: string, limit = 100): HistoryEntry[] {
    let filtered = this.history;
    if (agentName) {
      filtered = filtered.filter(h => h.agent === agentName);
    }
    return filtered.slice(-limit);
  }
}

class SmartAutomationEngine {
  enabled: boolean;
  contextualLearning: ContextualLearning;
  aiManager: AIManager;
  orchestrator: ReturnType<typeof getOrchestrator>;
  activeAutomations: Map<string, NodeJS.Timeout>;

  constructor() {
    this.enabled = process.env.AUTOMATION_ENABLED !== 'false';
    this.contextualLearning = new ContextualLearning();
    this.aiManager = new AIManager();
    this.orchestrator = getOrchestrator();
    this.activeAutomations = new Map();
  }

  async processAutomationRequest(agentName: string, context: Record<string, unknown>) {
    if (!this.enabled) {
      return { success: false, message: 'Automation disabled' };
    }

    try {
      const result = await this.orchestrator.orchestrate(agentName, context, { parallel: true });
      
      this.contextualLearning.record(agentName, context, result, result.successful ? 'success' : 'failure');
      
      return {
        success: result.successful !== undefined && result.successful > 0,
        result,
        insights: this.contextualLearning.getInsights()
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown';
      logger.error(`[SmartAutomation] Error: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  getSystemLoad() {
    const cpus = os.cpus();
    const load = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle / total;
      return acc + (1 - idle);
    }, 0) / cpus.length;

    return {
      cpu: Math.round(load * 100),
      memory: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100),
      uptime: os.uptime()
    };
  }

  getStats() {
    return {
      enabled: this.enabled,
      activeAutomations: this.activeAutomations.size,
      contextualLearning: this.contextualLearning.getInsights(),
      systemLoad: this.getSystemLoad()
    };
  }
}

export default new SmartAutomationEngine();