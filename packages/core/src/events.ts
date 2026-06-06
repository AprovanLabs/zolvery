export function createEvent(
  type: string,
  data?: unknown,
  source?: string,
  userId?: string,
): Record<string, unknown> {
  return { type, data, source, userId, timestamp: Date.now() };
}

export function isCoreEvent(type: string): boolean {
  const coreEvents = [
    'app.start',
    'app.ready',
    'app.initialized',
    'user.action',
    'user.connected',
    'user.disconnected',
    'data.request',
    'data.updated',
    'score.submit',
    'score.accepted',
    'score.rejected',
  ];
  return coreEvents.includes(type);
}

export function isGameEvent(type: string): boolean {
  return !isCoreEvent(type);
}

export type Event = ReturnType<typeof createEvent>;
