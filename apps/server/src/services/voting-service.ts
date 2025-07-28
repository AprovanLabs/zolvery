import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDynamoDBDocumentClient } from '@/aws';
import { appConfig } from '@/config';
import { getLogger } from '@/config/logger';
import { VoteAggregate, VoteSubmission } from '@/models/leaderboard';
import { votingKeys } from '@/utils/dynamo';

const logger = getLogger();

export class VotingService {
  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
  ) {}

  /**
   * Process a batch of votes from one user
   * All votes must be submitted together in one operation
   */
  async processBatchVotes(
    appId: string,
    voterUserId: string,
    votes: VoteSubmission[],
    day: string,
  ): Promise<void> {
    logger.debug({
      appId,
      voterUserId,
      day,
      voteCount: votes.length,
    }, 'Processing batch votes');

    // Validate the batch of votes
    this.validateVoteBatch(voterUserId, votes);

    // Process each vote in the batch
    for (const vote of votes) {
      await this.updateVoteAggregate(appId, vote.targetUserId, vote.score, day);
    }

    logger.debug({
      appId,
      voterUserId,
      day,
      processedVotes: votes.length,
    }, 'Batch votes processed successfully');
  }

  /**
   * Get the vote aggregate for a specific user
   */
  async getVoteAggregateForUser(
    appId: string,
    userId: string,
    day: string,
  ): Promise<VoteAggregate | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: votingKeys.voteAggregatePartitionKey(appId, day),
        SK: votingKeys.voteAggregateSortKey(userId),
      },
    });

    const result = await this.docClient.send(command);
    return (result.Item as VoteAggregate) || null;
  }

  /**
   * Get all vote aggregates for a day (for leaderboard purposes)
   */
  async getVoteAggregatesForDay(
    appId: string,
    day: string,
    limit = 100,
  ): Promise<VoteAggregate[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': votingKeys.voteAggregatePartitionKey(appId, day),
      },
      ScanIndexForward: false, // Sort by score descending
      Limit: limit,
    });

    const result = await this.docClient.send(command);
    return (result.Items as VoteAggregate[]) || [];
  }

  /**
   * Update the vote aggregate for a user
   */
  private async updateVoteAggregate(
    appId: string,
    targetUserId: string,
    voteScore: number,
    day: string,
  ): Promise<void> {
    const pk = votingKeys.voteAggregatePartitionKey(appId, day);
    const sk = votingKeys.voteAggregateSortKey(targetUserId);

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `
        SET 
          #appId = :appId,
          #targetUserId = :targetUserId,
          #day = :day,
          #totalScore = if_not_exists(#totalScore, :zero) + :voteScore,
          #voteCount = if_not_exists(#voteCount, :zero) + :one,
          #lastUpdated = :timestamp
        SET #averageScore = #totalScore / #voteCount
      `,
      ExpressionAttributeNames: {
        '#appId': 'appId',
        '#targetUserId': 'targetUserId',
        '#day': 'day',
        '#totalScore': 'totalScore',
        '#voteCount': 'voteCount',
        '#averageScore': 'averageScore',
        '#lastUpdated': 'lastUpdated',
      },
      ExpressionAttributeValues: {
        ':appId': appId,
        ':targetUserId': targetUserId,
        ':day': day,
        ':voteScore': voteScore,
        ':one': 1,
        ':zero': 0,
        ':timestamp': new Date().toISOString(),
      },
    });

    await this.docClient.send(command);

    logger.debug({
      appId,
      targetUserId,
      day,
      voteScore,
    }, 'Vote aggregate updated');
  }

  /**
   * Validate a batch of votes before processing
   */
  private validateVoteBatch(voterUserId: string, votes: VoteSubmission[]): void {
    if (!votes || votes.length === 0) {
      throw new Error('No votes provided in batch');
    }

    // Check for self-voting
    const selfVotes = votes.filter(vote => vote.targetUserId === voterUserId);
    if (selfVotes.length > 0) {
      throw new Error('Cannot vote for yourself');
    }

    // Check for duplicate target users in the batch
    const targetUserIds = votes.map(vote => vote.targetUserId);
    const uniqueTargetUserIds = new Set(targetUserIds);
    if (targetUserIds.length !== uniqueTargetUserIds.size) {
      throw new Error('Cannot vote for the same user multiple times in one batch');
    }

    // Validate vote scores
    for (const vote of votes) {
      if (vote.score < 0 || vote.score > 10) {
        throw new Error(`Vote score must be between 0 and 10, got ${vote.score}`);
      }
    }

    // Check maximum votes per batch (configurable constraint)
    const maxVotesPerBatch = 10; // This could be made configurable
    if (votes.length > maxVotesPerBatch) {
      throw new Error(`Too many votes in batch: ${votes.length}. Maximum allowed: ${maxVotesPerBatch}`);
    }
  }
}
