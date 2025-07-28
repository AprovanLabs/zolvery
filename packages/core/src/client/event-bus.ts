/**
 * Client-side event bus for handling internal events
 */
export interface ClientEventMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  source: 'client' | 'server';
  metadata?: Record<string, any>;
}

export type ClientEventHandler = (message: ClientEventMessage) => Promise<void> | void;

export interface ClientEventSubscription {
  id: string;
  eventType: string;
  handler: ClientEventHandler;
  unsubscribe: () => void;
}

export class ClientEventBus {
  private subscriptions = new Map<string, Set<ClientEventSubscription>>();
  private messageQueue: ClientEventMessage[] = [];
  private processing = false;

  /**
   * Publish an event to subscribers
   */
  public async publish(
    eventType: string,
    payload: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const message: ClientEventMessage = {
      id: this.generateId(),
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: 'client',
      metadata: metadata || {},
    };

    this.messageQueue.push(message);
    await this.processQueue();
  }

  /**
   * Subscribe to events
   */
  public subscribe(eventType: string, handler: ClientEventHandler): ClientEventSubscription {
    const subscription: ClientEventSubscription = {
      id: this.generateId(),
      eventType,
      handler,
      unsubscribe: () => this.unsubscribe(subscription.id),
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    this.subscriptions.get(eventType)!.add(subscription);

    return subscription;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): void {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      for (const sub of subs) {
        if (sub.id === subscriptionId) {
          subs.delete(sub);
          if (subs.size === 0) {
            this.subscriptions.delete(eventType);
          }
          return;
        }
      }
    }
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.notifySubscribers(message);
    }

    this.processing = false;
  }

  /**
   * Notify subscribers of an event
   */
  private async notifySubscribers(message: ClientEventMessage): Promise<void> {
    const subscribers = this.subscriptions.get(message.type);
    if (!subscribers) {
      return;
    }

    const promises = Array.from(subscribers).map(async (subscription) => {
      try {
        await subscription.handler(message);
      } catch (error) {
        console.error(`Error in event handler for ${message.type}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
