import { PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import logger from '@/logger';
import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import {
  AppData,
  AppDataRequest,
  UpdateAppDataRequest,
} from './app';
import { DynamoDbRecord, generatePartitionKey, generateSortKey } from '@/aws/dynamodb';

const appKeys = {
  partitionKey: (appId: string) => generatePartitionKey('APP', appId),
  sortKey: (type: string, key?: string) =>
    generateSortKey(type.toUpperCase(), key || ''),
  configSortKey: (configKey: string) => generateSortKey('CONFIG', configKey),
  dataSortKey: (day: string, dataKey: string) =>
    generateSortKey('DATA', day, dataKey),
};

const appDataKeys = {
  partitionKey: (appId: string, day: string) =>
    generatePartitionKey('APPDATA', appId, day),
  sortKey: (dataKey: string) => dataKey, // For app data, the sort key is just the data key itself
}

export class AppDataService {
  constructor(
    private readonly docClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
  ) {}

  async getAppData(
    request: AppDataRequest,
  ): Promise<Record<string, any> | any> {
    const { appId, day } = request;

    logger.debug({ appId, day }, 'Getting app data');

    // Get all app data for the day
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': appDataKeys.partitionKey(appId, day),
      },
    });

    const result = await this.docClient.send(command);
    const items = (result.Items as AppData[]) || [];

    logger.debug(
      { appId, day, itemCount: items.length },
      'Retrieved app data items',
    );

    // Convert to key-value object
    const data: Record<string, any> = {};
    for (const item of items) {
      data[item.key] = item.value;
    }

    logger.debug(
      { appId, day, keyCount: Object.keys(data).length },
      'App data processed',
    );
    return data;
  }

  async getAppDataByKey(appId: string, day: string, key: string): Promise<any> {
    logger.debug({ appId, day, key }, 'Getting app data by key');

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: appDataKeys.partitionKey(appId, day),
        SK: appDataKeys.sortKey(key),
      },
    });

    const result = await this.docClient.send(command);
    const item = result.Item as AppData;
    const value = item?.value || null;

    logger.debug({ appId, day, key, found: !!item }, 'App data by key result');
    return value;
  }

  async updateAppData(request: UpdateAppDataRequest): Promise<AppData> {
    const timestamp = new Date().toISOString();
    const version = request.version || `v${Date.now()}`;

    logger.debug(
      {
        appId: request.appId,
        day: request.day,
        key: request.key,
        version,
      },
      'Updating app data',
    );

    const appData: DynamoDbRecord<AppData> = {
      PK: appDataKeys.partitionKey(request.appId, request.day),
      SK: appDataKeys.sortKey(request.key),
      appId: request.appId,
      day: request.day,
      key: request.key,
      value: request.value,
      version,
      updatedAt: timestamp,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: appData,
    });

    await this.docClient.send(command);

    logger.debug(
      {
        appId: request.appId,
        day: request.day,
        key: request.key,
      },
      'App data updated successfully',
    );

    return appData;
  }

  async getAppDataWithFallback(
    appId: string,
    day: string,
    key: string,
    fallback: any = null,
  ): Promise<any> {
    try {
      const value = await this.getAppDataByKey(appId, day, key);
      return value !== null ? value : fallback;
    } catch (error) {
      logger.error(
        { appId, day, key, error },
        'Error getting app data, using fallback',
      );
      return fallback;
    }
  }

  async bulkUpdateAppData(
    appId: string,
    day: string,
    data: Record<string, any>,
  ): Promise<AppData[]> {
    const version = `v${Date.now()}`;
    const results: AppData[] = [];

    logger.debug(
      { appId, day, keyCount: Object.keys(data).length },
      'Bulk updating app data',
    );

    for (const [key, value] of Object.entries(data)) {
      const appData = await this.updateAppData({
        appId,
        day,
        key,
        value,
        version,
      });
      results.push(appData);
    }

    logger.debug(
      { appId, day, updatedCount: results.length },
      'Bulk update completed',
    );
    return results;
  }

  async deleteAppData(appId: string, day: string, key: string): Promise<void> {
    logger.debug({ appId, day, key }, 'Deleting app data');

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: appDataKeys.partitionKey(appId, day),
        SK: appDataKeys.sortKey(key),
        appId,
        day,
        key,
        value: null,
        version: `deleted_${Date.now()}`,
        updatedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Delete after 1 day
      },
    });

    await this.docClient.send(command);
    logger.debug({ appId, day, key }, 'App data deleted');
  }

  // Helper method to initialize daily app data with defaults
  async initializeDailyAppData(
    appId: string,
    day: string,
    defaults: Record<string, any>,
  ): Promise<void> {
    logger.debug(
      { appId, day, defaultCount: Object.keys(defaults).length },
      'Initializing daily app data',
    );

    const existingData = await this.getAppData({ appId, day });

    // Only set defaults for missing keys
    const toUpdate: Record<string, any> = {};
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in existingData)) {
        toUpdate[key] = value;
      }
    }

    if (Object.keys(toUpdate).length > 0) {
      await this.bulkUpdateAppData(appId, day, toUpdate);
      logger.debug(
        { appId, day, updatedCount: Object.keys(toUpdate).length },
        'Daily app data initialized',
      );
    } else {
      logger.debug(
        { appId, day },
        'No initialization needed - all defaults already exist',
      );
    }
  }
}
