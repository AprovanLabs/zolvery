import { Context, Next } from 'koa';
import { apiLogger } from '@/config/logger';
import { LogContext } from './logger';

export enum Group {
  ADMIN = 'admin',
  CREATOR = 'creator',
}

export type GroupType = `${Group}`;

const GROUPS = new Set<GroupType>(Object.values(Group));

export interface CognitoUser {
  userId: string;
  username: string;
  groups: GroupType[];
}

export interface AuthContext extends LogContext {
  user?: CognitoUser;
}

/**
 * Extract Cognito claims from AWS Lambda request context
 */
function getCognitoClaimsFromRequest(ctx: Context): Record<string, any> {
  // Check if running in AWS Lambda environment
  const event = (ctx as any).event;
  if (event?.requestContext?.authorizer?.claims) {
    return event.requestContext.authorizer.claims;
  }

  // For local development, check for custom access token header
  const headers = ctx.headers;
  if (headers['x-cognito-access-token']) {
    try {
      const tokenData = JSON.parse(headers['x-cognito-access-token'] as string);
      // The token should contain an authorizer object with claims
      if (tokenData.authorizer && tokenData.authorizer.claims) {
        return tokenData.authorizer.claims;
      }
      // Fallback: if the token data directly contains claims
      return tokenData;
    } catch (error) {
      apiLogger.warn(
        {
          requestId: (ctx as any).requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to parse x-cognito-access-token header',
      );
    }
  }

  // Legacy support for x-cognito-claims header
  if (headers['x-cognito-claims']) {
    try {
      return JSON.parse(headers['x-cognito-claims'] as string);
    } catch (error) {
      apiLogger.warn(
        {
          requestId: (ctx as any).requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to parse x-cognito-claims header',
      );
    }
  }

  return {};
}

/**
 * Extract Cognito sub (user ID) from request
 */
function getCognitoSubFromRequest(ctx: Context): string | null {
  try {
    const claims = getCognitoClaimsFromRequest(ctx);
    const cognitoSub = claims.sub;

    if (cognitoSub) {
      apiLogger.debug(
        {
          requestId: (ctx as any).requestId,
          sub: cognitoSub,
        },
        'Cognito user authenticated',
      );
      return cognitoSub;
    }
  } catch (error) {
    apiLogger.error(
      {
        requestId: (ctx as any).requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to parse Cognito user',
    );
  }

  return null;
}

/**
 * Extract Cognito username from request
 */
function getCognitoUsernameFromRequest(ctx: Context): string | null {
  try {
    const claims = getCognitoClaimsFromRequest(ctx);
    return claims['cognito:username'] || null;
  } catch (error) {
    apiLogger.error(
      {
        requestId: (ctx as any).requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to parse Cognito username',
    );
    return null;
  }
}

/**
 * Extract Cognito groups from request
 */
function getCognitoGroupsFromRequest(ctx: Context): GroupType[] {
  try {
    const claims = getCognitoClaimsFromRequest(ctx);
    const groupsString = claims['cognito:groups'] || '';

    if (!groupsString) {
      return [];
    }

    const groups = groupsString
      .split(',')
      .map((group: string) => group.trim())
      .filter(Boolean)
      .filter((group: string) => GROUPS.has(group as Group)) as GroupType[];

    apiLogger.debug(
      {
        requestId: (ctx as any).requestId,
        groups,
      },
      'Cognito groups parsed',
    );

    return groups;
  } catch (error) {
    apiLogger.error(
      {
        requestId: (ctx as any).requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to parse Cognito groups',
    );
    return [];
  }
}

/**
 * Authentication middleware that extracts Cognito user information
 */
export const authMiddleware = async (
  ctx: LogContext,
  next: Next,
): Promise<void> => {
  const requestId = ctx.requestId;

  try {
    const sub = getCognitoSubFromRequest(ctx);

    if (!sub) {
      apiLogger.warn(
        {
          requestId,
          path: ctx.path,
          method: ctx.method,
        },
        'No user authentication found',
      );

      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const username = getCognitoUsernameFromRequest(ctx);
    const groups = getCognitoGroupsFromRequest(ctx);

    // Attach user information to context
    (ctx as AuthContext).user = {
      userId: sub, // Use sub as userId
      username: username || sub, // Fallback to sub if username not available
      groups,
    };

    apiLogger.info(
      {
        requestId,
        user: {
          userId: (ctx as AuthContext).user!.userId,
          username: (ctx as AuthContext).user!.username,
          groupCount: (ctx as AuthContext).user!.groups.length,
        },
      },
      'User authenticated',
    );

    await next();
  } catch (error) {
    apiLogger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Authentication middleware error',
    );

    ctx.status = 500;
    ctx.body = {
      success: false,
      error: 'Authentication error',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }
};

/**
 * Middleware to check if user belongs to required groups
 */
export const requireGroups = (requiredGroups: string[]) => {
  return async (ctx: LogContext, next: Next): Promise<void> => {
    const requestId = ctx.requestId;
    const authCtx = ctx as AuthContext;

    if (!authCtx.user) {
      apiLogger.warn(
        {
          requestId,
        },
        'No user found for group authorization',
      );

      ctx.status = 401;
      ctx.body = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    const userGroups = authCtx.user.groups;
    const hasRequiredGroup = requiredGroups.some((group) =>
      userGroups.includes(group as GroupType),
    );

    if (!hasRequiredGroup) {
      apiLogger.warn(
        {
          requestId,
          userGroups,
          requiredGroups,
        },
        'User does not have required groups',
      );

      ctx.status = 403;
      ctx.body = {
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return;
    }

    apiLogger.debug(
      {
        requestId,
        userGroups,
        requiredGroups,
      },
      'Group authorization successful',
    );

    await next();
  };
};
