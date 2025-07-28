import { DynamoTableType } from './types';

/**
 * DynamoDB key utilities for consistent key generation
 */

/**
 * Generate a consistent partition key
 */
export const generatePartitionKey = (type: string, ...parts: (string | number)[]): string => {
  const cleanParts = parts.map(p => String(p).replace(/[:#]/g, '_'));
  return [type, ...cleanParts].join('#');
};

/**
 * Parse partition key components
 */
export const parsePartitionKey = (pk: string): string[] => {
  return pk.split('#');
};

/**
 * Generate sort key
 */
export const generateSortKey = (type: string, ...parts: (string | number)[]): string => {
  const cleanParts = parts.map(p => String(p).replace(/[:#]/g, '_'));
  return [type, ...cleanParts].join('#');
};

/**
 * Parse sort key components
 */
export const parseSortKey = (sk: string): string[] => {
  return sk.split('#');
};

/**
 * Event-specific key generators
 */
export const eventKeys = {
  partitionKey: (day: string, appId: string, userId: string) =>
    generatePartitionKey('DAY', day, 'APP', appId, 'USER', userId),
  sortKey: (eventKey: string) =>
    generateSortKey('EVENT', eventKey),
  gsi1PartitionKey: (userId: string, appId: string) =>
    generatePartitionKey('USER', userId, 'APP', appId),
  gsi1SortKey: (day: string) =>
    generateSortKey('DAY', day),
};

/**
 * Leaderboard-specific key generators
 */
export const leaderboardKeys = {
  partitionKey: (appId: string, day: string) =>
    generatePartitionKey('LEADERBOARD', appId, day),
  sortKey: (score: number, userId: string) =>
    generateSortKey('SCORE', String(score).padStart(10, '0'), userId),
  globalPartitionKey: (appId: string) =>
    generatePartitionKey('LEADERBOARD', appId, 'GLOBAL'),
};

/**
 * Voting-specific key generators
 */
export const votingKeys = {
  voteAggregatePartitionKey: (appId: string, day: string) =>
    generatePartitionKey('VOTE_AGG', appId, day),
  voteAggregateSortKey: (userId: string) =>
    generateSortKey('USER', userId),
};

/**
 * User-specific key generators
 */
export const userKeys = {
  partitionKey: (userId: string) =>
    generatePartitionKey('USER', userId),
  sortKey: (type: string, id?: string) =>
    generateSortKey(type.toUpperCase(), id || ''),
  profileSortKey: () => generateSortKey('PROFILE'),
  sessionSortKey: (sessionId: string) =>
    generateSortKey('SESSION', sessionId),
};

/**
 * App-specific key generators
 */
export const appKeys = {
  partitionKey: (appId: string) =>
    generatePartitionKey('APP', appId),
  sortKey: (type: string, key?: string) =>
    generateSortKey(type.toUpperCase(), key || ''),
  configSortKey: (configKey: string) =>
    generateSortKey('CONFIG', configKey),
  dataSortKey: (day: string, dataKey: string) =>
    generateSortKey('DATA', day, dataKey),
};

/**
 * App data-specific key generators for daily data storage
 */
export const appDataKeys = {
  partitionKey: (appId: string, day: string) =>
    generatePartitionKey('APPDATA', appId, day),
  sortKey: (dataKey: string) =>
    dataKey, // For app data, the sort key is just the data key itself
};

/**
 * I18n-specific key generators
 */
export const i18nKeys = {
  partitionKey: (appId: string) =>
    generatePartitionKey('I18N', appId),
  sortKey: (locale: string) =>
    generateSortKey('LOCALE', locale),
  gsi1PartitionKey: (locale: string) =>
    generatePartitionKey('LOCALE', locale),
  gsi1SortKey: (appId: string) =>
    generateSortKey('APP', appId),
};

/**
 * Analytics-specific key generators
 */
export const analyticsKeys = {
  partitionKey: (date: string, eventType: string) =>
    generatePartitionKey('ANALYTICS', date, eventType),
  sortKey: (timestamp: string, userId?: string) =>
    generateSortKey('EVENT', timestamp, userId || ''),
};

/**
 * Helper to create key patterns for queries
 */
export const createKeyPattern = (baseKey: string, pattern: string): string => {
  return `${baseKey}#${pattern}`;
};

/**
 * Table-specific key generators map
 */
export const tableKeyGenerators = {
  [DynamoTableType.MAIN]: {
    event: eventKeys,
    leaderboard: leaderboardKeys,
    voting: votingKeys,
    user: userKeys,
    app: appKeys,
    appData: appDataKeys,
    i18n: i18nKeys,
  },
  [DynamoTableType.EVENTS]: eventKeys,
  [DynamoTableType.LEADERBOARD]: leaderboardKeys,
  [DynamoTableType.USERS]: userKeys,
  [DynamoTableType.APPS]: appKeys,
  [DynamoTableType.TRANSLATIONS]: i18nKeys,
  [DynamoTableType.ANALYTICS]: analyticsKeys,
};
