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

const appDataKeys = {
    partitionKey: (appId: string, day: string) =>
        generatePartitionKey('APPDATA', appId, day),
    sortKey: (dataKey: string) => dataKey, // For app data, the sort key is just the data key itself
}

export interface DailyDataStore {

}

export class DynamoDbDailyDataStore {
    constructor(
        private readonly docClient = getDynamoDBDocumentClient(),
    )

    async get(
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

}