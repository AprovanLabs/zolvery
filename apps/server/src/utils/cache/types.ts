/**
 * Cache type definitions
 */

export enum CacheType {
  // User-related caches
  USER_PROFILE = 'user_profile',
  USER_EVENTS = 'user_events',
  USER_SESSION = 'user_session',
  
  // App-related caches
  APP_DATA = 'app_data',
  APP_CONFIG = 'app_config',
  
  // Game-related caches
  LEADERBOARD = 'leaderboard',
  GAME_STATE = 'game_state',
  
  // I18n caches
  TRANSLATIONS = 'translations',
  
  // Temporary caches
  TEMP_DATA = 'temp_data',
  API_RESPONSE = 'api_response',
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
