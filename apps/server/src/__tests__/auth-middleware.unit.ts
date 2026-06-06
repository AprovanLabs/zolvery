import { authMiddleware, requireGroups } from '@/middleware/auth';
import { AuthContext, GROUPS, Group } from '@/auth';

jest.mock('@/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  generateRequestId: jest.fn(() => 'test-id'),
  createTimer: jest.fn(() => () => 0),
  setRequestContext: jest.fn(),
  requestContextStore: { getStore: jest.fn(), enterWith: jest.fn() },
}));

jest.mock('@/config', () => ({
  appConfig: {
    nodeEnv: 'test',
    environment: 'tst',
    port: 3000,
    logLevel: 'debug',
    version: '1.0.0-test',
    aws: { region: 'us-east-2' },
    dynamodb: { tableName: 'test-table' },
    s3: { dataBucket: 'test-bucket' },
    cors: { origin: [/^http:\/\/localhost:\d+$/], credentials: false },
  },
}));

type NextFn = () => Promise<void>;

function createMockContext(
  overrides: Record<string, unknown> = {},
): AuthContext {
  const ctx = {
    headers: {},
    path: '/test',
    method: 'GET',
    status: 200,
    body: null,
    request: { body: null },
    set: jest.fn(),
    get: jest.fn(),
    requestId: 'test-request-id',
    routerPath: '/test',
    state: {},
    ...overrides,
  } as unknown as AuthContext;
  return ctx;
}

describe('authMiddleware', () => {
  let ctx: AuthContext;
  let next: NextFn;

  beforeEach(() => {
    next = jest.fn().mockResolvedValue(undefined);
  });

  it('should return 401 when no Cognito claims are present', async () => {
    ctx = createMockContext();
    await authMiddleware(ctx, next);

    expect(ctx.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when x-cognito-access-token is invalid JSON', async () => {
    ctx = createMockContext({
      headers: { 'x-cognito-access-token': 'not-json' },
    });
    await authMiddleware(ctx, next);

    expect(ctx.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when x-cognito-claims is invalid JSON', async () => {
    ctx = createMockContext({
      headers: { 'x-cognito-claims': '{invalid' },
    });
    await authMiddleware(ctx, next);

    expect(ctx.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should authenticate user with valid x-cognito-claims header', async () => {
    ctx = createMockContext({
      headers: {
        'x-cognito-claims': JSON.stringify({
          sub: 'user-123',
          'cognito:username': 'testuser',
          'cognito:groups': 'admin,creator',
        }),
      },
    });
    await authMiddleware(ctx, next);

    expect(ctx.user).toBeDefined();
    expect(ctx.user.userId).toBe('user-123');
    expect(ctx.user.username).toBe('testuser');
    expect(ctx.user.groups).toContain(Group.ADMIN);
    expect(ctx.user.groups).toContain(Group.CREATOR);
    expect(next).toHaveBeenCalled();
  });

  it('should authenticate user with valid x-cognito-access-token containing authorizer', async () => {
    ctx = createMockContext({
      headers: {
        'x-cognito-access-token': JSON.stringify({
          authorizer: {
            claims: {
              sub: 'user-456',
              'cognito:username': 'anotheruser',
              'cognito:groups': 'creator',
            },
          },
        }),
      },
    });
    await authMiddleware(ctx, next);

    expect(ctx.user).toBeDefined();
    expect(ctx.user.userId).toBe('user-456');
    expect(ctx.user.username).toBe('anotheruser');
    expect(ctx.user.groups).toEqual([Group.CREATOR]);
    expect(next).toHaveBeenCalled();
  });

  it('should use sub as username fallback when cognito:username is missing', async () => {
    ctx = createMockContext({
      headers: {
        'x-cognito-claims': JSON.stringify({
          sub: 'user-789',
          'cognito:groups': '',
        }),
      },
    });
    await authMiddleware(ctx, next);

    expect(ctx.user).toBeDefined();
    expect(ctx.user.username).toBe('user-789');
    expect(ctx.user.groups).toEqual([]);
  });

  it('should filter out invalid group names', async () => {
    ctx = createMockContext({
      headers: {
        'x-cognito-claims': JSON.stringify({
          sub: 'user-groups',
          'cognito:username': 'groupuser',
          'cognito:groups': 'admin,invalid-group,creator',
        }),
      },
    });
    await authMiddleware(ctx, next);

    expect(ctx.user.groups).toEqual([Group.ADMIN, Group.CREATOR]);
  });

  it('should handle empty groups string', async () => {
    ctx = createMockContext({
      headers: {
        'x-cognito-claims': JSON.stringify({
          sub: 'user-nogroups',
          'cognito:groups': '',
        }),
      },
    });
    await authMiddleware(ctx, next);

    expect(ctx.user.groups).toEqual([]);
  });
});

describe('requireGroups', () => {
  let ctx: AuthContext;
  let next: NextFn;

  beforeEach(() => {
    next = jest.fn().mockResolvedValue(undefined);
  });

  it('should return 401 when no user is set on context', async () => {
    ctx = createMockContext();
    const middleware = requireGroups(['admin']);
    await middleware(ctx, next);

    expect(ctx.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user lacks required groups', async () => {
    ctx = createMockContext();
    ctx.user = {
      userId: 'user-123',
      username: 'testuser',
      groups: [Group.CREATOR],
    };
    const middleware = requireGroups(['admin']);
    await middleware(ctx, next);

    expect(ctx.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when user has a required group', async () => {
    ctx = createMockContext();
    ctx.user = {
      userId: 'user-123',
      username: 'adminuser',
      groups: [Group.ADMIN, Group.CREATOR],
    };
    const middleware = requireGroups(['admin']);
    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
  });

  it('should call next when user has any of the required groups', async () => {
    ctx = createMockContext();
    ctx.user = {
      userId: 'user-123',
      username: 'creatoruser',
      groups: [Group.CREATOR],
    };
    const middleware = requireGroups(['admin', 'creator']);
    await middleware(ctx, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('GROUPS set', () => {
  it('should contain admin and creator group values', () => {
    expect(GROUPS.has('admin')).toBe(true);
    expect(GROUPS.has('creator')).toBe(true);
  });

  it('should not contain unknown groups', () => {
    expect(GROUPS.has('superadmin')).toBe(false);
  });
});
