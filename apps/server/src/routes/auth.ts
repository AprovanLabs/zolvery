import Router from '@koa/router';
import { LogContext } from '@/middleware/logger';
import { apiLogger } from '@/config/logger';
import { sendErrorResponse, sendSuccessResponse, validateAuth } from '@/utils/api';

const router = new Router();

// GET /auth/me - Get current user information
router.get('/me', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  
  try {
    const user = validateAuth(ctx);
    if (!user) {
      apiLogger.warn({
        requestId,
      }, 'No user found in auth context');
      return;
    }

    apiLogger.info({
      requestId,
      userId: user.userId,
    }, 'User info requested');

    sendSuccessResponse(ctx, 200, {
      userId: user.userId,
      username: user.username,
      groups: user.groups,
    }, 'User information retrieved successfully');
  } catch (error) {
    apiLogger.error({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get user information');
    
    sendErrorResponse(ctx, 500, 'Failed to retrieve user information');
  }
});

export { router as authRoutes };
