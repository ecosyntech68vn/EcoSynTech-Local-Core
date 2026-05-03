/**
 * Config Index Type Declaration
 */

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

declare const config: AppConfig;

export default config;