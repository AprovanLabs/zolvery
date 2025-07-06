import Joi from 'joi';

/**
 * Base validation schemas
 */

export const baseSchemas = {
  id: Joi.string().min(1).max(100).required(),
  userId: Joi.string().min(1).max(100).required(),
  appId: Joi.string().min(1).max(100).required(),
  day: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  timestamp: Joi.string().isoDate().required(),
  email: Joi.string().email().required(),
  username: Joi.string().min(2).max(50).required(),
  locale: Joi.string().pattern(/^[a-z]{2}(-[A-Z]{2})?$/).required(),
  version: Joi.string().optional(),
  ttl: Joi.number().integer().positive().optional(),
};

/**
 * User validation schemas
 */
export const userSchemas = {
  profile: Joi.object({
    id: baseSchemas.id,
    userId: baseSchemas.userId,
    username: baseSchemas.username,
    email: baseSchemas.email,
    groups: Joi.array().items(Joi.string()).default([]),
    preferences: Joi.object().default({}),
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  session: Joi.object({
    id: baseSchemas.id,
    sessionId: Joi.string().required(),
    userId: baseSchemas.userId,
    expiresAt: baseSchemas.timestamp,
    metadata: Joi.object().default({}),
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  createProfile: Joi.object({
    username: baseSchemas.username,
    email: baseSchemas.email,
    groups: Joi.array().items(Joi.string()).default([]),
    preferences: Joi.object().default({}),
  }),
};

/**
 * App validation schemas
 */
export const appSchemas = {
  config: Joi.object({
    id: baseSchemas.id,
    appId: baseSchemas.appId,
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).allow('').default(''),
    settings: Joi.object().default({}),
    status: Joi.string().valid('active', 'inactive', 'maintenance').default('active'),
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  data: Joi.object({
    id: baseSchemas.id,
    appId: baseSchemas.appId,
    key: Joi.string().min(1).max(200).required(),
    value: Joi.any().required(),
    day: baseSchemas.day,
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  createConfig: Joi.object({
    appId: baseSchemas.appId,
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).allow('').default(''),
    settings: Joi.object().default({}),
    status: Joi.string().valid('active', 'inactive', 'maintenance').default('active'),
  }),
};

/**
 * Game validation schemas
 */
export const gameSchemas = {
  event: Joi.object({
    id: baseSchemas.id,
    eventKey: Joi.string().min(1).max(100).required(),
    value: Joi.any().required(),
    appId: baseSchemas.appId,
    userId: baseSchemas.userId,
    day: baseSchemas.day,
    timestamp: baseSchemas.timestamp,
    ttl: baseSchemas.ttl,
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  leaderboardEntry: Joi.object({
    id: baseSchemas.id,
    appId: baseSchemas.appId,
    userId: baseSchemas.userId,
    username: baseSchemas.username,
    score: Joi.number().required(),
    day: baseSchemas.day,
    rank: Joi.number().integer().positive().optional(),
    metadata: Joi.object().default({}),
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  gameState: Joi.object({
    id: baseSchemas.id,
    gameId: Joi.string().min(1).max(100).required(),
    userId: baseSchemas.userId,
    state: Joi.any().required(),
    phase: Joi.string().min(1).max(50).required(),
    ttl: baseSchemas.ttl,
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  createEvent: Joi.object({
    eventKey: Joi.string().min(1).max(100).required(),
    value: Joi.any().required(),
    appId: baseSchemas.appId,
    day: baseSchemas.day.optional(),
  }),

  createLeaderboardEntry: Joi.object({
    appId: baseSchemas.appId,
    username: baseSchemas.username,
    score: Joi.number().required(),
    day: baseSchemas.day.optional(),
    metadata: Joi.object().default({}),
  }),
};

/**
 * I18n validation schemas
 */
export const i18nSchemas = {
  translationSet: Joi.object({
    id: baseSchemas.id,
    appId: baseSchemas.appId,
    locale: baseSchemas.locale,
    translations: Joi.object().pattern(Joi.string(), Joi.string()).required(),
    lastUpdated: baseSchemas.timestamp,
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  createTranslationSet: Joi.object({
    appId: baseSchemas.appId,
    locale: baseSchemas.locale,
    translations: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  }),
};

/**
 * Analytics validation schemas
 */
export const analyticsSchemas = {
  event: Joi.object({
    id: baseSchemas.id,
    eventType: Joi.string().min(1).max(100).required(),
    userId: baseSchemas.userId.optional(),
    appId: baseSchemas.appId.optional(),
    properties: Joi.object().default({}),
    timestamp: baseSchemas.timestamp,
    ttl: baseSchemas.ttl,
    createdAt: baseSchemas.timestamp,
    updatedAt: baseSchemas.timestamp,
    version: baseSchemas.version,
  }),

  createEvent: Joi.object({
    eventType: Joi.string().min(1).max(100).required(),
    userId: baseSchemas.userId.optional(),
    appId: baseSchemas.appId.optional(),
    properties: Joi.object().default({}),
  }),
};

/**
 * API request validation schemas
 */
export const apiSchemas = {
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
    cursor: Joi.string().optional(),
  }),

  sort: Joi.object({
    field: Joi.string().required(),
    direction: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  filter: Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().valid('eq', 'ne', 'lt', 'le', 'gt', 'ge', 'contains', 'begins_with').required(),
    value: Joi.any().required(),
  }),

  query: Joi.object({
    pagination: Joi.object().optional(),
    sort: Joi.array().items(Joi.object()).optional(),
    filters: Joi.array().items(Joi.object()).optional(),
  }),
};

/**
 * Cache validation schemas
 */
export const cacheSchemas = {
  key: Joi.string().min(1).max(500).required(),
  value: Joi.any().required(),
  ttl: Joi.number().integer().positive().optional(),
  
  pattern: Joi.string().min(1).max(500).optional(),
  
  metadata: Joi.object({
    ttl: Joi.number().integer().positive().optional(),
    createdAt: Joi.number().integer().positive().required(),
    expiresAt: Joi.number().integer().positive().optional(),
    version: Joi.string().optional(),
  }),
};

/**
 * DynamoDB validation schemas
 */
export const dynamoSchemas = {
  partitionKey: Joi.string().min(1).max(2048).required(),
  sortKey: Joi.string().min(1).max(1024).optional(),
  
  gsiPartitionKey: Joi.string().min(1).max(2048).optional(),
  gsiSortKey: Joi.string().min(1).max(1024).optional(),
  
  item: Joi.object().min(1).required(),
  
  keyConditionExpression: Joi.string().min(1).required(),
  filterExpression: Joi.string().optional(),
  projectionExpression: Joi.string().optional(),
  
  expressionAttributeValues: Joi.object().optional(),
  expressionAttributeNames: Joi.object().optional(),
};

/**
 * Combined validation schemas
 */
export const validationSchemas = {
  base: baseSchemas,
  user: userSchemas,
  app: appSchemas,
  game: gameSchemas,
  i18n: i18nSchemas,
  analytics: analyticsSchemas,
  api: apiSchemas,
  cache: cacheSchemas,
  dynamo: dynamoSchemas,
};
