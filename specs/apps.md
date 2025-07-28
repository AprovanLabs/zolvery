# Apps Implementation

## Overview

The Kossabos platform provides a comprehensive API for multi-app gaming experiences with authentication, event tracking, leaderboards, app data management, and internationalization.

## Data Models

### Core Entities

#### AppData
- **Purpose**: Store daily configuration and content for each app
- **Structure**: Key-value pairs with versioning support
- **Primary Key**: `APPDATA#{appId}#{day}`
- **Sort Key**: `CONFIG` or specific data key
- **Fields**: `appId`, `day`, `key`, `value`, `version`, `updatedAt`, `ttl`

#### AppEvent  
- **Purpose**: Track user actions and game state changes
- **Primary Key**: `DAY#{day}#APP#{appId}#USER#{userId}`
- **Sort Key**: `EVENT#{eventKey}`
- **Fields**: `eventKey`, `value`, `timestamp`, `appId`, `userId`, `day`, `ttl`

#### AppScore
- **Purpose**: Store user scores for leaderboard ranking
- **Primary Key**: `LEADERBOARD#{appId}#{day}`
- **Sort Key**: `SCORE#{userId}#{timestamp}`
- **Fields**: `userId`, `appId`, `day`, `score`, `rank`, `appData`, `timestamp`, `createdAt`

#### LeaderboardEntry
- **Purpose**: Cached leaderboard rankings (daily/global)
- **Primary Key**: `LEADERBOARD#{appId}#{scope}` (scope: day or GLOBAL)
- **Sort Key**: `USER#{userId}`
- **Fields**: `userId`, `username`, `score`, `submittedTimestamp`, `rank`, `GSI1PK`, `GSI1SK`

#### User & UserSession
- **Purpose**: User management and session tracking
- **Fields**: `id`, `username`, `email`, `createdAt`, `lastActive`, `preferences`
- **Session**: `userId`, `appId`, `day`, `sessionId`, `startedAt`, `lastActivity`, `status`

## API Endpoints

### Authentication (`/v1/protected/auth`)
- `GET /me` - Get current user information

### App Data (`/v1/protected/app-data`)
- `GET /:appId/:day` - Get all app data for specific day
- `GET /:appId` - Get app data for today
- `POST /:appId/:day/:key` - Update specific app data key (admin)
- `POST /:appId/:day` - Bulk update app data

### Events (`/v1/protected/events`)  
- `POST /:appId` - Store new event for authenticated user
- `GET /:appId/:day` - Get all events for user/app/day
- `GET /:appId/:day/:eventKey` - Get specific event
- `GET /:appId` - Get today's events (convenience)

### Leaderboard (`/v1/protected/leaderboard`)
- `POST /score` - Submit game score
- `GET /:appId/daily/:day` - Daily leaderboard for specific day
- `GET /:appId/daily` - Today's leaderboard
- `GET /:appId/global/:day` - Global leaderboard  
- `GET /:appId/user` - Authenticated user's score history
- `GET /:appId/user/rank/:date` - User's rank for specific date

### Internationalization (`/v1/protected/i18n`)
- `GET /:appId/:locale` - Get localized strings
- `POST /:appId/:locale` - Store translations
- `GET /:appId/locales` - Get available locales
- `DELETE /:appId/:locale` - Delete translations
- `GET /:appId/:locale/metadata` - Get translation metadata

## Key Features

### Daily Reset Architecture
- Apps operate on daily cycles with automatic timezone handling
- App data, events, and leaderboards are segmented by day
- Built-in utilities for current day calculation and time remaining

### Multi-App Support
- Single platform serves multiple game applications
- App-specific configuration, events, and leaderboards
- Shared user system across all apps

### Real-time Event Tracking
- Comprehensive event logging for user actions
- Flexible event structure supporting any JSON data
- Historical event retrieval for analytics and debugging

### Competitive Leaderboards
- Daily and global ranking systems
- Real-time score submission and ranking
- User performance tracking over time

### Internationalization
- Multi-language support for all apps
- Dynamic locale management
- Translation metadata and versioning