import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { App } from '@zolver/core';
import { appConfig } from '@/config';
import logger from '@/logger';
import {
  DynamoDbRecord,
  generatePartitionKey,
  generateSortKey,
  getDynamoDBDocumentClient,
} from '@/aws/dynamodb';

import { NotFoundError } from '../common/errors';

const appKeys = {
  partitionKey: (appId: string) => generatePartitionKey('APP', appId),
  sortKey: () => generateSortKey('DATA', 'v1'),
};

export interface AppStore {
  getApp(appId: string): Promise<DynamoDbRecord<App>>;
}

export class DynamoDbAppStore implements AppStore {
  constructor(
    private readonly docClient: DynamoDBDocumentClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
  ) {}

  async getApp(appId: string): Promise<DynamoDbRecord<App>> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: appKeys.partitionKey(appId),
          SK: appKeys.sortKey(),
        },
      });

      const result = await this.docClient.send(command);
      if (!result.Item) {
        throw new NotFoundError(`App not found: ${appId}`);
      }
      return result.Item as DynamoDbRecord<App>;
    } catch (error) {
      logger.error(error as Error, {
        operation: 'get',
        tableName: this.tableName,
      });
      throw error;
    }
  }
}

export const getAppStore = () => new DynamoDbAppStore();
