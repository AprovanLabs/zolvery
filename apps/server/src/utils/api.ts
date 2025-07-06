import { Context } from 'koa';
import { AuthContext } from '@/middleware/auth';
import { LogContext } from '@/middleware/logger';

// Types for API responses
export interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  message?: string;
}

// Helper functions for standardized responses
export const createErrorResponse = (message: string, requestId?: string): ErrorResponse => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
  ...(requestId && { requestId }),
});

export const createSuccessResponse = <T>(data: T, message?: string): SuccessResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
  ...(message && { message }),
});

export const sendErrorResponse = (ctx: Context, status: number, message: string): void => {
  const requestId = (ctx as LogContext).requestId;
  ctx.status = status;
  ctx.body = createErrorResponse(message, requestId);
};

export const sendSuccessResponse = <T>(ctx: Context, status: number, data: T, message?: string): void => {
  ctx.status = status;
  ctx.body = createSuccessResponse(data, message);
};

export const validateAuth = (ctx: Context): AuthContext['user'] | null => {
  const authCtx = ctx as AuthContext;
  if (!authCtx.user) {
    sendErrorResponse(ctx, 401, 'User not authenticated');
    return null;
  }
  return authCtx.user;
};
