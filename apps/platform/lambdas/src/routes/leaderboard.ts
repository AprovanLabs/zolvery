import Router from '@koa/router';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const router = new Router();
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// GET /api/leaderboard
router.get('/', async (ctx) => {
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      ctx.status = 500;
      ctx.body = { error: 'TABLE_NAME environment variable not set' };
      return;
    }

    const command = new ScanCommand({
      TableName: tableName,
      // Add any specific filtering or sorting logic here
    });

    const result = await docClient.send(command);
    
    // Sort by score descending (adjust field names as needed)
    const leaderboard = (result.Items || [])
      .filter(item => item.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 100); // Top 100 players

    ctx.body = {
      leaderboard,
      count: leaderboard.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch leaderboard' };
  }
});

export { router as leaderboardRoutes };
