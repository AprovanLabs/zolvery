import { Observable, filter } from 'rxjs';

export type Event<T extends string> = {
  type: Readonly<T>;
  target?: Readonly<Element>;
  timeStamp: Readonly<number>;
};

export type Element = {
  id: string;
  type: string;
  attributes: Record<string, string>;
  children: Element[];
  on: (eventType: string, callback: (event: Event) => void) => void;
};

export type Position = {
  x: number;
  y: number;
};

export type InteractEvent = Event<'interact'> & {
  position: Position;
};

export type FinishEvent = Event<'finish'> & unknown;

export type KeyEvent = Event<'interact'> & KeyboardEvent;

export type SwipeEvent = Event<'swipe'> & {
  angleDegrees: number;
  distance: number;
  direction:
    | 'left'
    | 'left-up'
    | 'up'
    | 'right-up'
    | 'right'
    | 'right-down'
    | 'down'
    | 'left-down';
  velocity: number;
  startPosition: Position;
  endPosition: Position;
};

export type ValueEvent<T> = Event<'value'> & {
  value: T;
};

export type KossabosEvent =
  | InteractEvent
  | KeyEvent
  | SwipeEvent
  | ValueEvent<unknown>
  | FinishEvent;
export type EventType = KossabosEvent['type'];

export const on = <T extends Event<EventType>>(
  eventStream: Observable<KossabosEvent>,
  eventType: T['type'],
  action: (event: T) => void,
) => {
  (
    eventStream.pipe(
      filter((event) => event.type === eventType),
    ) as Observable<T>
  ).subscribe(action);
};
