# Leaderboard Scoring Types Implementation

## Overview

This document outlines the implementation of different scoring types for the Kossabos leaderboard system to handle various game scenarios including client-authoritative games, server-authoritative games, voting mechanisms, and race validations.

## Scoring Types

### 1. Friends Leaderboard (`type: 'friends'`)

For client-based apps that can't validate score submissions, their app `metadata.leaderboard.type` should be `friends` since there's no globally fair competition.

**Characteristics:**
- No global leaderboard
- Only friends/known users can see each other's scores
- Less strict validation since it's not a global competition
- Suitable for client-authoritative games

### 2. Global Leaderboard (`type: 'global'`)

For server-authoritative games where fair global competition is possible.

**Scoring Types:**

#### a) Score (`scoringType: 'score'`)
- The app is server-authoritative and handles score calculation
- Server validates all game logic and calculates final scores
- Standard leaderboard ranking by score (highest wins)

#### b) Voting (`scoringType: 'voting'`)
- Users vote on each other's submissions (e.g., best poem, artwork)
- **All votes must be submitted in a single batch event** - no separate voting endpoints
- Votes are aggregated per submission, not tracked per individual voter
- Server calculates final scores based on vote aggregates
- Configuration options:
  - `maximumNumberOfVotes`: Total votes a submission can receive  
  - `maximumVotesPerUser`: How many votes each user can cast
- Score is calculated based on total votes received

#### c) Race (`scoringType: 'race'`)
- Time-based competition with validation
- **Completion time is calculated server-side, not provided by client**
- Score based on completion time with validation requirements
- Validation performed at API level before database storage (no status tracking)
- Daily validation value that submissions must match

## Data Models

### App Metadata Extension

```typescript
interface AppMetadata {
  appId: string;
  name: string;
  description: string;
  tags: string[];
  leaderboard?: {
    type: 'friends' | 'global';
    scoringType?: 'score' | 'voting' | 'race'; // Only for global leaderboards
    maximumNumberOfVotes?: number; // For voting type
    maximumVotesPerUser?: number; // For voting type
    validation?: {
      type: 'value' | 'time' | 'custom';
      dailyValue?: string; // For race validation
      timeLimit?: number; // For race validation (seconds)
      customValidator?: string; // Custom validation logic
    };
  };
  version: string;
  runnerTag: string;
  author: {
    id: string;
    username: string;
  };
  settings: Setting[];
}
```

### Enhanced Score Submission

```typescript
interface SubmitScoreRequest {
  score: number;
  appData?: any;
  day?: string; // Optional, defaults to today
  validationData?: {
    submissionValue?: string; // For race validation (client-provided answer)
    proofOfWork?: any; // Additional validation data
  };
  // Note: completionTime is calculated server-side, not client-provided
  votes?: VoteSubmission[]; // All votes submitted in one batch
}

interface VoteSubmission {
  targetUserId: string;
  score: number; // Vote weight/score (0-10)
}
```

### Voting System Models

```typescript
// Individual votes are not stored - only aggregates
interface VoteAggregate {
  PK: string; // "VOTE_AGG#{appId}#{day}"
  SK: string; // "USER#{targetUserId}"
  appId: string;
  day: string;
  targetUserId: string;
  totalScore: number; // Sum of all vote scores
  voteCount: number; // Number of votes received
  averageScore: number; // totalScore / voteCount
  lastUpdated: string;
}
```

## Implementation Strategy

### 1. Service Layer Changes

#### LeaderboardService Enhancement
- Add app metadata validation before score submission
- Implement different scoring logic based on `scoringType`
- Add voting system methods
- Add race validation methods

#### New VotingService
- Process batch vote submissions (all votes in one event)
- Aggregate votes per submission without tracking individual voters
- Validate vote constraints (max votes per user, self-voting prevention)
- Calculate final scores based on vote aggregates

#### ValidationService
- **Stateless validation** - no validation status tracking in database
- Handle race validation logic at API level before storage
- **Server-side completion time calculation** for race/puzzle scoring
- Validate daily puzzle solutions

### 2. API Changes

#### Enhanced Score Submission Endpoint
```typescript
POST /leaderboard/:appId/score
{
  score: number;
  appData?: any;
  validationData?: {
    submissionValue?: string; // Client-provided answer for race validation
    proofOfWork?: any; // Additional validation data
  };
  votes?: VoteSubmission[]; // All votes submitted in batch with score
}
```

#### Voting Endpoints (Updated)
```typescript
GET /leaderboard/:appId/vote-aggregates/:day  // Get vote aggregates for a day
POST /leaderboard/:appId/update-voting-scores/:day  // Admin endpoint to update leaderboard
```

**Note:** Individual voting endpoints have been removed. Votes are now submitted as part of the score submission process.

### 3. Validation Logic

#### Race Validation
1. Check if submission includes required validation data
2. Compare `submissionValue` against daily validation value stored in app data
3. **Server calculates completion time** (not provided by client)
4. Validation performed at API level - no database status tracking
5. Calculate score based on server-calculated time (faster = higher score)

#### Voting Validation
1. Ensure user hasn't exceeded `maximumVotesPerUser` in a single batch
2. Prevent self-voting within the batch
3. Prevent duplicate votes for the same user in one batch
4. Validate vote scores are within allowed range (0-10)
5. **All votes must be submitted together** - no separate vote submissions

#### Friends vs Global Logic
1. For `type: 'friends'`: Skip strict validation, allow more lenient scoring
2. For `type: 'global'`: Enforce all validation rules strictly

## Database Schema Changes

### New Partition Keys
- `VOTE_AGG#{appId}#{day}` - For vote aggregates (not individual votes)
- `CONFIG#{appId}` - For app metadata/configuration

### Enhanced LeaderboardEntry
```typescript
interface LeaderboardEntry {
  // ... existing fields
  scoringType: 'score' | 'voting' | 'race';
  // Note: validationStatus removed - validation is now stateless
  votingData?: {
    totalVotes: number;
    averageScore: number;
    voteCount: number;
  };
  raceData?: {
    completionTime: number; // Server-calculated completion time
    timeBonus: number;
  };
}
```

## Security Considerations

1. **Client Authority Detection**: Apps with `runnerTag: 'vue-vanilla'` default to `type: 'friends'`
2. **Validation Enforcement**: Global leaderboards require server validation at API level
3. **Vote Manipulation Prevention**: Batch voting constraints and validation
4. **Race Cheating Prevention**: Server-side time calculation and stateless validation
5. **Privacy**: Individual votes are not tracked - only aggregated totals

## Migration Strategy

1. **Phase 1**: Add new fields to existing models (backward compatible)
2. **Phase 2**: Implement voting and race services
3. **Phase 3**: Update existing apps to specify leaderboard configuration
4. **Phase 4**: Enforce validation rules for new submissions

## Example Configurations

### Poetry Slam (Voting)
```json
{
  "leaderboard": {
    "type": "global",
    "scoringType": "voting",
    "maximumNumberOfVotes": 50,
    "maximumVotesPerUser": 10
  }
}
```

### Daily Puzzle (Race)
```json
{
  "leaderboard": {
    "type": "global",
    "scoringType": "race",
    "validation": {
      "type": "value",
      "dailyValue": "stored-in-app-data",
      "timeLimit": 3600
    }
  }
}
```

### Simple Game (Client-side)
```json
{
  "leaderboard": {
    "type": "friends"
  }
}
```
