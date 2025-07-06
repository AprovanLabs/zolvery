import Router from '@koa/router';
import { format } from 'date-fns';
import { LeaderboardService } from '@/services/leaderboard-service';
import { SubmitScoreRequest } from '@/models/leaderboard';
import { ApiResponse } from '@/models';
import { leaderboardLogger, logError, logSuccess } from '@/config/logger';
import { AuthContext } from '@/middleware/auth';
import { LogContext } from '@/middleware/logger';

const router = new Router();
const leaderboardService = new LeaderboardService();

// POST /leaderboard/score - Submit game score
router.post('/score', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const scoreData = ctx.request.body as SubmitScoreRequest;

    if (!authCtx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    leaderboardLogger.info({
      requestId,
      scoreData: {
        appId: scoreData?.appId,
        userId: authCtx.user.sub,
        score: scoreData?.score,
        username: scoreData?.username,
      },
    }, 'Submitting new score');

    if (!scoreData || !scoreData.appId || typeof scoreData.score !== 'number') {
      leaderboardLogger.warn({
        requestId,
        receivedData: scoreData,
      }, 'Invalid score data received');
      
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required fields: appId, score',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const score = await leaderboardService.submitScore(
      authCtx.user.userId,
      authCtx.user.username,
      scoreData,
    );
    
    logSuccess(leaderboardLogger, 'Score submitted successfully', {
      requestId,
      appId: score.appId,
      userId: score.userId,
      score: score.score,
      rank: score.rank,
    });
    
    const response: ApiResponse = {
      success: true,
      data: score,
      message: 'Score submitted successfully',
      timestamp: new Date().toISOString(),
    };
    
    ctx.status = 201;
    ctx.body = response;
  } catch (error) {
    logError(leaderboardLogger, error as Error, {
      requestId,
      scoreData: ctx.request.body,
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to submit score',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

// GET /leaderboard/:appId/daily/:date - Daily leaderboard
router.get('/:appId/daily/:date', async (ctx) => {
  try {
    const { appId, date } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    if (!appId || !date) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, date',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const leaderboard = await leaderboardService.getDailyLeaderboard(appId, date, limit);
    
    const response: ApiResponse = {
      success: true,
      data: {
        leaderboard,
        date,
        appId,
        count: leaderboard.length,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch daily leaderboard',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /leaderboard/:appId/global - Global leaderboard
router.get('/:appId/global', async (ctx) => {
  try {
    const { appId } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    if (!appId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameter: appId',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const leaderboard = await leaderboardService.getGlobalLeaderboard(appId, limit);
    
    const response: ApiResponse = {
      success: true,
      data: {
        leaderboard,
        appId,
        type: 'global',
        count: leaderboard.length,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching global leaderboard:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch global leaderboard',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /leaderboard/:appId/user - Authenticated user's scores over time
router.get('/:appId/user', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const { appId } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 50;
    
    if (!authCtx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const userId = authCtx.user.sub;
    
    if (!appId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }
    
    const scores = await leaderboardService.getUserScores(appId, userId, limit);
    
    logSuccess(leaderboardLogger, 'User scores retrieved successfully', {
      requestId,
      appId,
      userId,
      scoreCount: scores.length,
    });
    
    const response: ApiResponse = {
      success: true,
      data: {
        scores,
        appId,
        userId,
        count: scores.length,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    logError(leaderboardLogger, error as Error, {
      requestId,
      appId: ctx.params.appId,
    });
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch user scores',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
});

// GET /leaderboard/:appId/daily - Today's leaderboard (convenience endpoint)
router.get('/:appId/daily', async (ctx) => {
  try {
    const { appId } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    if (!appId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameter: appId',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const leaderboard = await leaderboardService.getDailyLeaderboard(appId, today, limit);
    
    const response: ApiResponse = {
      success: true,
      data: {
        leaderboard,
        date: today,
        appId,
        count: leaderboard.length,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching today\'s leaderboard:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch today\'s leaderboard',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /leaderboard/:appId/user/rank/:date - Get authenticated user's rank for specific date
router.get('/:appId/user/rank/:date', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  const authCtx = ctx as AuthContext;
  
  try {
    const { appId, date } = ctx.params;
    
    if (!authCtx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'User not authenticated',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const userId = authCtx.user.sub;
    
    if (!appId || !date) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, date',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }
    
    const rank = await leaderboardService.getUserRank(appId, userId, date);
    
    logSuccess(leaderboardLogger, 'User rank retrieved successfully', {
      requestId,
      appId,
      userId,
      date,
      rank,
    });
    
    const response: ApiResponse = {
      success: true,
      data: {
        rank,
        appId,
        userId,
        date,
      },
      timestamp: new Date().toISOString(),
    };
    
    ctx.body = response;
  } catch (error) {
    console.error('Error fetching user rank:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch user rank',
      timestamp: new Date().toISOString(),
    };
  }
});

export { router as leaderboardRoutes };
