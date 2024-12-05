import React, { useEffect } from 'react';
import {
  Observable,
  first,
  fromEvent,
  map,
  of,
  scan,
  shareReplay,
  tap,
} from 'rxjs';

import { Project } from '../../core/project';

export type State = Record<string, unknown>;
export type Event = { elementId: string; payload: unknown };

export const EventContext = React.createContext<{
  events: Observable<Event>;
  state: Observable<State>;
}>({ events: of(), state: of() });

export const EventProvider: React.FC<
  React.PropsWithChildren<{
    project: Project;
    eventTarget: EventTarget;
  }>
> = ({ project, eventTarget, children }) => {
  const [events, setEvents] = React.useState<Observable<Event>>();
  const [state, setState] = React.useState<Observable<State>>();

  useEffect(() => {
    const eventBus: Observable<Event> = fromEvent<CustomEvent<Event>>(
      eventTarget,
      'message',
    ).pipe(
      tap((e) => console.log('event bus', e)),
      map((customEvent) => customEvent.detail),
    );
    setEvents(eventBus);

    const stateBus: Observable<State> = eventBus.pipe(
      scan((currState, currEvent) => {
        return {
          ...currState,
          [currEvent.elementId]: currEvent.payload,
        };
      }, {} as State),
      shareReplay(1),
    );
    setState(stateBus);

    const subscription = eventBus.subscribe((event) => {
      console.log(event);
    });

    return () => subscription.unsubscribe();
  }, [eventTarget]);

  return (
    <EventContext.Provider value={{ events, state }}>
      {children}
    </EventContext.Provider>
  );
};

export const useElementEventState = <T,>(elementId: string) => {
  const events = React.useContext(EventContext);
  const [state, setState] = React.useState<T>();

  useEffect(() => {
    events.state.pipe(first()).subscribe((state) => {
      const initialState = state[elementId] as T;
      if (!initialState) {
        return;
      }
      setState(initialState);
    });
  }, [elementId]);

  useEffect(() => {
    const subscription = events.events.subscribe((event) => {
      if (event.elementId === elementId) {
        setState(event as T);
      }
    });
    return () => subscription.unsubscribe();
  }, [elementId]);

  return state;
};
