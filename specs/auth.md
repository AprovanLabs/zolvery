# Authentication Implementation

## Overview

Kossabos uses AWS Cognito for authentication with JWT token-based authorization. All protected API endpoints require valid Cognito authentication.

## Architecture

### AWS Cognito Setup

- **User Pool**: Configured with email-based sign-in
- **Self-registration**: Enabled with email verification
- **Password Policy**: Minimum 6 characters, no complexity requirements
- **OAuth Scopes**: `openid`, `profile`, `email`, `cognito:admin`
- **Identity Providers**: Cognito native, optional Google OAuth

### User Groups

Two user groups are supported:
- `admin` - Administrative privileges
- `creator` - Content creation privileges

## Server Implementation

### Models

#### User Interface
```typescript
interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  lastActive: string;
  preferences?: UserPreferences;
}
```

#### CognitoUser Interface
```typescript
interface CognitoUser {
  userId: string;        // Cognito sub claim
  username: string;      // cognito:username or fallback to sub
  groups: GroupType[];   // parsed from cognito:groups
}
```

### Authentication Middleware

#### `authMiddleware`
- Extracts Cognito claims from request headers or Lambda context
- Validates JWT tokens and user identity
- Attaches user information to request context
- Returns 401 for unauthenticated requests

#### `requireGroups(requiredGroups)`
- Authorization middleware for group-based access control
- Checks if authenticated user belongs to required groups
- Returns 403 for insufficient permissions

### Token Handling

#### Production (AWS Lambda)
- Tokens extracted from `event.requestContext.authorizer.claims`
- Automatic JWT validation by API Gateway

#### Development/Local
- Custom headers supported:
  - `x-cognito-access-token`: Full token data with authorizer claims
  - `x-cognito-claims`: Legacy direct claims object

### API Endpoints

#### Authentication Routes (`/v1/protected/auth`)

##### `GET /me`
- Returns current user information
- **Response**: `{ userId, username, groups }`
- **Auth Required**: Yes

### Protected Route Structure

All API routes are protected under `/v1/protected/*`:
- `/v1/protected/auth` - User authentication endpoints
- `/v1/protected/events` - Event management
- `/v1/protected/leaderboard` - Leaderboard operations
- `/v1/protected/app-data` - Application data
- `/v1/protected/i18n` - Internationalization

### Error Handling

#### Standard Error Responses
```typescript
{
  success: false,
  error: string,
  timestamp: string,
  requestId?: string
}
```

#### Common HTTP Status Codes
- `401` - Authentication required
- `403` - Insufficient permissions (group authorization failed)
- `500` - Server error during authentication
