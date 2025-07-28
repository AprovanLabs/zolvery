import { Transport } from '../transport';
import { User } from '../user';
import { Client, ClientConfig } from './client.js';

export const createTransport = (windowTarget: Window): Transport => ({
  addEventListener: (
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void => {
    if (callback !== null) {
      windowTarget.addEventListener(type, callback, options);
    }
  },
  dispatchEvent: (event: Event) => {
    try {
      windowTarget.postMessage(event, '*');
      return true;
    } catch {
      return false;
    }
  },
  removeEventListener: (
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean,
  ): void => {
    if (callback !== null) {
      windowTarget.removeEventListener(type, callback, options);
    }
  },
});

export const createChildTransport = (): Transport =>
  createTransport(window.parent ?? window.top);

export const loadClient = (user: User, config: ClientConfig, transport: Transport) =>
  new Client(user, config, transport);

export { loadScript, getQueryParam } from './util';

// Export client-related types and classes
export type { ClientConfig, ClientEvent } from './client.js';
export { Client, CoreEventType } from './client.js';
export { ClientEventBus } from './event-bus.js';
export { ClientStorage } from './storage.js';
export { ClientAPI } from './api.js';
export { Localization } from './localization.js';
