/**
 * Logger Type Declaration
 */

export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  verbose(message: string, meta?: any): void;
  silly(message: string, meta?: any): void;
}

declare const logger: ILogger;

export default logger;