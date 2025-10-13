import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';

let dynamoDBClient: DynamoDBClient | null = null;
let dynamoDBDocumentClient: DynamoDBDocumentClient | null = null;

export function getDynamoDBClient(): DynamoDBClient {
  if (!dynamoDBClient) {
    const config: {
        region: string;
        endpoint?: string;
        forcePathStyle?: boolean;
        tls?: boolean;
        credentials?: {
            accessKeyId: string;
            secretAccessKey: string;
        };
    } = {
      region: appConfig.aws.region,
    };

    // Configure for LocalStack
    if (appConfig.aws.endpoint) {
      config.endpoint = appConfig.aws.endpoint;
      config.forcePathStyle = true;
      config.tls = false;
    }

    // Add credentials if provided
    if (appConfig.aws.accessKeyId && appConfig.aws.secretAccessKey) {
      config.credentials = {
        accessKeyId: appConfig.aws.accessKeyId,
        secretAccessKey: appConfig.aws.secretAccessKey,
      };
    }

    dynamoDBClient = new DynamoDBClient(config);
  }

  return dynamoDBClient;
}

export function getDynamoDBDocumentClient(): DynamoDBDocumentClient {
  if (!dynamoDBDocumentClient) {
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(getDynamoDBClient());
  }

  return dynamoDBDocumentClient;
}

export const generatePartitionKey = (type: string, ...parts: (string | number)[]): string => {
  const cleanParts = parts.map(p => String(p).replace(/[:#]/g, '_'));
  return [type, ...cleanParts].join('#');
};

export const generateSortKey = (type: string, ...parts: (string | number)[]): string => {
  const cleanParts = parts.map(p => String(p).replace(/[:#]/g, '_'));
  return [type, ...cleanParts].join('#');
};

export type DynamoDbRecord<T> = {
  PK: string,
  SK: string
} & T