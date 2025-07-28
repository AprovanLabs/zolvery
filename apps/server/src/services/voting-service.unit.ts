import { VotingService } from '@/services/voting-service';
import { VoteSubmission, AppMetadata } from '@/models/leaderboard';

// Mock the DynamoDB client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: mockSend,
    }),
  },
  PutCommand: jest.fn(),
  QueryCommand: jest.fn(),
}));

describe('VotingService', () => {
  let votingService: VotingService;
  let mockAppMetadata: AppMetadata;

  beforeEach(() => {
    votingService = new VotingService();
    mockSend.mockClear();
    
    mockAppMetadata = {
      appId: 'poetry-slam',
      name: 'Poetry Slam',
      description: 'Creative writing competition',
      tags: ['creative', 'voting'],
      leaderboard: {
        type: 'global',
        scoringType: 'voting',
        maximumNumberOfVotes: 50,
        maximumVotesPerUser: 10,
      },
      version: '1.0.0',
      runnerTag: 'vue-vanilla',
      author: {
        id: 'author123',
        username: 'test-author',
      },
      settings: [],
    };
  });

  describe('submitVotes', () => {
    it('should submit votes successfully', async () => {
      const votes: VoteSubmission[] = [
        { targetUserId: 'user1', score: 8, comment: 'Great poem!' },
        { targetUserId: 'user2', score: 6 },
      ];

      // Mock existing votes check (empty)
      mockSend.mockResolvedValueOnce({ Items: [] }); // getUserVotes
      mockSend.mockResolvedValueOnce({ Items: [] }); // getVotesForTarget user1
      mockSend.mockResolvedValueOnce({ Items: [] }); // getVotesForTarget user2
      
      // Mock vote submissions
      mockSend.mockResolvedValue({}); // PutCommand calls

      const result = await votingService.submitVotes(
        'poetry-slam',
        'voter123',
        votes,
        mockAppMetadata,
        '2025-01-15'
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.targetUserId).toBe('user1');
      expect(result[0]?.score).toBe(8);
      expect(result[1]?.targetUserId).toBe('user2');
      expect(result[1]?.score).toBe(6);
    });

    it('should prevent exceeding maximum votes per user', async () => {
      const votes: VoteSubmission[] = [
        { targetUserId: 'user1', score: 8 },
      ];

      // Mock existing votes (user already has 10 votes)
      const existingVotes = Array.from({ length: 10 }, (_, i) => ({
        targetUserId: `user${i}`,
        score: 5,
      }));
      mockSend.mockResolvedValueOnce({ Items: existingVotes });

      await expect(
        votingService.submitVotes('poetry-slam', 'voter123', votes, mockAppMetadata, '2025-01-15')
      ).rejects.toThrow('User can only cast 10 votes per day');
    });

    it('should prevent self-voting', async () => {
      const votes: VoteSubmission[] = [
        { targetUserId: 'voter123', score: 10 }, // Self-vote
      ];

      mockSend.mockResolvedValueOnce({ Items: [] }); // getUserVotes

      await expect(
        votingService.submitVotes('poetry-slam', 'voter123', votes, mockAppMetadata, '2025-01-15')
      ).rejects.toThrow('Cannot vote for yourself');
    });

    it('should validate vote scores are within range', async () => {
      const votes: VoteSubmission[] = [
        { targetUserId: 'user1', score: 15 }, // Invalid score
      ];

      mockSend.mockResolvedValueOnce({ Items: [] }); // getUserVotes

      await expect(
        votingService.submitVotes('poetry-slam', 'voter123', votes, mockAppMetadata, '2025-01-15')
      ).rejects.toThrow('Vote scores must be between 0 and 10');
    });

    it('should prevent duplicate votes to same target', async () => {
      const votes: VoteSubmission[] = [
        { targetUserId: 'user1', score: 8 },
        { targetUserId: 'user1', score: 6 }, // Duplicate
      ];

      mockSend.mockResolvedValueOnce({ Items: [] }); // getUserVotes

      await expect(
        votingService.submitVotes('poetry-slam', 'voter123', votes, mockAppMetadata, '2025-01-15')
      ).rejects.toThrow('Cannot vote multiple times for the same user in one submission');
    });
  });

  describe('getVotingResults', () => {
    it('should calculate voting results correctly', async () => {
      const mockVotes = [
        {
          voterUserId: 'voter1',
          targetUserId: 'user1',
          score: 8,
        },
        {
          voterUserId: 'voter2',
          targetUserId: 'user1',
          score: 6,
        },
        {
          voterUserId: 'voter1',
          targetUserId: 'user2',
          score: 9,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: mockVotes });

      const results = await votingService.getVotingResults('poetry-slam', '2025-01-15');

      expect(results).toHaveLength(2);
      
      // user1: (8 + 6) / 2 = 7 average, 2 votes, final score = 7 * 2 = 14
      const user1Result = results.find(r => r.userId === 'user1');
      expect(user1Result).toBeDefined();
      expect(user1Result?.totalVotes).toBe(14);
      expect(user1Result?.averageScore).toBe(7);
      expect(user1Result?.voteCount).toBe(2);
      expect(user1Result?.finalScore).toBe(14);

      // user2: 9 / 1 = 9 average, 1 vote, final score = 9 * 1 = 9
      const user2Result = results.find(r => r.userId === 'user2');
      expect(user2Result).toBeDefined();
      expect(user2Result?.totalVotes).toBe(9);
      expect(user2Result?.averageScore).toBe(9);
      expect(user2Result?.voteCount).toBe(1);
      expect(user2Result?.finalScore).toBe(9);

      // Results should be sorted by final score (user1 first with 14)
      expect(results[0]?.userId).toBe('user1');
      expect(results[1]?.userId).toBe('user2');
    });

    it('should handle empty vote results', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const results = await votingService.getVotingResults('poetry-slam', '2025-01-15');

      expect(results).toHaveLength(0);
    });
  });

  describe('getUserVotes', () => {
    it('should retrieve user votes successfully', async () => {
      const mockVotes = [
        {
          PK: 'VOTES#poetry-slam#2025-01-15',
          SK: 'VOTE#voter123#user1',
          voterUserId: 'voter123',
          targetUserId: 'user1',
          score: 8,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: mockVotes });

      const votes = await votingService.getUserVotes('poetry-slam', 'voter123', '2025-01-15');

      expect(votes).toHaveLength(1);
      expect(votes[0]?.targetUserId).toBe('user1');
      expect(votes[0]?.score).toBe(8);
    });
  });

  describe('getVotesForTarget', () => {
    it('should retrieve votes for target user successfully', async () => {
      const mockVotes = [
        {
          voterUserId: 'voter1',
          targetUserId: 'user1',
          score: 8,
        },
        {
          voterUserId: 'voter2',
          targetUserId: 'user1',
          score: 6,
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: mockVotes });

      const votes = await votingService.getVotesForTarget('poetry-slam', 'user1', '2025-01-15');

      expect(votes).toHaveLength(2);
      expect(votes.every(v => v.targetUserId === 'user1')).toBe(true);
    });
  });
});
