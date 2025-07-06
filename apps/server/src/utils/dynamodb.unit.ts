import { generatePartitionKey, parsePartitionKey } from './dynamodb';

describe('DynamoDB Utilities', () => {
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
