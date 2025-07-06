# Kossabos Server Architecture

A Koa.js-based TypeScript server for handling game events, leaderboards, and internationalization for word games like Poetry Slam.

## Architecture Overview

The server follows a modular architecture with clear separation of concerns:

```
src/
├── app.ts                # Main Koa application setup
├── index.ts              # Entry point
├── config/               # Configuration management
├── middleware/           # Custom middleware
├── routes/               # Route handlers
├── services/             # Business logic
├── models/               # Data models and types
├── utils/                # Utility functions
└── __tests__/            # Integration tests
```

## Core Functionalities

### 1. Event Handling

**Purpose**: Store and retrieve the latest event value for each event key per day-game-user instance.

**Data Model**:
```typescript
interface AppEvent {
  PK: string;           // "DAY#2025-07-01#GAME#poetry-slam#USER#user123"
  SK: string;           // "EVENT#eventKey"
  eventKey: string;     // Event identifier (e.g., "poem", "vote", "phase")
  value: any;          // Event data (JSON)
  timestamp: string;    // ISO timestamp
  appId: string;       // App ID
  day: string;         // Date in YYYY-MM-DD format
  ttl?: number;        // Optional TTL for cleanup
}
```

**Endpoints**:
- `POST /events/:appId` - Store event data
- `GET /events/:appId/:day` - Get latest events for user/game/day
- `GET /events/:appId/:day/:eventKey` - Get specific event value

### 2. Leaderboard & Scoring

**Purpose**: Store game-end scores and maintain leaderboards with time-based queries.

**Data Model**:
```typescript
interface GameScore {
  PK: string;           // "LEADERBOARD#poetry-slam#2025-07-01"
  SK: string;           // "SCORE#user123#timestamp"
  userId: string;       // User identifier
  appId: string;       // Game identifier
  day: string;         // Date in YYYY-MM-DD format
  score: number;        // Final score
  rank?: number;        // Calculated rank
  gameData: any;        // Game-specific data (poem, votes, etc.)
  timestamp: string;    // ISO timestamp
  createdAt: number;    // Unix timestamp for sorting
}

interface LeaderboardEntry {
  PK: string;           // "LEADERBOARD#poetry-slam#GLOBAL" or "LEADERBOARD#poetry-slam#2025-07-01"
  SK: string;           // "USER#user123"
  userId: string;
  username: string;
  totalScore: number;   // Aggregate score
  gamesPlayed: number;
  bestScore: number;
  lastPlayed: string;
  rank: number;
}
```

**Endpoints**:
- `POST /leaderboard/score` - Submit game score
- `GET /leaderboard/:appId/daily/:date` - Daily leaderboard
- `GET /leaderboard/:appId/global` - Global leaderboard
- `GET /leaderboard/:appId/user/:userId` - User's scores over time

### 3. Game Data (Key/Value) Endpoints

**Purpose**: Provide game-specific configuration and data per game and day.

**Data Model**:
```typescript
interface GameData {
  PK: string;           // "GAMEDATA#poetry-slam#2025-07-01"
  SK: string;           // "CONFIG" or specific data key
  appId: string;
  day: string;
  key: string;         // Data key (e.g., "prompt", "examples", "config")
  value: any;          // JSON data
  version: string;     // Data version for caching
  updatedAt: string;
}
```

**Endpoints**:
- `GET /game-data/:appId/:day` - Get all game data for day
- `GET /game-data/:appId/:day/:key` - Get specific data value
- `POST /game-data/:appId/:day/:key` - Update game data (admin)

### 4. Internationalization (i18n)

**Purpose**: Load and serve localized content from S3 per game.

**S3 Structure**:
```
kossabos-i18n/
├── poetry-slam/
│   ├── en.json
│   ├── es.json
│   ├── fr.json
│   └── de.json
├── word-chain/
│   └── en.json
└── common/
    ├── en.json
    └── es.json
```

**Endpoints**:
- `GET /i18n/:appId/:locale` - Get localized strings for game
- `GET /i18n/common/:locale` - Get common localized strings

## Database Schema (DynamoDB)

### Primary Table: `kossabos-game-data`

**Access Patterns**:
1. Get user events for specific game/day: `PK = DAY#date#GAME#appId#USER#userId`
2. Get daily leaderboard: `PK = LEADERBOARD#appId#date`, `SK begins_with SCORE#`
3. Get user's game history: `GSI1PK = USER#userId#GAME#appId`, `GSI1SK = DAY#date`
4. Get game configuration: `PK = GAMEDATA#appId#date`

**Indexes**:
- GSI1: `GSI1PK` / `GSI1SK` - User-centric queries
- GSI2: `appId` / `createdAt` - Time-based game queries

## Testing Strategy

### Unit Tests (`*.unit.ts`)
- Individual service functions
- Utility functions
- Data model validation
- Configuration loading

### Integration Tests (`*.spec.ts`)
- API endpoint testing
- Database operations
- S3 interactions
- End-to-end game flows

**Test Structure**:
```
src/
├── services/
│   ├── event-service.ts
│   └── event-service.unit.ts
├── utils/
│   ├── validation.ts
│   └── validation.unit.ts
└── __tests__/
    ├── events.spec.ts
    ├── leaderboard.spec.ts
    └── setup.ts
```

## Environment Configuration

```bash
# Database
DYNAMODB_TABLE_NAME=kossabos-game-data
DYNAMODB_REGION=us-east-2

# S3
S3_DATA_BUCKET=kossabos-i18n
S3_REGION=us-east-2

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# AWS
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## API Response Formats

### Success Response
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}
```

### Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}
```

## Game Integration Example (Poetry Slam)

Based on the client code analysis, the Poetry Slam game requires:

1. **Event Storage**: Store poem text, votes, phase changes
2. **Game Data**: Daily prompts, example poems
3. **Scoring**: Vote-based scoring system
4. **i18n**: UI text translations

**Client Integration**:
```javascript
// Client uses inject('kossabos') to access:
const { get, env, emit, t } = inject('kossabos');

// get() calls -> GET /game-data/poetry-slam/2025-07-01
// emit() calls -> POST /events
// t() calls -> cached i18n data from GET /i18n/poetry-slam/en
```

## Performance Considerations

1. **Caching**: Redis for frequently accessed game data and i18n strings
2. **Rate Limiting**: Per-user rate limits on event submissions
3. **Data Partitioning**: Partition by game and date for better query performance
4. **TTL**: Automatic cleanup of old event data
5. **Connection Pooling**: Reuse DynamoDB and S3 connections

## Security

1. **Input Validation**: Strict validation on all inputs
2. **Rate Limiting**: Prevent spam and abuse
3. **CORS**: Configured for allowed origins
4. **Sanitization**: Clean user-generated content
5. **Authentication**: Cognito

## Deployment

The server is designed to run both as:
1. **Standalone Koa server**: For development and testing
2. **AWS Lambda**: For production serverless deployment

Lambda handler wraps the Koa app using `serverless-http` or similar adapter.

## Implementation Status

✅ **Completed:**
- TypeScript configuration with path aliases
- Koa.js server setup with middleware
- Event handling service and routes
- Leaderboard service and routes  
- App data (key/value) service and routes
- i18n service with S3 integration
- Jest testing configuration for unit and integration tests
- Environment configuration management
- Error handling and API response standardization
- Updated terminology from 'game' to 'app' throughout

✅ **Created Files:**
- Core models: `event.ts`, `leaderboard.ts`, `app.ts`, `user.ts`, `index.ts`
- Services: `event-service.ts`, `leaderboard-service.ts`, `app-service.ts`, `i18n-service.ts`
- Routes: `events.ts`, `leaderboard.ts`, `app-data.ts`, `i18n.ts`
- Utils: `date.ts` with helper functions
- Tests: Unit tests (`*.unit.ts`) and integration tests (`*.spec.ts`)
- Config: `tsconfig.json`, `jest.config.js`, `vite.config.ts`, `.eslintrc.js`

🔄 **Next Steps:**
1. Install dependencies: `npm install`
2. Set up environment: Copy `.env.example` to `.env` and configure
3. Create DynamoDB table with proper indexes
4. Set up S3 bucket for i18n files
5. Run tests: `npm test`
6. Start development server: `npm run dev`

## Poetry Slam Integration

The server provides all necessary endpoints for the Poetry Slam client:

```javascript
// Client integration points:
const { get, env, emit, t } = inject('kossabos');

// get('context') -> GET /app-data/poetry-slam/2025-07-01
// get('data') -> GET /app-data/poetry-slam/2025-07-01
// emit('submit', data) -> POST /events
// emit('end', data) -> POST /leaderboard/score
// t('submit', 'Submit') -> cached from GET /i18n/poetry-slam/en
```

## Database Setup

Create DynamoDB table with the following configuration:

```bash
aws dynamodb create-table \
  --table-name kossabos-game-data \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=GSI1,KeySchema='[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

## Testing

Run different types of tests:

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```
