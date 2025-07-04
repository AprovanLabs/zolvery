import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { format } from 'date-fns';
import { appConfig } from '@/config';
import { AppData, AppDataRequest, UpdateAppDataRequest } from '@/models/app';

export class AppDataService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: appConfig.dynamodb.region,
      ...(appConfig.dynamodb.endpoint && { endpoint: appConfig.dynamodb.endpoint }),
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = appConfig.dynamodb.tableName;
  }

  async getAppData(request: AppDataRequest): Promise<Record<string, any> | any> {
    const { appId, day, key } = request;

    if (key) {
      // Get specific key
      return this.getAppDataByKey(appId, day, key);
    }

    // Get all app data for the day
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `APPDATA#${appId}#${day}`,
      },
    });

    const result = await this.docClient.send(command);
    const items = result.Items as AppData[] || [];

    // Convert to key-value object
    const data: Record<string, any> = {};
    for (const item of items) {
      data[item.key] = item.value;
    }

    return data;
  }

  async getAppDataByKey(appId: string, day: string, key: string): Promise<any> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `APPDATA#${appId}#${day}`,
        SK: key,
      },
    });

    const result = await this.docClient.send(command);
    const item = result.Item as AppData;
    return item?.value || null;
  }

  async updateAppData(request: UpdateAppDataRequest): Promise<AppData> {
    const timestamp = new Date().toISOString();
    const version = request.version || `v${Date.now()}`;

    const appData: AppData = {
      PK: `APPDATA#${request.appId}#${request.day}`,
      SK: request.key,
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
    return appData;
  }

  async getAppDataWithFallback(appId: string, day: string, key: string, fallback: any = null): Promise<any> {
    try {
      const value = await this.getAppDataByKey(appId, day, key);
      return value !== null ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  async bulkUpdateAppData(appId: string, day: string, data: Record<string, any>): Promise<AppData[]> {
    const timestamp = new Date().toISOString();
    const version = `v${Date.now()}`;
    const results: AppData[] = [];

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

    return results;
  }

  async deleteAppData(appId: string, day: string, key: string): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `APPDATA#${appId}#${day}`,
        SK: key,
        appId,
        day,
        key,
        value: null,
        version: `deleted_${Date.now()}`,
        updatedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Delete after 1 day
      },
    });

    await this.docClient.send(command);
  }

  // Helper method to initialize daily app data with defaults
  async initializeDailyAppData(appId: string, day: string, defaults: Record<string, any>): Promise<void> {
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
    }
  }
}
