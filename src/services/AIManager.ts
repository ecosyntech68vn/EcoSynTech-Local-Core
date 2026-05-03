'use strict';

import os from 'os';

interface ThresholdConfig {
  critical?: number;
  warning?: number;
  optimal?: number;
  cpu?: number;
  ram?: number;
  disk?: number;
  failedLogins?: number;
  responseTime?: number;
  errorRate?: number;
  alertCount?: number;
  [key: string]: number | undefined;
}

interface AgentResult {
  field: string;
  action: string;
  details: Record<string, unknown>;
  confidence: number;
}

const AGRICULTURE_THRESHOLDS: Record<string, ThresholdConfig> = {
  irrigation: { critical: 20, warning: 40, optimal: 60 },
  climate: { critical: 34, warning: 30 },
  soil_health: { critical: 15, warning: 30, optimal: 50 },
  energy_saver: { critical: 80, warning: 60, optimal: 40 },
  pest_control: { critical: 70, warning: 50, optimal: 25 }
};

const SYSTEM_THRESHOLDS: Record<string, ThresholdConfig> = {
  system_health: { cpu: 90, ram: 90, disk: 95 },
  security_monitor: { failedLogins: 5 },
  performance_tuner: { responseTime: 2000, errorRate: 5 },
  alert_aggregator: { alertCount: 20 }
};

class Agent {
  field: string;
  memory: Record<string, unknown>;
  thresholds: ThresholdConfig;

  constructor(field: string) {
    this.field = field;
    this.memory = {};
    this.thresholds = AGRICULTURE_THRESHOLDS[field] || SYSTEM_THRESHOLDS[field] || { critical: 80, warning: 60 };
  }

  think(context: Record<string, unknown> = {}): AgentResult {
    const field = this.field;
    const ctx = (context[field] || context) as Record<string, unknown>;
    const result: AgentResult = { field, action: 'no_action', details: {}, confidence: 0.8 };
    const th = this.thresholds;

    if (field === 'irrigation') {
      const soil = typeof ctx.soilMoisture === 'number' ? ctx.soilMoisture : null;
      if (soil !== null) {
        if (soil < (th.critical ?? 20)) {
          result.action = 'irrigate';
          result.details = { level: 'high', soilMoisture: soil, reason: 'critical_low_moisture' };
        } else if (soil < (th.warning ?? 40)) {
          result.action = 'irrigate';
          result.details = { level: 'medium', soilMoisture: soil, reason: 'warning_low_moisture' };
        } else if (soil >= (th.optimal ?? 60) && ctx.forecast === 'rain') {
          result.action = 'delay_irrigation';
          result.details = { reason: 'rain_forecasted', forecast: 'rain' };
        }
      }
    }
    else if (field === 'climate' || field === 'weather') {
      const forecast = ctx.forecast || context.forecast;
      const temp = typeof ctx.temperature === 'number' ? ctx.temperature : (context.temperature as number);
      if (forecast === 'dry' || (typeof temp === 'number' && temp > (th.critical ?? 34))) {
        result.action = 'adjust_irrigation_schedule';
        result.details = { reason: 'dry_heat', forecast, temperature: temp };
      } else if (forecast === 'rain' || temp < 20) {
        result.action = 'reduce_irrigation';
        result.details = { reason: 'cool_rainy', forecast, temperature: temp };
      }
    }
    else if (field === 'soil_health') {
      const ph = typeof ctx.ph === 'number' ? ctx.ph : null;
      const nitrogen = typeof ctx.nitrogen === 'number' ? ctx.nitrogen : null;
      if (ph !== null) {
        if (ph < 5.5) {
          result.action = 'apply_lime';
          result.details = { ph, reason: 'acidic_soil', severity: 'high' };
        } else if (ph > 7.5) {
          result.action = 'apply_sulfur';
          result.details = { ph, reason: 'alkaline_soil', severity: 'medium' };
        } else if (ph >= 6.0 && ph <= 7.0) {
          result.action = 'optimal';
          result.details = { ph, reason: 'optimal_ph_range' };
        }
      }
      if (nitrogen !== null && result.action === 'no_action' && nitrogen < 20) {
        result.action = 'apply_nitrogen';
        result.details = { nitrogen, reason: 'nitrogen_deficient' };
      }
    }
    else if (field === 'energy_saver') {
      const powerUsage = typeof ctx.powerUsage === 'number' ? ctx.powerUsage : null;
      const solarOutput = typeof ctx.solarOutput === 'number' ? ctx.solarOutput : null;
      const hour = typeof ctx.hour === 'number' ? ctx.hour : new Date().getHours();
      if (powerUsage !== null) {
        if (powerUsage > (th.critical ?? 80)) {
          result.action = 'reduce_load';
          result.details = { powerUsage, reason: 'high_power_consumption', severity: 'critical' };
        } else if (powerUsage > (th.warning ?? 60)) {
          result.action = 'optimize_schedule';
          result.details = { powerUsage, reason: 'moderate_power_usage' };
        }
      }
      if (solarOutput !== null && solarOutput > 70 && hour >= 10 && hour <= 14) {
        result.details.solar_optimization = true;
      }
    }
    else if (field === 'pest_control') {
      const humidity = typeof ctx.humidity === 'number' ? ctx.humidity : null;
      const temperature = typeof ctx.temperature === 'number' ? ctx.temperature : null;
      const pestRisk = typeof ctx.pestRisk === 'number' ? ctx.pestRisk : null;
      if (pestRisk !== null) {
        if (pestRisk > (th.critical ?? 70)) {
          result.action = 'activate_spraying';
          result.details = { pestRisk, reason: 'high_pest_risk', severity: 'critical' };
        } else if (pestRisk > (th.warning ?? 50)) {
          result.action = 'increase_monitoring';
          result.details = { pestRisk, reason: 'elevated_pest_risk' };
        }
      } else if (humidity !== null && temperature !== null) {
        if (humidity > 80 && temperature >= 20 && temperature <= 30) {
          result.action = 'preventive_spray';
          result.details = { humidity, temperature, reason: 'fungal_conditions' };
        }
      }
    }
    else if (field === 'system_health') {
      const cpu = typeof ctx.cpu === 'number' ? ctx.cpu : 0;
      const ram = typeof ctx.ram === 'number' ? ctx.ram : 0;
      const disk = typeof ctx.disk === 'number' ? ctx.disk : 0;
      const uptime = typeof ctx.uptime === 'number' ? ctx.uptime : 0;
      const reasons: string[] = [];

      if (cpu > (th.cpu ?? 90)) {
        result.action = 'critical';
        reasons.push('cpu_overload');
        result.details.cpu = cpu;
      } else if (cpu > 80) {
        result.action = 'warning';
        reasons.push('cpu_high');
        result.details.cpu = cpu;
      }

      if (ram > (th.ram ?? 90)) {
        if (result.action === 'no_action') result.action = 'critical';
        result.details.ram = ram;
        reasons.push('memory_critical');
      } else if (ram > 80 && result.action === 'no_action') {
        result.action = 'warning';
        result.details.ram = ram;
        reasons.push('memory_high');
      }

      if (disk > (th.disk ?? 95)) {
        if (result.action === 'no_action') result.action = 'critical';
        result.details.disk = disk;
        reasons.push('disk_full');
      } else if (disk > 85 && result.action === 'no_action') {
        result.action = 'warning';
        result.details.disk = disk;
        reasons.push('disk_high');
      }

      if (reasons.length > 0) {
        result.details.reason = reasons.join('; ');
        result.details.severity = result.action;
      }

      if (uptime > 0 && uptime < 3600) {
        result.details.recentReboot = true;
      }
    }

    return result;
  }

  remember(key: string, value: unknown) {
    this.memory[key] = value;
  }

  recall(key: string): unknown {
    return this.memory[key];
  }

  learn(context: Record<string, unknown>, result: AgentResult, outcome: string) {
    this.remember(`last_${this.field}`, { context, result, outcome, time: Date.now() });
  }
}

class AIManager {
  agents: Map<string, Agent>;
  decisionHistory: Array<{ agent: string; result: AgentResult; timestamp: number }>;

  constructor() {
    this.agents = new Map();
    this.decisionHistory = [];
    this.initAgents();
  }

  initAgents() {
    const agentFields = [
      'irrigation', 'climate', 'soil_health', 'energy_saver', 'pest_control',
      'system_health', 'security_monitor', 'performance_tuner', 'alert_aggregator'
    ];
    for (const field of agentFields) {
      this.agents.set(field, new Agent(field));
    }
  }

  async process(field: string, context: Record<string, unknown>): Promise<AgentResult> {
    const agent = this.agents.get(field);
    if (!agent) {
      return { field, action: 'unknown_agent', details: { error: 'Agent not found' }, confidence: 0 };
    }

    const result = agent.think(context);
    agent.learn(context, result, result.action !== 'no_action' ? 'success' : 'no_action');

    this.decisionHistory.push({ agent: field, result, timestamp: Date.now() });
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory = this.decisionHistory.slice(-500);
    }

    return result;
  }

  async processAll(context: Record<string, unknown>): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const [field, agent] of this.agents) {
      const result = agent.think(context);
      results.push(result);
    }
    return results;
  }

  getAgent(field: string): Agent | undefined {
    return this.agents.get(field);
  }

  getDecisionHistory(agentField?: string, limit = 50) {
    let history = this.decisionHistory;
    if (agentField) {
      history = history.filter(h => h.agent === agentField);
    }
    return history.slice(-limit);
  }

  getStats() {
    const agentStats: Record<string, { actionCount: number; lastAction: string }> = {};
    for (const [field, agent] of this.agents) {
      agentStats[field] = { actionCount: 0, lastAction: 'none' };
    }
    for (const entry of this.decisionHistory.slice(-100)) {
      const stats = agentStats[entry.agent];
      if (stats) {
        stats.actionCount++;
        stats.lastAction = entry.result.action;
      }
    }
    return {
      totalAgents: this.agents.size,
      totalDecisions: this.decisionHistory.length,
      agentStats,
      systemLoad: {
        cpu: os.loadavg()[0],
        memory: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)
      }
    };
  }

  reset() {
    this.decisionHistory = [];
    for (const [, agent] of this.agents) {
      agent.memory = {};
    }
  }
}

export { AIManager, Agent, AgentResult };