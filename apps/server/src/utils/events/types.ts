/**
 * Event bus types and interfaces
 */

export interface EventMessage<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  source: string;
  metadata?: Record<string, any>;
  correlationId?: string;
  causationId?: string;
}

export interface EventHandler<T = any> {
  (message: EventMessage<T>): Promise<void> | void;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  unsubscribe: () => void;
}

export interface EventBusOptions {
  maxRetries?: number;
  retryDelay?: number;
  deadLetterQueue?: boolean;
  persistent?: boolean;
}

export interface EventBus {
  // Publishing
  publish<T = any>(eventType: string, payload: T, metadata?: Record<string, any>): Promise<void>;
  publishBatch<T = any>(events: Array<{ eventType: string; payload: T; metadata?: Record<string, any> }>): Promise<void>;

  // Subscribing
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): EventSubscription;
  subscribeToPattern<T = any>(pattern: string, handler: EventHandler<T>): EventSubscription;
  unsubscribe(subscriptionId: string): void;
  unsubscribeAll(eventType?: string): void;

  // Management
  getSubscriptions(eventType?: string): EventSubscription[];
  getStats(): EventBusStats;
  close(): Promise<void>;
}

export interface EventBusStats {
  totalPublished: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  errors: number;
  lastError?: Error;
}

export interface DeadLetterMessage extends EventMessage {
  originalTimestamp: number;
  retryCount: number;
  lastError: string;
  deadLetterTimestamp: number;
}

export interface EventStore {
  save(message: EventMessage): Promise<void>;
  load(id: string): Promise<EventMessage | null>;
  delete(id: string): Promise<boolean>;
  cleanup(olderThan: Date): Promise<number>;
}
