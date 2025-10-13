import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import logger from '@/logger';
import { AppEvent, CreateEventRequest } from '@/domains/events/event';
import { getCurrentDay, getTTL } from '@/utils/date';

import {
  DynamoDbRecord,
  generatePartitionKey,
  generateSortKey,
} from '@/aws/dynamodb';
import { EventPublisher, EventStore } from '@/event-bus';

export class EventService {
  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly eventStore: EventStore,
  ) {}

  async createEvent(
    userId: string,
    request: CreateEventRequest,
  ): Promise<AppEvent> {
    const day = request.day || getCurrentDay();
    const timestamp = new Date().toISOString();

    try {
      await this.eventStore.save({
        eventKey: request.eventKey,
        value: request.value,
        timestamp,
        appId: request.appId,
        userId,
        day,
      });

      await this.eventPublisher.publish(appEvent);

      logger.debug(
        {
          operation: 'createEvent',
          eventType: AppEventType.APP_EVENT_CREATED,
          appId: event.appId,
          userId: event.userId,
          eventKey: event.eventKey,
        },
        'Event published to event bus',
      );

      return event;
    } catch (error) {
      logger.error(error as Error, {
        operation: 'createEvent',
        PK: event.PK,
        SK: event.SK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getEvent(
    appId: string,
    userId: string,
    day: string,
    eventKey: string,
  ): Promise<AppEvent | null> {
    const PK = eventKeys.partitionKey(day, appId, userId);
    const SK = eventKeys.sortKey(eventKey);

    logger.debug(
      {
        operation: 'getEvent',
        PK,
        SK,
        appId,
        userId,
        day,
        eventKey,
      },
      'Getting event from DynamoDB',
    );

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { PK, SK },
      });

      const result = await this.docClient.send(command);
      const event = (result.Item as AppEvent) || null;

      logger.debug(
        {
          operation: 'getEvent',
          PK,
          SK,
          found: !!event,
        },
        'Event retrieval completed',
      );

      return event;
    } catch (error) {
      logger.error(error as Error, {
        operation: 'getEvent',
        PK,
        SK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getUserEvents(
    appId: string,
    userId: string,
    day: string,
  ): Promise<AppEvent[]> {
    const PK = eventKeys.partitionKey(day, appId, userId);

    logger.debug(
      {
        operation: 'getUserEvents',
        PK,
        appId,
        userId,
        day,
      },
      'Querying user events from DynamoDB',
    );

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': PK,
          ':sk': 'EVENT#',
        },
      });

      const result = await this.docClient.send(command);
      const events = (result.Items as AppEvent[]) || [];

      logger.info(
        {
          operation: 'getUserEvents',
          PK,
          eventCount: events.length,
        },
        'User events query completed',
      );

      return events;
    } catch (error) {
      logger.error(error as Error, {
        operation: 'getUserEvents',
        PK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getUserEventsByKeyPattern(
    appId: string,
    userId: string,
    day: string,
    keyPattern: string,
  ): Promise<AppEvent[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId),
        ':sk': `EVENT#${keyPattern}`,
      },
    });

    const result = await this.docClient.send(command);
    return (result.Items as AppEvent[]) || [];
  }

  async updateEventValue(
    appId: string,
    userId: string,
    day: string,
    eventKey: string,
    value: any,
  ): Promise<AppEvent> {
    // For DynamoDB, we just overwrite the item with PUT
    return this.createEvent(userId, {
      appId,
      eventKey,
      value,
    });
  }
}
