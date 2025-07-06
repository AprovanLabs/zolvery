import { config } from 'dotenv';

const environment = process.env.ENVIRONMENT || 'dev';

config({
  path: environment === 'dev' ? '.env.local' : '.env'
});

export interface AppConfig {
  port: number;
  nodeEnv: string;
  environment: 'dev' | 'tst' | 'stg' | 'prd';
  logLevel: string;
  version: string;
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    endpoint?: string; // For local development
  };
  dynamodb: {
    tableName: string;
  };
  s3: {
    dataBucket: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

const getConfig = (): AppConfig => {
  const requiredEnvVars = [
    'DYNAMODB_TABLE_NAME',
    'S3_DATA_BUCKET',
  ];

  // Check for required environment variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const sha = process.env.BUILD_SHA_PREFIX;
  const version = `${process.env.npm_package_version || '1.0.0'}${sha ? `-${sha}` : ''}`;

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    environment: (process.env.ENVIRONMENT || 'dev') as 'dev' | 'tst' | 'stg' | 'prd',
    version,
    logLevel: process.env.LOG_LEVEL || 'info',
    aws: {
      region: process.env.AWS_REGION || 'us-east-2',
      ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT }),
      ...(process.env.AWS_ACCESS_KEY_ID && { accessKeyId: process.env.AWS_ACCESS_KEY_ID }),
      ...(process.env.AWS_SECRET_ACCESS_KEY && { secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }),
    },
    dynamodb: {
      tableName: process.env.DYNAMODB_TABLE_NAME!,
    },
    s3: {
      dataBucket: process.env.S3_DATA_BUCKET!,
    },
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
  };
};

export const appConfig = getConfig();
