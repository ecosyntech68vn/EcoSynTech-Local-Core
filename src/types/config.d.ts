/**
 * Config Layer Type Definitions
 * Phase 1: TypeScript Migration
 */

declare module '../config/logger' {
  export interface ILogger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    verbose(message: string, meta?: any): void;
    silly(message: string, meta?: any): void;
  }

  const logger: ILogger;
  export default logger;
}

declare module '../config/index' {
  export interface AppConfig {
    port: number;
    env: string;
    logLevel: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    db: {
      filename: string;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
  }

  const config: AppConfig;
  export default config;
}

declare module '../config/features' {
  export interface FeaturesConfig {
    enableRedis: boolean;
    enableWebSocket: boolean;
    enableMQTT: boolean;
    enableAI: boolean;
    enablePayment: boolean;
    enableNotification: boolean;
  }

  const features: FeaturesConfig;
  export default features;
}

declare module '../config/database' {
  export interface DatabaseConfig {
    filename: string;
    mode: number;
  }

  const dbConfig: DatabaseConfig;
  export default dbConfig;
}