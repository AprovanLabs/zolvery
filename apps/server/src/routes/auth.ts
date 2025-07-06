import Router from '@koa/router';
import { AuthContext } from '@/middleware/auth';
import { LogContext } from '@/middleware/logger';
import { ApiResponse } from '@/models';
import { apiLogger } from '@/config/logger';

const router = new Router();

// GET /auth/me - Get current user information
router.get('/me', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    if (!authCtx.user) {
      apiLogger.warn({
        requestId,
      }, 'No user found in auth context');
      
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    apiLogger.info({
      requestId,
      userId: authCtx.user.userId,
    }, 'User info requested');

    const response: ApiResponse = {
      success: true,
      data: {
        userId: authCtx.user.userId,
        username: authCtx.user.username,
        groups: authCtx.user.groups,
      },
      message: 'User information retrieved successfully',
      timestamp: new Date().toISOString(),
    };

    ctx.status = 200;
    ctx.body = response;
  } catch (error) {
    apiLogger.error({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get user information');
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to retrieve user information',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

export { router as authRoutes };
