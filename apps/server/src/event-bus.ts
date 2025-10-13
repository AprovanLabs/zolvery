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
}

export interface EventHandler<T = any> {
  (message: EventMessage<T>): Promise<void> | void;
}

export interface EventPublisher {
  publish<T = any>(eventType: string, payload: T, metadata?: Record<string, any>): Promise<void>;
}

export interface EventSubscriber {
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): Promise<string>;
}

export interface EventStore {
  save(message: EventMessage): Promise<void>;
  load(id: string): Promise<EventMessage | null>;
  delete(id: string): Promise<boolean>;
  cleanup(olderThan: Date): Promise<number>;
}
