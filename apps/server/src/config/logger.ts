import pino from 'pino';
import { appConfig } from './index';
import { v7 as uuid } from 'uuid';

const isDevelopment = appConfig.environment === 'dev';

// Create logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: appConfig.logLevel,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Use pretty printing in development
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    },
  }),
  // Add base fields for all logs
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    service: 'api',
    environment: appConfig.environment,
    version: appConfig.version,
  },
};

// Create the logger instance
export const logger = pino(loggerConfig);

// Create child loggers for different modules
export const createModuleLogger = (module: string) => logger.child({ module });

// Specific loggers for different parts of the application
export const apiLogger = createModuleLogger('api');
export const dbLogger = createModuleLogger('database');
export const authLogger = createModuleLogger('auth');
export const eventLogger = createModuleLogger('events');
export const leaderboardLogger = createModuleLogger('leaderboard');
export const appDataLogger = createModuleLogger('app-data');
export const i18nLogger = createModuleLogger('i18n');

// Request ID generator for tracing
export const generateRequestId = (): string => uuid();

// Error logging helper
export const logError = (logger: pino.Logger, error: Error, context?: Record<string, any>) => {
  logger.error({
    err: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    ...context,
  }, 'Error occurred');
};

// Success response logging helper
export const logSuccess = (logger: pino.Logger, message: string, context?: Record<string, any>) => {
  logger.info({
    ...context,
  }, message);
};

// Request timing helper
export const createTimer = () => {
  const start = process.hrtime.bigint();
  return () => {
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };
};
