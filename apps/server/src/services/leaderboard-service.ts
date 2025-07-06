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

export class LeaderboardService {
  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
  ) {}

  async submitScore(
    userId: string,
    username: string,
    request: SubmitScoreRequest,
  ): Promise<AppScore> {
    const day = request.day || getCurrentDay();
    const timestamp = new Date().toISOString();
    const createdAt = Date.now();

    const score: AppScore = {
      PK: `LEADERBOARD#${request.appId}#${day}`,
      SK: `SCORE#${userId}#${createdAt}`,
      userId: userId,
      appId: request.appId,
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

    // Update or create user's leaderboard entry
    await this.updateUserLeaderboardEntry(userId, username, request, day);

    return score;
  }

  async getDailyLeaderboard(
    appId: string,
    day: string,
    limit = 100,
  ): Promise<LeaderboardEntry[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `LEADERBOARD#${appId}#${day}`,
        ':sk': 'SCORE#',
      },
      ScanIndexForward: false, // Sort descending by SK (which includes timestamp)
      Limit: limit * 2, // Get more items since we need to deduplicate by user
    });

    const result = await this.docClient.send(command);
    const scores = (result.Items as AppScore[]) || [];

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
        PK: `LEADERBOARD#${appId}#${day}`,
        SK: `USER#${score.userId}`,
        userId: score.userId,
        username: score.userId,
        score: score.score,
        submittedTimestamp: score.timestamp,
        rank: index + 1,
      }));

    return leaderboardEntries;
  }

  async getGlobalLeaderboard(
    appId: string,
    limit = 100,
  ): Promise<LeaderboardEntry[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `LEADERBOARD#${appId}#GLOBAL`,
        ':sk': 'USER#',
      },
      ScanIndexForward: false,
      Limit: limit,
    });

    const result = await this.docClient.send(command);
    return (result.Items as LeaderboardEntry[]) || [];
  }

  async getUserScores(
    appId: string,
    userId: string,
    limit = 50,
  ): Promise<AppScore[]> {
    // This would use GSI1 in a real implementation
    // For now, we'll query by day patterns (this is not optimal)
    const today = getCurrentDay();
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `LEADERBOARD#${appId}#${today}`,
        ':sk': `SCORE#${userId}#`,
      },
      ScanIndexForward: false,
      Limit: limit,
    });

    const result = await this.docClient.send(command);
    return (result.Items as AppScore[]) || [];
  }

  async getUserRank(
    appId: string,
    userId: string,
    day: string,
  ): Promise<number | null> {
    const leaderboard = await this.getDailyLeaderboard(appId, day);
    const userEntry = leaderboard.find((entry) => entry.userId === userId);
    return userEntry?.rank || null;
  }

  private async updateUserLeaderboardEntry(
    userId: string,
    username: string,
    request: SubmitScoreRequest,
    day: string,
  ): Promise<void> {
    const globalPK = `LEADERBOARD#${request.appId}#GLOBAL`;
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
            ':username': request.username,
          },
        }),
      );
    } catch (error) {
      // If item doesn't exist, create it
      const newEntry: LeaderboardEntry = {
        PK: globalPK,
        SK: userSK,
        userId: userId,
        username: request.username,
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
  }
}
