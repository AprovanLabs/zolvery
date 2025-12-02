#!/usr/bin/env tsx

import { DynamoDBClient, ScanCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-2';
const AWS_ENDPOINT_URL = process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
const TABLE_NAME = process.env.TABLE_NAME || 'kossabos-dev-use2-main';
const AWS_PROFILE = process.env.AWS_PROFILE || 'localstack';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: 'kossabos',
    secretAccessKey: 'kossabos'
  }
});

interface DynamoItem {
  PK: { S: string };
  SK: { S: string };
}

/**
 * Scan all items from the table
 */
async function scanAllItems(): Promise<DynamoItem[]> {
  const items: DynamoItem[] = [];
  let lastEvaluatedKey: any = undefined;
  
  do {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'PK, SK',
      ExclusiveStartKey: lastEvaluatedKey
    });
    
    const result = await dynamoClient.send(command);
    
    if (result.Items) {
      items.push(...(result.Items as unknown as DynamoItem[]));
    }
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  return items;
}

/**
 * Delete items in batches (max 25 items per batch)
 */
async function batchDeleteItems(items: DynamoItem[]): Promise<number> {
  if (items.length === 0) {
    return 0;
  }
  
  const batches: DynamoItem[][] = [];
  
  // Split into batches of 25 (DynamoDB limit)
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }
  
  let totalDeleted = 0;
  
  for (const [index, batch] of batches.entries()) {
    console.log(`🗑️  Deleting batch ${index + 1}/${batches.length} (${batch.length} items)...`);
    
    const deleteRequests = batch.map(item => ({
      DeleteRequest: {
        Key: {
          PK: item.PK,
          SK: item.SK
        }
      }
    }));
    
    try {
      const command = new BatchWriteItemCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests
        }
      });
      
      await dynamoClient.send(command);
      totalDeleted += batch.length;
      console.log(`✅ Batch ${index + 1} deleted successfully`);
    } catch (error) {
      console.error(`❌ Error deleting batch ${index + 1}:`, (error as Error).message);
      throw error;
    }
  }
  
  return totalDeleted;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🧹 Wiping DynamoDB table...');
  console.log(`🎯 Target table: ${TABLE_NAME}`);
  console.log(`🌐 Endpoint: ${AWS_ENDPOINT_URL}`);
  console.log(`👤 Profile: ${AWS_PROFILE}`);
  console.log('');
  
  // Scan all items
  console.log('🔍 Scanning for items to delete...');
  const items = await scanAllItems();
  
  console.log(`📋 Found ${items.length} items to delete`);
  
  if (items.length === 0) {
    console.log('✨ Table is already empty!');
    return;
  }
  
  // Confirm deletion
  console.log('');
  console.log('⚠️  WARNING: This will delete ALL items from the table!');
  console.log(`   Table: ${TABLE_NAME}`);
  console.log(`   Items to delete: ${items.length}`);
  console.log('');
  
  // In a real scenario, you might want to add a confirmation prompt here
  // For now, we'll proceed automatically
  
  // Delete all items
  console.log('🗑️  Starting deletion...');
  const deleted = await batchDeleteItems(items);
  
  console.log('');
  console.log('🎉 Table wipe complete!');
  console.log(`🗑️  Total items deleted: ${deleted}`);
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}