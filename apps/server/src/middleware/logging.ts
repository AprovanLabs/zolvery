import { Context, Next } from 'koa';
import { logRequestStart, logRequestEnd, createTimer, setRequestContext } from '@/config/logger';

/**
 * Request logging middleware that automatically injects request context
 */
export const requestLoggingMiddleware = async (ctx: Context, next: Next) => {
  const timer = createTimer();
  
  // Extract user and app info from headers or query params
  const userId = ctx.headers['x-user-id'] as string || ctx.query.userId as string;
  const appId = ctx.headers['x-app-id'] as string || ctx.query.appId as string;
  
  // Start request logging and set context
  const requestId = logRequestStart(ctx.method, ctx.path, userId, appId);
  
  // Set additional context in headers for downstream services
  ctx.set('X-Request-ID', requestId);
  
  try {
    await next();
  } catch (error) {
    // Error will be handled by error middleware, but we ensure context is maintained
    throw error;
  } finally {
    // Log request completion
    const duration = timer();
    logRequestEnd(ctx.status, duration, {
      responseSize: ctx.length,
      userAgent: ctx.headers['user-agent'],
    });
  }
};

/**
 * Middleware to extract and set request context from headers
 */
export const contextMiddleware = async (ctx: Context, next: Next) => {
  const requestId = ctx.headers['x-request-id'] as string || ctx.get('X-Request-ID');
  const userId = ctx.headers['x-user-id'] as string;
  const appId = ctx.headers['x-app-id'] as string;
  
  if (requestId || userId || appId) {
    setRequestContext({
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(appId && { appId }),
      path: ctx.path,
      method: ctx.method,
    });
  }
  
  await next();
};
