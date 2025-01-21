import { BehaviorSubject, Observable } from 'rxjs';

export type ObservableRecord<T> = { readonly [K in keyof T]: Observable<T[K]> };

export type MaybeObservableRecord<T> = {
  readonly [K in keyof T]: Observable<T[K]> | T[K];
};

export type BehaviorSubjectRecord<T> = {
  readonly [K in keyof T]: BehaviorSubject<T[K]>;
};
