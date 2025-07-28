/**
 * DynamoDB table name enums and utilities
 */

export enum DynamoTableType {
  // Main data table
  MAIN = 'main',
  
  // User-related tables
  USERS = 'users',
  USER_SESSIONS = 'user_sessions',
  
  // App-related tables
  APPS = 'apps',
  APP_CONFIG = 'app_config',
  
  // Event and app data
  EVENTS = 'events',
  LEADERBOARD = 'leaderboard',
  APP_STATE = 'app_state',
  
  // I18n tables
  TRANSLATIONS = 'translations',
  
  // Analytics and logs
  ANALYTICS = 'analytics',
  AUDIT_LOGS = 'audit_logs',
  
  // Temporary tables
  TEMP_DATA = 'temp_data',
}

export interface TableSchema {
  tableName: string;
  partitionKey: string;
  sortKey?: string;
  gsi?: Array<{
    indexName: string;
    partitionKey: string;
    sortKey?: string;
  }>;
  ttl?: {
    attributeName: string;
    enabled: boolean;
  };
}

/**
 * Generate table name with environment and region
 */
export const generateTableName = (
  type: DynamoTableType,
  projectId: string = 'kossabos',
  environment: string = 'dev',
  region: string = 'use1'
): string => {
  return `${projectId}-${environment}-${region}-${type}`;
};

/**
 * Parse table name to extract components
 */
export const parseTableName = (tableName: string): {
  projectId: string;
  environment: string;
  region: string;
  type: string;
} => {
  const parts = tableName.split('-');
  if (parts.length !== 4) {
    throw new Error(`Invalid table name format: ${tableName}`);
  }
  
  return {
    projectId: parts[0] || '',
    environment: parts[1] || '',
    region: parts[2] || '',
    type: parts[3] || '',
  };
};

/**
 * Table schema definitions
 */
export const tableSchemas: Record<DynamoTableType, TableSchema> = {
  [DynamoTableType.MAIN]: {
    tableName: generateTableName(DynamoTableType.MAIN),
    partitionKey: 'PK',
    sortKey: 'SK',
    gsi: [
      {
        indexName: 'GSI1',
        partitionKey: 'GSI1PK',
        sortKey: 'GSI1SK',
      },
      {
        indexName: 'GSI2',
        partitionKey: 'appId',
        sortKey: 'createdAt',
      },
    ],
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
  },
  
  [DynamoTableType.USERS]: {
    tableName: generateTableName(DynamoTableType.USERS),
    partitionKey: 'userId',
    gsi: [
      {
        indexName: 'EmailIndex',
        partitionKey: 'email',
      },
    ],
  },
  
  [DynamoTableType.USER_SESSIONS]: {
    tableName: generateTableName(DynamoTableType.USER_SESSIONS),
    partitionKey: 'sessionId',
    ttl: {
      attributeName: 'expiresAt',
      enabled: true,
    },
  },
  
  [DynamoTableType.APPS]: {
    tableName: generateTableName(DynamoTableType.APPS),
    partitionKey: 'appId',
    gsi: [
      {
        indexName: 'StatusIndex',
        partitionKey: 'status',
        sortKey: 'createdAt',
      },
    ],
  },
  
  [DynamoTableType.APP_CONFIG]: {
    tableName: generateTableName(DynamoTableType.APP_CONFIG),
    partitionKey: 'appId',
    sortKey: 'configKey',
  },
  
  [DynamoTableType.EVENTS]: {
    tableName: generateTableName(DynamoTableType.EVENTS),
    partitionKey: 'PK',
    sortKey: 'SK',
    gsi: [
      {
        indexName: 'UserEventIndex',
        partitionKey: 'userId',
        sortKey: 'timestamp',
      },
    ],
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
  },
  
  [DynamoTableType.LEADERBOARD]: {
    tableName: generateTableName(DynamoTableType.LEADERBOARD),
    partitionKey: 'appId',
    sortKey: 'scoreId',
    gsi: [
      {
        indexName: 'ScoreIndex',
        partitionKey: 'appId',
        sortKey: 'score',
      },
    ],
  },
  
  [DynamoTableType.APP_STATE]: {
    tableName: generateTableName(DynamoTableType.APP_STATE),
    partitionKey: 'appId',
    sortKey: 'userId',
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
  },
  
  [DynamoTableType.TRANSLATIONS]: {
    tableName: generateTableName(DynamoTableType.TRANSLATIONS),
    partitionKey: 'appId',
    sortKey: 'locale',
    gsi: [
      {
        indexName: 'LocaleIndex',
        partitionKey: 'locale',
        sortKey: 'lastUpdated',
      },
    ],
  },
  
  [DynamoTableType.ANALYTICS]: {
    tableName: generateTableName(DynamoTableType.ANALYTICS),
    partitionKey: 'PK',
    sortKey: 'SK',
    gsi: [
      {
        indexName: 'TimestampIndex',
        partitionKey: 'eventType',
        sortKey: 'timestamp',
      },
    ],
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
  },
  
  [DynamoTableType.AUDIT_LOGS]: {
    tableName: generateTableName(DynamoTableType.AUDIT_LOGS),
    partitionKey: 'PK',
    sortKey: 'timestamp',
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
  },
  
  [DynamoTableType.TEMP_DATA]: {
    tableName: generateTableName(DynamoTableType.TEMP_DATA),
    partitionKey: 'tempId',
    ttl: {
      attributeName: 'expiresAt',
      enabled: true,
    },
  },
};
