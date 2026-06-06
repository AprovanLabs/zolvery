import { AppService } from '@/domains/app/app-service';
import { NotFoundError, UnauthorizedError } from '@/domains/common/errors';

jest.mock('@/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-id'),
  createTimer: jest.fn(() => () => 0),
  setRequestContext: jest.fn(),
  requestContextStore: { getStore: jest.fn(), enterWith: jest.fn() },
}));

jest.mock('@/config', () => ({
  appConfig: {
    nodeEnv: 'test',
    environment: 'tst',
    port: 3000,
    logLevel: 'debug',
    version: '1.0.0-test',
    aws: { region: 'us-east-2' },
    dynamodb: { tableName: 'test-table' },
    s3: { dataBucket: 'test-bucket' },
    cors: { origin: [/^http:\/\/localhost:\d+$/], credentials: false },
  },
}));

const mockGetApp = jest.fn();

jest.mock('@/domains/app/app-store', () => ({
  getAppStore: () => ({
    getApp: mockGetApp,
  }),
  DynamoDbAppStore: jest.fn(),
}));

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    mockGetApp.mockReset();
    service = new AppService();
  });

  describe('getAppById', () => {
    it('should throw NotFoundError when app store throws NotFoundError', async () => {
      mockGetApp.mockRejectedValue(
        new NotFoundError('App not found: test-app'),
      );

      await expect(service.getAppById('test-app', 'user-1')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should return public app regardless of user', async () => {
      const mockApp = {
        appId: 'public-app',
        visibility: 'public',
        authorId: 'other-user',
      };
      mockGetApp.mockResolvedValue(mockApp);

      const result = await service.getAppById('public-app', 'user-1');
      expect(result).toEqual(mockApp);
    });

    it('should return private app when user is the author', async () => {
      const mockApp = {
        appId: 'private-app',
        visibility: 'private',
        authorId: 'user-1',
      };
      mockGetApp.mockResolvedValue(mockApp);

      const result = await service.getAppById('private-app', 'user-1');
      expect(result).toEqual(mockApp);
    });

    it('should throw UnauthorizedError when user is not the author of private app', async () => {
      const mockApp = {
        appId: 'private-app',
        visibility: 'private',
        authorId: 'other-user',
      };
      mockGetApp.mockResolvedValue(mockApp);

      await expect(service.getAppById('private-app', 'user-1')).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });
});
