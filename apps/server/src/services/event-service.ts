import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { appConfig } from '@/config';
import { getDynamoDBDocumentClient } from '@/aws';
import { dbLogger, logError } from '@/config/logger';
import { AppEvent, CreateEventRequest } from '@/models/event';
import { getCurrentDay, getTTL } from '@/utils/date';
import { generatePartitionKey } from '@/utils/dynamodb';

export class EventService {
  constructor(
    private readonly docClient: DynamoDBDocumentClient = getDynamoDBDocumentClient(),
    private readonly tableName: string = appConfig.dynamodb.tableName
  ) {}

  async createEvent(userId: string, request: CreateEventRequest): Promise<AppEvent> {
    const day = getCurrentDay();
    const timestamp = new Date().toISOString();

    const event: AppEvent = {
      PK: generatePartitionKey('DAY', day, 'APP', request.appId, 'USER', userId),
      SK: `EVENT#${request.eventKey}`,
      eventKey: request.eventKey,
      value: request.value,
      timestamp,
      appId: request.appId,
      userId,
      day,
      // Set TTL to 30 days from creation
      ttl: getTTL(30),
    };

    dbLogger.info({
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
      
      dbLogger.info({
        operation: 'createEvent',
        PK: event.PK,
        SK: event.SK,
      }, 'Event created successfully in DynamoDB');
      
      return event;
    } catch (error) {
      logError(dbLogger, error as Error, {
        operation: 'createEvent',
        PK: event.PK,
        SK: event.SK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getEvent(appId: string, userId: string, day: string, eventKey: string): Promise<AppEvent | null> {
    const PK = generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId);
    const SK = `EVENT#${eventKey}`;
    
    dbLogger.debug({
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
      
      dbLogger.debug({
        operation: 'getEvent',
        PK,
        SK,
        found: !!event,
      }, 'Event retrieval completed');
      
      return event;
    } catch (error) {
      logError(dbLogger, error as Error, {
        operation: 'getEvent',
        PK,
        SK,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  async getUserEvents(appId: string, userId: string, day: string): Promise<AppEvent[]> {
    const PK = generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId);
    
    dbLogger.debug({
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
      
      dbLogger.info({
        operation: 'getUserEvents',
        PK,
        eventCount: events.length,
      }, 'User events query completed');
      
      return events;
    } catch (error) {
      logError(dbLogger, error as Error, {
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
