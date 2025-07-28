import Router from '@koa/router';
import { format } from 'date-fns';
import { LeaderboardService } from '@/services/leaderboard-service';
import { VotingService } from '@/services/voting-service';
import { ValidationService } from '@/services/validation-service';
import { SubmitScoreRequest } from '@/models/leaderboard';
import { leaderboardLogger, logError, logSuccess } from '@/config/logger';
import { LogContext } from '@/middleware/logger';
import { sendErrorResponse, sendSuccessResponse, validateAuth } from '@/utils/api';

const router = new Router();
const leaderboardService = new LeaderboardService();
const votingService = new VotingService();
const validationService = new ValidationService();

// POST /leaderboard/:appId/score - Submit game score
router.post('/:appId/score', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  
  try {
    const { appId } = ctx.params;
    const scoreData = ctx.request.body as any;

    if (!appId || !scoreData || scoreData.score === undefined) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, score');
      return;
    }

    const user = validateAuth(ctx);
    if (!user) return;

    leaderboardLogger.info({
      requestId,
      userId: user.userId,
      appId,
      scoreData: {
        score: scoreData?.score,
        hasValidationData: !!scoreData?.validationData,
        hasVotes: !!scoreData?.votes,
      },
    }, 'Submitting new score');

    const score = await leaderboardService.submitScore(
      appId,
      user.userId,
      user.username,
      scoreData as SubmitScoreRequest,
    );
    
    logSuccess(leaderboardLogger, 'Score submitted successfully', {
      requestId,
      appId: score.appId,
      userId: score.userId,
      score: score.score,
      rank: score.rank,
    });
    
    sendSuccessResponse(ctx, 201, score, 'Score submitted successfully');
  } catch (error) {
    logError(leaderboardLogger, error as Error, {
      requestId,
      scoreData: ctx.request.body,
    });
    
    sendErrorResponse(ctx, 500, 'Failed to submit score');
  }
});

// GET /leaderboard/:appId/daily/:day - Daily leaderboard
router.get('/:appId/daily/:day', async (ctx) => {
  try {
    const { appId, day } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }
    
    const leaderboard = await leaderboardService.getDailyLeaderboard(appId, day, limit);
    
    sendSuccessResponse(ctx, 200, {
      leaderboard,
      day,
      appId,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch daily leaderboard');
  }
});

// GET /leaderboard/:appId/global - Global leaderboard
router.get('/:appId/global/:day', async (ctx) => {
  try {
    const { appId, day } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;

    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }
    
    const leaderboard = await leaderboardService.getGlobalLeaderboard(appId, limit);
    
    sendSuccessResponse(ctx, 200, {
      leaderboard,
      appId,
      type: 'global',
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Error fetching global leaderboard:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch global leaderboard');
  }
});

// GET /leaderboard/:appId/user - Authenticated user's scores over time
router.get('/:appId/user', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  
  try {
    const { appId } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 50;
    
    const user = validateAuth(ctx);
    if (!user) return;

    const userId = user.userId;
    
    if (!appId) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId');
      return;
    }
    
    const scores = await leaderboardService.getUserScores(appId, userId, limit);
    
    logSuccess(leaderboardLogger, 'User scores retrieved successfully', {
      requestId,
      appId,
      userId,
      scoreCount: scores.length,
    });
    
    sendSuccessResponse(ctx, 200, {
      scores,
      appId,
      userId,
      count: scores.length,
    });
  } catch (error) {
    logError(leaderboardLogger, error as Error, {
      requestId,
      appId: ctx.params.appId,
    });
    sendErrorResponse(ctx, 500, 'Failed to fetch user scores');
  }
});

// GET /leaderboard/:appId/daily - Today's leaderboard (convenience endpoint)
router.get('/:appId/daily', async (ctx) => {
  try {
    const { appId } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    if (!appId) {
      sendErrorResponse(ctx, 400, 'Missing required parameter: appId');
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const leaderboard = await leaderboardService.getDailyLeaderboard(appId, today, limit);
    
    sendSuccessResponse(ctx, 200, {
      leaderboard,
      date: today,
      appId,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error('Error fetching today\'s leaderboard:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch today\'s leaderboard');
  }
});

// GET /leaderboard/:appId/user/rank/:date - Get authenticated user's rank for specific date
router.get('/:appId/user/rank/:date', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  
  try {
    const { appId, date } = ctx.params;
    
    const user = validateAuth(ctx);
    if (!user) return;

    const userId = user.userId;
    
    if (!appId || !date) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, date');
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
    
    sendSuccessResponse(ctx, 200, {
      rank,
      appId,
      userId,
      date,
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch user rank');
  }
});

// Note: Voting is now handled as part of score submission
// Votes must be submitted in batch with the score, not separately

// GET /leaderboard/:appId/vote-aggregates/:day - Get vote aggregates for a day
router.get('/:appId/vote-aggregates/:day', async (ctx: LogContext) => {
  try {
    const { appId, day } = ctx.params;
    const limit = parseInt(ctx.query.limit as string) || 100;
    
    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }

    const aggregates = await votingService.getVoteAggregatesForDay(appId, day, limit);
    
    sendSuccessResponse(ctx, 200, {
      aggregates,
      appId,
      day,
      count: aggregates.length,
    }, 'Vote aggregates retrieved successfully');
  } catch (error) {
    console.error('Error fetching vote aggregates:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch vote aggregates');
  }
});

// POST /leaderboard/:appId/validation/:day - Set daily validation value (admin only)
router.post('/:appId/validation/:day', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  
  try {
    const { appId, day } = ctx.params;
    const { validationValue } = ctx.request.body as any;

    if (!appId || !day || !validationValue) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day, validationValue');
      return;
    }

    const user = validateAuth(ctx);
    if (!user) return;

    // TODO: Add admin role validation here
    // For now, any authenticated user can set validation values

    await validationService.setDailyValidationValue(appId, day, validationValue);
    
    logSuccess(leaderboardLogger, 'Daily validation value set successfully', {
      requestId,
      appId,
      day,
      validationValue,
    });
    
    sendSuccessResponse(ctx, 200, { appId, day, validationValue }, 'Validation value set successfully');
  } catch (error) {
    logError(leaderboardLogger, error as Error, {
      requestId,
      validationData: ctx.request.body,
    });
    
    sendErrorResponse(ctx, 500, 'Failed to set validation value');
  }
});

// GET /leaderboard/:appId/validation/:day - Get daily validation value
router.get('/:appId/validation/:day', async (ctx: LogContext) => {
  try {
    const { appId, day } = ctx.params;
    
    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }

    const validationValue = await validationService.getDailyValidationValue(appId, day);
    
    if (!validationValue) {
      sendErrorResponse(ctx, 404, 'Validation value not found');
      return;
    }
    
    sendSuccessResponse(ctx, 200, {
      appId,
      day,
      validationValue,
    }, 'Validation value retrieved successfully');
  } catch (error) {
    console.error('Error fetching validation value:', error);
    sendErrorResponse(ctx, 500, 'Failed to fetch validation value');
  }
});

// POST /leaderboard/:appId/update-voting-scores/:day - Update leaderboard with voting results
router.post('/:appId/update-voting-scores/:day', async (ctx: LogContext) => {
  const requestId = ctx.requestId;
  
  try {
    const { appId, day } = ctx.params;
    
    if (!appId || !day) {
      sendErrorResponse(ctx, 400, 'Missing required parameters: appId, day');
      return;
    }

    const user = validateAuth(ctx);
    if (!user) return;

    // TODO: Add admin role validation here

    await leaderboardService.updateVotingScores(appId, day);
    
    logSuccess(leaderboardLogger, 'Voting scores updated successfully', {
      requestId,
      appId,
      day,
    });
    
    sendSuccessResponse(ctx, 200, { appId, day }, 'Voting scores updated successfully');
  } catch (error) {
    logError(leaderboardLogger, error as Error, {
      requestId,
      appId: ctx.params.appId,
      day: ctx.params.day,
    });
    
    sendErrorResponse(ctx, 500, 'Failed to update voting scores');
  }
});

export { router as leaderboardRoutes };
