import { CacheType } from './types';

/**
 * Cache key utilities for consistent key generation
 */

/**
 * Generate a consistent cache key
 */
export const generateCacheKey = (type: CacheType, ...parts: (string | number)[]): string => {
  const cleanParts = parts.map(p => String(p).replace(/[:#]/g, '_'));
  return `${type}:${cleanParts.join(':')}`;
};

/**
 * Parse a cache key into its components
 */
export const parseCacheKey = (key: string): { type: string; parts: string[] } => {
  const [type, ...parts] = key.split(':');
  return { type: type || '', parts };
};

/**
 * Generate user-specific cache keys
 */
export const userCacheKeys = {
  profile: (userId: string) => generateCacheKey(CacheType.USER_PROFILE, userId),
  events: (userId: string, appId: string, day: string) => 
    generateCacheKey(CacheType.USER_EVENTS, userId, appId, day),
  session: (userId: string, sessionId: string) => 
    generateCacheKey(CacheType.USER_SESSION, userId, sessionId),
};

/**
 * Generate app-specific cache keys
 */
export const appCacheKeys = {
  data: (appId: string, key: string, day: string) => 
    generateCacheKey(CacheType.APP_DATA, appId, key, day),
  config: (appId: string) => generateCacheKey(CacheType.APP_CONFIG, appId),
};


/**
 * Generate i18n cache keys
 */
export const i18nCacheKeys = {
  translations: (appId: string, locale: string) => 
    generateCacheKey(CacheType.TRANSLATIONS, appId, locale),
  common: (locale: string) => 
    generateCacheKey(CacheType.TRANSLATIONS, 'common', locale),
};

/**
 * Generate temporary cache keys
 */
export const tempCacheKeys = {
  data: (key: string, suffix?: string) => 
    generateCacheKey(CacheType.TEMP_DATA, key, suffix || ''),
  apiResponse: (endpoint: string, params: string) => 
    generateCacheKey(CacheType.API_RESPONSE, endpoint, params),
};

/**
 * Helper to create cache key patterns for bulk operations
 */
export const createCachePattern = (type: CacheType, pattern: string): string => {
  return `${type}:${pattern}`;
};
