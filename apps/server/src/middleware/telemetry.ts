import { Context, Next } from 'koa';
import { addSpanAttributes } from '@/utils/telemetry';

/**
 * Middleware to enhance OpenTelemetry spans with custom attributes
 */
export const telemetryMiddleware = () => {
  return async (ctx: Context, next: Next) => {
    // Add custom attributes at the start of the request
    addSpanAttributes(ctx, {
      'app.environment': process.env.ENVIRONMENT || 'unknown',
      'app.version': process.env.npm_package_version || 'unknown',
      'http.user_agent': ctx.headers['user-agent'] || 'unknown',
      'http.content_length': ctx.headers['content-length'] || '0',
    });

    try {
      await next();
      
      // Add response attributes
      addSpanAttributes(ctx, {
        'http.status_code': ctx.status,
        'http.response_size': ctx.length?.toString() || '0',
      });
    } catch (error) {
      // Add error attributes
      addSpanAttributes(ctx, {
        'error.name': error instanceof Error ? error.name : 'Unknown',
        'error.message': error instanceof Error ? error.message : 'Unknown error',
        'http.status_code': ctx.status || 500,
      });
      
      throw error;
    }
  };
};
