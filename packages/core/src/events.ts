import { Observable, filter } from 'rxjs';

export type Event_<T extends string, V = unknown> = {
  type: Readonly<T>;
  timestamp: Readonly<number>;
  value?: V;
  source: 'server' | 'client';
  sourceId: string;
  credentials?: string;
  context: unknown;
};

export type FinishEvent = Event_<'finish'> & unknown;
export type StartEvent = Event_<'start'> & unknown;

export type Event = FinishEvent | StartEvent;

export type EventType = Event['type'];

export const on =
  <T extends Event_<EventType>>(eventStream: Observable<Event>) =>
  (eventType: T['type'], action: (event: T) => void) => {
    (
      eventStream.pipe(
        filter((event) => event?.type === eventType),
      ) as Observable<T>
    ).subscribe(action);
  };
