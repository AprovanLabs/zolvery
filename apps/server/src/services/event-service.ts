import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '@/config';
import { AppEvent, CreateEventRequest } from '@/models/event';
import { getCurrentDay, getTTL, generatePartitionKey } from '@/utils/date';

export class EventService {
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

  async createEvent(request: CreateEventRequest): Promise<AppEvent> {
    const day = request.day || getCurrentDay();
    const timestamp = new Date().toISOString();

    const event: AppEvent = {
      PK: generatePartitionKey('DAY', day, 'APP', request.appId, 'USER', request.userId),
      SK: `EVENT#${request.eventKey}`,
      eventKey: request.eventKey,
      value: request.value,
      timestamp,
      appId: request.appId,
      userId: request.userId,
      day,
      // Set TTL to 30 days from creation
      ttl: getTTL(30),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: event,
    });

    await this.docClient.send(command);
    return event;
  }

  async getEvent(appId: string, userId: string, day: string, eventKey: string): Promise<AppEvent | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId),
        SK: `EVENT#${eventKey}`,
      },
    });

    const result = await this.docClient.send(command);
    return result.Item as AppEvent || null;
  }

  async getUserEvents(appId: string, userId: string, day: string): Promise<AppEvent[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId),
        ':sk': 'EVENT#',
      },
    });

    const result = await this.docClient.send(command);
    return result.Items as AppEvent[] || [];
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
    return this.createEvent({
      appId,
      userId,
      eventKey,
      value,
      day,
    });
  }
}
