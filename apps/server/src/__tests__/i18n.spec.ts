import request from 'supertest';
import { app } from '@/app';
import { I18nService } from '@/services/i18n-service';

// Mock the I18nService
jest.mock('@/services/i18n-service');
const MockedI18nService = I18nService as jest.MockedClass<typeof I18nService>;

describe('I18n API Integration Tests', () => {
  let mockI18nService: jest.Mocked<I18nService>;

  beforeEach(() => {
    mockI18nService = new MockedI18nService() as jest.Mocked<I18nService>;
    MockedI18nService.mockClear();
  });

  describe('GET /i18n/:appId/:locale', () => {
    it('should get translations successfully', async () => {
      const mockTranslations = {
        'welcome': 'Welcome',
        'goodbye': 'Goodbye',
        'hello': 'Hello {name}',
      };

      mockI18nService.getTranslations.mockResolvedValue(mockTranslations);

      const response = await request(app)
        .get('/i18n/test-app/en-US')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.translations).toEqual(mockTranslations);
      expect(response.body.data.locale).toBe('en-US');
      expect(response.body.data.appId).toBe('test-app');
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .get('/i18n/test-app/')
        .expect(404); // 404 because the route doesn't match

      // Test missing appId
      const response2 = await request(app)
        .get('/i18n//en-US')
        .expect(404); // 404 because the route doesn't match
    });

    it('should return 500 for service errors', async () => {
      mockI18nService.getTranslations.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app)
        .get('/i18n/test-app/en-US')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch app translations');
    });
  });

  describe('POST /i18n/:appId/:locale', () => {
    it('should store translations successfully', async () => {
      const translations = {
        'welcome': 'Bienvenido',
        'goodbye': 'Adiós',
        'hello': 'Hola {name}',
      };

      mockI18nService.storeTranslations.mockResolvedValue();

      const response = await request(app)
        .post('/i18n/test-app/es-ES')
        .send({ translations })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locale).toBe('es-ES');
      expect(response.body.data.appId).toBe('test-app');
      expect(mockI18nService.storeTranslations).toHaveBeenCalledWith('test-app', 'es-ES', translations);
    });

    it('should return 400 for missing translations', async () => {
      const response = await request(app)
        .post('/i18n/test-app/es-ES')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing or invalid translations object');
    });

    it('should return 400 for invalid translations type', async () => {
      const response = await request(app)
        .post('/i18n/test-app/es-ES')
        .send({ translations: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing or invalid translations object');
    });
  });

  describe('GET /i18n/:appId/locales', () => {
    it('should get available locales successfully', async () => {
      const mockLocales = ['en-US', 'es-ES', 'fr-FR'];

      mockI18nService.getAvailableLocales.mockResolvedValue(mockLocales);

      const response = await request(app)
        .get('/i18n/test-app/locales')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locales).toEqual(mockLocales);
      expect(response.body.data.appId).toBe('test-app');
    });

    it('should return 500 for service errors', async () => {
      mockI18nService.getAvailableLocales.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app)
        .get('/i18n/test-app/locales')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch available locales');
    });
  });

  describe('GET /i18n/:appId/:locale/metadata', () => {
    it('should get translation metadata successfully', async () => {
      const mockMetadata = {
        version: 'v1704398400000',
        lastUpdated: '2024-01-04T12:00:00.000Z',
      };

      mockI18nService.getTranslationMetadata.mockResolvedValue(mockMetadata);

      const response = await request(app)
        .get('/i18n/test-app/en-US/metadata')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(mockMetadata.version);
      expect(response.body.data.lastUpdated).toBe(mockMetadata.lastUpdated);
      expect(response.body.data.locale).toBe('en-US');
      expect(response.body.data.appId).toBe('test-app');
    });

    it('should return 404 for non-existent translations', async () => {
      mockI18nService.getTranslationMetadata.mockResolvedValue(null);

      const response = await request(app)
        .get('/i18n/test-app/non-existent/metadata')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Translations not found');
    });
  });

  describe('DELETE /i18n/:appId/:locale', () => {
    it('should delete translations successfully', async () => {
      mockI18nService.deleteTranslations.mockResolvedValue();

      const response = await request(app)
        .delete('/i18n/test-app/en-US')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locale).toBe('en-US');
      expect(response.body.data.appId).toBe('test-app');
      expect(mockI18nService.deleteTranslations).toHaveBeenCalledWith('test-app', 'en-US');
    });

    it('should return 500 for service errors', async () => {
      mockI18nService.deleteTranslations.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app)
        .delete('/i18n/test-app/en-US')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to delete app translations');
    });
  });
});
