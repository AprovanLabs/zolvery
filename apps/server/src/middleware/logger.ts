import { Context, Next } from 'koa';
import { apiLogger, generateRequestId, createTimer } from '@/config/logger';

export interface LogContext extends Context {
  requestId: string;
  startTime: number;
}

/**
 * Request logging middleware that logs incoming requests and responses
 */
export const requestLogger = async (ctx: LogContext, next: Next): Promise<void> => {
  // Generate unique request ID
  ctx.requestId = generateRequestId();
  ctx.startTime = Date.now();

  // Create timer for request duration
  const timer = createTimer();

  // Log incoming request
  apiLogger.info({
    requestId: ctx.requestId,
    method: ctx.method,
    url: ctx.url,
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
    apiLogger.info({
      requestId: ctx.requestId,
      method: ctx.method,
      url: ctx.url,
      status: ctx.status,
      duration: `${duration.toFixed(2)}ms`,
      responseLength: ctx.length,
    }, 'Request completed');

  } catch (error) {
    // Calculate request duration for error case
    const duration = timer();

    // Log error response
    apiLogger.error({
      requestId: ctx.requestId,
      method: ctx.method,
      url: ctx.url,
      status: ctx.status || 500,
      duration: `${duration.toFixed(2)}ms`,
      err: {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Error',
        stack: error instanceof Error ? error.stack : undefined,
      },
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
    
    // Set error response
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
    };

    // Log the error with context
    apiLogger.error({
      requestId: ctx.requestId,
      method: ctx.method,
      url: ctx.url,
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
      },
      body: ctx.request.body,
      query: ctx.query,
      headers: ctx.headers,
    }, 'Unhandled error in request');

    // Don't re-throw as we've handled the error
  }
};
