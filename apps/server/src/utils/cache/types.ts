/**
 * Cache type definitions
 */

export enum CacheType {
  // User-related caches
  USER_PROFILE = 'user-profile',
  USER_EVENTS = 'user-events',
  USER_SESSION = 'user-session',
  
  // App-related caches
  APP_DATA = 'app-data',
  APP_CONFIG = 'app-config',
    LEADERBOARD = 'leaderboard',
  APP_STATE = 'app-state',
  
  // I18n caches
  TRANSLATIONS = 'translations',
  
  // Temporary caches
  TEMP_DATA = 'temp-data',
  API_RESPONSE = 'api-response',
}

export interface CacheMetadata {
  ttl?: number;
  createdAt: number;
  expiresAt?: number;
  version?: string;
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  metadata: CacheMetadata;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memory?: number;
}
