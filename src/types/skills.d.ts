/**
 * Skills Layer Type Definitions
 * Phase 1: TypeScript Migration
 */

export interface ISkill {
  name: string;
  version: string;
  description: string;
  execute(context: ISkillContext): Promise<ISkillResult>;
  validate?(input: any): boolean;
}

export interface ISkillContext {
  farmId?: string;
  userId?: string;
  deviceId?: string;
  data?: any;
  metadata?: Record<string, any>;
}

export interface ISkillResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  actions?: ISkillAction[];
}

export interface ISkillAction {
  type: string;
  target?: string;
  params?: any;
}

export interface ISkillMetadata {
  name: string;
  version: string;
  category: SkillCategory;
  tags: string[];
  requiresAuth: boolean;
}

export type SkillCategory =
  | 'ai'
  | 'agriculture'
  | 'analysis'
  | 'communication'
  | 'dashboard'
  | 'defense'
  | 'diagnosis'
  | 'drift'
  | 'governance'
  | 'iot'
  | 'maintenance'
  | 'network'
  | 'orchestration'
  | 'recovery'
  | 'release'
  | 'sales'
  | 'security'
  | 'selfheal'
  | 'sync'
  | 'traceability';

export interface ISkillRegistry {
  register(skill: ISkill): void;
  unregister(name: string): boolean;
  get(name: string): ISkill | undefined;
  list(): ISkillMetadata[];
  execute(name: string, context: ISkillContext): Promise<ISkillResult>;
}

export interface IWaterOptimizationSkill extends ISkill {
  calculateIrrigation(sensorData: any, cropType: string): Promise<any>;
  getSchedule(farmId: string): Promise<any>;
  optimizeWaterUsage(farmId: string): Promise<any>;
}

export interface IWeatherIntelligenceSkill extends ISkill {
  getCurrentWeather(farmId: string): Promise<any>;
  getForecast(farmId: string, days: number): Promise<any>;
  analyzeWeatherImpact(cropId: string): Promise<any>;
}

export interface ICropGrowthTrackerSkill extends ISkill {
  trackGrowth(cropId: string): Promise<any>;
  predictHarvest(cropId: string): Promise<any>;
  analyzeHealth(cropId: string): Promise<any>;
}

export interface IPestAlertSkill extends ISkill {
  detectThreats(farmId: string): Promise<any>;
  sendAlert(alert: any): Promise<void>;
  getRecommendations(pestType: string): any[];
}

export interface IAutoBackupSkill extends ISkill {
  performBackup(farmId: string): Promise<any>;
  restore(backupId: string): Promise<any>;
  listBackups(farmId: string): Promise<any[]>;
}

export interface IRBACGuardSkill extends ISkill {
  checkPermission(userId: string, resource: string, action: string): boolean;
  getUserRoles(userId: string): string[];
  assignRole(userId: string, role: string): Promise<boolean>;
}

export interface IRateLimitGuardSkill extends ISkill {
  checkLimit(identifier: string): boolean;
  increment(identifier: string): void;
  reset(identifier: string): void;
}

export interface IDeviceProvisioningSkill extends ISkill {
  registerDevice(deviceData: any): Promise<any>;
  configureDevice(deviceId: string, config: any): Promise<any>;
  unregisterDevice(deviceId: string): Promise<boolean>;
}

export interface IEnergySaverSkill extends ISkill {
  analyzeUsage(): Promise<any>;
  optimizeSchedule(): Promise<any>;
  getSavingsReport(): Promise<any>;
}

export interface IAnomalyDetectionSkill extends ISkill {
  detect(data: any): Promise<any>;
  classify(anomaly: any): Promise<string>;
  getSeverity(anomaly: any): 'low' | 'medium' | 'high' | 'critical';
}

export interface IWebhookDispatchSkill extends ISkill {
  dispatch(webhook: any): Promise<any>;
  retry(webhookId: string): Promise<any>;
  getStatus(webhookId: string): any;
}

export interface IReportGeneratorSkill extends ISkill {
  generate(reportType: string, params: any): Promise<any>;
  export(format: 'pdf' | 'excel' | 'csv'): Promise<Buffer>;
  schedule(reportType: string, cron: string): Promise<any>;
}

export interface IQRTraceabilitySkill extends ISkill {
  generateQR(productId: string): Promise<string>;
  lookup(qrCode: string): Promise<any>;
  trackJourney(productId: string): Promise<any[]>;
}

export interface ISkillChain {
  add(skill: ISkill): void;
  execute(context: ISkillContext): Promise<ISkillResult[]>;
  clear(): void;
}

export interface ISkillExecutor {
  execute(skillName: string, context: ISkillContext): Promise<ISkillResult>;
  executeParallel(skills: string[], context: ISkillContext): Promise<ISkillResult[]>;
  executeSequential(skills: string[], context: ISkillContext): Promise<ISkillResult[]>;
}

export interface ISkillConfig {
  enabled: boolean;
  timeout: number;
  retries: number;
  priority: number;
}

export interface ISkillMetrics {
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecution: Date;
}