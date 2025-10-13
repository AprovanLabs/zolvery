import { EventPublisher } from '../../event-bus';
import type { SNSClient } from '@aws-sdk/client-sns';

export class SnsEventPublisher<T> implements EventPublisher<T> {
  constructor(
    private readonly snsClient: SNSClient,
    private readonly topic: string
  ) {}

  publish<T = any>(
    eventType: string,
    payload: T,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.snsClient.publish({
      source: 'server'
    });
  }
}
