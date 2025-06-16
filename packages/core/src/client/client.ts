import { Event } from '../events';
import { Random } from '../random';
import { Transport } from '../transport';
import { User } from '../user';
import { Localization } from './localization';

export class Client {
  public constructor(
    private user: User,
    public config: unknown,
    private transport: Transport,
    private localization: Localization = new Localization(),
    private random: Random = new Random(),
  ) {
    this.transport.addEventListener('message', (message) => {
      // console.log('message', message)
    });
  }

  public env = (key: string) => {
    if (key === 'ENVIRONMENT') {
      return 'dev';
    }
    return null;
  }

  public get = (key: string) => {
    return null;
  }

  public set = (key: string, value: unknown) => {};

  public on = (
    eventType: Readonly<string>,
    action: (event: Event) => void,
  ): void => {
    this.transport.addEventListener(eventType, action as any);
  };

  public emit = (event: Event) => {
    this.transport.dispatchEvent(event as any);
  };

  public t = (key: string, defaultValue: string) => this.localization.t(key) ?? defaultValue;
}
