import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import { AppMetadata, SubmitScoreRequest } from '@/models/leaderboard';
import { AppDataService } from './app-service';
import { getCurrentDay } from '@/utils/date';
import { getLogger } from '@/config/logger';

const logger = getLogger();

export class ValidationService {
  private readonly appDataService: AppDataService;

  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName
  ) {
    this.appDataService = new AppDataService(docClient, tableName);
  }

  async validateRaceSubmission(
    appId: string,
    request: SubmitScoreRequest,
    appMetadata: AppMetadata,
    day: string = getCurrentDay(),
    submissionTime: Date = new Date() // Server-calculated submission time
  ): Promise<{ isValid: boolean; score: number; reason?: string; completionTime?: number }> {
    logger.debug({ 
      appId, 
      day, 
      hasValidationData: !!request.validationData,
      submissionTime: submissionTime.toISOString()
    }, 'Validating race submission');

    const leaderboardConfig = appMetadata.leaderboard;
    if (!leaderboardConfig || leaderboardConfig.scoringType !== 'race') {
      return { isValid: false, score: 0, reason: 'App is not configured for race scoring' };
    }

    const validation = leaderboardConfig.validation;
    if (!validation) {
      return { isValid: false, score: 0, reason: 'No validation configuration found' };
    }

    const validationData = request.validationData;
    if (!validationData) {
      return { isValid: false, score: 0, reason: 'Validation data is required for race submissions' };
    }

    // Calculate completion time from server perspective
    // This could be based on when the user started the puzzle (stored in app data)
    // For now, we'll use a simplified approach
    const completionTime = this.calculateCompletionTime(appId, day, submissionTime);

    switch (validation.type) {
      case 'value':
        return await this.validateByValue(appId, day, validationData, validation, completionTime);
      case 'time':
        return await this.validateByTime(validationData, validation, completionTime);
      case 'custom':
        return await this.validateByCustom(appId, day, validationData, validation, completionTime);
      default:
        return { isValid: false, score: 0, reason: 'Unknown validation type' };
    }
  }

  private async validateByValue(
    appId: string,
    day: string,
    validationData: any,
    validation: any
  ): Promise<{ isValid: boolean; score: number; reason?: string }> {
    logger.debug({ appId, day }, 'Validating by value');

    // Get the daily validation value from app data
    const dailyValidationValue = await this.appDataService.getAppDataByKey(
      appId, 
      day, 
      'validationValue'
    );

    if (!dailyValidationValue) {
      return { 
        isValid: false, 
        score: 0, 
        reason: 'Daily validation value not found' 
      };
    }

    const submissionValue = validationData.submissionValue;
    if (!submissionValue) {
      return { 
        isValid: false, 
        score: 0, 
        reason: 'Submission value is required' 
      };
    }

    // Check if submission value matches daily validation value
    const isValid = submissionValue === dailyValidationValue;
    if (!isValid) {
      return { 
        isValid: false, 
        score: 0, 
        reason: 'Submission value does not match daily validation value' 
      };
    }

    // Calculate server-side completion time (time from puzzle start to now)
    // This should be calculated based on when the user started the puzzle
    // For now, we'll use a simple time-based scoring
    const submissionTime = Date.now();
    const startOfDay = new Date(day + 'T00:00:00Z').getTime();
    const completionTime = Math.floor((submissionTime - startOfDay) / 1000); // seconds since start of day

    const timeLimit = validation.timeLimit || 3600; // Default 1 hour

    if (completionTime > timeLimit) {
      return { 
        isValid: false, 
        score: 0, 
        reason: `Completion time ${completionTime}s exceeds limit ${timeLimit}s` 
      };
    }

    // Score calculation: higher score for faster completion
    // Max score of 1000, reduced by time taken (1 point per second)
    const baseScore = 1000;
    const timeBonus = Math.max(0, timeLimit - completionTime);
    const finalScore = Math.round(baseScore + timeBonus);

    logger.debug({ 
      appId, 
      day, 
      completionTime, 
      timeBonus, 
      finalScore 
    }, 'Race validation successful');

    return { isValid: true, score: finalScore };
  }

  private async validateByTime(
    validationData: any,
    validation: any
  ): Promise<{ isValid: boolean; score: number; reason?: string }> {
    // For time-based validation, we calculate completion time server-side
    // The client should not provide completion time
    const submissionTime = Date.now();
    const timeLimit = validation.timeLimit;

    if (!timeLimit) {
      return { 
        isValid: false, 
        score: 0, 
        reason: 'Time limit not configured' 
      };
    }

    // We need to track when the user started the challenge
    // For now, assume they started at the beginning of the current hour
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    const startTime = currentHour.getTime();
    
    const completionTime = Math.floor((submissionTime - startTime) / 1000); // seconds

    if (completionTime > timeLimit) {
      return { 
        isValid: false, 
        score: 0, 
        reason: `Completion time ${completionTime}s exceeds limit ${timeLimit}s` 
      };
    }

    // Simple time-based scoring: faster = higher score
    const score = Math.max(0, timeLimit - completionTime);
    return { isValid: true, score };
  }

  private async validateByCustom(
    appId: string,
    day: string,
    validationData: any,
    validation: any
  ): Promise<{ isValid: boolean; score: number; reason?: string }> {
    logger.warn({ appId, day }, 'Custom validation not implemented yet');
    
    // TODO: Implement custom validation logic
    // This could involve executing custom validation scripts or rules
    return { 
      isValid: false, 
      score: 0, 
      reason: 'Custom validation not implemented' 
    };
  }

  async setDailyValidationValue(
    appId: string,
    day: string,
    validationValue: string
  ): Promise<void> {
    logger.debug({ appId, day, validationValue }, 'Setting daily validation value');

    await this.appDataService.updateAppData({
      appId,
      day,
      key: 'validationValue',
      value: validationValue,
    });

    logger.debug({ appId, day }, 'Daily validation value set successfully');
  }

  async getDailyValidationValue(appId: string, day: string): Promise<string | null> {
    logger.debug({ appId, day }, 'Getting daily validation value');

    const value = await this.appDataService.getAppDataByKey(appId, day, 'validationValue');
    
    logger.debug({ appId, day, hasValue: !!value }, 'Retrieved daily validation value');
    return value;
  }
}
