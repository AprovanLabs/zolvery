const pino = require('pino');
import { appConfig } from './index';
import { v7 as uuid } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { initTelemetry } from './telemetry';

initTelemetry();

// Store for request context
interface RequestContext {
  requestId: string;
  userId?: string;
  appId?: string;
  path?: string;
  method?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

const isDevelopment = process.env.environment === 'dev';

// Create logger configuration with transports
const createLogger = () => {
  const targets = [];
  
  // Always add pretty console transport
  targets.push({
    target: 'pino-pretty',
    level: 'debug',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname,traceId,spanId,traceFlags',
      singleLine: true,
    },
  });

  // Only add OTEL transport in production and if endpoint is configured
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!isDevelopment && otlpEndpoint) {
    console.log('Adding OpenTelemetry log transport for production');
    targets.push({
      target: 'pino-opentelemetry-transport',
      level: 'info',
      options: {
        resourceAttributes: {
          'service.name': 'kossabos-server',
          'service.version': appConfig.version,
          'environment': appConfig.environment,
        },
      },
    });
  } else if (isDevelopment) {
    console.log('OpenTelemetry log transport disabled in development mode');
  }

  const loggerOptions = {
    level: appConfig.logLevel,
    base: {
      hostname: process.env.HOSTNAME || 'unknown',
      environment: appConfig.environment,
      version: appConfig.version,
    },
    // Automatically inject request context
    mixin: () => {
      const context = requestContextStore.getStore();
      return context
        ? {
            requestId: context.requestId,
            ...(context.userId && { userId: context.userId }),
            ...(context.appId && { appId: context.appId }),
            ...(context.path && { requestPath: context.path }),
            ...(context.method && { method: context.method }),
          }
        : {};
    },
    transport: {
      targets,
    },
  };

  return pino(loggerOptions);
};

export const logger = createLogger();

// Request ID generator for tracing
export const generateRequestId = (): string => uuid();

/**
 * Set request context for the current async operation
 */
export const setRequestContext = (context: Partial<RequestContext>): void => {
  const currentContext = requestContextStore.getStore();
  const newContext: RequestContext = {
    requestId:
      context.requestId || currentContext?.requestId || generateRequestId(),
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

// Request timing helper
export const createTimer = () => {
  const start = process.hrtime.bigint();
  return () => {
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };
};

export default logger;
