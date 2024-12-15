export type Transport = EventTarget

export class ContextTransport implements Transport {
  constructor(
    private eventTarget: EventTarget,
    private context: unknown,
  ) {}

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.eventTarget.addEventListener(type, callback, options);
  }
  dispatchEvent(event: Event): boolean {
    return this.eventTarget.dispatchEvent({
        ...event,
        context: this.context,
    } as any);
  }
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void {
    this.eventTarget.removeEventListener(type, callback, options);
  }
}
