export interface MessageBus<T = unknown> {
  postMessage(eventType: string, event: T): void;
}

export const createMessageBus = <T = unknown>(
  windowTarget: Window,
  onMessage: (e: T) => void,
): MessageBus<T> => {
  window.addEventListener('message', (e) => onMessage(e.data));
  return {
    postMessage: (eventType: string, event: T) => {
      windowTarget.postMessage({ type: eventType, ...event }, '*');
    },
  };
};

export const createChildMessageBus = <T = unknown>(
  onMessage: (e: T) => void,
): MessageBus<T> => createMessageBus(window.parent ?? window.top, onMessage)
