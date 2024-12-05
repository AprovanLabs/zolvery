export interface MessageBus {
  postMessage(eventType: string, event: unknown): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

export const createMessageBus = (): MessageBus => {
  window.addEventListener('message', function (e) {
    const event = e.data;
    window.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  });

  return {
    postMessage: (eventType: string, event: object) => {
      window.parent.postMessage({ type: eventType, ...event }, '*');
    },
  };
};
