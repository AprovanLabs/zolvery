import { User, Random, Event, Transport } from '@kossabos/core';
import { Localization } from './localization';

export class Client {
  constructor(
    private user: User,
    public config: unknown,
    private transport: Transport,
    private localization: Localization = new Localization(),
    private random: Random = new Random(),
  ) {
    this.transport.addEventListener('message', (m) => {})
  }
  
  on = (eventType: Readonly<string>, action: (event: Event) => void): void => {
    this.transport.addEventListener(eventType, action as any);
  }

  emit = (event: Event) => {
    this.transport.dispatchEvent(event as any);
  }

  t = (key: string) => this.localization.t(key);
}
