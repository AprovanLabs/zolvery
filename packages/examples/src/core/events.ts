import { Observable, filter } from 'rxjs';

export type Event<T extends string, V = unknown> = {
  type: Readonly<T>;
  timestamp: Readonly<number>;
  value?: V
};

export type FinishEvent = Event<'finish'> & unknown;
export type StartEvent = Event<'start'> & unknown;

export type KossabosEvent =
  | FinishEvent
  | StartEvent;

export type EventType = KossabosEvent['type'];

export const on = <T extends Event<EventType>>(
  eventStream: Observable<KossabosEvent>
) => (
  eventType: T['type'],
  action: (event: T) => void,
) => {
  (
    eventStream.pipe(
      filter((event) => event?.type === eventType),
    ) as Observable<T>
  ).subscribe(action);
};
