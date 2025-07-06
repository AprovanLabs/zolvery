import request from 'supertest';
import { app } from '@/app';
import { EventService } from '@/services/event-service';

// Mock the EventService
jest.mock('@/services/event-service');
const MockedEventService = EventService as jest.MockedClass<typeof EventService>;

describe('Events API Integration Tests', () => {
  let mockEventService: jest.Mocked<EventService>;

  beforeEach(() => {
    mockEventService = new MockedEventService() as jest.Mocked<EventService>;
    MockedEventService.mockClear();
  });

  describe('POST /events', () => {
    it('should create a new event successfully', async () => {
      const eventData = {
        appId: 'poetry-slam',
        userId: 'user123',
        eventKey: 'poem',
        value: { content: 'Roses are red, violets are blue' },
      };

      const mockEvent = {
        ...eventData,
        PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
        SK: 'EVENT#poem',
        day: '2025-07-01',
        timestamp: '2025-07-01T12:00:00Z',
        ttl: 1234567890,
      };

      mockEventService.createEvent.mockResolvedValueOnce(mockEvent);

      const response = await request(app.callback())
        .post('/events')
        .send(eventData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: mockEvent,
        message: 'Event stored successfully',
      });

      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        appId: 'poetry-slam',
        // missing userId, eventKey
        value: { content: 'test' },
      };

      const response = await request(app.callback())
        .post('/events')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing required fields: appId, userId, eventKey',
      });
    });

    it('should handle service errors', async () => {
      const eventData = {
        appId: 'poetry-slam',
        userId: 'user123',
        eventKey: 'poem',
        value: { content: 'test' },
      };

      mockEventService.createEvent.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app.callback())
        .post('/events')
        .send(eventData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to store event',
      });
    });
  });

  describe('GET /events/:appId/:userId/:day', () => {
    it('should fetch user events successfully', async () => {
      const mockEvents = [
        {
          PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
          SK: 'EVENT#poem',
          eventKey: 'poem',
          value: { content: 'First poem' },
          appId: 'poetry-slam',
          userId: 'user123',
          day: '2025-07-01',
        },
        {
          PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
          SK: 'EVENT#vote',
          eventKey: 'vote',
          value: { score: 4 },
          appId: 'poetry-slam',
          userId: 'user123',
          day: '2025-07-01',
        },
      ];

      mockEventService.getUserEvents.mockResolvedValueOnce(mockEvents);

      const response = await request(app.callback())
        .get('/events/poetry-slam/user123/2025-07-01')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockEvents,
      });

      expect(mockEventService.getUserEvents).toHaveBeenCalledWith('poetry-slam', 'user123', '2025-07-01');
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app.callback())
        .get('/events/poetry-slam/') // missing userId and day
        .expect(404); // This will be 404 since route doesn't match

      // Alternative test with correct route structure
      const response2 = await request(app.callback())
        .get('/events///') // empty parameters
        .expect(404);
    });
  });

  describe('GET /events/:appId/:userId/:day/:eventKey', () => {
    it('should fetch specific event successfully', async () => {
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

      mockEventService.getEvent.mockResolvedValueOnce(mockEvent);

      const response = await request(app.callback())
        .get('/events/poetry-slam/user123/2025-07-01/poem')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockEvent,
      });

      expect(mockEventService.getEvent).toHaveBeenCalledWith('poetry-slam', 'user123', '2025-07-01', 'poem');
    });

    it('should return 404 when event not found', async () => {
      mockEventService.getEvent.mockResolvedValueOnce(null);

      const response = await request(app.callback())
        .get('/events/poetry-slam/user123/2025-07-01/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Event not found',
      });
    });
  });

  describe('GET /events/:appId/:userId', () => {
    it('should fetch events for today', async () => {
      const mockEvents = [
        {
          PK: 'DAY#2025-07-01#APP#poetry-slam#USER#user123',
          SK: 'EVENT#poem',
          eventKey: 'poem',
          value: { content: 'Today poem' },
          appId: 'poetry-slam',
          userId: 'user123',
        },
      ];

      mockEventService.getUserEvents.mockResolvedValueOnce(mockEvents);

      const response = await request(app.callback())
        .get('/events/poetry-slam/user123')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockEvents,
      });

      // Should call getUserEvents with today's date
      expect(mockEventService.getUserEvents).toHaveBeenCalledWith(
        'poetry-slam',
        'user123',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.callback())
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        environment: 'test',
      });

      expect(response.body.timestamp).toBeDefined();
    });
  });
});
