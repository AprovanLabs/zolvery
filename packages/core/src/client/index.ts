import { Transport } from '../transport';
import { User } from '../user';
import { Client } from './client';

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

export const loadClient = (user: User, config: unknown, transport: Transport) =>
  new Client(user, config, transport);

export { loadScript, getQueryParam } from './util';
