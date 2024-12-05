import { App } from './app';

export interface Server<T> {
  run(app: App<T>): void;
}

export class KossabosServer<T> implements Server<T> {
  constructor(private readonly messageBus: MessageBus) {}

  public async run(app: App<T>): void {
    // Run synchrnous app.run as promise
    messageBus.addEventListener();
  }
}
