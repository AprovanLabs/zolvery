import { BehaviorSubject, Subject } from 'rxjs';

import { Element } from './element';
import { EventType, KossabosEvent } from './events';
import { BehaviorSubjectRecord } from './types';

type EventEmitter = (eventType: EventType, event?: KossabosEvent) => void;

export type App<T> = {
  props: BehaviorSubjectRecord<T>;
  template: Record<string, Element>;
  emit: EventEmitter;
  destroy: () => void;
};

export const create =
  <T extends Record<string, unknown>>(
    props: Partial<T>,
    mount: (
      props: BehaviorSubjectRecord<T>,
      emit: EventEmitter,
    ) => Record<string, Element>,
  ) =>
  (eventEmitter: Subject<KossabosEvent>) => {
    const emit = (eventType: EventType, event?: KossabosEvent) =>
      eventEmitter.next(event ?? ({ type: eventType } as KossabosEvent));

    const subjects = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [
        key,
        new BehaviorSubject(value),
      ]),
    ) as BehaviorSubjectRecord<T>;

    const template = mount(subjects, emit);
    return {
      props: subjects,
      emit,
      destroy: () => {},
      template,
    } as App<T>;
  };
