# Implementation Summary: Enhanced Leaderboard Scoring Types

## Overview

This implementation addresses the security and fairness concerns with client-authoritative vs server-authoritative games by introducing different leaderboard types and scoring mechanisms.

## Problem Solved

**Original Issue**: Client-authoritative games could submit any score, making global leaderboards unfair since anyone could post fake high scores.

**Solution**: Implement different leaderboard types (`friends` vs `global`) and scoring methods (`score`, `voting`, `race`) based on the app's validation capabilities.

## Key Features Implemented

### 1. Leaderboard Types

#### Friends Leaderboard (`type: 'friends'`)
- **Use Case**: Client-authoritative games that can't validate scores server-side
- **Security**: No global competition, only among known users
- **Examples**: Tic-Tac-Toe, simple puzzle games
- **Default**: Apps with `runnerTag: 'vue-vanilla'`

#### Global Leaderboard (`type: 'global'`)
- **Use Case**: Server-authoritative games with proper validation
- **Security**: Strict validation enforced
- **Examples**: Boardgame.io games, server-validated puzzles
- **Scoring Types**: `score`, `voting`, `race`

### 2. Scoring Types

#### Standard Score (`scoringType: 'score'`)
- Server calculates and validates all scores
- Traditional highest-score-wins leaderboard
- Used by boardgame.io and server-authoritative games

#### Voting-Based (`scoringType: 'voting'`)
- **All votes must be submitted in a single batch event**
- Server aggregates votes per submission (no individual vote tracking)
- Server calculates final scores from vote aggregates
- Prevents vote manipulation with batch validation constraints
- Example: Poetry Slam where users vote on poems (all votes submitted together)

#### Race/Time-Based (`scoringType: 'race'`)
- Time-based competition with **server-side completion time calculation**
- **Validation performed at API level before database storage**
- Submissions must match daily validation values
- Score calculated based on server-calculated completion time
- Example: Daily puzzles with correct answer validation

## Implementation Details

### New Services

#### VotingService
- `processBatchVotes()`: Process all votes in a single batch event
- `getVoteAggregatesForDay()`: Get vote aggregates for leaderboard calculation
- `getVoteAggregateForUser()`: Get aggregated votes for a specific user
- **No individual vote tracking** - only aggregates maintained
- Validates batch constraints: max votes per user, no self-voting, no duplicates

#### ValidationService  
- `validateRaceSubmission()`: **Stateless validation** at API level
- **Server-side completion time calculation** for race submissions
- `setDailyValidationValue()` / `getDailyValidationValue()`: Manage puzzle answers
- **No validation status tracking** in database

#### Enhanced LeaderboardService
- `getAppMetadata()`: Fetch app configuration to determine scoring type
- `updateVotingScores()`: Update leaderboard from vote aggregates
- Enhanced `submitScore()` to handle different scoring types with batch voting
- Automatic detection of app authority level

### New API Endpoints

#### Voting Endpoints (Updated)
- `GET /leaderboard/:appId/vote-aggregates/:day` - Get vote aggregates
- `POST /leaderboard/:appId/update-voting-scores/:day` - Update leaderboard from aggregates

**Note**: Individual voting endpoints removed. Votes now submitted with score in single request.

#### Enhanced Score Submission
- `POST /leaderboard/:appId/score` now accepts:
  - `validationData`: For race validation (answer only, not completion time)
  - `votes`: For batch voting submissions
  - Automatic routing based on app configuration

### Data Models

#### Enhanced App Metadata
```typescript
interface AppMetadata {
  leaderboard?: {
    type: 'friends' | 'global';
    scoringType?: 'score' | 'voting' | 'race';
    maximumNumberOfVotes?: number;
    maximumVotesPerUser?: number;
    validation?: {
      type: 'value' | 'time' | 'custom';
      dailyValue?: string;
      timeLimit?: number;
    };
  };
}
```

#### New Database Entities
- `Vote`: Store voting data per app/day
- `VotingResult`: Calculated voting outcomes
- Enhanced `LeaderboardEntry` with scoring metadata
- Enhanced `SubmitScoreRequest` with validation and voting data

## Security Features

### Client Authority Detection
- Apps are analyzed to determine validation capabilities
- Default to `friends` leaderboard for safety
- `vue-vanilla` apps typically use `friends`
- `vue-boardgameio` apps can use `global`

### Validation Enforcement
- Global leaderboards require server validation
- Race submissions must match daily validation values
- Time limits enforced for race competitions

### Vote Manipulation Prevention
- Rate limiting per user and per target
- Self-voting prevention
- Vote count limits configurable per app
- Server-side vote validation

## Example Configurations

### Client Game (Friends)
```json
{
  "leaderboard": {
    "type": "friends"
  }
}
```

### Server Game (Global Score)
```json
{
  "leaderboard": {
    "type": "global",
    "scoringType": "score"
  }
}
```

### Voting Competition
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

### Race/Puzzle Competition
```json
{
  "leaderboard": {
    "type": "global",
    "scoringType": "race",
    "validation": {
      "type": "value",
      "timeLimit": 3600
    }
  }
}
```

## Migration Strategy

### Existing Apps
1. **Automatic Detection**: Apps without leaderboard config default to safe settings
2. **Backward Compatibility**: Existing score submission continues to work
3. **Gradual Migration**: Apps can be updated individually

### Default Behaviors
- No leaderboard config → `type: "friends"`
- `vue-vanilla` → `type: "friends"`
- `vue-boardgameio` → Can use `type: "global"`

## Files Created/Modified

### New Files
- `/apps/server/src/services/voting-service.ts`
- `/apps/server/src/services/validation-service.ts`
- `/docs/leaderboard-scoring-types.md`
- `/docs/example-app-configurations.md`
- `/packages/examples/src/puzzles/daily-challenge/kossabos.json`

### Modified Files
- `/apps/server/src/models/leaderboard.ts` - Enhanced models
- `/apps/server/src/services/leaderboard-service.ts` - Enhanced with new scoring types
- `/apps/server/src/routes/leaderboard.ts` - New voting and validation endpoints
- `/packages/core/src/app.ts` - Enhanced app metadata
- Multiple example app configs updated

## Next Steps

1. **Testing**: Create comprehensive test suites for new functionality
2. **Admin Interface**: Build UI for setting daily validation values
3. **Analytics**: Track usage patterns across different scoring types
4. **Documentation**: Update API documentation and client guides
5. **Migration Tools**: Create scripts to help existing apps migrate

## Benefits Achieved

✅ **Security**: Client games can't manipulate global leaderboards  
✅ **Fairness**: Different competition types for different game styles  
✅ **Flexibility**: Supports creative competitions with batch voting  
✅ **Validation**: Stateless time-based competitions with server validation  
✅ **Privacy**: Individual votes not tracked - only aggregated totals  
✅ **Performance**: Batch voting reduces API calls and database writes  
✅ **Integrity**: Server-side completion time calculation prevents cheating  
✅ **Backward Compatibility**: Existing apps continue to work  
✅ **Scalability**: New scoring types can be added easily
