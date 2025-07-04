import Router from '@koa/router';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const router = new Router();
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// GET /api/user-status/:userId
router.get('/:userId', async (ctx) => {
  try {
    const { userId } = ctx.params;
    const tableName = process.env.TABLE_NAME;
    
    if (!tableName) {
      ctx.status = 500;
      ctx.body = { error: 'TABLE_NAME environment variable not set' };
      return;
    }

    if (!userId) {
      ctx.status = 400;
      ctx.body = { error: 'User ID is required' };
      return;
    }

    const command = new GetCommand({
      TableName: tableName,
      Key: { userId }
    });

    const result = await docClient.send(command);
    
    if (!result.Item) {
      ctx.status = 404;
      ctx.body = { error: 'User not found' };
      return;
    }

    ctx.body = {
      user: result.Item,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching user status:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch user status' };
  }
});

// PUT /api/user-status/:userId
router.put('/:userId', async (ctx) => {
  try {
    const { userId } = ctx.params;
    const updateData = ctx.request.body;
    const tableName = process.env.TABLE_NAME;
    
    if (!tableName) {
      ctx.status = 500;
      ctx.body = { error: 'TABLE_NAME environment variable not set' };
      return;
    }

    if (!userId) {
      ctx.status = 400;
      ctx.body = { error: 'User ID is required' };
      return;
    }

    // Build update expression dynamically
    const updateExpression: string[] = [];
    const expressionAttributeValues: any = {};
    const expressionAttributeNames: any = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    
    ctx.body = {
      user: result.Attributes,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating user status:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to update user status' };
  }
});

export { router as userStatusRoutes };
