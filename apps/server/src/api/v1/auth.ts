import Router from '@koa/router';
import { logger } from '@/logger';
import { authMiddleware } from '@/middleware/auth';
import { AuthContext } from '@/auth';
import { sendErrorResponse, sendSuccessResponse } from '../responses';

const router = new Router();

router.use(authMiddleware);

// GET /auth/me - Get current user information
router.get('/me', async (ctx: AuthContext) => {
  try {
    const user = ctx.user;
    logger.info('User info requested');
    sendSuccessResponse(
      ctx,
      200,
      {
        userId: user.userId,
        username: user.username,
        groups: user.groups,
      },
      'User information retrieved successfully',
    );
  } catch (error) {
    logger.error(error, 'Failed to get user information');
    sendErrorResponse(ctx, 500, 'Failed to retrieve user information');
  }
});

export { router };
