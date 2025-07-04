import { config } from 'dotenv';

// Load environment variables
config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  dynamodb: {
    tableName: string;
    region: string;
    endpoint?: string; // For local development
  };
  s3: {
    i18nBucket: string;
    region: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

const getConfig = (): AppConfig => {
  const requiredEnvVars = [
    'DYNAMODB_TABLE_NAME',
    'S3_I18N_BUCKET',
    'JWT_SECRET'
  ];

  // Check for required environment variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    aws: {
      region: process.env.AWS_REGION || 'us-east-2',
      ...(process.env.AWS_ACCESS_KEY_ID && { accessKeyId: process.env.AWS_ACCESS_KEY_ID }),
      ...(process.env.AWS_SECRET_ACCESS_KEY && { secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }),
    },
    dynamodb: {
      tableName: process.env.DYNAMODB_TABLE_NAME!,
      region: process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'us-east-2',
      ...(process.env.DYNAMODB_ENDPOINT && { endpoint: process.env.DYNAMODB_ENDPOINT }),
    },
    s3: {
      i18nBucket: process.env.S3_I18N_BUCKET!,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-2',
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
  };
};

export const appConfig = getConfig();
