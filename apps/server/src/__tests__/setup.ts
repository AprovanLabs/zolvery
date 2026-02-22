import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'development';
process.env.ENVIRONMENT = 'tst';
process.env.AWS_REGION = 'us-east-2';
process.env.DYNAMODB_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME || 'zolvery-tst-use2-main';
process.env.S3_DATA_BUCKET =
  process.env.S3_DATA_BUCKET || 'zolvery-tst-use2-data';

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
