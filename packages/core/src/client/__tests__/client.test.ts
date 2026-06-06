import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoreEventType } from '../client.js';
import { ClientEventBus } from '../event-bus.js';
import { ClientStorage } from '../storage.js';

vi.mock('../api.js', () => {
  return {
    ClientAPI: vi.fn().mockImplementation(() => ({
      getAppData: vi.fn().mockResolvedValue({ key: 'value' }),
      createEvent: vi.fn().mockResolvedValue({ eventKey: 'test' }),
      getEvents: vi.fn().mockResolvedValue([]),
      submitScore: vi.fn().mockResolvedValue({}),
      getLeaderboard: vi.fn().mockResolvedValue([]),
      getI18nData: vi.fn().mockResolvedValue({}),
      getUsers: vi.fn().mockResolvedValue([]),
      setAuthToken: vi.fn(),
      setAppId: vi.fn(),
    })),
  };
});

vi.mock('../../events.js', () => ({
  createEvent: (
    type: string,
    data?: unknown,
    source?: string,
    userId?: string,
  ) => ({ type, data, source, userId, timestamp: Date.now() }),
  isCoreEvent: (type: string) =>
    [
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
    ].includes(type),
  isGameEvent: (type: string) =>
    ![
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
    ].includes(type),
}));

import { Client } from '../client.js';

function createTestClient(overrides: Record<string, unknown> = {}): Client {
  const user = {
    userId: 'test-user',
    userLocale: 'en-US',
    username: 'testuser',
  };

  const config = {
    appId: 'test-app',
    environment: 'test',
    apiBaseUrl: 'https://api.test.com',
    ...overrides,
  };

  const transport = {
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    removeEventListener: vi.fn(),
  };

  return new Client(user, config, transport);
}

describe('Client', () => {
  describe('constructor', () => {
    it('should create a client with required config', () => {
      const client = createTestClient();
      expect(client.config.appId).toBe('test-app');
    });
  });

  describe('env', () => {
    it('should return environment value for known keys', () => {
      const client = createTestClient({ environment: 'staging' });
      expect(client.env('ENVIRONMENT')).toBe('staging');
      expect(client.env('APP_ID')).toBe('test-app');
      expect(client.env('USER_ID')).toBe('test-user');
    });

    it('should return null for unknown keys', () => {
      const client = createTestClient();
      expect(client.env('UNKNOWN')).toBeNull();
    });

    it('should use default environment when not specified', () => {
      const client = createTestClient({ environment: undefined });
      expect(client.env('ENVIRONMENT')).toBe('dev');
    });
  });

  describe('set and get', () => {
    it('should set and get values from local state', () => {
      const client = createTestClient();
      client.set('testKey', 'testValue');
      expect(client.get('testKey')).toBe('testValue');
    });

    it('should return null for unset keys', () => {
      const client = createTestClient();
      expect(client.get('nonexistent')).toBeNull();
    });
  });

  describe('on and off', () => {
    it('should subscribe and receive events', () => {
      const client = createTestClient();
      const handler = vi.fn();
      client.on('test-event', handler);
      client.emit('test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test-event',
          data: { data: 'test' },
          source: 'client',
        }),
      );
    });

    it('should unsubscribe from events', () => {
      const client = createTestClient();
      const handler = vi.fn();
      client.on('test-event', handler);
      client.off('test-event', handler);
      client.emit('test-event');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('t', () => {
    it('should return default value when no translation exists', () => {
      const client = createTestClient();
      const result = client.t('missing.key', 'Default Text');
      expect(result).toBe('Default Text');
    });
  });

  describe('hasSubmittedScoreToday', () => {
    it('should return false initially', () => {
      const client = createTestClient();
      expect(client.hasSubmittedScoreToday()).toBe(false);
    });
  });
});

describe('CoreEventType', () => {
  it('should have expected event types', () => {
    expect(CoreEventType.APP_START).toBe('app.start');
    expect(CoreEventType.APP_READY).toBe('app.ready');
    expect(CoreEventType.APP_INITIALIZED).toBe('app.initialized');
    expect(CoreEventType.USER_ACTION).toBe('user.action');
    expect(CoreEventType.DATA_REQUEST).toBe('data.request');
    expect(CoreEventType.DATA_UPDATED).toBe('data.updated');
    expect(CoreEventType.SCORE_SUBMIT).toBe('score.submit');
    expect(CoreEventType.SCORE_ACCEPTED).toBe('score.accepted');
    expect(CoreEventType.SCORE_REJECTED).toBe('score.rejected');
  });
});

describe('ClientEventBus', () => {
  let bus: ClientEventBus;

  beforeEach(() => {
    bus = new ClientEventBus();
  });

  it('should publish events to subscribers', async () => {
    const handler = vi.fn();
    bus.subscribe('test-event', handler);
    await bus.publish('test-event', { data: 'test' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test-event',
        payload: { data: 'test' },
      }),
    );
  });

  it('should not notify subscribers of different event types', async () => {
    const handler = vi.fn();
    bus.subscribe('other-event', handler);
    await bus.publish('test-event', { data: 'test' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow unsubscribing', async () => {
    const handler = vi.fn();
    const sub = bus.subscribe('test-event', handler);
    sub.unsubscribe();
    await bus.publish('test-event', { data: 'test' });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ClientStorage', () => {
  let storage: ClientStorage;

  beforeEach(() => {
    storage = new ClientStorage();
  });

  it('should return null for unset keys', () => {
    expect(storage.get('missing')).toBeNull();
  });

  it('should set and get values', () => {
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });

  it('should remove values', () => {
    storage.set('key', 'value');
    storage.remove('key');
    expect(storage.get('key')).toBeNull();
  });

  it('should clear all values', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    storage.clear();
    expect(storage.get('key1')).toBeNull();
    expect(storage.get('key2')).toBeNull();
  });

  it('should check if key exists', () => {
    storage.set('key', 'value');
    expect(storage.has('key')).toBe(true);
    expect(storage.has('missing')).toBe(false);
  });

  it('should return all keys', () => {
    storage.set('a', 1);
    storage.set('b', 2);
    expect(storage.keys()).toEqual(['a', 'b']);
  });

  it('should return cache size', () => {
    storage.set('a', 1);
    storage.set('b', 2);
    expect(storage.size()).toBe(2);
  });
});
