import Router from '@koa/router';
import logger from '@/logger';
import { sendErrorResponse, sendSuccessResponse, validateAuth } from '@/utils/api';
import { AuthContext } from '@/auth';

const router = new Router();

// GET /auth/me - Get current user information
router.get('/me', async (ctx: AuthContext) => {
  const requestId = ctx.requestId;
  const user = ctx.user;
  
  try {
    logger.info({
      requestId,
      userId: user.userId,
    }, 'User info requested');

    sendSuccessResponse(ctx, 200, {
      userId: user.userId,
      username: user.username,
      groups: user.groups,
    }, 'User information retrieved successfully');
  } catch (error) {
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get user information');
    
    sendErrorResponse(ctx, 500, 'Failed to retrieve user information');
  }
});

export { router as authRoutes };
