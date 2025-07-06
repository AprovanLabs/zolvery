import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { appConfig } from '@/config';
import { logger, apiLogger } from '@/config/logger';
import { requestLogger, errorLogger } from '@/middleware/logger';
import { authMiddleware } from '@/middleware/auth';
import { leaderboardRoutes } from './routes/leaderboard';
import { eventRoutes } from './routes/events';
import { appDataRoutes } from './routes/app-data';
import { i18nRoutes } from './routes/i18n';
import { authRoutes } from './routes/auth';
import { getCurrentDay } from './utils/date';

const app = new Koa();
const router = new Router();

// Log application startup
logger.info({
  config: {
    nodeEnv: appConfig.nodeEnv,
    environment: appConfig.environment,
    port: appConfig.port,
    logLevel: appConfig.logLevel,
    corsOrigins: appConfig.cors.origin,
  }
}, 'Starting Kossabos API');

// Error handling middleware (should be first)
app.use(errorLogger);

// Request logging middleware
app.use(requestLogger);

// Configure CORS
app.use(cors({
  origin: (ctx) => {
    const origin = ctx.headers.origin;
    const allowedOrigin = appConfig.cors.origin.includes(origin || '') ? origin || '' : appConfig.cors.origin[0] as string;
    
    apiLogger.debug({
      requestOrigin: origin,
      allowedOrigin,
      requestId: (ctx as any).requestId,
    }, 'CORS origin check');
    
    return allowedOrigin;
  },
  credentials: appConfig.cors.credentials,
}));

// Body parser middleware
app.use(bodyParser({
  enableTypes: ['json', 'form'],
  formLimit: '10mb',
  jsonLimit: '10mb',
  onerror: (err: Error, ctx: any) => {
    apiLogger.error({
      requestId: ctx.requestId,
      err: {
        message: err.message,
        name: err.name,
      },
    }, 'Body parser error');
    throw err;
  },
}));

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
    day: getCurrentDay()
  };
  
  apiLogger.info({
    requestId: (ctx as any).requestId,
    health: healthData,
  }, 'Health check requested');
  
  ctx.body = healthData;
});

router.get('/status', (ctx) => {
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
    day: getCurrentDay()
  };
  
  apiLogger.info({
    requestId: (ctx as any).requestId,
    health: healthData,
  }, 'Health check requested');
  
  ctx.body = healthData;
});

// Protected API routes
apiLogger.info('Setting up API routes');
router.use('/v1/protected/auth', authMiddleware, authRoutes.routes());
router.use('/v1/protected/events', authMiddleware, eventRoutes.routes());
router.use('/v1/protected/leaderboard', authMiddleware, leaderboardRoutes.routes());
router.use('/v1/protected/app-data', authMiddleware, appDataRoutes.routes());
router.use('/v1/protected/i18n', authMiddleware, i18nRoutes.routes());

// Apply routes to app
app.use(router.routes());
app.use(router.allowedMethods());

// Error handling middleware
app.on('error', (err: Error, ctx?: any) => {
  logger.error({
    requestId: ctx?.requestId,
    method: ctx?.method,
    url: ctx?.url,
    err: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
  }, 'Application error event');
  
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
