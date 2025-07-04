import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { leaderboardRoutes } from './routes/leaderboard';
import { userStatusRoutes } from './routes/user-status';
import { eventRoutes } from './routes/events';

const app = new Koa();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());

// Health check endpoint
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
router.use('/api/leaderboard', leaderboardRoutes.routes());
router.use('/api/user-status', userStatusRoutes.routes());
router.use('/api/events', eventRoutes.routes());

app.use(router.routes());
app.use(router.allowedMethods());

export { app };
