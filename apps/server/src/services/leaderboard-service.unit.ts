import { LeaderboardService } from '@/services/leaderboard-service';
import { VotingService } from '@/services/voting-service';
import { ValidationService } from '@/services/validation-service';
import { SubmitScoreRequest, AppMetadata } from '@/models/leaderboard';

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
  GetCommand: jest.fn(),
}));

// Mock services
jest.mock('@/services/voting-service');
jest.mock('@/services/validation-service');
const MockedVotingService = VotingService as jest.MockedClass<typeof VotingService>;
const MockedValidationService = ValidationService as jest.MockedClass<typeof ValidationService>;

describe('LeaderboardService - Enhanced Scoring Types', () => {
  let leaderboardService: LeaderboardService;
  let mockVotingService: jest.Mocked<VotingService>;
  let mockValidationService: jest.Mocked<ValidationService>;

  beforeEach(() => {
    leaderboardService = new LeaderboardService();
    mockSend.mockClear();
    
    // Setup mocked services
    mockVotingService = new MockedVotingService() as jest.Mocked<VotingService>;
    mockValidationService = new MockedValidationService() as jest.Mocked<ValidationService>;
    
    (leaderboardService as any).votingService = mockVotingService;
    (leaderboardService as any).validationService = mockValidationService;
  });

  describe('submitScore - Friends Leaderboard', () => {
    it('should accept score for friends leaderboard without strict validation', async () => {
      const friendsAppMetadata: AppMetadata = {
        appId: 'tic-tac-toe',
        name: 'Tic Tac Toe',
        description: 'Classic strategy game',
        tags: ['strategy'],
        leaderboard: {
          type: 'friends',
        },
        version: '1.0.0',
        runnerTag: 'vue-vanilla',
        author: { id: 'author123', username: 'test-author' },
        settings: [],
      };

      const request: SubmitScoreRequest = {
        score: 100,
      };

      // Mock successful storage
      mockSend.mockResolvedValueOnce({}); // PutCommand for score
      mockSend.mockResolvedValueOnce({}); // PutCommand for leaderboard entry

      const result = await leaderboardService.submitScore(
        'tic-tac-toe',
        'user123',
        'testuser',
        request,
        friendsAppMetadata
      );

      expect(result.score).toBe(100);
      expect(result.userId).toBe('user123');
      expect(result.appId).toBe('tic-tac-toe');
      
      // Should not call voting or validation services for friends leaderboard
      expect(mockVotingService.submitVotes).not.toHaveBeenCalled();
      expect(mockValidationService.validateRaceSubmission).not.toHaveBeenCalled();
    });
  });

  describe('submitScore - Global Voting Leaderboard', () => {
    const votingAppMetadata: AppMetadata = {
      appId: 'poetry-slam',
      name: 'Poetry Slam',
      description: 'Creative writing with peer voting',
      tags: ['creative', 'voting'],
      leaderboard: {
        type: 'global',
        scoringType: 'voting',
        maximumNumberOfVotes: 50,
        maximumVotesPerUser: 10,
      },
      version: '1.0.0',
      runnerTag: 'vue-vanilla',
      author: { id: 'author123', username: 'test-author' },
      settings: [],
    };

    it('should handle voting submission', async () => {
      const request: SubmitScoreRequest = {
        score: 0, // Placeholder score for voting
        votes: [
          { targetUserId: 'user1', score: 8, comment: 'Great poem!' },
          { targetUserId: 'user2', score: 6 },
        ],
      };

      const mockVotes = [
        {
          PK: 'VOTES#poetry-slam#2025-01-15',
          SK: 'VOTE#user123#user1',
          voterUserId: 'user123',
          targetUserId: 'user1',
          appId: 'poetry-slam',
          day: '2025-01-15',
          score: 8,
          timestamp: '2025-01-15T10:00:00Z',
          createdAt: 1705320000000,
        },
        {
          PK: 'VOTES#poetry-slam#2025-01-15',
          SK: 'VOTE#user123#user2',
          voterUserId: 'user123',
          targetUserId: 'user2',
          appId: 'poetry-slam',
          day: '2025-01-15',
          score: 6,
          timestamp: '2025-01-15T10:00:00Z',
          createdAt: 1705320000000,
        },
      ];

      mockVotingService.submitVotes.mockResolvedValueOnce(mockVotes);
      mockSend.mockResolvedValueOnce({}); // PutCommand for score
      mockSend.mockResolvedValueOnce({}); // PutCommand for leaderboard entry

      const result = await leaderboardService.submitScore(
        'poetry-slam',
        'user123',
        'testuser',
        request,
        votingAppMetadata
      );

      expect(mockVotingService.submitVotes).toHaveBeenCalledWith(
        'poetry-slam',
        'user123',
        request.votes,
        votingAppMetadata,
        expect.any(String) // day
      );
      
      expect(result.score).toBe(0); // Initial voting score is placeholder
      expect(result.userId).toBe('user123');
    });

    it('should handle voting submission without votes array', async () => {
      const request: SubmitScoreRequest = {
        score: 0,
        // No votes array
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for score
      mockSend.mockResolvedValueOnce({}); // PutCommand for leaderboard entry

      const result = await leaderboardService.submitScore(
        'poetry-slam',
        'user123',
        'testuser',
        request,
        votingAppMetadata
      );

      expect(mockVotingService.submitVotes).not.toHaveBeenCalled();
      expect(result.score).toBe(0);
    });
  });

  describe('submitScore - Global Race Leaderboard', () => {
    const raceAppMetadata: AppMetadata = {
      appId: 'daily-puzzle',
      name: 'Daily Puzzle',
      description: 'Time-based puzzle competition',
      tags: ['puzzle', 'race'],
      leaderboard: {
        type: 'global',
        scoringType: 'race',
        validation: {
          type: 'value',
          dailyValue: 'stored-in-app-data',
          timeLimit: 300,
        },
      },
      version: '1.0.0',
      runnerTag: 'vue-vanilla',
      author: { id: 'author123', username: 'test-author' },
      settings: [],
    };

    it('should validate and calculate score for race submission', async () => {
      const request: SubmitScoreRequest = {
        score: 0, // Will be calculated by validation
        validationData: {
          submissionValue: 'correct-answer',
          completionTime: 120,
        },
      };

      const validationResult = {
        isValid: true,
        score: 1180, // Calculated score based on time
      };

      mockValidationService.validateRaceSubmission.mockResolvedValueOnce(validationResult);
      mockSend.mockResolvedValueOnce({}); // PutCommand for score
      mockSend.mockResolvedValueOnce({}); // PutCommand for leaderboard entry

      const result = await leaderboardService.submitScore(
        'daily-puzzle',
        'user123',
        'testuser',
        request,
        raceAppMetadata
      );

      expect(mockValidationService.validateRaceSubmission).toHaveBeenCalledWith(
        'daily-puzzle',
        request,
        raceAppMetadata,
        expect.any(String) // day
      );
      
      expect(result.score).toBe(1180);
      expect(result.userId).toBe('user123');
    });

    it('should reject invalid race submission', async () => {
      const request: SubmitScoreRequest = {
        score: 0,
        validationData: {
          submissionValue: 'wrong-answer',
          completionTime: 120,
        },
      };

      const validationResult = {
        isValid: false,
        score: 0,
        reason: 'Submission value does not match daily validation value',
      };

      mockValidationService.validateRaceSubmission.mockResolvedValueOnce(validationResult);

      await expect(
        leaderboardService.submitScore(
          'daily-puzzle',
          'user123',
          'testuser',
          request,
          raceAppMetadata
        )
      ).rejects.toThrow('Race validation failed: Submission value does not match daily validation value');
    });
  });

  describe('submitScore - Global Score Leaderboard', () => {
    const scoreAppMetadata: AppMetadata = {
      appId: 'yatzy',
      name: 'Yatzy',
      description: 'Dice game with server validation',
      tags: ['dice', 'strategy'],
      leaderboard: {
        type: 'global',
        scoringType: 'score',
      },
      version: '1.0.0',
      runnerTag: 'vue-boardgameio',
      author: { id: 'author123', username: 'test-author' },
      settings: [],
    };

    it('should accept server-authoritative score', async () => {
      const request: SubmitScoreRequest = {
        score: 425, // High score calculated by server
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for score
      mockSend.mockResolvedValueOnce({}); // PutCommand for leaderboard entry

      const result = await leaderboardService.submitScore(
        'yatzy',
        'user123',
        'testuser',
        request,
        scoreAppMetadata
      );

      expect(result.score).toBe(425);
      expect(result.userId).toBe('user123');
      
      // Should not call voting or validation services for standard scoring
      expect(mockVotingService.submitVotes).not.toHaveBeenCalled();
      expect(mockValidationService.validateRaceSubmission).not.toHaveBeenCalled();
    });
  });

  describe('updateVotingScores', () => {
    it('should update leaderboard with voting results', async () => {
      const mockVotingResults = [
        {
          userId: 'user1',
          totalVotes: 14,
          averageScore: 7,
          voteCount: 2,
          finalScore: 14,
        },
        {
          userId: 'user2',
          totalVotes: 9,
          averageScore: 9,
          voteCount: 1,
          finalScore: 9,
        },
      ];

      mockVotingService.getVotingResults.mockResolvedValueOnce(mockVotingResults);
      mockSend.mockResolvedValue({}); // PutCommand calls for leaderboard entries

      await leaderboardService.updateVotingScores('poetry-slam', '2025-01-15');

      expect(mockVotingService.getVotingResults).toHaveBeenCalledWith('poetry-slam', '2025-01-15');
      expect(mockSend).toHaveBeenCalledTimes(2); // Two leaderboard entries
    });

    it('should handle empty voting results', async () => {
      mockVotingService.getVotingResults.mockResolvedValueOnce([]);

      await leaderboardService.updateVotingScores('poetry-slam', '2025-01-15');

      expect(mockVotingService.getVotingResults).toHaveBeenCalledWith('poetry-slam', '2025-01-15');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('getAppMetadata', () => {
    it('should retrieve app metadata successfully', async () => {
      const mockMetadata = {
        PK: 'CONFIG#poetry-slam',
        SK: 'METADATA',
        appId: 'poetry-slam',
        name: 'Poetry Slam',
        description: 'Creative writing with peer voting',
        tags: ['creative', 'voting'],
        leaderboard: {
          type: 'global',
          scoringType: 'voting',
          maximumNumberOfVotes: 50,
          maximumVotesPerUser: 10,
        },
        version: '1.0.0',
        runnerTag: 'vue-vanilla',
        author: { id: 'author123', username: 'test-author' },
        settings: [],
      };

      mockSend.mockResolvedValueOnce({ Item: mockMetadata });

      const result = await leaderboardService.getAppMetadata('poetry-slam');

      expect(result?.appId).toBe('poetry-slam');
      expect(result?.leaderboard?.scoringType).toBe('voting');
    });

    it('should return null for non-existent app metadata', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await leaderboardService.getAppMetadata('non-existent-app');

      expect(result).toBeNull();
    });
  });
});
