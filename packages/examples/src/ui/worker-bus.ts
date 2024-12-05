export interface WorkerBus {
  getEventTarget(): EventTarget;
  postMessage(message: any): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

export const createWorkerBus = (worker: Worker): WorkerBus => {
  const bus = new EventTarget();

  worker.onmessage = (event) => {
    bus.dispatchEvent(new CustomEvent(event.data.type, { detail: event.data }));
  };

  return {
    getEventTarget: () => bus,
    postMessage: (message: any) => {
      worker.postMessage(message);
    },
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      bus.addEventListener(type, listener);
    },
    removeEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      bus.removeEventListener(type, listener);
    },
  };
};
