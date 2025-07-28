import { Random } from '../random';
import { Transport } from '../transport';
import { User } from '../user';
import { createEvent, isCoreEvent } from '../events.js';
import { Localization } from './localization.js';
import { ClientEventBus } from './event-bus.js';
import { ClientStorage } from './storage.js';
import { ClientAPI } from './api.js';

/**
 * Core client events that are managed by the system
 */
export enum CoreEventType {
  // App lifecycle
  APP_START = 'app.start',
  APP_READY = 'app.ready',
  APP_INITIALIZED = 'app.initialized',
  
  // User interactions
  USER_ACTION = 'user.action',
  USER_CONNECTED = 'user.connected',
  USER_DISCONNECTED = 'user.disconnected',
  
  // Data management
  DATA_REQUEST = 'data.request',
  DATA_UPDATED = 'data.updated',
  
  // Scoring (once per day)
  SCORE_SUBMIT = 'score.submit',
  SCORE_ACCEPTED = 'score.accepted',
  SCORE_REJECTED = 'score.rejected',
}

/**
 * Client configuration options
 */
export interface ClientConfig {
  appId: string;
  apiBaseUrl?: string;
  environment?: string;
  locale?: string;
  enableCaching?: boolean;
  batchEvents?: boolean;
  retryFailedEvents?: boolean;
}

/**
 * Event payload for client events
 */
export interface ClientEvent {
  type: string;
  data?: any;
  timestamp?: number;
  source?: 'client' | 'server';
  metadata?: Record<string, any>;
}

export class Client {
  private eventBus: ClientEventBus;
  private storage: ClientStorage;
  private api: ClientAPI;
  private localState: Map<string, unknown> = new Map();
  private eventHandlers: Map<string, Set<(event: ClientEvent) => void>> = new Map();
  private scoreSubmittedToday: boolean = false;

  public constructor(
    private user: User,
    public config: ClientConfig,
    private transport: Transport,
    private localization: Localization = new Localization(),
    private random: Random = new Random(),
  ) {
    this.eventBus = new ClientEventBus();
    this.storage = new ClientStorage();
    this.api = new ClientAPI(config.apiBaseUrl || '', user, config.appId);

    // Initialize event handling
    this.setupEventHandlers();
    this.loadInitialData();
  }

  /**
   * Get environment configuration
   */
  public env = (key: string): string | null => {
    switch (key) {
      case 'ENVIRONMENT':
        return this.config.environment || 'dev';
      case 'APP_ID':
        return this.config.appId;
      case 'USER_ID':
        return this.user.userId;
      case 'LOCALE':
        return this.config.locale || this.user.userLocale || 'en-US';
      default:
        return null;
    }
  };

  /**
   * Get data from backend or local cache
   */
  public get = (key: string): any => {
    // Check local state first
    if (this.localState.has(key)) {
      return this.localState.get(key);
    }

    // Check storage cache
    const cached = this.storage.get(key);
    if (cached !== null) {
      this.localState.set(key, cached);
      return cached;
    }

    // Request from backend if not found
    this.requestData(key);
    return null;
  };

  /**
   * Set local client state (not persisted to backend)
   */
  public set = (key: string, value: unknown): void => {
    this.localState.set(key, value);
    
    // Also cache in storage for persistence
    this.storage.set(key, value);
    
    // Emit data updated event
    this.emitInternal(CoreEventType.DATA_UPDATED, { key, value });
  };

  /**
   * Subscribe to events
   */
  public on = (
    eventType: string,
    handler: (event: ClientEvent) => void,
  ): void => {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  };

  /**
   * Unsubscribe from events
   */
  public off = (
    eventType: string,
    handler: (event: ClientEvent) => void,
  ): void => {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  };

  /**
   * Emit events to the system
   */
  public emit = (eventType: string, data?: any): void => {
    const event: ClientEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: 'client',
    };

    // Handle core events specially
    if (this.isCoreEvent(eventType)) {
      this.handleCoreEvent(event);
    } else {
      // Custom events - forward to backend and local handlers
      this.handleCustomEvent(event);
    }

    // Always trigger local handlers
    this.triggerLocalHandlers(event);

    // Also emit to transport for broader event system compatibility
    const transportEvent = createEvent(eventType, data, 'client', this.user.userId);
    this.transport.dispatchEvent(transportEvent as any);
  };

  /**
   * Get internationalized text
   */
  public t = (key: string, defaultValue: string): string => {
    const translation = this.localization.t(key);
    return translation ?? defaultValue;
  };

  /**
   * Check if user has already submitted score today
   */
  public hasSubmittedScoreToday = (): boolean => {
    return this.scoreSubmittedToday;
  };

  /**
   * Initialize the client
   */
  public async initialize(): Promise<void> {
    try {
      // Load app data
      await this.loadAppData();
      
      // Load user context
      await this.loadUserContext();
      
      // Load i18n data
      await this.loadI18nData();
      
      // Check if score already submitted today
      await this.checkScoreSubmissionStatus();
      
      // Emit initialization complete
      this.emitInternal(CoreEventType.APP_INITIALIZED, {
        user: this.user,
        config: this.config,
      });
    } catch (error) {
      console.error('Failed to initialize client:', error);
      throw error;
    }
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.transport.addEventListener('message', (message) => {
      // Handle incoming events from transport
      this.handleTransportMessage(message as any);
    });
  }

  /**
   * Load initial data from backend
   */
  private async loadInitialData(): Promise<void> {
    // Trigger data loading without blocking construction
    setTimeout(() => {
      this.initialize().catch(console.error);
    }, 0);
  }

  /**
   * Request data from backend
   */
  private async requestData(key: string): Promise<void> {
    try {
      let data: any = null;

      switch (key) {
        case 'context':
        case 'data':
          data = await this.api.getAppData(this.getCurrentDay());
          break;
        case 'users':
          data = await this.api.getUsers();
          break;
        case 'events':
          data = await this.api.getEvents(this.getCurrentDay());
          break;
        default:
          // Try to get as app data
          data = await this.api.getAppData(this.getCurrentDay(), key);
      }

      if (data !== null) {
        this.set(key, data);
      }
    } catch (error) {
      console.error(`Failed to request data for key: ${key}`, error);
    }
  }

  /**
   * Load app data from backend
   */
  private async loadAppData(): Promise<void> {
    const data = await this.api.getAppData(this.getCurrentDay());
    if (data) {
      this.set('data', data);
    }
  }

  /**
   * Load user context
   */
  private async loadUserContext(): Promise<void> {
    const context = {
      user: this.user,
      appId: this.config.appId,
      day: this.getCurrentDay(),
      environment: this.env('ENVIRONMENT'),
    };
    this.set('context', context);
  }

  /**
   * Load internationalization data
   */
  private async loadI18nData(): Promise<void> {
    const locale = this.env('LOCALE') || 'en';
    const i18nData = await this.api.getI18nData(locale);
    if (i18nData) {
      this.localization.load(i18nData);
    }
  }

  /**
   * Check if score has been submitted today
   */
  private async checkScoreSubmissionStatus(): Promise<void> {
    const events = await this.api.getEvents(this.getCurrentDay());
    this.scoreSubmittedToday = events?.some(
      (event: any) => event.eventKey === 'score' || event.eventKey === 'final_score'
    ) || false;
  }

  /**
   * Check if event is a core system event
   */
  private isCoreEvent(eventType: string): boolean {
    return isCoreEvent(eventType);
  }

  /**
   * Handle core system events
   */
  private async handleCoreEvent(event: ClientEvent): Promise<void> {
    switch (event.type) {
      case CoreEventType.SCORE_SUBMIT:
        await this.handleScoreSubmission(event);
        break;
      case CoreEventType.DATA_REQUEST:
        await this.requestData(event.data?.key);
        break;
      case CoreEventType.USER_ACTION:
        await this.api.createEvent({
          appId: this.config.appId,
          eventKey: 'user_action',
          value: event.data,
        });
        break;
      default:
        // Log unhandled core events
        console.warn('Unhandled core event:', event.type);
    }
  }

  /**
   * Handle custom game events
   */
  private async handleCustomEvent(event: ClientEvent): Promise<void> {
    try {
      // Send to backend as event
      await this.api.createEvent({
        appId: this.config.appId,
        eventKey: event.type,
        value: event.data,
      });
    } catch (error) {
      console.error('Failed to handle custom event:', event, error);
    }
  }

  /**
   * Handle score submission (once per day)
   */
  private async handleScoreSubmission(event: ClientEvent): Promise<void> {
    if (this.scoreSubmittedToday) {
      this.emitInternal(CoreEventType.SCORE_REJECTED, {
        reason: 'Score already submitted today',
      });
      return;
    }

    try {
      // Submit score event
      await this.api.createEvent({
        appId: this.config.appId,
        eventKey: 'final_score',
        value: event.data,
      });

      // Submit to leaderboard
      await this.api.submitScore(event.data);

      this.scoreSubmittedToday = true;
      this.emitInternal(CoreEventType.SCORE_ACCEPTED, event.data);
    } catch (error) {
      console.error('Failed to submit score:', error);
      this.emitInternal(CoreEventType.SCORE_REJECTED, {
        reason: 'Network error',
        error: error.message,
      });
    }
  }

  /**
   * Trigger local event handlers
   */
  private triggerLocalHandlers(event: ClientEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Emit internal events
   */
  private emitInternal(eventType: string, data?: any): void {
    const event: ClientEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: 'client',
    };
    
    this.triggerLocalHandlers(event);
  }

  /**
   * Handle messages from transport
   */
  private handleTransportMessage(message: any): void {
    // Handle incoming events from server/transport
    if (message.type) {
      this.triggerLocalHandlers({
        type: message.type,
        data: message.data,
        timestamp: Date.now(),
        source: 'server',
      });
    }
  }

  /**
   * Get current day in YYYY-MM-DD format
   */
  private getCurrentDay(): string {
    return new Date().toISOString().split('T')[0];
  }
}
