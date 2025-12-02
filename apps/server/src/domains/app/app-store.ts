import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { App } from '@kossabos/core';
import { appConfig } from '@/config';
import logger from '@/logger';
import {
  DynamoDbRecord,
  generatePartitionKey,
  generateSortKey,
  getDynamoDBDocumentClient,
} from '@/aws/dynamodb';

const appKeys = {
  partitionKey: (appId: string) =>
    generatePartitionKey('APP', appId),
  sortKey: () => generateSortKey('DATA', 'v1'),    
};

export interface AppStore {
  getApp(appId: string): Promise<DynamoDbRecord<App> | undefined>;
}

export class DynamoDbAppStore implements AppStore {
  constructor(
    private readonly docClient: DynamoDBDocumentClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
  ) {}

  async getApp(appId: string): Promise<DynamoDbRecord<App> | undefined> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: appKeys.partitionKey(appId),
          SK: appKeys.sortKey()
        }
      });

      const result = await this.docClient.send(command);
      return result.Item as DynamoDbRecord<App> | undefined;
    } catch (error) {
      logger.error(error as Error, {
        operation: 'get',
        tableName: this.tableName,
      });
      return undefined;
    }
  }
}

export const getAppStore = () => new DynamoDbAppStore()
