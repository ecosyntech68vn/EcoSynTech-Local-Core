/**
 * Service Layer Type Definitions
 * Phase 1: TypeScript Migration
 */

export interface IRedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
  socket?: {
    connectTimeout?: number;
    reconnectStrategy?: (retries: number) => number | Error;
  };
}

export interface ICacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface ICacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

export interface ICacheStats {
  hits: number;
  misses: number;
  memorySize: number;
  redisConnected: boolean;
}

export interface IRedisCacheService {
  initRedis(config?: IRedisConfig): Promise<boolean>;
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  getPattern(pattern: string): Promise<any[]>;
  invalidatePattern(pattern: string): Promise<number>;
  cached<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
  getStats(): Promise<ICacheStats>;
  close(): Promise<void>;
}

export interface IAuthService {
  register(data: any): Promise<any>;
  login(email: string, password: string): Promise<any>;
  refreshToken(token: string): Promise<any>;
  verifyToken(token: string): Promise<any>;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}

export interface IWaterOptimizationService {
  calculateIrrigation(sensorData: any, cropData: any): Promise<any>;
  getSchedule(farmId: string): Promise<any[]>;
  optimizeWaterUsage(farmId: string): Promise<any>;
}

export interface IOrderService {
  createOrder(data: any): Promise<any>;
  getOrders(filters: any): Promise<any[]>;
  updateOrder(id: string, data: any): Promise<any>;
  deleteOrder(id: string): Promise<boolean>;
}

export interface ILaborService {
  addWorker(data: any): Promise<any>;
  getWorkers(filters: any): Promise<any[]>;
  updateWorker(id: string, data: any): Promise<any>;
  recordAttendance(workerId: string, data: any): Promise<any>;
}

export interface IEquipmentService {
  addEquipment(data: any): Promise<any>;
  getEquipment(filters: any): Promise<any[]>;
  updateEquipment(id: string, data: any): Promise<any>;
  scheduleMaintenance(id: string, data: any): Promise<any>;
}

export interface IPaymentService {
  createPayment(data: any): Promise<any>;
  getPayments(filters: any): Promise<any[]>;
  verifyPayment(transactionId: string): Promise<any>;
  refund(transactionId: string, amount: number): Promise<any>;
}

export interface ISmartAutomationEngine {
  initialize(): Promise<void>;
  processEvent(event: any): Promise<any>;
  getStatus(): Promise<any>;
  shutdown(): Promise<void>;
}

export interface ISkillOrchestrator {
  registerSkill(skill: any): void;
  executeSkill(skillName: string, context: any): Promise<any>;
  getAvailableSkills(): string[];
}

export interface ISelfHealingService {
  diagnose(issue: any): Promise<any>;
  repair(deviceId: string): Promise<any>;
  resetDevice(deviceId: string): Promise<any>;
}

export interface ISensorValidator {
  validate(data: any): Promise<boolean>;
  sanitize(data: any): any;
}

export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDatabaseConfig {
  filename: string;
  mode?: number;
}

export interface IDatabaseService {
  initialize(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
  close(): Promise<void>;
}

export interface IIoTService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, callback: (msg: any) => void): Promise<void>;
  getDevices(): any[];
  getSensorData(deviceId: string): Promise<any>;
}

export interface IDashboardService {
  getFinanceSummary(farmId: string, period: string): Promise<any>;
  getInventoryStats(farmId: string): Promise<any>;
  getEquipmentStats(farmId: string): Promise<any>;
  getLaborStats(farmId: string): Promise<any>;
  getCropStats(farmId: string): Promise<any>;
  getWeatherData(farmId: string): Promise<any>;
  getSalesStats(farmId: string): Promise<any>;
}

export type ServiceType = 
  | 'redisCache'
  | 'auth'
  | 'waterOptimization'
  | 'order'
  | 'labor'
  | 'equipment'
  | 'payment'
  | 'smartAutomation'
  | 'skillOrchestrator'
  | 'selfHealing'
  | 'dashboard';

export interface IServiceMap {
  [key: string]: any;
}