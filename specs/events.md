# Events Implementation

## Overview

The events system provides persistent storage and retrieval of application events using DynamoDB with an integrated event bus for real-time notifications. Events are scoped by user, application, and day to enable efficient querying and automatic cleanup.

## Data Model

### AppEvent Interface

```typescript
interface AppEvent {
  PK: string;          // Partition key: "DAY#2025-07-01#APP#poetry-slam#USER#user123"
  SK: string;          // Sort key: "EVENT#eventKey"
  eventKey: string;    // Event identifier (e.g., "poem", "vote", "phase")
  value: any;          // Event data (JSON)
  timestamp: string;   // ISO timestamp
  appId: string;       // App identifier
  userId: string;      // User identifier
  day: string;         // Date in YYYY-MM-DD format
  ttl?: number;        // Optional TTL for cleanup (30 days)
}
```

### Key Structure

- **Partition Key**: `DAY#<day>#APP#<appId>#USER#<userId>`
- **Sort Key**: `EVENT#<eventKey>`
- **TTL**: 30 days from creation for automatic cleanup

## API Endpoints

### POST /events/:appId
Creates a new event for the authenticated user.

**Request Body:**
```typescript
{
  eventKey: string;    // Event identifier
  value: any;          // Event data
  day?: string;        // Optional day (defaults to today)
}
```

**Response:** `201 Created` with the created event

### GET /events/:appId/:day
Retrieves all events for the authenticated user, app, and specific day.

**Response:** `200 OK` with array of events

### GET /events/:appId/:day/:eventKey
Retrieves a specific event for the authenticated user.

**Response:** `200 OK` with the event, or `404 Not Found`

### GET /events/:appId
Convenience endpoint to retrieve today's events for the authenticated user.

**Response:** `200 OK` with array of events

## Event Service

### Core Methods

- `createEvent(userId, request)` - Creates and stores an event
- `getEvent(appId, userId, day, eventKey)` - Retrieves a specific event
- `getUserEvents(appId, userId, day)` - Retrieves all user events for a day
- `getUserEventsByKeyPattern(appId, userId, day, keyPattern)` - Pattern-based retrieval
- `updateEventValue(appId, userId, day, eventKey, value)` - Updates event value

### Features

- **Authentication Required**: All endpoints require valid JWT authentication
- **Automatic TTL**: Events expire after 30 days
- **Event Bus Integration**: Published events trigger `APP_EVENT_CREATED` events
- **Error Handling**: Comprehensive logging and error responses
- **Key Generation**: Consistent DynamoDB key patterns

## Event Bus Integration

### Event Types

The system publishes `AppEventType.APP_EVENT_CREATED` events when new events are stored.

### Available Event Types

- User events: `user.registered`, `user.logged_in`, `user.logged_out`
- Game events: `game.started`, `game.ended`, `game.paused`, `game.resumed`
- Player events: `player.joined`, `player.left`, `player.action`, `player.score_updated`
- App events: `app.event_created`, `app.data_updated`, `app.config_changed`
- System events: `leaderboard.updated`, `cache.invalidated`, `error.occurred`

## Usage Patterns

### Storing Game State
```typescript
// Store poem submission
POST /events/poetry-slam
{
  "eventKey": "poem",
  "value": { "content": "Roses are red...", "wordCount": 10 }
}

// Store vote
POST /events/poetry-slam
{
  "eventKey": "vote",
  "value": { "poemId": "123", "rating": 5 }
}
```

### Retrieving Game History
```typescript
// Get all today's events
GET /events/poetry-slam

// Get specific day's events
GET /events/poetry-slam/2025-07-01

// Get specific event
GET /events/poetry-slam/2025-07-01/poem
```

### Pattern-Based Queries
```typescript
// Get all vote events
eventService.getUserEventsByKeyPattern(appId, userId, day, "vote");
```
