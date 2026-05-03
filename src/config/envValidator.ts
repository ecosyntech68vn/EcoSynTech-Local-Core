import logger from './logger';
import fs from 'fs';
import path from 'path';

export const REQUIRED_ENV_VARS = ['NODE_ENV'];

export const RECOMMENDED_ENV_VARS = [
  'JWT_SECRET',
  'DB_PATH'
];

export const PRODUCTION_REQUIRED = ['JWT_SECRET'];

const warnings: string[] = [];
const errors: string[] = [];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
  isProduction: boolean;
}

export function validateEnv(): ValidationResult {
  errors.length = 0;
  warnings.length = 0;
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required env: ${varName}`);
    }
  });
  
  if (isProduction) {
    PRODUCTION_REQUIRED.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Production requires ${varName}`);
      }
    });
  }
  
  RECOMMENDED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Recommended but not set: ${varName}`);
    }
  });
  
  if (!process.env.JWT_SECRET && !isProduction) {
    warnings.push('JWT_SECRET not set - using temporary secret for dev');
  }
  
  if (!process.env.LOG_LEVEL) {
    warnings.push('LOG_LEVEL not set - using default');
  }
  
  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    warnings.push(`Database directory does not exist: ${dbDir}`);
  }
  
  if (errors.length > 0) {
    errors.forEach(e => logger.error('[Config] ' + e));
  }
  
  if (warnings.length > 0) {
    warnings.forEach(w => logger.warn('[Config] ' + w));
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment: nodeEnv,
    isProduction
  };
}

export interface ConfigSummary {
  nodeEnv: string;
  port: string | number;
  dbPath: string;
  logLevel: string;
  jwtSecretSet: boolean;
  corsEnabled: boolean;
  wsEnabled: boolean;
  backupEnabled: boolean;
  telegramEnabled: boolean;
}

export function getConfigSummary(): ConfigSummary {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    dbPath: process.env.DB_PATH || './data/ecosyntech.db',
    logLevel: process.env.LOG_LEVEL || 'info',
    jwtSecretSet: !!process.env.JWT_SECRET,
    corsEnabled: !!process.env.CORS_ORIGIN,
    wsEnabled: process.env.WEBSOCKET_ENABLED !== 'false',
    backupEnabled: process.env.AUTO_BACKUP_ENABLED === 'true',
    telegramEnabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  };
}

export function checkRequiredStartup(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET required in production');
    process.exit(1);
  }
  
  validateEnv();
  
  logger.info('[Config] Environment validated');
}

export default {
  validateEnv,
  getConfigSummary,
  checkRequiredStartup,
  REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS,
  PRODUCTION_REQUIRED
};