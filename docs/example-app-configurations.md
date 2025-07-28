# Example App Configurations for Different Scoring Types

This document shows example configurations for different types of apps using the new leaderboard scoring system.

## 1. Client-Authoritative Game (Friends Leaderboard)

For games like Tic-Tac-Toe where the client handles all game logic and there's no server validation.

### kossabos.json
```json
{
  "appId": "classics/tic-tac-toe",
  "name": "Tic Tac Toe",
  "description": "A classic game of Tic Tac Toe",
  "runnerTag": "vue-vanilla",
  "version": "0.0.1",
  "author": {
    "username": "Jacob Sampson",
    "email": "jacob.samps@gmail.com"
  },
  "tags": ["game", "classics"],
  "leaderboard": {
    "type": "friends"
  },
  "settings": []
}
```

### Usage
- Users can submit any score
- Only friends can see each other's scores
- No global competition to prevent cheating
- Suitable for client-side games

## 2. Server-Authoritative Game (Global Score Leaderboard)

For games like Yatzy where the server validates all moves and calculates scores.

### kossabos.json
```json
{
  "appId": "dice-games/yatzy",
  "name": "Yatzy",
  "description": "A dice game with server validation",
  "runnerTag": "vue-boardgameio",
  "version": "0.0.1",
  "author": {
    "username": "Jacob Sampson",
    "email": "jacob.samps@gmail.com"
  },
  "tags": ["game", "dice"],
  "leaderboard": {
    "type": "global",
    "scoringType": "score"
  },
  "settings": []
}
```

### Usage
- Server validates all game moves
- Server calculates final scores
- Global leaderboard with fair competition
- Suitable for boardgame.io games

## 3. Voting-Based Competition (Poetry Slam)

For creative competitions where users vote on each other's submissions.

### kossabos.json
```json
{
  "appId": "word-games/poetry-slam",
  "name": "Poetry Slam",
  "description": "Creative writing with peer voting",
  "runnerTag": "vue-vanilla",
  "version": "0.0.1",
  "author": {
    "username": "Jacob Sampson",
    "email": "jacob.samps@gmail.com"
  },
  "tags": ["game", "creative", "voting"],
  "leaderboard": {
    "type": "global",
    "scoringType": "voting",
    "maximumNumberOfVotes": 50,
    "maximumVotesPerUser": 10
  },
  "settings": []
}
```

### Usage
- Users submit creative content (poems, art, etc.)
- Other users vote on submissions (0-10 scale)
- Final score calculated from votes received
- Prevents vote manipulation with limits

### Voting Flow
1. User submits content with `emit('submit', { content: 'poem text' })`
2. **During voting phase, users collect votes locally (no separate API calls)**
3. **All votes submitted together with final score in one batch**:
```json
{
  "score": 0,
  "votes": [
    { "targetUserId": "user1", "score": 8 },
    { "targetUserId": "user2", "score": 6 },
    { "targetUserId": "user3", "score": 9 }
  ]
}
```
4. Server aggregates votes per submission (no individual vote tracking)
5. Final rankings based on vote aggregates

## 4. Race/Puzzle Competition (Daily Puzzle)

For time-based competitions with validation requirements.

### kossabos.json
```json
{
  "appId": "puzzles/daily-challenge",
  "name": "Daily Puzzle Challenge",
  "description": "Solve daily puzzles as fast as possible",
  "runnerTag": "vue-vanilla",
  "version": "0.0.1",
  "author": {
    "username": "Jacob Sampson",
    "email": "jacob.samps@gmail.com"
  },
  "tags": ["puzzle", "race"],
  "leaderboard": {
    "type": "global",
    "scoringType": "race",
    "validation": {
      "type": "value",
      "timeLimit": 3600
    }
  },
  "settings": []
}
```

### Daily App Data Setup
```json
{
  "puzzle": "What is 2 + 2?",
  "validationValue": "4",
  "hint": "It's a basic math problem"
}
```

### Usage
- Server sets daily validation value (puzzle answer)
- **Server calculates completion time (not provided by client)**
- Score calculated: faster time = higher score
- Only correct answers are accepted
- **Validation performed at API level before database storage**

### Race Flow
1. User solves puzzle and submits via score endpoint:
```json
{
  "score": 0,
  "validationData": {
    "submissionValue": "4"
    // Note: completionTime calculated server-side
  }
}
```
2. Server validates answer against daily validation value
3. **Server calculates completion time** based on request timing
4. Score calculated based on server-calculated completion time
5. Invalid answers rejected immediately (no status tracking)

## Migration Guide

### Existing Apps
1. Add `leaderboard` configuration to `kossabos.json`
2. For client-side games: use `type: "friends"`
3. For server-side games: use `type: "global", scoringType: "score"`

### Default Behavior
- Apps without leaderboard config default to `type: "friends"`
- Apps with `runnerTag: "vue-vanilla"` default to `type: "friends"`
- Apps with `runnerTag: "vue-boardgameio"` can use `type: "global"`

### API Changes
- Score submission endpoint now accepts votes and validation data in single request
- **Voting is now handled via score submission (no separate voting endpoints)**
- **Individual vote tracking removed - only aggregates maintained**
- **Validation is stateless - no validation status tracking**

## Security Considerations

1. **Client Authority Detection**: Apps are analyzed to determine trustworthiness
2. **Validation Enforcement**: Global leaderboards require proper validation at API level
3. **Vote Manipulation Prevention**: Batch voting constraints and validation
4. **Race Cheating Prevention**: Server-side completion time calculation and stateless validation
5. **Privacy**: Individual votes are not tracked - only aggregated totals
