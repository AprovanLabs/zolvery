import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { appConfig } from '@/config';
import logger from '@/logger';
import { requestLogger, errorLogger } from '@/middleware/logger';
import { telemetryMiddleware } from '@/middleware/telemetry';
import { buildApiRouter } from './api';

import type { LogContext } from '@/middleware/logger';
import { buildServices } from './services';

const app = new Koa<{}, LogContext>();
const router = new Router<{}, LogContext>();

// Log application startup
logger.info(
  {
    config: {
      nodeEnv: appConfig.nodeEnv,
      environment: appConfig.environment,
      port: appConfig.port,
      logLevel: appConfig.logLevel,
      corsOrigins: appConfig.cors.origin,
    },
  },
  'Starting Kossabos API',
);

// Error handling middleware (should be first)
app.use(errorLogger);

// Request logging middleware
app.use(requestLogger);

// Telemetry middleware to enhance spans with custom attributes
app.use(telemetryMiddleware());

// Configure CORS
app.use(
  cors({
    origin: (ctx) => {
      const origin = ctx.headers.origin;
      const allowedOrigin = appConfig.cors.origin.includes(origin || '')
        ? origin || ''
        : (appConfig.cors.origin[0] as string);

      logger.debug(
        {
          requestOrigin: origin,
          allowedOrigin,
          requestId: (ctx as any).requestId,
        },
        'CORS origin check',
      );

      return allowedOrigin;
    },
    credentials: appConfig.cors.credentials,
  }),
);

// Body parser middleware
app.use(
  bodyParser({
    enableTypes: ['json', 'form'],
    formLimit: '10mb',
    jsonLimit: '10mb',
    onerror: (err: Error, ctx: any) => {
      logger.error(err, { requestId: ctx.requestId }, 'Body parser error');
      throw err;
    },
  }),
);

// Health check endpoint
router.get('/about', (ctx) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: appConfig.environment,
    version: appConfig.version,
    aws: {
      region: appConfig.aws.region,
      endpoint: appConfig.aws.endpoint,
    },
    requestId: ctx.requestId,
  };

  logger.info(
    {
      requestId: (ctx as any).requestId,
      health: healthData,
    },
    'Health check requested',
  );

  ctx.body = healthData;
});

router.get('/status', (ctx) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: appConfig.environment,
    version: appConfig.version,
    requestId: ctx.requestId,
    ...(appConfig.environment === 'dev' && {
      config: {
        aws: appConfig.aws,
        logLevel: appConfig.logLevel,
        nodeEnv: appConfig.nodeEnv,
      },
    }),
  };

  logger.info(
    {
      requestId: (ctx as any).requestId,
      health: healthData,
    },
    'Health check requested',
  );

  ctx.body = healthData;
});

logger.info('Setting up API routes');

const services = buildServices();
router.use(
  '/api',
  buildApiRouter({ services }).routes(),
)

// Apply routes to app
app.use(router.routes());
app.use(router.allowedMethods());

// Error handling middleware
app.on('error', (err: Error, ctx?: any) => {
  logger.error(
    {
      requestId: ctx?.requestId,
      method: ctx?.method,
      path: ctx?.path,
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
      },
    },
    'Application error event',
  );

  if (ctx) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    };
  }
});

logger.info('Kossabos server initialized successfully');

export { app };
