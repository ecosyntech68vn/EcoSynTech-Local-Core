/**
 * Routes Layer Type Definitions
 * Phase 1: TypeScript Migration
 */

import { Request, Response, NextFunction, Router } from 'express';

export type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options';

export interface IRoute {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  middleware?: RouteHandler[];
}

export interface IRouteGroup {
  prefix: string;
  routes: IRoute[];
  middleware?: RouteHandler[];
}

export interface IAuthRoutes {
  register: AsyncRouteHandler;
  login: AsyncRouteHandler;
  refresh: AsyncRouteHandler;
  logout: AsyncRouteHandler;
  getMe: AsyncRouteHandler;
  updatePassword: AsyncRouteHandler;
}

export interface IDashboardRoutes {
  getSummary: AsyncRouteHandler;
  getFinance: AsyncRouteHandler;
  getInventory: AsyncRouteHandler;
  getEquipment: AsyncRouteHandler;
  getLabor: AsyncRouteHandler;
  getCrops: AsyncRouteHandler;
  getWeather: AsyncRouteHandler;
  getSales: AsyncRouteHandler;
}

export interface IDeviceRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  getSensors: AsyncRouteHandler;
  sendCommand: AsyncRouteHandler;
}

export interface ISensorRoutes {
  getAll: AsyncRouteHandler;
  getLatest: AsyncRouteHandler;
  getHistory: AsyncRouteHandler;
  create: AsyncRouteHandler;
  getAlerts: AsyncRouteHandler;
}

export interface ICropRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  addGrowth: AsyncRouteHandler;
  getYield: AsyncRouteHandler;
}

export interface IInventoryRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  getLowStock: AsyncRouteHandler;
  adjust: AsyncRouteHandler;
}

export interface IEquipmentRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  scheduleMaintenance: AsyncRouteHandler;
  getHistory: AsyncRouteHandler;
}

export interface ILaborRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  recordAttendance: AsyncRouteHandler;
  getAttendance: AsyncRouteHandler;
}

export interface ISalesRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  processPayment: AsyncRouteHandler;
  getReport: AsyncRouteHandler;
}

export interface IPaymentRoutes {
  getAll: AsyncRouteHandler;
  create: AsyncRouteHandler;
  verify: AsyncRouteHandler;
  refund: AsyncRouteHandler;
  getStatus: AsyncRouteHandler;
}

export interface IAutomationRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  execute: AsyncRouteHandler;
  getLogs: AsyncRouteHandler;
}

export interface IFarmRoutes {
  getAll: AsyncRouteHandler;
  getById: AsyncRouteHandler;
  create: AsyncRouteHandler;
  update: AsyncRouteHandler;
  delete: AsyncRouteHandler;
  getStats: AsyncRouteHandler;
  getDevices: AsyncRouteHandler;
}

export interface IReportRoutes {
  getFinance: AsyncRouteHandler;
  getProduction: AsyncRouteHandler;
  getInventory: AsyncRouteHandler;
  getLabor: AsyncRouteHandler;
  export: AsyncRouteHandler;
}

export interface IRoutesMap {
  auth: Router;
  dashboard: Router;
  devices: Router;
  sensors: Router;
  crops: Router;
  inventory: Router;
  equipment: Router;
  labor: Router;
  sales: Router;
  payment: Router;
  automation: Router;
  farm: Router;
  report: Router;
}

export type RouteModule = {
  path: string;
  router: Router;
};

export interface IAPIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface IErrorResponse {
  ok: false;
  error: string;
  code?: number;
  details?: any;
}

export interface IRouterConfig {
  prefix?: string;
  middleware?: RouteHandler[];
}

export type RequestParams = {
  [key: string]: string;
};

export interface RequestBody {
  [key: string]: any;
}

export interface RequestQuery {
  [key: string]: string | number | boolean | undefined;
}