import { CacheType } from '../cache/types';
import { DynamoTableType } from '../dynamo/types';

/**
 * Type-safe mapping between cache keys, DynamoDB keys, and data structures
 */

// Base interface for all data structures
export interface BaseDataStructure {
  id: string;
  createdAt: string;
  updatedAt: string;
  version?: string;
}

// User-related structures
export interface UserProfile extends BaseDataStructure {
  userId: string;
  username: string;
  email: string;
  groups: string[];
  preferences: Record<string, any>;
}

export interface UserSession extends BaseDataStructure {
  sessionId: string;
  userId: string;
  expiresAt: string;
  metadata: Record<string, any>;
}

// App-related structures  
export interface AppConfig extends BaseDataStructure {
  appId: string;
  name: string;
  description: string;
  settings: Record<string, any>;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface AppData extends BaseDataStructure {
  appId: string;
  key: string;
  value: any;
  day: string;
}

// Game-related structures
export interface AppEvent extends BaseDataStructure {
  eventKey: string;
  value: any;
  appId: string;
  userId: string;
  day: string;
  timestamp: string;
  ttl?: number;
}

export interface LeaderboardEntry extends BaseDataStructure {
  appId: string;
  userId: string;
  username: string;
  score: number;
  day: string;
  rank?: number;
  metadata: Record<string, any>;
}

export interface GameState extends BaseDataStructure {
  gameId: string;
  userId: string;
  state: any;
  phase: string;
  ttl?: number;
}

// I18n structures
export interface TranslationSet extends BaseDataStructure {
  appId: string;
  locale: string;
  translations: Record<string, string>;
  lastUpdated: string;
}

// Analytics structures
export interface AnalyticsEvent extends BaseDataStructure {
  eventType: string;
  userId?: string;
  appId?: string;
  properties: Record<string, any>;
  timestamp: string;
  ttl?: number;
}

/**
 * Type mapping for cache keys to data structures
 */
export interface CacheDataTypeMap {
  [CacheType.USER_PROFILE]: UserProfile;
  [CacheType.USER_EVENTS]: AppEvent[];
  [CacheType.USER_SESSION]: UserSession;
  [CacheType.APP_DATA]: AppData;
  [CacheType.APP_CONFIG]: AppConfig;
  [CacheType.LEADERBOARD]: LeaderboardEntry[];
  [CacheType.GAME_STATE]: GameState;
  [CacheType.TRANSLATIONS]: TranslationSet;
  [CacheType.TEMP_DATA]: any;
  [CacheType.API_RESPONSE]: any;
}

/**
 * Type mapping for DynamoDB tables to data structures
 */
export interface DynamoDataTypeMap {
  [DynamoTableType.MAIN]: AppEvent | LeaderboardEntry | AppData | TranslationSet;
  [DynamoTableType.USERS]: UserProfile;
  [DynamoTableType.USER_SESSIONS]: UserSession;
  [DynamoTableType.APPS]: AppConfig;
  [DynamoTableType.APP_CONFIG]: AppData;
  [DynamoTableType.EVENTS]: AppEvent;
  [DynamoTableType.LEADERBOARD]: LeaderboardEntry;
  [DynamoTableType.GAME_STATE]: GameState;
  [DynamoTableType.TRANSLATIONS]: TranslationSet;
  [DynamoTableType.ANALYTICS]: AnalyticsEvent;
  [DynamoTableType.AUDIT_LOGS]: any;
  [DynamoTableType.TEMP_DATA]: any;
}

/**
 * Type-safe cache operations
 */
export interface TypedCache {
  get<T extends CacheType>(type: T, key: string): Promise<CacheDataTypeMap[T] | null>;
  set<T extends CacheType>(type: T, key: string, value: CacheDataTypeMap[T], ttlMs?: number): Promise<void>;
  delete(type: CacheType, key: string): Promise<boolean>;
}

/**
 * Type-safe DynamoDB operations
 */
export interface TypedDynamoOperations {
  get<T extends DynamoTableType>(table: T, pk: string, sk?: string): Promise<DynamoDataTypeMap[T] | null>;
  put<T extends DynamoTableType>(table: T, item: DynamoDataTypeMap[T]): Promise<void>;
  query<T extends DynamoTableType>(table: T, pk: string, skCondition?: string): Promise<DynamoDataTypeMap[T][]>;
  delete(table: DynamoTableType, pk: string, sk?: string): Promise<boolean>;
}

/**
 * Combined cache and database type mappings
 */
export interface DataStructureMapping {
  // User data
  userProfile: {
    cache: CacheType.USER_PROFILE;
    table: DynamoTableType.USERS;
    type: UserProfile;
  };
  userSession: {
    cache: CacheType.USER_SESSION;
    table: DynamoTableType.USER_SESSIONS;
    type: UserSession;
  };
  userEvents: {
    cache: CacheType.USER_EVENTS;
    table: DynamoTableType.EVENTS;
    type: AppEvent[];
  };
  
  // App data
  appConfig: {
    cache: CacheType.APP_CONFIG;
    table: DynamoTableType.APPS;
    type: AppConfig;
  };
  appData: {
    cache: CacheType.APP_DATA;
    table: DynamoTableType.APP_CONFIG;
    type: AppData;
  };
  
  // Game data
  gameState: {
    cache: CacheType.GAME_STATE;
    table: DynamoTableType.GAME_STATE;
    type: GameState;
  };
  leaderboard: {
    cache: CacheType.LEADERBOARD;
    table: DynamoTableType.LEADERBOARD;
    type: LeaderboardEntry[];
  };
  
  // I18n data
  translations: {
    cache: CacheType.TRANSLATIONS;
    table: DynamoTableType.TRANSLATIONS;
    type: TranslationSet;
  };
}
