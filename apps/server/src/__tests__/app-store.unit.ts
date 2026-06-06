import { DynamoDbAppStore } from '@/domains/app/app-store';
import { NotFoundError } from '@/domains/common/errors';

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

jest.mock('@aws-sdk/lib-dynamodb');

const mockSend = jest.fn();

jest.mock('@/aws/dynamodb', () => ({
  getDynamoDBDocumentClient: () => ({ send: mockSend }),
  generatePartitionKey: (prefix: string, id: string) => `${prefix}#${id}`,
  generateSortKey: (prefix: string, version: string) => `${prefix}#${version}`,
  DynamoDbRecord: undefined,
}));

describe('DynamoDbAppStore', () => {
  let store: DynamoDbAppStore;

  beforeEach(() => {
    mockSend.mockReset();
    store = new DynamoDbAppStore();
  });

  describe('getApp', () => {
    it('should throw NotFoundError when item does not exist', async () => {
      mockSend.mockResolvedValue({ Item: null });

      await expect(store.getApp('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should return app data when item exists', async () => {
      const mockApp = {
        appId: 'test-app',
        name: 'Test App',
        visibility: 'public',
      };
      mockSend.mockResolvedValue({ Item: mockApp });

      const result = await store.getApp('test-app');
      expect(result).toEqual(mockApp);
    });

    it('should rethrow on DynamoDB error', async () => {
      const dbError = new Error('DynamoDB connection failed');
      mockSend.mockRejectedValue(dbError);

      await expect(store.getApp('test-app')).rejects.toThrow(
        'DynamoDB connection failed',
      );
    });
  });
});
