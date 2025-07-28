import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import {
  AppScore,
  LeaderboardEntry,
  SubmitScoreRequest,
} from '@/models/leaderboard';
import { getCurrentDay } from '@/utils/date';
import { leaderboardKeys } from '@/utils/dynamo';
import { getLogger } from '@/config/logger';
import { AppEventBusIntegration, AppEventType } from '@/utils/events/integration';
import { InMemoryEventBus } from '@/utils/events';

const logger = getLogger();

export class LeaderboardService {
  private readonly eventBus: AppEventBusIntegration;

  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
    eventBus?: AppEventBusIntegration
  ) {
    // Use provided event bus or create a new one with in-memory implementation
    this.eventBus = eventBus || new AppEventBusIntegration(new InMemoryEventBus());
  }

  async submitScore(
    appId: string,
    userId: string,
    username: string,
    request: SubmitScoreRequest,
  ): Promise<AppScore> {
    const day = request.day || getCurrentDay();
    const timestamp = new Date().toISOString();
    const createdAt = Date.now();

    logger.debug({ 
      userId, 
      username, 
      appId, 
      day, 
      score: request.score 
    }, 'Submitting score');

    const score: AppScore = {
      PK: leaderboardKeys.partitionKey(appId, day),
      SK: leaderboardKeys.sortKey(request.score, userId),
      userId: userId,
      appId,
      day,
      score: request.score,
      appData: request.appData,
      timestamp,
      createdAt,
    };

    // Save the score
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: score,
      }),
    );

    logger.debug({ userId, appId: appId, day, score: request.score }, 'Score saved successfully');

    // Update or create user's leaderboard entry
    await this.updateUserLeaderboardEntry(userId, username, request, day);

    // Publish leaderboard updated event
    try {
      // Get updated leaderboard for publishing
      const leaderboard = await this.getDailyLeaderboard(appId, day, 10);
      
      await this.eventBus.publishLeaderboardUpdated({
        appId,
        day,
        entries: leaderboard.map(entry => ({
          userId: entry.userId,
          username: entry.username,
          score: entry.score,
          rank: entry.rank,
        })),
      });

      logger.debug({
        appId,
        day,
        eventType: AppEventType.LEADERBOARD_UPDATED,
      }, 'Leaderboard updated event published');
    } catch (busError) {
      logger.error({
        error: busError,
        appId,
        day,
        userId,
      }, 'Failed to publish leaderboard updated event');
    }

    return score;
  }

  async getDailyLeaderboard(
    appId: string,
    day: string,
    limit = 100,
  ): Promise<LeaderboardEntry[]> {
    logger.debug({ appId, day, limit }, 'Getting daily leaderboard');
    
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': leaderboardKeys.partitionKey(appId, day),
        ':sk': 'SCORE#',
      },
      ScanIndexForward: false, // Sort descending by SK (which includes timestamp)
      Limit: limit * 2, // Get more items since we need to deduplicate by user
    });

    const result = await this.docClient.send(command);
    const scores = (result.Items as AppScore[]) || [];

    logger.debug({ appId, day, scoreCount: scores.length }, 'Retrieved scores for leaderboard');

    // Get the best score for each user
    const userBestScores = new Map<string, AppScore>();
    for (const score of scores) {
      const existing = userBestScores.get(score.userId);
      if (!existing || score.score > existing.score) {
        userBestScores.set(score.userId, score);
      }
    }

    // Convert to leaderboard entries and sort by score
    const leaderboardEntries: LeaderboardEntry[] = Array.from(
      userBestScores.values(),
    )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((score, index) => ({
        PK: leaderboardKeys.partitionKey(appId, day),
        SK: `USER#${score.userId}`,
        userId: score.userId,
        username: score.userId,
        score: score.score,
        submittedTimestamp: score.timestamp,
        rank: index + 1,
      }));

    logger.debug({ appId, day, entryCount: leaderboardEntries.length }, 'Generated leaderboard entries');
    return leaderboardEntries;
  }

  async getGlobalLeaderboard(
    appId: string,
    limit = 100,
  ): Promise<LeaderboardEntry[]> {
    logger.debug({ appId, limit }, 'Getting global leaderboard');
    
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': leaderboardKeys.globalPartitionKey(appId),
        ':sk': 'USER#',
      },
      ScanIndexForward: false,
      Limit: limit,
    });

    const result = await this.docClient.send(command);
    const entries = (result.Items as LeaderboardEntry[]) || [];
    
    logger.debug({ appId, entryCount: entries.length }, 'Retrieved global leaderboard entries');
    return entries;
  }

  async getUserScores(
    appId: string,
    userId: string,
    limit = 50,
  ): Promise<AppScore[]> {
    logger.debug({ appId, userId, limit }, 'Getting user scores');
    
    // Query for all scores on the day, then filter in memory
    // In a production system, this would use a GSI with userId as partition key
    const today = getCurrentDay();
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': leaderboardKeys.partitionKey(appId, today),
        ':sk': 'SCORE#',
      },
      ScanIndexForward: false,
      Limit: limit * 10, // Get more items to account for filtering
    });

    const result = await this.docClient.send(command);
    const allScores = (result.Items as AppScore[]) || [];
    
    // Filter for the specific user's scores in memory
    const userScores = allScores.filter(score => score.userId === userId).slice(0, limit);
    
    logger.debug({ appId, userId, scoreCount: userScores.length, totalScores: allScores.length }, 'Retrieved user scores');
    return userScores;
  }

  async getUserRank(
    appId: string,
    userId: string,
    day: string,
  ): Promise<number | null> {
    logger.debug({ appId, userId, day }, 'Getting user rank');
    
    const leaderboard = await this.getDailyLeaderboard(appId, day);
    const userEntry = leaderboard.find((entry) => entry.userId === userId);
    const rank = userEntry?.rank || null;
    
    logger.debug({ appId, userId, day, rank }, 'User rank determined');
    return rank;
  }

  private async updateUserLeaderboardEntry(
    userId: string,
    username: string,
    request: SubmitScoreRequest,
    day: string,
  ): Promise<void> {
    logger.debug({ 
      userId, 
      username, 
      appId: request.appId, 
      day, 
      score: request.score 
    }, 'Updating user leaderboard entry');
    
    const globalPK = leaderboardKeys.globalPartitionKey(request.appId);
    const userSK = `USER#${userId}`;

    try {
      // Try to update existing entry
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: globalPK, SK: userSK },
          UpdateExpression: `
          SET 
            totalScore = if_not_exists(totalScore, :zero) + :score,
            appsPlayed = if_not_exists(appsPlayed, :zero) + :one,
            bestScore = if_not_exists(bestScore, :zero),
            lastPlayed = :timestamp,
            username = :username
          SET bestScore = if_(bestScore < :score, :score, bestScore)
        `,
          ExpressionAttributeValues: {
            ':score': request.score,
            ':zero': 0,
            ':one': 1,
            ':timestamp': new Date().toISOString(),
            ':username': username,
          },
        }),
      );
    } catch (error) {
      // If item doesn't exist, create it
      logger.debug({ userId, appId }, 'Creating new leaderboard entry');
      
      const newEntry: LeaderboardEntry = {
        PK: globalPK,
        SK: userSK,
        userId: userId,
        username,
        score: request.score,
        submittedTimestamp: new Date().toISOString(),
        rank: 0,
      };

      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: newEntry,
        }),
      );
    }
    
    logger.debug({ userId, appId }, 'User leaderboard entry updated');
  }
}
