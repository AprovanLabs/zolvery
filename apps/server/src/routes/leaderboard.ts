import Router from '@koa/router';
import { format } from 'date-fns';
import { LeaderboardService } from '@/services/leaderboard-service';
import { SubmitScoreRequest } from '@/models/leaderboard';
import { ApiResponse } from '@/models';

const router = new Router();
const leaderboardService = new LeaderboardService();

// POST /api/leaderboard/score - Submit game score
router.post('/score', async (ctx) => {
  try {
    const scoreData = ctx.request.body as SubmitScoreRequest;

    if (!scoreData || !scoreData.appId || !scoreData.userId || typeof scoreData.score !== 'number') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required fields: appId, userId, score',
        timestamp: new Date().toISOString(),
      };
      return;
    }

    const score = await leaderboardService.submitScore(scoreData);
    
    const response: ApiResponse = {
      success: true,
      data: score,
      message: 'Score submitted successfully',
      timestamp: new Date().toISOString(),
    };
    
    ctx.status = 201;
    ctx.body = response;
  } catch (error) {
    console.error('Error submitting score:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to submit score',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /api/leaderboard/:appId/daily/:date - Daily leaderboard
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

// GET /api/leaderboard/:appId/global - Global leaderboard
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

// GET /api/leaderboard/:appId/user/:userId - User's scores over time
router.get('/:appId/user/:userId', async (ctx) => {
  try {
    const { appId, userId } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 50;
    
    if (!appId || !userId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, userId',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const scores = await leaderboardService.getUserScores(appId, userId, limit);
    
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
    console.error('Error fetching user scores:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Failed to fetch user scores',
      timestamp: new Date().toISOString(),
    };
  }
});

// GET /api/leaderboard/:appId/daily - Today's leaderboard (convenience endpoint)
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

// GET /api/leaderboard/:appId/user/:userId/rank/:date - Get user's rank for specific date
router.get('/:appId/user/:userId/rank/:date', async (ctx) => {
  try {
    const { appId, userId, date } = ctx.params;
    
    if (!appId || !userId || !date) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Missing required parameters: appId, userId, date',
        timestamp: new Date().toISOString(),
      };
      return;
    }
    
    const rank = await leaderboardService.getUserRank(appId, userId, date);
    
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
