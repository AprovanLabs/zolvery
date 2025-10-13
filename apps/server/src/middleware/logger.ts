import { Context, Next } from 'koa';
import logger, { generateRequestId, createTimer, setRequestContext } from '@/config/logger';

export interface LogContext extends Context {
  requestId: string;
  startTime: number;
}

/**
 * Request logging middleware that logs incoming requests and responses
 */
export const requestLogger = async (ctx: LogContext, next: Next): Promise<void> => {
  const requestId =
    (ctx.headers['x-request-id'] as string) || ctx.get('X-Request-ID') || generateRequestId();
  const userId = ctx.headers['x-user-id'] as string;
  const appId = ctx.headers['x-app-id'] as string;

  // Generate unique request ID
  ctx.requestId = requestId;
  ctx.startTime = Date.now();

  // Create timer for request duration
  const timer = createTimer();

  setRequestContext({
    ...(requestId && { requestId }),
    ...(userId && { userId }),
    ...(appId && { appId }),
    path: ctx.path,
    method: ctx.method,
  });

  // Log incoming request
  logger.info({
    userAgent: ctx.headers['user-agent'],
    contentType: ctx.headers['content-type'],
    contentLength: ctx.headers['content-length'],
    ip: ctx.ip,
    query: ctx.query,
  }, 'Incoming request');

  try {
    await next();

    // Calculate request duration
    const duration = timer();

    // Log successful response
    logger.info({
      status: ctx.status,
      duration: `${duration.toFixed(2)}ms`,
      responseLength: ctx.length,
    }, 'Request completed');

  } catch (error) {
    // Calculate request duration for error case
    const duration = timer();

    // Log error response
    logger.error(error, {
      status: ctx.status || 500,
      duration: `${duration.toFixed(2)}ms`,
    }, 'Request failed');

    // Re-throw the error to be handled by other middleware
    throw error;
  }
};

/**
 * Error logging middleware that catches and logs all unhandled errors
 */
export const errorLogger = async (ctx: LogContext, next: Next): Promise<void> => {
  try {
    await next();
  } catch (error) {
    const err = error as Error;

    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    };

    logger.error(err, {
      body: ctx.request.body,
      query: ctx.query,
      headers: ctx.headers,
    }, 'Unhandled error in request');
  }
};
