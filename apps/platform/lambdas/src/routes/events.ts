import Router from '@koa/router';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const router = new Router();
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// POST /api/events
router.post('/', async (ctx) => {
  try {
    const eventData = ctx.request.body;
    const tableName = process.env.TABLE_NAME;
    
    if (!tableName) {
      ctx.status = 500;
      ctx.body = { error: 'TABLE_NAME environment variable not set' };
      return;
    }

    if (!eventData) {
      ctx.status = 400;
      ctx.body = { error: 'Event data is required' };
      return;
    }

    // Add timestamp and event ID
    const event = {
      ...eventData,
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: event
    });

    await docClient.send(command);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      event,
      message: 'Event stored successfully'
    };
  } catch (error) {
    console.error('Error storing event:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to store event' };
  }
});

// GET /api/events (optional - for retrieving events)
router.get('/', async (ctx) => {
  try {
    const tableName = process.env.TABLE_NAME;
    const limit = parseInt(ctx.query.limit as string) || 50;
    
    if (!tableName) {
      ctx.status = 500;
      ctx.body = { error: 'TABLE_NAME environment variable not set' };
      return;
    }

    // This is a simple scan - in production you might want to use a GSI
    // or different querying strategy depending on your data model
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: tableName,
      Limit: limit,
      FilterExpression: 'attribute_exists(eventId)'
    });

    const result = await docClient.send(command);

    ctx.body = {
      events: result.Items || [],
      count: (result.Items || []).length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch events' };
  }
});

export { router as eventRoutes };
