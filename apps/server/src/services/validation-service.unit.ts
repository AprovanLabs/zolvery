import { ValidationService } from '@/services/validation-service';
import { SubmitScoreRequest, AppMetadata } from '@/models/leaderboard';
import { AppDataService } from '@/services/app-service';

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
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
}));

// Mock AppDataService
jest.mock('@/services/app-service');
const MockedAppDataService = AppDataService as jest.MockedClass<typeof AppDataService>;

describe('ValidationService', () => {
  let validationService: ValidationService;
  let mockAppDataService: jest.Mocked<AppDataService>;
  let mockAppMetadata: AppMetadata;

  beforeEach(() => {
    validationService = new ValidationService();
    mockSend.mockClear();
    
    // Setup mocked AppDataService
    mockAppDataService = new MockedAppDataService() as jest.Mocked<AppDataService>;
    (validationService as any).appDataService = mockAppDataService;
    
    mockAppMetadata = {
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
          timeLimit: 300, // 5 minutes
        },
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

  describe('validateRaceSubmission', () => {
    it('should validate correct submission successfully', async () => {
      const request: SubmitScoreRequest = {
        score: 0, // Score will be calculated by validation
        validationData: {
          submissionValue: 'correct-answer',
          completionTime: 120, // 2 minutes
        },
      };

      // Mock daily validation value
      mockAppDataService.getAppDataByKey.mockResolvedValueOnce('correct-answer');

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        mockAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBe(1180); // 1000 base + (300-120) time bonus
    });

    it('should reject submission with wrong answer', async () => {
      const request: SubmitScoreRequest = {
        score: 0,
        validationData: {
          submissionValue: 'wrong-answer',
          completionTime: 120,
        },
      };

      mockAppDataService.getAppDataByKey.mockResolvedValueOnce('correct-answer');

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        mockAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toContain('does not match daily validation value');
    });

    it('should reject submission exceeding time limit', async () => {
      const request: SubmitScoreRequest = {
        score: 0,
        validationData: {
          submissionValue: 'correct-answer',
          completionTime: 400, // Exceeds 300s limit
        },
      };

      mockAppDataService.getAppDataByKey.mockResolvedValueOnce('correct-answer');

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        mockAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toContain('exceeds limit');
    });

    it('should reject submission without validation data', async () => {
      const request: SubmitScoreRequest = {
        score: 100,
        // No validationData
      };

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        mockAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('Validation data is required for race submissions');
    });

    it('should reject if app is not configured for race scoring', async () => {
      const nonRaceAppMetadata = {
        ...mockAppMetadata,
        leaderboard: {
          type: 'global' as const,
          scoringType: 'score' as const, // Not race
        },
      };

      const request: SubmitScoreRequest = {
        score: 100,
        validationData: {
          submissionValue: 'answer',
          completionTime: 120,
        },
      };

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        nonRaceAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('App is not configured for race scoring');
    });

    it('should reject if no daily validation value is found', async () => {
      const request: SubmitScoreRequest = {
        score: 0,
        validationData: {
          submissionValue: 'answer',
          completionTime: 120,
        },
      };

      mockAppDataService.getAppDataByKey.mockResolvedValueOnce(null);

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        mockAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('Daily validation value not found');
    });

    it('should handle time-based validation', async () => {
      const timeBasedAppMetadata = {
        ...mockAppMetadata,
        leaderboard: {
          type: 'global' as const,
          scoringType: 'race' as const,
          validation: {
            type: 'time' as const,
            timeLimit: 300,
          },
        },
      };

      const request: SubmitScoreRequest = {
        score: 0,
        validationData: {
          completionTime: 150,
        },
      };

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        timeBasedAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(true);
      expect(result.score).toBe(150); // timeLimit - completionTime
    });

    it('should handle custom validation (not implemented)', async () => {
      const customAppMetadata = {
        ...mockAppMetadata,
        leaderboard: {
          type: 'global' as const,
          scoringType: 'race' as const,
          validation: {
            type: 'custom' as const,
            customValidator: 'some-custom-logic',
          },
        },
      };

      const request: SubmitScoreRequest = {
        score: 0,
        validationData: {
          proofOfWork: { customData: 'test' },
        },
      };

      const result = await validationService.validateRaceSubmission(
        'daily-puzzle',
        request,
        customAppMetadata,
        '2025-01-15'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toBe('Custom validation not implemented');
    });
  });

  describe('setDailyValidationValue', () => {
    it('should set daily validation value successfully', async () => {
      const mockAppData = {
        PK: 'APP_DATA#daily-puzzle#2025-01-15',
        SK: 'KEY#validationValue',
        appId: 'daily-puzzle',
        day: '2025-01-15',
        key: 'validationValue',
        value: 'puzzle-answer-42',
        version: 'v123456789',
        updatedAt: '2025-01-15T10:00:00Z',
      };
      
      mockAppDataService.updateAppData.mockResolvedValueOnce(mockAppData);

      await validationService.setDailyValidationValue(
        'daily-puzzle',
        '2025-01-15',
        'puzzle-answer-42'
      );

      expect(mockAppDataService.updateAppData).toHaveBeenCalledWith({
        appId: 'daily-puzzle',
        day: '2025-01-15',
        key: 'validationValue',
        value: 'puzzle-answer-42',
      });
    });
  });

  describe('getDailyValidationValue', () => {
    it('should get daily validation value successfully', async () => {
      mockAppDataService.getAppDataByKey.mockResolvedValueOnce('puzzle-answer-42');

      const result = await validationService.getDailyValidationValue(
        'daily-puzzle',
        '2025-01-15'
      );

      expect(result).toBe('puzzle-answer-42');
      expect(mockAppDataService.getAppDataByKey).toHaveBeenCalledWith(
        'daily-puzzle',
        '2025-01-15',
        'validationValue'
      );
    });

    it('should return null when validation value not found', async () => {
      mockAppDataService.getAppDataByKey.mockResolvedValueOnce(null);

      const result = await validationService.getDailyValidationValue(
        'daily-puzzle',
        '2025-01-15'
      );

      expect(result).toBeNull();
    });
  });
});
