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
  'Starting Zolvery API',
);

app.use(errorLogger);
app.use(requestLogger);
app.use(telemetryMiddleware());

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
          requestId: (ctx as unknown as { requestId?: string }).requestId,
        },
        'CORS origin check',
      );

      return allowedOrigin;
    },
    credentials: appConfig.cors.credentials,
  }),
);

app.use(
  bodyParser({
    enableTypes: ['json', 'form'],
    formLimit: '10mb',
    jsonLimit: '10mb',
    onerror: (err: Error, ctx: unknown) => {
      const logCtx = ctx as {
        requestId?: string;
        method?: string;
        path?: string;
      };
      logger.error(err, { requestId: logCtx.requestId }, 'Body parser error');
      throw err;
    },
  }),
);

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
router.use('/api', buildApiRouter({ services }).routes());

app.use(router.routes());
app.use(router.allowedMethods());

app.on('error', (err: Error, ctx?: unknown) => {
  const logCtx = ctx as
    | { requestId?: string; method?: string; path?: string }
    | undefined;
  logger.error(
    {
      requestId: logCtx?.requestId,
      method: logCtx?.method,
      path: logCtx?.path,
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
      },
    },
    'Application error event',
  );

  if (logCtx) {
    (logCtx as { status?: number }).status = 500;
    (logCtx as { body?: unknown }).body = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: logCtx.requestId,
    };
  }
});

logger.info('Zolvery server initialized successfully');

export { app };
