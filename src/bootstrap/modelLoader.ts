import * as path from 'path';
import * as fs from 'fs';

let logger: unknown = null;
try { logger from('../../config/logger'); } catch (e) { logger = console; }

import HISTORY_MAX = 100;
import historyRing: Array<{ ts: string; [key: string]: unknown }> = [];

function historyPush(entry: Record<string, unknown>): void {
  historyRing.push({ ts: new Date().toISOString(), ...entry });
  if (historyRing.length > HISTORY_MAX) historyRing.shift();
}

function historyGet(n: number = 20): Array<{ ts: string; [key: string]: unknown }> {
  return historyRing.slice(-n);
}

interface BootstrapState {
  smallEnabled: boolean;
  largeEnabled: boolean;
  largeUrl: string;
  lastBootstrapTs: string | null;
}

import state: BootstrapState = {
  smallEnabled: (process.env.AI_SMALL_MODEL ?? '1') !== '0' && (process.env.AI_SMALL_MODEL ?? '1') !== 'false',
  largeEnabled: (process.env.AI_LARGE_MODEL ?? '0') === '1' || (process.env.AI_LARGE_MODEL ?? '0') === 'true',
  largeUrl: process.env.AI_ONNX_URL || '',
  lastBootstrapTs: null
};

let light: unknown = null;
let large: unknown = null;

import REGISTRY_PATH = path.join(__dirname, '../../models/registry.json');

interface RegistryData {
  models?: Array<{ id: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

function readRegistry(): RegistryData | null {
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function writeRegistry(data: RegistryData): boolean {
  try {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (e) { return false; }
}

function updateRegistryModel(id: string, patch: Record<string, unknown>): boolean {
  const reg = readRegistry();
  if (!reg || !reg.models) return false;
  const idx = reg.models.findIndex(m => m.id === id);
  if (idx < 0) return false;
  Object.assign(reg.models[idx], patch);
  return writeRegistry(reg);
}

function healthCheck(): { modelsDir: string; smallPath: string; exists: boolean } {
  const modelsDir = path.join(__dirname, '../../models');
  const smallPath = path.join(modelsDir, 'plant_disease.tflite');
  return { modelsDir, smallPath, exists: fs.existsSync(smallPath) };
}

export interface ModelConfig {
  small?: boolean;
  large?: boolean;
  largeUrl?: string;
}

export function applyConfig(config: ModelConfig): void {
  if (config.small !== undefined) state.smallEnabled = config.small;
  if (config.large !== undefined) state.largeEnabled = config.large;
  if (config.largeUrl !== undefined) state.largeUrl = config.largeUrl;
  historyPush({ event: 'config', config });
}

export function getStatus(): BootstrapState & { health: ReturnType<typeof healthCheck> } {
  return { ...state, health: healthCheck() };
}

export function getHealth(): { models: boolean; large: boolean; overall: string } {
  const hc = healthCheck();
  return {
    models: hc.exists,
    large: state.largeEnabled && !!state.largeUrl,
    overall: hc.exists ? 'healthy' : 'degraded'
  };
}

export function getHistory(n: number): Array<{ ts: string; [key: string]: unknown }> {
  return historyGet(n);
}

export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  status: string;
}

export function getModels(): ModelInfo[] {
  const reg = readRegistry();
  if (!reg || !reg.models) return [];
  return reg.models as ModelInfo[];
}

export async function reload(): Promise<{ success: boolean; message: string }> {
  historyPush({ event: 'reload' });
  return { success: true, message: 'Models reloaded' };
}

export function predict(modelId: string, input: unknown): unknown {
  historyPush({ event: 'predict', modelId });
  return { prediction: 'mock', modelId, input };
}

export default {
  applyConfig,
  getStatus,
  getHealth,
  getHistory,
  getModels,
  reload,
  predict
};