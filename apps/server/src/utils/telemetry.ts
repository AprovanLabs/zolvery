import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Context } from 'koa';

// Get the tracer for our service
const tracer = trace.getTracer('kossabos-server', '1.0.0');

/**
 * Create a custom span for manual instrumentation
 */
export const createSpan = (name: string, options?: { 
  kind?: SpanKind; 
  attributes?: Record<string, string | number | boolean>;
}) => {
  const spanOptions: any = {
    kind: options?.kind || SpanKind.INTERNAL,
  };
  
  if (options?.attributes) {
    spanOptions.attributes = options.attributes;
  }
  
  return tracer.startSpan(name, spanOptions);
};

/**
 * Instrument an async function with a span
 */
export const instrumentAsync = async <T>(
  spanName: string,
  fn: () => Promise<T>,
  options?: { 
    kind?: SpanKind; 
    attributes?: Record<string, string | number | boolean>;
  }
): Promise<T> => {
  const span = createSpan(spanName, options);
  
  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Add custom attributes to the current span from Koa context
 */
export const addSpanAttributes = (ctx: Context, attributes: Record<string, string | number | boolean>) => {
  const span = trace.getActiveSpan();
  if (span) {
    // Add context-specific attributes
    span.setAttributes({
      'http.route': ctx.routerPath || ctx.path,
      'user.id': ctx.state?.user?.userId || 'anonymous',
      'app.request_id': (ctx as any).requestId || 'unknown',
      ...attributes,
    });
  }
};

/**
 * Create a child span within a Koa context
 */
export const createChildSpan = (ctx: Context, spanName: string, fn: () => Promise<any>) => {
  return instrumentAsync(spanName, fn, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'http.method': ctx.method,
      'http.route': ctx.routerPath || ctx.path,
      'user.id': ctx.state?.user?.userId || 'anonymous',
    },
  });
};
