import logger from './logger';

export const DEFAULT_FLAGS: Record<string, boolean> = {
  ENABLE_WATER_OPTIMIZATION: false,
  ENABLE_HEALTH_REPORT: false,
  ENABLE_AI_FEATURES: false,
  ENABLE_ADVANCED_RULES: true,
  ENABLE_BATCH_OPERATIONS: false,
  ENABLE_WEBRTC: false,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_TELEMETRY: true,
  ENABLE_DEBUG_MODE: false,
  ENABLE_EXPERIMENTAL_FEATURES: false
};

const featureFlags = new Map<string, boolean>(Object.entries(DEFAULT_FLAGS));

export function getFlag(name: string): boolean {
  if (Object.prototype.hasOwnProperty.call(process.env, 'FF_' + name)) {
    return process.env['FF_' + name] === 'true';
  }
  return featureFlags.get(name) ?? false;
}

export function setFlag(name: string, value: boolean): void {
  featureFlags.set(name, !!value);
  logger.info(`[FeatureFlags] ${name} = ${value}`);
}

export function isEnabled(name: string): boolean {
  return getFlag(name);
}

export function getAllFlags(): Record<string, any> {
  const flags: Record<string, any> = {};
  for (const [name, defaultValue] of featureFlags) {
    flags[name] = {
      default: defaultValue,
      current: getFlag(name),
      envVar: 'FF_' + name
    };
  }
  return flags;
}

export function middleware(req: any, res: any, next: any): void {
  res.setHeader('X-Feature-Flags', JSON.stringify([...featureFlags.keys()]));
  next();
}

export function checkFeature(name: string): { enabled: boolean; message?: string } {
  if (!isEnabled(name)) {
    return { enabled: false, message: `Feature ${name} is disabled` };
  }
  return { enabled: true };
}

export const FEATURE_GROUPS: Record<string, string[]> = {
  core: ['ENABLE_ADVANCED_RULES', 'ENABLE_OFFLINE_MODE'],
  ai: ['ENABLE_AI_FEATURES', 'ENABLE_EXPERIMENTAL_FEATURES'],
  integration: ['ENABLE_HEALTH_REPORT', 'ENABLE_WATER_OPTIMIZATION', 'ENABLE_TELEMETRY']
};

export function enableGroup(groupName: string): void {
  const features = FEATURE_GROUPS[groupName];
  if (!features) return;
  features.forEach(f => setFlag(f, true));
}

export function disableGroup(groupName: string): void {
  const features = FEATURE_GROUPS[groupName];
  if (!features) return;
  features.forEach(f => setFlag(f, false));
}

export default {
  getFlag,
  setFlag,
  isEnabled,
  getAllFlags,
  middleware,
  checkFeature,
  FEATURE_GROUPS,
  enableGroup,
  disableGroup
};