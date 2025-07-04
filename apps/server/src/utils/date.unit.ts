import { 
  getCurrentDay, 
  isValidDateString, 
  getDateFromTimestamp, 
  getTTL, 
  generatePartitionKey, 
  parsePartitionKey 
} from './date';

describe('Date Utilities', () => {
  describe('getCurrentDay', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const result = getCurrentDay();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Should be a valid date
      const date = new Date(result);
      expect(date).toBeInstanceOf(Date);
      expect(date.toString()).not.toBe('Invalid Date');
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
    it('should convert timestamp to date string', () => {
      const timestamp = new Date('2025-07-01T12:00:00Z').getTime();
      const result = getDateFromTimestamp(timestamp);
      expect(result).toBe('2025-07-01');
    });

    it('should handle different times on same day', () => {
      const morningTimestamp = new Date('2025-07-01T08:00:00Z').getTime();
      const eveningTimestamp = new Date('2025-07-01T20:00:00Z').getTime();
      
      expect(getDateFromTimestamp(morningTimestamp)).toBe('2025-07-01');
      expect(getDateFromTimestamp(eveningTimestamp)).toBe('2025-07-01');
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

  describe('generatePartitionKey', () => {
    it('should generate consistent partition keys', () => {
      const pk1 = generatePartitionKey('DAY', '2025-07-01', 'APP', 'poetry-slam', 'USER', 'user123');
      const pk2 = generatePartitionKey('LEADERBOARD', 'poetry-slam', 'GLOBAL');
      
      expect(pk1).toBe('DAY#2025-07-01#APP#poetry-slam#USER#user123');
      expect(pk2).toBe('LEADERBOARD#poetry-slam#GLOBAL');
    });

    it('should handle single component', () => {
      const pk = generatePartitionKey('SINGLE');
      expect(pk).toBe('SINGLE');
    });

    it('should handle empty components', () => {
      const pk = generatePartitionKey('TYPE', '', 'VALUE');
      expect(pk).toBe('TYPE##VALUE');
    });
  });

  describe('parsePartitionKey', () => {
    it('should parse partition key components', () => {
      const pk = 'DAY#2025-07-01#APP#poetry-slam#USER#user123';
      const components = parsePartitionKey(pk);
      
      expect(components).toEqual(['DAY', '2025-07-01', 'APP', 'poetry-slam', 'USER', 'user123']);
    });

    it('should handle single component', () => {
      const components = parsePartitionKey('SINGLE');
      expect(components).toEqual(['SINGLE']);
    });

    it('should handle empty components', () => {
      const components = parsePartitionKey('TYPE##VALUE');
      expect(components).toEqual(['TYPE', '', 'VALUE']);
    });
  });
});
