export type Transport = EventTarget;

export class ContextTransport implements Transport {
  public constructor(
    private eventTarget: EventTarget,
    private context: unknown,
  ) {}

  public addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.eventTarget.addEventListener(type, callback, options);
  }
  public dispatchEvent(event: Event): boolean {
    return this.eventTarget.dispatchEvent({
      ...event,
      context: this.context,
    } as any);
  }
  public removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void {
    this.eventTarget.removeEventListener(type, callback, options);
  }
}
