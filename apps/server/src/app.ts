import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { appConfig } from '@/config';
import { leaderboardRoutes } from './routes/leaderboard';
import { eventRoutes } from './routes/events';
import { appDataRoutes } from './routes/app-data';
import { i18nRoutes } from './routes/i18n';

const app = new Koa();
const router = new Router();

// Configure CORS
app.use(cors({
  origin: (ctx) => {
    const origin = ctx.headers.origin;
    return appConfig.cors.origin.includes(origin || '') ? origin || '' : appConfig.cors.origin[0];
  },
  credentials: appConfig.cors.credentials,
}));

// Body parser middleware
app.use(bodyParser({
  enableTypes: ['json', 'form'],
  formLimit: '10mb',
  jsonLimit: '10mb',
}));

// Health check endpoint
router.get('/health', (ctx) => {
  ctx.body = { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: appConfig.nodeEnv,
  };
});

// Protected API routes
router.use('/v1/protected/events', eventRoutes.routes());
router.use('/v1/protected/leaderboard', leaderboardRoutes.routes());
router.use('/v1/protected/app-data', appDataRoutes.routes());
router.use('/v1/protected/i18n', i18nRoutes.routes());

// Apply routes to app
app.use(router.routes());
app.use(router.allowedMethods());

// Error handling middleware
app.on('error', (err, ctx) => {
  console.error('Server error:', err);
  if (ctx) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    };
  }
});

export { app };
