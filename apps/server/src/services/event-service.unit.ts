import { EventService } from '@/services/event-service';
import { CreateEventRequest } from '@/models/event';

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
  QueryCommand: jest.fn(),
}));

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
    mockSend.mockClear();
  });

  describe('createEvent', () => {
    it('should create an event with all required fields', async () => {
      const request: CreateEventRequest = {
        appId: 'poetry-slam',
        eventKey: 'poem',
        value: { content: 'Roses are red...' },
      };

      mockSend.mockResolvedValueOnce({});

      const result = await eventService.createEvent('user123', request);

      expect(result).toMatchObject({
        PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
        SK: 'EVENT#poem',
        eventKey: 'poem',
        value: { content: 'Roses are red...' },
        appId: 'poetry-slam',
        userId: 'user123',
        day: '2025-07-01',
      });

      expect(result.timestamp).toBeDefined();
      expect(result.ttl).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should use current date when day is not provided', async () => {
      const request: CreateEventRequest = {
        appId: 'poetry-slam',
        eventKey: 'vote',
        value: { score: 5 },
      };

      mockSend.mockResolvedValueOnce({});

      const result = await eventService.createEvent('user123', request);

      expect(result.day).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      expect(result.PK).toContain(`DAY#${result.day}#`);
    });

    it('should handle DynamoDB errors', async () => {
      const request: CreateEventRequest = {
        appId: 'poetry-slam',
        eventKey: 'error-test',
        value: {},
      };

      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(eventService.createEvent('user123', request)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getEvent', () => {
    it('should return an event when found', async () => {
      const mockEvent = {
        PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
        SK: 'EVENT#poem',
        eventKey: 'poem',
        value: { content: 'Test poem' },
        appId: 'poetry-slam',
        userId: 'user123',
        day: '2025-07-01',
        timestamp: '2025-07-01T12:00:00Z',
      };

      mockSend.mockResolvedValueOnce({ Item: mockEvent });

      const result = await eventService.getEvent('poetry-slam', 'user123', '2025-07-01', 'poem');

      expect(result).toEqual(mockEvent);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null when event not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await eventService.getEvent('poetry-slam', 'user123', '2025-07-01', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserEvents', () => {
    it('should return array of user events', async () => {
      const mockEvents = [
        {
          PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
          SK: 'EVENT#poem',
          eventKey: 'poem',
          value: { content: 'First poem' },
        },
        {
          PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
          SK: 'EVENT#vote',
          eventKey: 'vote',
          value: { score: 4 },
        },
      ];

      mockSend.mockResolvedValueOnce({ Items: mockEvents });

      const result = await eventService.getUserEvents('poetry-slam', 'user123', '2025-07-01');

      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no events found', async () => {
      mockSend.mockResolvedValueOnce({ Items: undefined });

      const result = await eventService.getUserEvents('poetry-slam', 'user123', '2025-07-01');

      expect(result).toEqual([]);
    });
  });

  describe('updateEventValue', () => {
    it('should update event value by creating new event', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await eventService.updateEventValue(
        'poetry-slam',
        'user123',
        '2025-07-01',
        'poem',
        { content: 'Updated poem' }
      );

      expect(result.value).toEqual({ content: 'Updated poem' });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
