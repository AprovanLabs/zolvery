import { EventBus, EventMessage } from './types';
import { AppEvent } from '../data/types';

/**
 * Game event types for the event bus
 */
export enum AppEventType {
  // User events
  USER_REGISTERED = 'user.registered',
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',
  
  // Game events
  GAME_STARTED = 'game.started',
  GAME_ENDED = 'game.ended',
  GAME_PAUSED = 'game.paused',
  GAME_RESUMED = 'game.resumed',
  
  // Player events
  PLAYER_JOINED = 'player.joined',
  PLAYER_LEFT = 'player.left',
  PLAYER_ACTION = 'player.action',
  PLAYER_SCORE_UPDATED = 'player.score_updated',
  
  // App events
  APP_EVENT_CREATED = 'app.event_created',
  APP_DATA_UPDATED = 'app.data_updated',
  APP_CONFIG_CHANGED = 'app.config_changed',
  
  // System events
  LEADERBOARD_UPDATED = 'leaderboard.updated',
  CACHE_INVALIDATED = 'cache.invalidated',
  ERROR_OCCURRED = 'error.occurred',
}

/**
 * Event payload types
 */
export interface UserRegisteredPayload {
  userId: string;
  username: string;
  email: string;
}

export interface GameStartedPayload {
  appId: string;
  userId: string;
  gameId: string;
  timestamp: string;
}

export interface GameEndedPayload {
  appId: string;
  userId: string;
  gameId: string;
  score?: number;
  duration: number;
  timestamp: string;
}

export interface PlayerActionPayload {
  appId: string;
  userId: string;
  gameId: string;
  action: string;
  data: any;
  timestamp: string;
}

export type AppEventCreatedPayload = AppEvent;

export interface LeaderboardUpdatedPayload {
  appId: string;
  day: string;
  entries: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
  }>;
}

export interface CacheInvalidatedPayload {
  keys: string[];
  pattern?: string;
  reason: string;
}

export interface ErrorOccurredPayload {
  error: string;
  context: Record<string, any>;
  userId?: string;
  appId?: string;
  timestamp: string;
}

/**
 * Event bus integration class
 */
export class AppEventBusIntegration {
  public constructor(private eventBus: EventBus) {}

  // User events
  public async publishUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.USER_REGISTERED, payload, {
      source: 'auth-service',
      category: 'user',
    });
  }

  // Game events
  public async publishGameStarted(payload: GameStartedPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.GAME_STARTED, payload, {
      source: 'game-service',
      category: 'game',
      appId: payload.appId,
    });
  }

  public async publishGameEnded(payload: GameEndedPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.GAME_ENDED, payload, {
      source: 'game-service',
      category: 'game',
      appId: payload.appId,
    });
  }

  // Player events
  public async publishPlayerAction(payload: PlayerActionPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.PLAYER_ACTION, payload, {
      source: 'game-service',
      category: 'player',
      appId: payload.appId,
    });
  }

  // App events
  public async publishAppEventCreated(payload: AppEventCreatedPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.APP_EVENT_CREATED, payload, {
      source: 'event-service',
      category: 'app',
      appId: payload.appId,
    });
  }

  // System events
  public async publishLeaderboardUpdated(payload: LeaderboardUpdatedPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.LEADERBOARD_UPDATED, payload, {
      source: 'leaderboard-service',
      category: 'system',
      appId: payload.appId,
    });
  }

  public async publishCacheInvalidated(payload: CacheInvalidatedPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.CACHE_INVALIDATED, payload, {
      source: 'cache-service',
      category: 'system',
    });
  }

  public async publishError(payload: ErrorOccurredPayload): Promise<void> {
    await this.eventBus.publish(AppEventType.ERROR_OCCURRED, payload, {
      source: 'error-handler',
      category: 'system',
      severity: 'error',
    });
  }

  // Subscribe to events
  public subscribeToUserEvents(handler: (message: EventMessage) => Promise<void> | void) {
    return this.eventBus.subscribeToPattern('user.*', handler);
  }

  public subscribeToAppEvents(handler: (message: EventMessage) => Promise<void> | void) {
    return this.eventBus.subscribeToPattern('game.*', handler);
  }

  public subscribeToPlayerEvents(handler: (message: EventMessage) => Promise<void> | void) {
    return this.eventBus.subscribeToPattern('player.*', handler);
  }

  public subscribeToAppEvents(handler: (message: EventMessage) => Promise<void> | void) {
    return this.eventBus.subscribeToPattern('app.*', handler);
  }

  public subscribeToSystemEvents(handler: (message: EventMessage) => Promise<void> | void) {
    return this.eventBus.subscribeToPattern('leaderboard.*', handler);
  }

  public subscribeToAllEvents(handler: (message: EventMessage) => Promise<void> | void) {
    return this.eventBus.subscribeToPattern('*', handler);
  }
}
