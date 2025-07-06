import pino from 'pino';
import { appConfig } from './index';
import { v7 as uuid } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Store for request context
interface RequestContext {
  requestId: string;
  userId?: string;
  appId?: string;
  path?: string;
  method?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

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
  // Automatically inject request context
  mixin: () => {
    const context = requestContextStore.getStore();
    return context ? {
      requestId: context.requestId,
      ...(context.userId && { userId: context.userId }),
      ...(context.appId && { appId: context.appId }),
      ...(context.path && { requestPath: context.path }),
      ...(context.method && { method: context.method }),
    } : {};
  },
};

const baseLogger = pino(loggerConfig);

export const getLogger = (name?: string): pino.Logger => name ? baseLogger.child({ name }) : baseLogger;
export const createModuleLogger = (module: string) => baseLogger.child({ module });

export const logger = baseLogger;

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

/**
 * Set request context for the current async operation
 */
export const setRequestContext = (context: Partial<RequestContext>): void => {
  const currentContext = requestContextStore.getStore();
  const newContext: RequestContext = {
    requestId: context.requestId || currentContext?.requestId || generateRequestId(),
    ...currentContext,
    ...context,
  };
  requestContextStore.enterWith(newContext);
};

/**
 * Get current request context
 */
export const getRequestContext = (): RequestContext | undefined => {
  return requestContextStore.getStore();
};

/**
 * Enhanced error logging helper with automatic context injection
 */
export const logError = (logger: pino.Logger, error: Error, context?: Record<string, any>) => {
  const requestContext = getRequestContext();
  
  logger.error({
    err: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    ...context,
    ...(requestContext && {
      errorContext: {
        requestId: requestContext.requestId,
        userId: requestContext.userId,
        appId: requestContext.appId,
        path: requestContext.path,
        method: requestContext.method,
      }
    }),
  }, `Error occurred: ${error.message}`);
};

/**
 * Enhanced success response logging helper
 */
export const logSuccess = (logger: pino.Logger, message: string, context?: Record<string, any>) => {
  logger.info({
    ...context,
  }, message);
};

/**
 * Log request start
 */
export const logRequestStart = (method: string, path: string, userId?: string, appId?: string) => {
  const requestId = generateRequestId();
  
  setRequestContext({
    requestId,
    ...(userId && { userId }),
    ...(appId && { appId }),
    path,
    method,
  });
  
  apiLogger.info({
    method,
    path,
    userId,
    appId,
  }, 'Request started');
  
  return requestId;
};

/**
 * Log request end
 */
export const logRequestEnd = (statusCode: number, duration: number, context?: Record<string, any>) => {
  apiLogger.info({
    statusCode,
    duration,
    ...context,
  }, `Request completed - ${statusCode} (${duration}ms)`);
};

// Request timing helper
export const createTimer = () => {
  const start = process.hrtime.bigint();
  return () => {
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };
};
