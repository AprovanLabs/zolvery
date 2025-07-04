import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'kossabos-test-table';
process.env.S3_I18N_BUCKET = process.env.S3_I18N_BUCKET || 'kossabos-test-i18n';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

// Mock AWS SDK for tests
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-s3');

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
