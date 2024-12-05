import { Event, EventType } from './events';
import { MaybeObservableRecord } from './types';

export type ElementAttributes = {
  class?: string;
  value?: string;
};

export type EventCallback = {
  [T in EventType]: (event: Event<T>) => void;
};

export type Element<T = ElementAttributes> = {
  type: string;
  attributes?: MaybeObservableRecord<T>;
  children?: Record<string, Element>;
  on?: Partial<EventCallback>;
};
