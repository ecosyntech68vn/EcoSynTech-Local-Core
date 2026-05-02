import { buildRegistry, skills } from './skill-registry';
import { Orchestrator } from './orchestrator';
import { StateStore } from './state-store';
import { IncidentBus } from './incident-bus';
import Watchdog from '../watchdog';
import { SkillScheduler, SkillMetrics, SkillHotReloader } from './scheduler';

export interface OpsConfig {
  baseUrl?: string;
  packageVersion?: string;
  config?: Record<string, unknown>;
}

export interface OpsContext {
  baseUrl: string;
  packageVersion: string;
  config: Record<string, unknown>;
}

export interface HealthStatus {
  skills: number;
  schedulerRunning: boolean;
  lastTick: number | null;
}

export interface OpsInstance {
  stateStore: StateStore;
  registry: Map<string, unknown>;
  orchestrator: Orchestrator;
  incidentBus: IncidentBus;
  context: OpsContext;
  createWatchdog: (options?: OpsConfig) => Watchdog;
  getScheduler: () => ReturnType<typeof SkillScheduler> | null;
  getMetrics: () => Record<string, unknown>;
  getHealth: () => HealthStatus;
  heartbeat: () => void;
  recordWebSocketBeat: () => void;
  recordMqttBeat: () => void;
  handleAlert: (alert: unknown) => Promise<unknown>;
  trigger: (eventType: string, data: unknown) => Promise<unknown>;
  startScheduler: (schedulerConfig?: unknown) => unknown;
  stopScheduler: () => void;
  enableHotReload: () => ReturnType<typeof SkillHotReloader>;
  disableHotReload: () => void;
}

export function createOps(logger: unknown, baseUrl: string, packageVersion: string, config: Record<string, unknown>): OpsInstance {
  const stateStore = new StateStore();
  const registry = buildRegistry();
  const orchestrator = new Orchestrator({ registry, logger, stateStore });
  const incidentBus = new IncidentBus();
  const context: OpsContext = { baseUrl, packageVersion, config };

  let scheduler: ReturnType<typeof SkillScheduler> | null = null;
  let hotReloader: ReturnType<typeof SkillHotReloader> | null = null;
  const metrics: SkillMetrics | null = null;

  function startScheduler(schedulerConfig?: unknown): ReturnType<typeof SkillScheduler> | null {
    if (!scheduler) {
      scheduler = SkillScheduler({ registry, orchestrator, stateStore, context }, logger as Parameters<typeof SkillScheduler>[1]);
    }
    scheduler.start(schedulerConfig);
    return scheduler;
  }

  function stopScheduler(): void {
    if (scheduler) {
      scheduler.stop();
    }
  }

  function enableHotReload(): ReturnType<typeof SkillHotReloader> {
    if (!hotReloader) {
      hotReloader = SkillHotReloader({ registry, orchestrator }, logger as Parameters<typeof SkillHotReloader>[1]);
    }
    hotReloader.watch();
    return hotReloader;
  }

  function disableHotReload(): void {
    if (hotReloader) {
      hotReloader.stop();
    }
  }

  function getMetrics(): Record<string, unknown> {
    return (metrics && (metrics as { getAllMetrics: () => Record<string, unknown> }).getAllMetrics) ? (metrics as { getAllMetrics: () => Record<string, unknown> }).getAllMetrics() : {};
  }

  return {
    stateStore,
    registry,
    orchestrator,
    incidentBus,
    context,
    
    createWatchdog: function(options?: OpsConfig): Watchdog {
      return new Watchdog({
        orchestrator: orchestrator,
        logger: logger,
        baseUrl: options && options.baseUrl ? options.baseUrl : baseUrl,
        packageVersion: options && options.packageVersion ? options.packageVersion : packageVersion,
        config: options && options.config ? options.config : config
      });
    },

    getScheduler: function(): ReturnType<typeof SkillScheduler> | null { return scheduler; },
    getMetrics: getMetrics,
    
    getHealth: function(): HealthStatus {
      return {
        skills: registry.size,
        schedulerRunning: scheduler && (scheduler as { running?: boolean }).running ? (scheduler as { running?: boolean }).running! : false,
        lastTick: scheduler && (scheduler as { metrics?: { lastTick?: number } }).metrics && (scheduler as { metrics?: { lastTick?: number } }).metrics.lastTick ? (scheduler as { metrics?: { lastTick?: number } }).metrics.lastTick! : null
      };
    },

    heartbeat: function(): void {
      const current = stateStore.get('beats') || {};
      (current as Record<string, number>).orchestrator = Date.now();
      stateStore.set('beats', current);
    },

    recordWebSocketBeat: function(): void {
      const current = stateStore.get('beats') || {};
      (current as Record<string, number>).websocket = Date.now();
      stateStore.set('beats', current);
    },

    recordMqttBeat: function(): void {
      const current = stateStore.get('beats') || {};
      (current as Record<string, number>).mqtt = Date.now();
      stateStore.set('beats', current);
    },

    handleAlert: async function(alert: unknown): Promise<unknown> {
      stateStore.push('alerts', {
        id: (alert && (alert as { id?: string }).id) ? (alert as { id: string }).id : 'alert-' + Date.now(),
        signature: JSON.stringify(alert),
        ts: Date.now()
      }, 500);
      return orchestrator.handle({
        type: 'alert.created',
        alert: alert,
        baseUrl: baseUrl,
        packageVersion: packageVersion,
        config: config
      });
    },

    trigger: async function(eventType: string, data: unknown): Promise<unknown> {
      return orchestrator.handle({
        type: eventType,
        event: eventType,
        data: data,
        baseUrl: baseUrl,
        packageVersion: packageVersion,
        config: config
      });
    },

    startScheduler: startScheduler,
    stopScheduler: stopScheduler,

    enableHotReload: enableHotReload,
    disableHotReload: disableHotReload
  };
}

export { skills };

export default { createOps, skills };