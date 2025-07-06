import { EventBus, EventMessage, EventHandler, EventSubscription, EventBusOptions, EventBusStats } from './types';
import { v4 as uuid } from 'uuid';

/**
 * In-memory event bus implementation
 */
export class InMemoryEventBus implements EventBus {
  private subscriptions = new Map<string, EventSubscription[]>();
  private patternSubscriptions = new Map<string, EventSubscription[]>();
  private stats: EventBusStats = {
    totalPublished: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    errors: 0,
  };

  public constructor(private options: EventBusOptions = {}) {}

  public async publish<T = any>(
    eventType: string,
    payload: T,
    metadata?: Record<string, any>
  ): Promise<void> {
    const message: EventMessage<T> = {
      id: uuid(),
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: 'in-memory',
      metadata: metadata || {},
      correlationId: metadata?.correlationId || uuid(),
    };

    this.stats.totalPublished++;

    try {
      // Handle direct subscriptions
      const directSubscriptions = this.subscriptions.get(eventType) || [];
      await this.notifySubscribers(directSubscriptions, message);

      // Handle pattern subscriptions
      for (const [pattern, subs] of this.patternSubscriptions.entries()) {
        if (this.matchesPattern(eventType, pattern)) {
          await this.notifySubscribers(subs, message);
        }
      }
    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error as Error;
      throw error;
    }
  }

  public async publishBatch<T = any>(
    events: Array<{ eventType: string; payload: T; metadata?: Record<string, any> }>
  ): Promise<void> {
    const promises = events.map(event =>
      this.publish(event.eventType, event.payload, event.metadata)
    );
    await Promise.all(promises);
  }

  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): EventSubscription {
    const subscription: EventSubscription = {
      id: uuid(),
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => this.unsubscribe(subscription.id),
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(subscription);

    this.stats.totalSubscriptions++;
    this.stats.activeSubscriptions++;

    return subscription;
  }

  public subscribeToPattern<T = any>(pattern: string, handler: EventHandler<T>): EventSubscription {
    const subscription: EventSubscription = {
      id: uuid(),
      eventType: pattern,
      handler: handler as EventHandler,
      unsubscribe: () => this.unsubscribe(subscription.id),
    };

    if (!this.patternSubscriptions.has(pattern)) {
      this.patternSubscriptions.set(pattern, []);
    }
    this.patternSubscriptions.get(pattern)!.push(subscription);

    this.stats.totalSubscriptions++;
    this.stats.activeSubscriptions++;

    return subscription;
  }

  public unsubscribe(subscriptionId: string): void {
    // Remove from direct subscriptions
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        this.stats.activeSubscriptions--;
        if (subs.length === 0) {
          this.subscriptions.delete(eventType);
        }
        return;
      }
    }

    // Remove from pattern subscriptions
    for (const [pattern, subs] of this.patternSubscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        this.stats.activeSubscriptions--;
        if (subs.length === 0) {
          this.patternSubscriptions.delete(pattern);
        }
        return;
      }
    }
  }

  public unsubscribeAll(eventType?: string): void {
    if (eventType) {
      const subs = this.subscriptions.get(eventType);
      if (subs) {
        this.stats.activeSubscriptions -= subs.length;
        this.subscriptions.delete(eventType);
      }
    } else {
      this.stats.activeSubscriptions = 0;
      this.subscriptions.clear();
      this.patternSubscriptions.clear();
    }
  }

  public getSubscriptions(eventType?: string): EventSubscription[] {
    if (eventType) {
      return this.subscriptions.get(eventType) || [];
    }
    
    const allSubscriptions: EventSubscription[] = [];
    for (const subs of this.subscriptions.values()) {
      allSubscriptions.push(...subs);
    }
    for (const subs of this.patternSubscriptions.values()) {
      allSubscriptions.push(...subs);
    }
    
    return allSubscriptions;
  }

  public getStats(): EventBusStats {
    return { ...this.stats };
  }

  public async close(): Promise<void> {
    this.unsubscribeAll();
  }

  private async notifySubscribers(subscriptions: EventSubscription[], message: EventMessage): Promise<void> {
    const promises = subscriptions.map(async (subscription) => {
      try {
        await subscription.handler(message);
      } catch (error) {
        this.stats.errors++;
        this.stats.lastError = error as Error;
        
        // Could implement retry logic here if needed
        throw error;
      }
    });

    await Promise.allSettled(promises);
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    // Simple pattern matching (supports * wildcard)
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventType);
  }
}

/**
 * SNS-based event bus implementation (placeholder)
 */
export class SNSEventBus implements EventBus {
  public constructor(private snsClient: any, private options: EventBusOptions = {}) {}

  public async publish<T = any>(
    _eventType: string,
    _payload: T,
    _metadata?: Record<string, any>
  ): Promise<void> {
    // TODO: Implement SNS publishing
    throw new Error('SNSEventBus not yet implemented');
  }

  public async publishBatch<T = any>(
    _events: Array<{ eventType: string; payload: T; metadata?: Record<string, any> }>
  ): Promise<void> {
    // TODO: Implement SNS batch publishing
    throw new Error('SNSEventBus not yet implemented');
  }

  public subscribe<T = any>(_eventType: string, _handler: EventHandler<T>): EventSubscription {
    // TODO: Implement SNS subscription
    throw new Error('SNSEventBus not yet implemented');
  }

  public subscribeToPattern<T = any>(_pattern: string, _handler: EventHandler<T>): EventSubscription {
    // TODO: Implement SNS pattern subscription
    throw new Error('SNSEventBus not yet implemented');
  }

  public unsubscribe(_subscriptionId: string): void {
    // TODO: Implement SNS unsubscribe
    throw new Error('SNSEventBus not yet implemented');
  }

  public unsubscribeAll(_eventType?: string): void {
    // TODO: Implement SNS unsubscribe all
    throw new Error('SNSEventBus not yet implemented');
  }

  public getSubscriptions(_eventType?: string): EventSubscription[] {
    // TODO: Implement SNS get subscriptions
    throw new Error('SNSEventBus not yet implemented');
  }

  public getStats(): EventBusStats {
    // TODO: Implement SNS stats
    throw new Error('SNSEventBus not yet implemented');
  }

  public async close(): Promise<void> {
    // TODO: Implement SNS close
    throw new Error('SNSEventBus not yet implemented');
  }
}
