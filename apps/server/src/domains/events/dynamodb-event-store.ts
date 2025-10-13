import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';
import logger from '@/logger';
import { EventMessage, EventStore } from '@/event-bus';
import {
  DynamoDbRecord,
  generatePartitionKey,
  generateSortKey,
  getDynamoDBDocumentClient,
} from '@/aws/dynamodb';
import { AppEvent } from './event';
import { getTTL } from '@/utils/date';

const eventKeys = {
  partitionKey: (day: string, appId: string, userId: string) =>
    generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId),
  sortKey: (eventKey: string) => generateSortKey('EVENT', eventKey),
  gsi1PartitionKey: (userId: string, appId: string) =>
    generatePartitionKey('USER', userId, 'APP', appId),
  gsi1SortKey: (day: string) => generateSortKey('DAY', day),
};

export class DynamoDbEventStore implements EventStore {
  constructor(
    private readonly docClient: DynamoDBDocumentClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
  ) {}

  save(event: AppEvent) {
    const record: DynamoDbRecord<AppEvent> = {
      PK: eventKeys.partitionKey(event.day, event.appId, event.userId),
      SK: eventKeys.sortKey(event.eventKey),
      ...event,
      // Set TTL to 30 days from creation
      ttl: getTTL(30),
    };

    logger.info(
      {
        operation: 'createEvent',
        PK: record.PK,
        SK: record.SK,
      },
      'Creating event in DynamoDB',
    );

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: event,
      });

      await this.docClient.send(command);

      logger.info(
        {
          operation: 'createEvent',
          PK: event.PK,
          SK: event.SK,
        },
        'Event created successfully in DynamoDB',
      );
    } catch (error) {
      logger.error(error as Error, {
        operation: 'createEvent',
        PK: event.PK,
        SK: event.SK,
        tableName: this.tableName,
      });
    }
  }
}
