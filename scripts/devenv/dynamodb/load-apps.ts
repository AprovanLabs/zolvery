#!/usr/bin/env tsx

import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-2';
const AWS_ENDPOINT_URL =
  process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
const TABLE_NAME = process.env.TABLE_NAME || 'zolvery-dev-use2-main';
const AWS_PROFILE = process.env.AWS_PROFILE || 'localstack';
const EXAMPLES_DIR = join(__dirname, '../../../packages/examples/src');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: 'zolvery',
    secretAccessKey: 'zolvery',
  },
});

interface AppConfig {
  appId: string;
  name: string;
  description: string;
  version: string;
  runnerTag: string;
  authorId: string;
  visibility: 'public' | 'private';
  tags: string[];
  settings: any[];
  servers: Record<string, any>;
}

interface DynamoRecord {
  PK: string;
  SK: string;
  data: string;
  appId: string;
  name: string;
  tags: string[];
  authorId: string;
  visibility: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Recursively find all zolvery.json files
 */
function findZolveryFiles(dir: string): string[] {
  const files: string[] = [];

  function scan(currentDir: string): void {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item === 'zolvery.json') {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

/**
 * Load and parse a zolvery.json file
 */
function loadAppConfig(filePath: string): AppConfig | null {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      console.warn(`⚠️  Skipping empty file: ${filePath}`);
      return null;
    }

    const config = JSON.parse(content);

    // Validate required fields and add defaults
    if (!config.appId) {
      console.warn(`⚠️  Skipping file without appId: ${filePath}`);
      return null;
    }

    // Add default fields if missing
    const defaults = {
      name: config.name || config.appId.split('/').pop(),
      description: config.description || `A ${config.appId} game`,
      version: config.version || '0.0.1',
      runnerTag: config.runnerTag || 'vue-vanilla',
      authorId: config.authorId || 'system',
      visibility: config.visibility || 'public',
      tags: config.tags || ['game'],
      settings: config.settings || [],
      servers: config.servers || {},
    };

    return { ...defaults, ...config } as AppConfig;
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, (error as Error).message);
    return null;
  }
}

/**
 * Create DynamoDB record format
 */
function createDynamoRecord(appConfig: AppConfig): DynamoRecord {
  const timestamp = new Date().toISOString();

  return {
    PK: `APP#${appConfig.appId}`,
    SK: 'DATA#v1',
    data: JSON.stringify(appConfig),
    appId: appConfig.appId,
    name: appConfig.name,
    tags: appConfig.tags,
    authorId: appConfig.authorId,
    visibility: appConfig.visibility,
    version: appConfig.version,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Batch write items to DynamoDB (max 25 items per batch)
 */
async function batchWriteItems(items: DynamoRecord[]): Promise<number> {
  const batches: DynamoRecord[][] = [];

  // Split into batches of 25 (DynamoDB limit)
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  let totalWritten = 0;

  for (const [index, batch] of batches.entries()) {
    console.log(
      `📦 Writing batch ${index + 1}/${batches.length} (${
        batch.length
      } items)...`,
    );

    const putRequests = batch.map((item) => ({
      PutRequest: {
        Item: marshall(item),
      },
    }));

    try {
      const command = new BatchWriteItemCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      });

      await dynamoClient.send(command);
      totalWritten += batch.length;
      console.log(`✅ Batch ${index + 1} written successfully`);
    } catch (error) {
      console.error(
        `❌ Error writing batch ${index + 1}:`,
        (error as Error).message,
      );
      throw error;
    }
  }

  return totalWritten;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🎮 Loading Zolvery apps into DynamoDB...');
  console.log(`📂 Scanning directory: ${EXAMPLES_DIR}`);
  console.log(`🎯 Target table: ${TABLE_NAME}`);
  console.log(`🌐 Endpoint: ${AWS_ENDPOINT_URL}`);
  console.log(`👤 Profile: ${AWS_PROFILE}`);
  console.log('');

  // Find all zolvery.json files
  const jsonFiles = findZolveryFiles(EXAMPLES_DIR);
  console.log(`📋 Found ${jsonFiles.length} zolvery.json files`);

  if (jsonFiles.length === 0) {
    console.log('⚠️  No zolvery.json files found. Exiting.');
    return;
  }

  // Load and validate app configs
  const appConfigs: AppConfig[] = [];
  for (const filePath of jsonFiles) {
    console.log(`📄 Processing: ${relative(EXAMPLES_DIR, filePath)}`);
    const config = loadAppConfig(filePath);
    if (config) {
      appConfigs.push(config);
      console.log(`   ✅ Loaded: ${config.appId}`);
    }
  }

  console.log('');
  console.log(
    `🎯 Successfully loaded ${appConfigs.length} valid app configurations`,
  );

  if (appConfigs.length === 0) {
    console.log('⚠️  No valid app configurations found. Exiting.');
    return;
  }

  // Create DynamoDB records
  const dynamoRecords = appConfigs.map(createDynamoRecord);

  // Write to DynamoDB
  console.log('📊 Writing to DynamoDB...');
  const written = await batchWriteItems(dynamoRecords);

  console.log('');
  console.log('🎉 Data loading complete!');
  console.log(`📊 Total apps written: ${written}`);
  console.log('');
  console.log('📋 Loaded apps:');
  appConfigs.forEach((app) => {
    console.log(`   • ${app.appId} (${app.name})`);
  });
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { findZolveryFiles, loadAppConfig, createDynamoRecord };
