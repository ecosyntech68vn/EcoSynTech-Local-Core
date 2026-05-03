/**
 * Database Service Type Declaration
 * Complete type definitions for database module
 */

export interface DatabaseConfig {
  filename: string;
  mode: number;
}

export interface QueryResult {
  columns: string[];
  values: any[][];
}

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  farm_id: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface FarmRecord {
  id: string;
  name: string;
  owner_id: string;
  location: string;
  area: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseModule {
  initDatabase(): Promise<any>;
  getDatabase(): any;
  closeDatabase(): Promise<void>;
  saveDatabase(): void;
  query(sql: string, params?: any[]): any[];
  run(sql: string, params?: any[]): void;
  get(sql: string, params?: any[]): any;
  all(sql: string, params?: any[]): any[];
  findUserByEmail(email: string): UserRecord | null;
  findUserById(id: string): UserRecord | null;
  createUser(userData: any): string;
  updateUser(id: string, userData: any): boolean;
  deleteUser(id: string): boolean;
  saveRefreshToken(userId: string, token: string, ip?: string, userAgent?: string, expiresInDays?: number): boolean;
  verifyRefreshToken(userId: string, token: string): boolean;
  rotateRefreshToken(userId: string, oldToken: string, newToken: string, ip?: string, userAgent?: string): boolean;
  revokeRefreshToken(userId: string, token: string): boolean;
  getDevices(farmId?: string): DeviceRecord[];
  getDeviceById(id: string): DeviceRecord | null;
  createDevice(deviceData: any): string;
  updateDevice(id: string, deviceData: any): boolean;
  deleteDevice(id: string): boolean;
  getFarms(ownerId?: string): FarmRecord[];
  getFarmById(id: string): FarmRecord | null;
  createFarm(farmData: any): string;
  updateFarm(id: string, farmData: any): boolean;
  deleteFarm(id: string): boolean;
  saveSensorData(deviceId: string, data: any): boolean;
  getSensorData(deviceId: string, limit?: number): any[];
  getLatestSensorData(deviceId: string): any;
  saveTransaction(farmId: string, data: any): string;
  getTransactions(farmId: string, startDate?: string, endDate?: string): any[];
  getFinanceSummary(farmId: string, period: string): any;
  getInventory(farmId: string): any[];
  updateInventory(id: string, data: any): boolean;
  getEquipment(farmId: string): any[];
  createEquipment(data: any): string;
  getWorkers(farmId: string): any[];
  recordAttendance(workerId: string, data: any): boolean;
  getCrops(farmId: string): any[];
  createCrop(data: any): string;
  getOrders(farmId: string): any[];
  createOrder(data: any): string;
}

export function initDatabase(): Promise<any>;
export function getDatabase(): any;
export function closeDatabase(): Promise<void>;
export function runQuery(sql: string, params?: any[]): void;
export function getOne(sql: string, params?: any[]): any;
export function getAll(sql: string, params?: any[]): any[];
export function get(sql: string, params?: any[]): any;
export function all(sql: string, params?: any[]): any[];
export function run(sql: string, params?: any[]): void;
export function saveDatabase(): void;
export function saveDatabaseSync(): void;
export function createIndexes(): void;
export function optimizeDatabase(): void;
export function verifyPersistence(): Promise<boolean>;
export function getHealthCheck(): any;
export function logDeviceAction(deviceId: string, action: string, status: string, details?: any): void;
export function getLastDeviceAction(deviceId: string): any;
export function checkDeviceCooldown(deviceId: string, action: string, cooldownSeconds: number): boolean;
export function saveRefreshToken(userId: string, token: string, ip?: string, userAgent?: string, expiresInDays?: number): boolean;
export function verifyRefreshToken(userId: string, token: string): any;
export function rotateRefreshToken(userId: string, oldToken: string, newToken: string, ip?: string, userAgent?: string): boolean;
export function revokeRefreshToken(userId: string, token: string): boolean;
export function revokeAllUserRefreshTokens(userId: string): void;