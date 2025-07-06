import { 
  getCurrentDay, 
  getCurrentDayInTimezone,
  getCurrentTimeInRolloverTimezone,
  ROLLOVER_TIMEZONE,
  isValidDateString, 
  getDateFromTimestamp, 
  getTTL
} from './date';
import { 
  generatePartitionKey, 
  parsePartitionKey 
} from './dynamodb';

describe('Date Utilities', () => {
  describe('getCurrentDay', () => {
    it('should return current date in YYYY-MM-DD format using rollover timezone', () => {
      const result = getCurrentDay();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Should be a valid date
      const date = new Date(result);
      expect(date).toBeInstanceOf(Date);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should use the rollover timezone (GMT+9)', () => {
      expect(ROLLOVER_TIMEZONE).toBe('Asia/Tokyo');
    });
  });

  describe('getCurrentDayInTimezone', () => {
    it('should return current date for a specific timezone', () => {
      const utcDay = getCurrentDayInTimezone('UTC');
      const tokyoDay = getCurrentDayInTimezone('Asia/Tokyo');
      const nyDay = getCurrentDayInTimezone('America/New_York');
      
      expect(utcDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tokyoDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nyDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getCurrentTimeInRolloverTimezone', () => {
    it('should return current time in rollover timezone', () => {
      const rolloverTime = getCurrentTimeInRolloverTimezone();
      expect(rolloverTime).toBeInstanceOf(Date);
    });
  });

  describe('isValidDateString', () => {
    it('should validate correct date strings', () => {
      expect(isValidDateString('2025-07-01')).toBe(true);
      expect(isValidDateString('2025-12-31')).toBe(true);
      expect(isValidDateString('2024-02-29')).toBe(true); // Leap year
    });

    it('should reject invalid date strings', () => {
      expect(isValidDateString('2025-13-01')).toBe(false); // Invalid month
      expect(isValidDateString('2025-02-30')).toBe(false); // Invalid day
      expect(isValidDateString('25-07-01')).toBe(false);   // Wrong format
      expect(isValidDateString('2025/07/01')).toBe(false); // Wrong separator
      expect(isValidDateString('not-a-date')).toBe(false); // Completely invalid
      expect(isValidDateString('')).toBe(false);           // Empty string
    });
  });

  describe('getDateFromTimestamp', () => {
    it('should convert timestamp to date string using rollover timezone', () => {
      // Test with a specific UTC timestamp
      const timestamp = new Date('2025-07-01T12:00:00Z').getTime();
      const result = getDateFromTimestamp(timestamp);
      
      // In Asia/Tokyo timezone, 2025-07-01T12:00:00Z becomes 2025-07-01T21:00:00 JST
      // So it should still be 2025-07-01
      expect(result).toBe('2025-07-01');
    });

    it('should handle timezone boundary cases', () => {
      // Test with a timestamp that would be a different date in different timezones
      // 2025-07-01T16:00:00Z = 2025-07-02T01:00:00 JST (next day in Tokyo)
      const lateUtcTimestamp = new Date('2025-07-01T16:00:00Z').getTime();
      const result = getDateFromTimestamp(lateUtcTimestamp);
      expect(result).toBe('2025-07-02'); // Should be next day in Tokyo timezone
      
      // 2025-07-01T08:00:00Z = 2025-07-01T17:00:00 JST (same day in Tokyo)
      const earlyUtcTimestamp = new Date('2025-07-01T08:00:00Z').getTime();
      const result2 = getDateFromTimestamp(earlyUtcTimestamp);
      expect(result2).toBe('2025-07-01'); // Should be same day in Tokyo timezone
    });
  });

  describe('getTTL', () => {
    it('should calculate TTL for future dates', () => {
      const oneDayTTL = getTTL(1);
      const thirtyDayTTL = getTTL(30);
      
      expect(oneDayTTL).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(thirtyDayTTL).toBeGreaterThan(oneDayTTL);
      
      // Should be roughly 1 day in the future (allowing for test execution time)
      const expectedOneDayTTL = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      expect(Math.abs(oneDayTTL - expectedOneDayTTL)).toBeLessThan(60); // Within 1 minute
    });

    it('should handle zero days', () => {
      const zeroTTL = getTTL(0);
      const now = Math.floor(Date.now() / 1000);
      expect(Math.abs(zeroTTL - now)).toBeLessThan(5); // Within 5 seconds
    });
  });
});
