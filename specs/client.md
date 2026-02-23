# Zolvery Client Architecture

## Overview

The Zolvery client system provides an event-driven interface for game applications to interact with the backend API. Each app has both a client-side script for UI logic and an optional server-side script for multiplayer coordination.

## Core Concepts

### Event-Driven Architecture

The entire system is built around events rather than direct API calls. This provides:
- **Abstraction**: Clients don't need to know about specific endpoints
- **Flexibility**: Support for both synchronous (WebRTC) and asynchronous (daily leaderboards) gameplay
- **Separation**: Core system events vs custom game events
- **Runners**: Multiple implementation strategies (boardgame.io, vanilla JS)

### App Structure

Each app consists of:
- **Core Config**: Base app configuration loaded into the database
- **Daily Configs**: Day-specific data (prompts, puzzles, etc.)
- **Client Script**: Frontend logic for game display and interaction
- **Server Script**: Optional backend logic for multiplayer coordination

## Client API

The client exposes a unified interface via dependency injection:

```javascript
const { get, set, env, emit, on, t } = inject('zolvery');
```

### Core Methods

#### `get(key: string): any`
Retrieves data from the backend (app data, context, user state)
- Maps to `GET /app-data/:appId/:day` for daily data
- Caches frequently accessed data locally
- Returns `null` for unknown keys

#### `set(key: string, value: any): void`
Sets local client state (not persisted to backend)
- Used for UI state management
- Temporary data during gameplay
- User preferences

#### `env(key: string): string | null`
Access environment variables and configuration
- `ENVIRONMENT`: Current environment (dev, staging, prod)
- App-specific configuration values
- Feature flags

#### `emit(eventType: string, data?: any): void`
Sends events to the system
- Core events: handled by system
- Custom events: forwarded to custom scripts
- Can trigger backend API calls

#### `on(eventType: string, handler: Function): void`
Subscribes to events
- Listen for system events
- Receive custom game events
- Handle responses from backend

#### `t(key: string, defaultValue: string): string`
Internationalization support
- Maps to cached i18n data from `GET /i18n/:appId/:locale`
- Falls back to default value if translation missing
- Supports parameterized translations

## Event Types

### Core System Events

These events are managed by the core system and cannot be overridden:

#### Client → System
- `app.start`: Initialize app session
- `app.ready`: Client is ready for gameplay
- `user.action`: Generic user interaction
- `score.submit`: Submit final score (once per day)
- `data.request`: Request specific data from backend

#### System → Client
- `app.initialized`: App data loaded
- `data.updated`: New data available
- `user.connected`: User joined session
- `user.disconnected`: User left session
- `score.accepted`: Score successfully submitted
- `score.rejected`: Score submission failed/duplicate

### Custom Game Events

Games can define their own events for specific functionality:

#### Examples from Poetry Slam
- `poem.submit`: User submits their poem
- `vote.cast`: User votes for a poem
- `phase.change`: Game phase transition
- `timer.update`: Update countdown timer

#### Examples from Card Games
- `card.play`: Player plays a card
- `hand.update`: Hand composition changes
- `turn.change`: Turn passes to next player
- `game.end`: Game concludes

## Implementation Strategies

### Vanilla JavaScript Backend

Direct API integration with event mapping:
- `emit()` → HTTP POST requests
- `get()` → HTTP GET requests with caching
- Local event bus for client-side coordination

### Boardgame.io Backend

Wrapped boardgame.io integration:
- `emit()` → boardgame.io moves/events
- Game state synced automatically
- Built-in multiplayer support

## Data Flow

### Asynchronous (Daily Games)

1. Client loads daily config via `get('data')`
2. User plays game locally
3. Events stored via `emit()` calls
4. Final score submitted once per day
5. Leaderboards updated automatically

### Synchronous (Real-time Multiplayer)

1. Users join session via WebRTC or boardgame.io
2. Game state synchronized in real-time
3. Events broadcast to all connected players
4. Optional backend coordination for complex logic

## Error Handling

### Rate Limiting
- Events limited per user per time period
- Score submission: once per day per app
- Graceful degradation when limits exceeded

### Network Issues
- Client-side caching for offline play
- Event queuing when connection restored
- Automatic retry for critical events

### Validation
- Client-side validation for immediate feedback
- Server-side validation for security
- Clear error messages for users

## Security

### Authentication
- JWT tokens required for all backend calls
- Automatic token refresh
- Session management

### Input Validation
- Sanitize all user input
- Validate event payloads
- Prevent injection attacks

### Rate Limiting
- Per-user event limits
- Daily score submission limits
- DDoS protection

## Performance

### Caching Strategy
- App data cached for session duration
- i18n strings cached locally
- User preferences persisted locally

### Event Batching
- Multiple events can be batched for efficiency
- Automatic batching for high-frequency events
- Configurable batch sizes and timeouts

### Connection Management
- Persistent connections for real-time games
- Efficient polling for async updates
- Automatic reconnection handling

## Current Implementation Examples

### Poetry Slam Game

The Poetry Slam example demonstrates the event-driven approach:

```javascript
export const app = createApp({
  setup() {
    const { get, env, emit, t } = inject('zolvery');
    
    // Environment detection
    const isDev = computed(() => env('ENVIRONMENT') === 'dev');
    
    // Data retrieval
    const example = computed(() => get('example') || {});

    // Game logic
    const submit = () => {
      emit('submit', { value: poem.value });
      phase.value = 'voting';
    };
    
    const submitVotes = () => {
      emit('end', { votes, data });
    };
  }
});
```

### Event Mapping

Current client calls map to the backend as follows:

**Data Retrieval:**
- `get('context')` → `GET /app-data/:appId/:day` (general context)
- `get('data')` → `GET /app-data/:appId/:day` (daily config)
- `get('users')` → In-memory or WebRTC user list

**Event Emission:**
- `emit('submit', data)` → `POST /events/:appId` with `{ eventKey: 'submit', value: data }`
- `emit('end', data)` → `POST /events/:appId` + `POST /leaderboard/score`

**Environment:**
- `env('ENVIRONMENT')` → Returns 'dev', 'staging', or 'prod'

**Internationalization:**
- `t('key', 'default')` → Uses cached data from `GET /i18n/:appId/:locale`

## Backend API Integration

### Event Storage

When `emit()` is called with custom events, the client:
1. Creates an event via `POST /events/:appId` 
2. Event is stored in DynamoDB with TTL
3. Event bus publishes `APP_EVENT_CREATED` 
4. Other clients can receive updates via WebSocket/polling

### Score Submission

Special handling for score events:
1. `emit('score.submit', { score: 100 })` 
2. Client checks if score already submitted today
3. If not submitted: stores event + submits to leaderboard
4. If already submitted: emits `score.rejected` event
5. Leaderboards updated automatically

### Data Caching

The client implements intelligent caching:
- App data cached for session duration
- i18n strings cached until locale change
- User preferences stored in localStorage
- Event queue for offline support

## Examples

### Poetry Slam Integration

```javascript
// Get daily prompt and context
const data = get('data') || {};
const context = get('context') || {};
const prompt = data.prompt || 'Write a haiku.';

// Submit poem when user finishes
emit('poem.submit', { 
  text: poemText,
  timestamp: Date.now()
});

// Submit final score (once per day)
emit('score.submit', {
  score: finalScore,
  metadata: { words: wordCount, rhymes: rhymeCount }
});
```

### Card Game Integration

```javascript
// Listen for turn changes
on('turn.change', (event) => {
  updateUI(event.currentPlayer);
});

// Play a card
emit('card.play', {
  cardId: selectedCard.id,
  targetPlayer: targetPlayerId
});

// Listen for game end
on('game.end', (event) => {
  showResults(event.winner, event.scores);
});
```

## Migration Guide

### From Direct API Calls

**Before:**
```javascript
fetch('/api/events', {
  method: 'POST',
  body: JSON.stringify(eventData)
});
```

**After:**
```javascript
emit('custom.event', eventData);
```

### From Boardgame.io Only

**Before:**
```javascript
moves.playCard(cardId);
```

**After:**
```javascript
emit('card.play', { cardId });
```

## Enhanced Client Implementation

### Core Client Class

The new `Client` class provides a comprehensive event-driven interface:

```typescript
import { Client, ClientConfig, CoreEventType } from '@zolver/core';

const config: ClientConfig = {
  appId: 'my-game',
  apiBaseUrl: 'https://api.zolvery.com',
  environment: 'production',
  locale: 'en-US',
  enableCaching: true,
  batchEvents: false,
  retryFailedEvents: true,
};

const client = new Client(user, config, transport);
```

### Key Features

#### Smart Caching
- **App Data**: Cached for session duration
- **i18n Strings**: Cached until locale changes  
- **User Preferences**: Persisted in localStorage
- **Event Queue**: Queued for offline support

#### Event Handling
- **Core Events**: System-managed (score submission, app lifecycle)
- **Custom Events**: Game-specific logic
- **Event Bus**: Internal pub/sub for complex flows
- **Transport Integration**: Compatible with existing event systems

#### Backend Integration
- **Automatic API Calls**: `emit()` → HTTP requests
- **Authentication**: JWT token management
- **Error Handling**: Retry logic and graceful degradation
- **Rate Limiting**: Built-in protection against spam

### Migration from Legacy System

**Before (Vue with inject):**
```javascript
const { get, env, emit, t } = inject('zolvery');

// Get data
const data = get('data');

// Submit event
emit('submit', { value: poemText });

// Environment check
const isDev = env('ENVIRONMENT') === 'dev';

// Localization
const submitText = t('submit', 'Submit');
```

**After (Enhanced Client):**
```typescript
const client = new Client(user, config, transport);

// Get data (same interface)
const data = client.get('data');

// Submit event (same interface)
client.emit('submit', { value: poemText });

// Environment check (same interface)
const isDev = client.env('ENVIRONMENT') === 'dev';

// Localization (same interface)
const submitText = client.t('submit', 'Submit');

// New capabilities
client.on('score.accepted', handleScoreAccepted);
await client.initialize();
const canSubmit = !client.hasSubmittedScoreToday();
```

### Backwards Compatibility

The new client maintains the same public interface as the legacy `inject('zolvery')` system:

```typescript
// Create backwards-compatible interface
const createLegacyInterface = (client: Client) => ({
  get: client.get,
  set: client.set,
  emit: client.emit,
  on: client.on,
  t: client.t,
  env: client.env,
});

// Use in existing code without changes
const zolvery = createLegacyInterface(client);
const data = zolvery.get('data'); // Works exactly the same
```

## Runner Implementations

### Vanilla JavaScript Runner

For simple games without external dependencies:

```typescript
class VanillaGameRunner {
  private client: Client;
  
  constructor(config: ClientConfig) {
    const transport = this.createWebSocketTransport();
    this.client = new Client(user, config, transport);
  }
  
  private createWebSocketTransport() {
    // WebSocket-based transport for real-time events
    const ws = new WebSocket('wss://api.zolvery.com/ws');
    return {
      addEventListener: (type, handler) => ws.addEventListener(type, handler),
      removeEventListener: (type, handler) => ws.removeEventListener(type, handler),
      dispatchEvent: (event) => ws.send(JSON.stringify(event)),
    };
  }
}
```

### Boardgame.io Runner

For complex multiplayer games:

```typescript
class BoardgameIORunner {
  private client: Client;
  private bgio: any; // boardgame.io client
  
  constructor(config: ClientConfig, gameDefinition: any) {
    this.client = new Client(user, config, this.createBGIOTransport());
    this.setupBoardgameIO(gameDefinition);
  }
  
  private createBGIOTransport() {
    // Bridge between Zolvery events and boardgame.io moves
    return {
      addEventListener: (type, handler) => {
        this.bgio.subscribe(state => {
          if (state.ctx.phase !== this.lastPhase) {
            handler({ type: 'phase.change', data: state.ctx });
            this.lastPhase = state.ctx.phase;
          }
        });
      },
      dispatchEvent: (event) => {
        // Convert Zolvery events to boardgame.io moves
        this.bgio.moves[event.type](event.data);
      },
    };
  }
}
```

## Testing Strategy

### Unit Testing

```typescript
import { Client, ClientConfig } from '@zolver/core';

describe('Zolvery Client', () => {
  let client: Client;
  let mockTransport: any;
  
  beforeEach(() => {
    mockTransport = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    
    const config: ClientConfig = {
      appId: 'test-app',
      environment: 'test',
    };
    
    client = new Client(testUser, config, mockTransport);
  });
  
  it('should emit events correctly', () => {
    client.emit('test.event', { data: 'test' });
    expect(mockTransport.dispatchEvent).toHaveBeenCalled();
  });
  
  it('should handle score submission limits', () => {
    // Test once-per-day score submission
    client.emit('score.submit', { score: 100 });
    client.emit('score.submit', { score: 200 }); // Should be rejected
  });
});
```

### Integration Testing

```typescript
describe('Client Integration', () => {
  it('should integrate with real backend', async () => {
    const client = new Client(user, productionConfig, transport);
    await client.initialize();
    
    // Test real API calls
    const data = client.get('data');
    expect(data).toBeDefined();
    
    // Test event submission
    client.emit('test.event', { timestamp: Date.now() });
    // Verify event was stored in backend
  });
});
```

## Performance Optimizations

### Event Batching

```typescript
const config: ClientConfig = {
  appId: 'high-frequency-game',
  batchEvents: true,
  batchTimeout: 100, // ms
  maxBatchSize: 10,
};

// Multiple rapid events will be batched automatically
client.emit('mouse.move', { x: 100, y: 200 });
client.emit('mouse.move', { x: 101, y: 201 });
client.emit('mouse.move', { x: 102, y: 202 });
// All sent as single batch request
```

### Caching Strategy

```typescript
// Smart caching based on data type
client.get('data');     // Cached for session
client.get('context');  // Cached for session  
client.get('users');    // Real-time data, minimal caching
client.t('submit');     // Cached until locale change
```

### Memory Management

```typescript
// Automatic cleanup of event handlers
const subscription = client.on('test.event', handler);

// Clean up when component unmounts
onUnmounted(() => {
  subscription.unsubscribe();
  client.off('test.event', handler);
});
```

## Implementation Summary

### What's Been Implemented

✅ **Enhanced Client Class** (`packages/core/src/client/client.ts`)
- Event-driven architecture with core vs custom event separation
- Smart caching and data management
- Backend API integration with authentication
- Score submission with once-per-day enforcement
- Comprehensive error handling and retry logic

✅ **Supporting Infrastructure**
- `ClientEventBus`: Internal pub/sub system for complex event flows
- `ClientStorage`: Intelligent caching with localStorage persistence
- `ClientAPI`: HTTP client with automatic retries and error handling
- `Localization`: Enhanced i18n support with dynamic loading

✅ **Event System Enhancements** (`packages/core/src/events.ts`)
- Extended event types for game scenarios
- Core event detection utilities
- Event creation helpers
- Type-safe event handling

✅ **Backwards Compatibility**
- Maintains same interface as legacy `inject('zolvery')` system
- Migration helpers for existing games
- Drop-in replacement capability

✅ **Documentation** (`specs/client.md`)
- Comprehensive architecture overview
- Implementation examples
- Migration guide from legacy system
- Performance optimization strategies
- Testing approaches

### Key Architectural Decisions

1. **Event-Driven Core**: All interactions flow through events rather than direct API calls
2. **Separation of Concerns**: Core system events vs custom game events
3. **Smart Caching**: Different caching strategies for different data types
4. **Transport Abstraction**: Works with WebSocket, HTTP, or boardgame.io transports
5. **Progressive Enhancement**: Can start simple and add complexity as needed

### Integration Points

**Server API Mapping:**
- `client.get()` → `GET /app-data/:appId/:day`
- `client.emit()` → `POST /events/:appId` 
- `client.t()` → Cached from `GET /i18n/:appId/:locale`
- Score events → `POST /leaderboard/score`

**Event Bus Integration:**
- Client events trigger server-side event bus
- Real-time updates via WebSocket/transport
- Offline queuing with automatic retry

**Runner Support:**
- Vanilla JS: Direct HTTP/WebSocket integration
- Boardgame.io: Event bridge to moves/phases
- Future: React, Vue, Angular specific adapters

### Next Steps

To complete the implementation:

1. **Runner Implementations**: Create boardgame.io and vanilla JS runners
2. **Vue Plugin**: Provide `inject('zolvery')` compatibility  
3. **WebSocket Transport**: Real-time event synchronization
4. **Testing Suite**: Comprehensive unit and integration tests
5. **Example Games**: Port existing games to new system

### Breaking Changes

⚠️ **Constructor Signature**: Client now requires `ClientConfig` instead of `unknown`
⚠️ **Initialization**: Must call `await client.initialize()` before use
⚠️ **Event Handling**: Some events now have special handling (score submission)

### Migration Path

For existing games:
1. Update client construction with `ClientConfig`
2. Add `await client.initialize()` call
3. Optionally add enhanced event handlers
4. Test score submission behavior
5. Update any direct API calls to use events

Most existing code using `get()`, `emit()`, `t()`, and `env()` will work unchanged.