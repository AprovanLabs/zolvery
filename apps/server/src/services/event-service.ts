import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import { getLogger, logError } from '@/config/logger';
import { AppEvent, CreateEventRequest } from '@/models/event';
import { getCurrentDay, getTTL } from '@/utils/date';
import { eventKeys, generatePartitionKey } from '@/utils/dynamo';
import { AppEventBusIntegration, AppEventType } from '@/utils/events/integration';
import { InMemoryEventBus } from '@/utils/events';

const logger = getLogger();

export class EventService {
  private readonly eventBus: AppEventBusIntegration;

  constructor(
    private readonly docClient: DynamoDBDocumentClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName,
    eventBus?: AppEventBusIntegration
  ) {
    // Use provided event bus or create a new one with in-memory implementation
    this.eventBus = eventBus || new AppEventBusIntegration(new InMemoryEventBus());
  }

  async createEvent(userId: string, request: CreateEventRequest): Promise<AppEvent> {
    const day = request.day || getCurrentDay();
    const timestamp = new Date().toISOString();

    const event: AppEvent = {
      PK: eventKeys.partitionKey(day, request.appId, userId),
      SK: eventKeys.sortKey(request.eventKey),
      eventKey: request.eventKey,
      value: request.value,
      timestamp,
      appId: request.appId,
      userId,
      day,
      // Set TTL to 30 days from creation
      ttl: getTTL(30),
    };

    logger.info({
      operation: 'createEvent',
      PK: event.PK,
      SK: event.SK,
      appId: request.appId,
      userId,
      eventKey: request.eventKey,
      day,
    }, 'Creating event in DynamoDB');

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: event,
      });

      await this.docClient.send(command);
      
      logger.info({
        operation: 'createEvent',
        PK: event.PK,
        SK: event.SK,
      }, 'Event created successfully in DynamoDB');

      // Publish event to event bus
      try {
        const appEvent = {
          id: `${event.PK}#${event.SK}`,
          eventKey: event.eventKey,
          value: event.value,
          appId: event.appId,
          userId: event.userId,
          day: event.day,
          timestamp: event.timestamp,
          ...(event.ttl !== undefined && { ttl: event.ttl }),
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
          version: 'v1',
        };

        await this.eventBus.publishAppEventCreated(appEvent);
        
        logger.debug({
          operation: 'createEvent',
          eventType: AppEventType.APP_EVENT_CREATED,
          appId: event.appId,
          userId: event.userId,
          eventKey: event.eventKey,
        }, 'Event published to event bus');
      } catch (busError) {
        // Log but don't throw - event bus failures shouldn't fail the main operation
        logger.error({
          operation: 'createEvent',
          error: busError,
          appId: event.appId,
          userId: event.userId,
          eventKey: event.eventKey,
        }, 'Failed to publish event to event bus');
      }
      
      return event;
    } catch (error) {
      logError(logger, error as Error, {
        operation: 'createEvent',
        PK: event.PK,
        SK: event.SK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getEvent(appId: string, userId: string, day: string, eventKey: string): Promise<AppEvent | null> {
    const PK = eventKeys.partitionKey(day, appId, userId);
    const SK = eventKeys.sortKey(eventKey);
    
    logger.debug({
      operation: 'getEvent',
      PK,
      SK,
      appId,
      userId,
      day,
      eventKey,
    }, 'Getting event from DynamoDB');

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { PK, SK },
      });

      const result = await this.docClient.send(command);
      const event = result.Item as AppEvent || null;
      
      logger.debug({
        operation: 'getEvent',
        PK,
        SK,
        found: !!event,
      }, 'Event retrieval completed');
      
      return event;
    } catch (error) {
      logError(logger, error as Error, {
        operation: 'getEvent',
        PK,
        SK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getUserEvents(appId: string, userId: string, day: string): Promise<AppEvent[]> {
    const PK = eventKeys.partitionKey(day, appId, userId);
    
    logger.debug({
      operation: 'getUserEvents',
      PK,
      appId,
      userId,
      day,
    }, 'Querying user events from DynamoDB');

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
      const events = result.Items as AppEvent[] || [];
      
      logger.info({
        operation: 'getUserEvents',
        PK,
        eventCount: events.length,
      }, 'User events query completed');
      
      return events;
    } catch (error) {
      logError(logger, error as Error, {
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
    keyPattern: string
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
    return result.Items as AppEvent[] || [];
  }

  async updateEventValue(
    appId: string, 
    userId: string, 
    day: string, 
    eventKey: string, 
    value: any
  ): Promise<AppEvent> {
    // For DynamoDB, we just overwrite the item with PUT
    return this.createEvent(userId, {
      appId,
      eventKey,
      value,
    });
  }
}
