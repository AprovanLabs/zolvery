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

// Core system events that match server implementation
export type AppStartEvent = Event_<'app.start', { appId: string; userId: string }>;
export type AppReadyEvent = Event_<'app.ready'>;
export type UserActionEvent = Event_<'user.action', any>;
export type ScoreSubmitEvent = Event_<'score.submit', { score: number; metadata?: Record<string, any> }>;
export type DataRequestEvent = Event_<'data.request', { key: string }>;

// Custom game events (examples from existing games)
export type SubmitEvent = Event_<'submit', { value: any }>;
export type EndEvent = Event_<'end', { votes?: any[]; data?: any }>;
export type VoteEvent = Event_<'vote', { userId: string; score: number }>;
export type PhaseChangeEvent = Event_<'phase.change', { from: string; to: string }>;

// Card game events
export type CardPlayEvent = Event_<'card.play', { cardId: string; targetPlayer?: string }>;
export type TurnChangeEvent = Event_<'turn.change', { currentPlayer: string; nextPlayer: string }>;

// General purpose events
export type CustomEvent = Event_<string, any>;

export type Event = 
  | FinishEvent 
  | StartEvent 
  | AppStartEvent
  | AppReadyEvent
  | UserActionEvent
  | ScoreSubmitEvent
  | DataRequestEvent
  | SubmitEvent
  | EndEvent
  | VoteEvent
  | PhaseChangeEvent
  | CardPlayEvent
  | TurnChangeEvent
  | CustomEvent;

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

/**
 * Create a properly typed event
 */
export const createEvent = <T extends string, V = unknown>(
  type: T,
  value?: V,
  source: 'server' | 'client' = 'client',
  sourceId: string = 'default',
  context: unknown = null
): Event_<T, V> => ({
  type,
  timestamp: Date.now(),
  value,
  source,
  sourceId,
  context,
});

/**
 * Check if an event is a core system event
 */
export const isCoreEvent = (eventType: string): boolean => {
  return eventType.startsWith('app.') || 
         eventType.startsWith('user.') || 
         eventType.startsWith('score.') || 
         eventType.startsWith('data.');
};

/**
 * Check if an event is a game-specific event
 */
export const isGameEvent = (eventType: string): boolean => {
  return !isCoreEvent(eventType);
};
