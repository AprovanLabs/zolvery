# BoardGame.io Framework Knowledge Base

> **Version**: 0.50.x | **Type**: Game Framework | **Platform**: JavaScript/TypeScript
> **Source**: https://boardgame.io | **GitHub**: https://github.com/boardgameio/boardgame.io

## Overview

BoardGame.io is a state management framework for turn-based games. It handles game state synchronization, multiplayer networking, and provides a structured way to define game rules through moves, phases, stages, and events.

### Core Philosophy
- **State-Centric**: All game logic operates on two state objects: `G` (game state) and `ctx` (metadata)
- **Pure Functions**: Moves are pure functions that transform state
- **Automatic Sync**: Framework handles client-server state synchronization
- **Declarative**: Game rules defined declaratively through configuration

---

## Core Concepts

### State Objects

```typescript
{
  // Your game state (managed by you)
  G: {
    board: [...],
    players: {...},
    deck: [...],
    // Any JSON-serializable data
  },

  // Read-only metadata (managed by framework)
  ctx: {
    turn: 1,                    // Current turn number
    currentPlayer: '0',         // ID of active player
    numPlayers: 2,              // Total players in game
    playOrder: ['0', '1'],      // Order players take turns
    playOrderPos: 0,            // Index into playOrder
    phase: 'setup',             // Current phase (or null)
    activePlayers: null,        // Players in stages (or null)
    numMoves: 0,                // Moves made this turn
    gameover: undefined,        // Set when game ends
  }
}
```

**CRITICAL**: `G` must be JSON-serializable. No classes, functions, or circular references.

### Moves

Moves are functions that modify `G`. They receive a context object and optional arguments.

```typescript
// Short-form move
moves: {
  clickCell: ({ G, ctx, playerID }, cellId) => {
    G.cells[cellId] = playerID;
  },
}

// Long-form move (with options)
moves: {
  rollDice: {
    move: ({ G, random }) => {
      G.diceResult = random.D6();
    },
    undoable: false,        // Cannot undo this move
    redact: true,           // Hide args from log
    client: false,          // Server-only execution
    noLimit: true,          // Doesn't count toward maxMoves
    ignoreStaleStateID: true, // Process even from stale client
  },
}
```

**Move Context Object Properties**:
| Property | Type | Description |
|----------|------|-------------|
| `G` | object | Game state (mutable) |
| `ctx` | object | Game metadata (read-only) |
| `playerID` | string | ID of player making move |
| `events` | object | Event dispatch functions |
| `random` | object | Random number API |
| `log` | object | Logging API |

### Invalid Moves

Return `INVALID_MOVE` to reject a move:

```typescript
import { INVALID_MOVE } from 'boardgame.io/core';

moves: {
  clickCell: ({ G, playerID }, id) => {
    if (G.cells[id] !== null) {
      return INVALID_MOVE;  // Cell already occupied
    }
    G.cells[id] = playerID;
  },
}
```

---

## Events

Events modify `ctx` and control game flow. They're provided by the framework.

### Event Types

| Event | Description | Example |
|-------|-------------|---------|
| `endTurn` | End current turn | `events.endTurn()` or `events.endTurn({ next: '2' })` |
| `endPhase` | End current phase | `events.endPhase()` |
| `setPhase` | Switch to specific phase | `events.setPhase('combat')` |
| `endStage` | Exit current stage | `events.endStage()` |
| `setStage` | Enter specific stage | `events.setStage('discard')` |
| `setActivePlayers` | Set multiple players active | `events.setActivePlayers({ all: 'vote' })` |
| `endGame` | End the game | `events.endGame({ winner: '0' })` |

### Triggering Events

**From moves**:
```typescript
moves: {
  playCard: ({ G, events }, card) => {
    G.playedCard = card;
    events.endTurn();
  },
}
```

**From client** (Plain JS):
```typescript
client.events.endTurn();
client.events.setPhase('combat');
```

### Disabling Client Events

Prevent direct event calls from client:

```typescript
const game = {
  events: {
    endGame: false,      // Cannot call endGame from client
    endPhase: false,     // Must end phase through game logic
  },
};
```

### Event Call Compatibility (from hooks)

| Event | moves | turn.onBegin | turn.onEnd | phase.onBegin | phase.onEnd | game.onEnd |
|-------|-------|--------------|------------|---------------|-------------|------------|
| setStage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| endStage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| setActivePlayers | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| endTurn | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| setPhase | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| endPhase | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| endGame | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Turn Order

The framework manages turn progression through `ctx` properties.

### Turn State

```typescript
ctx: {
  currentPlayer: '0',           // Active player
  playOrder: ['0', '1', '2'],   // Turn sequence
  playOrderPos: 0,              // Index in playOrder
}
```

### Turn Configuration

```typescript
const game = {
  turn: {
    order: TurnOrder.DEFAULT,   // Turn order preset
    minMoves: 1,                // Must make at least 1 move
    maxMoves: 3,                // Auto-end after 3 moves
    
    onBegin: ({ G, ctx }) => {  // Called at turn start
      G.turnStarted = true;
    },
    
    onEnd: ({ G, ctx }) => {    // Called at turn end
      G.turnStarted = false;
    },
    
    onMove: ({ G, ctx }) => {   // Called after each move
      G.lastMoveTime = Date.now();
    },
    
    endIf: ({ G, ctx }) => {    // Auto-end condition
      return G.playerPassed;
      // Can return { next: '2' } to specify next player
    },
  },
};
```

### Turn Order Presets

Import from `boardgame.io/core`:

| Preset | Behavior |
|--------|----------|
| `TurnOrder.DEFAULT` | Round-robin, continues from last position |
| `TurnOrder.RESET` | Round-robin, always starts from position 0 |
| `TurnOrder.CONTINUE` | Starts with player who ended previous phase |
| `TurnOrder.ONCE` | Round-robin once, then phase auto-ends |
| `TurnOrder.CUSTOM(['1', '3'])` | Custom player order |
| `TurnOrder.CUSTOM_FROM('fieldInG')` | Order from G property |

### Custom Turn Order

```typescript
turn: {
  order: {
    // Initial position (called at phase start)
    first: ({ G, ctx }) => 0,
    
    // Next position (called at turn end)
    // Return undefined to end phase
    next: ({ G, ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
    
    // Override play order (optional)
    playOrder: ({ G, ctx }) => ['2', '0', '1'],
  },
}
```

### Ad-Hoc Next Player

```typescript
// From event
events.endTurn({ next: '3' });

// From endIf
turn: {
  endIf: ({ G }) => ({ next: G.nextPlayer }),
}
```

---

## Phases

Phases are distinct periods that override game configuration.

### Phase Definition

```typescript
const game = {
  phases: {
    setup: {
      start: true,              // Game begins in this phase
      moves: { DrawCard },      // Phase-specific moves
      
      onBegin: ({ G }) => {     // Called when entering phase
        G.setupComplete = false;
      },
      
      onEnd: ({ G }) => {       // Called when leaving phase
        G.setupComplete = true;
      },
      
      endIf: ({ G }) => G.allPlayersReady,  // Auto-end condition
      next: 'play',             // Phase to enter next
      
      turn: {                   // Override turn config
        order: TurnOrder.ONCE,
        minMoves: 2,
      },
    },
    
    play: {
      moves: { PlayCard, Attack },
      next: 'cleanup',
    },
    
    cleanup: {
      moves: { DiscardHand },
      next: 'play',             // Loop back
    },
  },
};
```

### Dynamic Next Phase

```typescript
phases: {
  combat: {
    next: ({ G, ctx }) => {
      return G.playerDefeated ? 'gameover' : 'play';
    },
  },
}
```

### Phase Transitions

```typescript
// From move
moves: {
  startBattle: ({ events }) => {
    events.setPhase('combat');
  },
}

// From client
client.events.endPhase();     // Go to 'next' or null
client.events.setPhase('x');  // Go to specific phase
```

**Note**: When a phase ends, the current turn ends first automatically.

---

## Stages

Stages subdivide turns and allow multiple players to act.

### Stage Definition

```typescript
const game = {
  moves: { PlayCard },
  
  turn: {
    stages: {
      discard: {
        moves: { DiscardCard },  // Only these moves allowed
        next: 'draw',            // Stage after endStage()
      },
      draw: {
        moves: { DrawCard },
      },
    },
  },
};
```

### Entering/Exiting Stages

```typescript
// Enter a stage (current player)
events.setStage('discard');
events.setStage({ stage: 'discard', minMoves: 2, maxMoves: 5 });

// Exit current stage
events.endStage();
```

### Active Players

By default, only `currentPlayer` can make moves. Stages allow multiple players.

```typescript
// Set multiple players active
events.setActivePlayers({
  currentPlayer: 'attack',      // Current player in 'attack'
  others: 'defend',             // Others in 'defend'
  all: 'vote',                  // Everyone in 'vote'
  value: {                      // Specific assignments
    '0': 'attack',
    '1': 'defend',
    '2': 'defend',
  },
  minMoves: 1,                  // All must make 1+ moves
  maxMoves: 2,                  // Auto-exit after 2 moves
  revert: true,                 // Revert when all done
  next: { ... },                // Next activePlayers config
});

// Simple array syntax (Stage.NULL = no stage restriction)
events.setActivePlayers(['0', '2']);  // Players 0 and 2 active
```

### Stage.NULL

Allow players to act without stage restrictions:

```typescript
import { Stage } from 'boardgame.io/core';

events.setActivePlayers({ all: Stage.NULL });
```

### ActivePlayers Presets

```typescript
import { ActivePlayers } from 'boardgame.io/core';

turn: {
  activePlayers: ActivePlayers.ALL,        // All can play
  // OR
  activePlayers: ActivePlayers.ALL_ONCE,   // All play once
  // OR
  activePlayers: ActivePlayers.OTHERS,     // All except current
  // OR
  activePlayers: ActivePlayers.OTHERS_ONCE,
}
```

### Configure at Turn Start

```typescript
turn: {
  activePlayers: {
    currentPlayer: 'main',
    others: Stage.NULL,
  },
}
```

---

## Game Definition Reference

Complete game object structure:

```typescript
import { TurnOrder, PlayerView } from 'boardgame.io/core';
import type { Game } from 'boardgame.io';

interface MyGameState {
  cells: (string | null)[];
  deck: Card[];
  // ...
}

const game: Game<MyGameState> = {
  name: 'my-game',              // Unique identifier
  
  // Initial state
  setup: ({ ctx }, setupData) => ({
    cells: Array(9).fill(null),
    deck: createDeck(),
  }),
  
  // Validate setup data (optional)
  validateSetupData: (setupData, numPlayers) => {
    if (setupData.invalid) return 'Invalid setup!';
    // Return undefined if valid
  },
  
  // Player constraints
  minPlayers: 2,
  maxPlayers: 4,
  
  // Moves
  moves: {
    shortMove: ({ G, ctx, playerID, events, random }, arg1, arg2) => {
      // Modify G directly (Immer handles immutability)
      G.cells[arg1] = playerID;
    },
    
    longMove: {
      move: ({ G, random }) => { G.roll = random.D6(); },
      undoable: false,
      client: false,
      redact: true,
      noLimit: true,
    },
  },
  
  // Turn configuration
  turn: {
    order: TurnOrder.DEFAULT,
    minMoves: 0,
    maxMoves: 1,
    activePlayers: { ... },
    
    onBegin: ({ G, ctx, events, random }) => G,
    onEnd: ({ G, ctx, events, random }) => G,
    onMove: ({ G, ctx, events, random }) => G,
    endIf: ({ G, ctx, random }) => boolean | { next: string },
    
    stages: {
      stageName: {
        moves: { ... },
        next: 'otherStage',
      },
    },
  },
  
  // Phase configuration
  phases: {
    phaseName: {
      start: true,
      moves: { ... },
      turn: { ... },
      next: 'nextPhase',
      onBegin: ({ G, ctx, events, random }) => G,
      onEnd: ({ G, ctx, events, random }) => G,
      endIf: ({ G, ctx, random }) => boolean,
    },
  },
  
  // Game end condition
  endIf: ({ G, ctx, random }) => {
    if (checkWin(G)) return { winner: ctx.currentPlayer };
    if (checkDraw(G)) return { draw: true };
    // Return undefined to continue
  },
  
  // Called when game ends
  onEnd: ({ G, ctx, events, random }) => G,
  
  // Hide secret state
  playerView: PlayerView.STRIP_SECRETS,
  // OR custom:
  playerView: ({ G, ctx, playerID }) => {
    return stripSecrets(G, playerID);
  },
  
  // Events configuration
  events: {
    endGame: false,           // Disable client endGame
  },
  
  // Undo configuration
  disableUndo: false,
  
  // Random seed (for reproducibility)
  seed: 'optional-seed',
  
  // Transfer optimization
  deltaState: true,
  
  // Plugins
  plugins: [PluginPlayer({ setup: () => ({}) })],
  
  // AI configuration (for bots)
  ai: {
    enumerate: (G, ctx) => {
      const moves = [];
      // Return all legal moves
      G.cells.forEach((cell, i) => {
        if (cell === null) {
          moves.push({ move: 'clickCell', args: [i] });
        }
      });
      return moves;
    },
  },
};
```

---

## Client API

### Plain JS Client

```typescript
import { Client } from 'boardgame.io/client';
import { Local, SocketIO } from 'boardgame.io/multiplayer';

const client = Client({
  game: MyGame,
  numPlayers: 2,
  
  // Multiplayer (choose one)
  multiplayer: Local(),                              // Local testing
  multiplayer: SocketIO({ server: 'localhost:8000' }), // Remote server
  
  // Match/player identification (multiplayer)
  matchID: 'match-123',
  playerID: '0',
  credentials: 'auth-token',
  
  // Debug panel
  debug: true,        // Show debug panel
  debug: false,       // Hide debug panel
  debug: {
    impl: Debug,      // Include in production
    collapseOnLoad: true,
    hideToggleButton: false,
  },
  
  // Redux enhancer (for debugging)
  enhancer: window.__REDUX_DEVTOOLS_EXTENSION__?.(),
});

// Lifecycle
client.start();
client.stop();

// State access
const state = client.getState();
// Returns: { G, ctx, plugins, log, isActive, isConnected }

// Subscribe to changes
const unsubscribe = client.subscribe(state => {
  if (state === null) return;  // Still connecting
  renderGame(state.G, state.ctx);
});
unsubscribe();  // Stop listening

// Make moves
client.moves.clickCell(5);
client.moves.playCard({ suit: 'hearts', value: 10 });

// Trigger events
client.events.endTurn();
client.events.setPhase('combat');

// Undo/Redo
client.undo();
client.redo();
client.reset();

// Chat
client.sendChatMessage('Hello!');
client.sendChatMessage({ text: 'Hi', timestamp: Date.now() });
// Access: client.chatMessages

// Update connection
client.updateMatchID('new-match');
client.updatePlayerID('1');
client.updateCredentials('new-token');

// Properties
client.matchID;      // Current match ID
client.playerID;     // Current player ID
client.credentials;  // Auth credentials
client.log;          // Game log
client.matchData;    // Player info [{ id, name, isConnected }]
```

### React Client

```tsx
import { Client } from 'boardgame.io/react';
import type { BoardProps } from 'boardgame.io/react';

interface MyBoardProps extends BoardProps<MyGameState> {
  // Custom props
}

function Board({ G, ctx, moves, events, playerID, isActive }: MyBoardProps) {
  return (
    <div>
      {G.cells.map((cell, i) => (
        <button 
          key={i} 
          onClick={() => moves.clickCell(i)}
          disabled={!isActive}
        >
          {cell}
        </button>
      ))}
      <button onClick={() => events.endTurn()}>End Turn</button>
    </div>
  );
}

const App = Client({
  game: MyGame,
  board: Board,
  numPlayers: 2,
  multiplayer: SocketIO({ server: 'localhost:8000' }),
  debug: true,
});

// Usage: <App playerID="0" matchID="game-1" />
```

**BoardProps properties**:
- `G` - Game state
- `ctx` - Game context
- `moves` - Move dispatch functions
- `events` - Event dispatch functions
- `reset` - Reset game
- `undo` / `redo` - Undo/redo moves
- `playerID` - Current player ID
- `isActive` - Can this player act?
- `isConnected` - Connected to server?
- `matchData` - Player metadata
- `sendChatMessage` - Send chat
- `chatMessages` - Received messages

---

## Server API

### Basic Setup

```typescript
const { Server, Origins } = require('boardgame.io/server');

const server = Server({
  games: [TicTacToe, Chess],  // Game definitions
  
  origins: [
    'https://mygame.com',
    Origins.LOCALHOST,              // Allow localhost
    Origins.LOCALHOST_IN_DEVELOPMENT,  // Localhost only if NODE_ENV !== 'production'
  ],
  
  // Database (optional, defaults to in-memory)
  db: new FlatFile({ dir: '/data' }),
  
  // Custom ID generation
  uuid: () => nanoid(),
  
  // Authentication
  generateCredentials: async (ctx) => {
    const token = ctx.request.headers['authorization'];
    return decodeToken(token).uid;
  },
  
  authenticateCredentials: async (credentials, playerMetadata) => {
    return credentials === playerMetadata.credentials;
  },
});

// Start server
server.run(8000);
server.run(8000, () => console.log('Ready!'));
server.run({
  port: 8000,
  lobbyConfig: {
    apiPort: 8080,
    apiCallback: () => console.log('Lobby API ready'),
  },
});

// Stop server
server.kill({ apiServer, appServer });

// Access internals
server.app;     // Koa app
server.db;      // Database
server.router;  // Koa router
```

### HTTPS

```typescript
const fs = require('fs');

const server = Server({
  games: [MyGame],
  origins: [...],
  https: {
    cert: fs.readFileSync('/path/to/cert.pem'),
    key: fs.readFileSync('/path/to/key.pem'),
  },
});
```

### Extending Server

```typescript
// Add custom endpoint
server.router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

// Add middleware
server.router.use('/games/:name/create', async (ctx, next) => {
  // Custom validation
  await next();
});
```

---

## Lobby API

The Lobby API manages match creation, joining, and player coordination.

### LobbyClient (Browser)

```typescript
import { LobbyClient } from 'boardgame.io/client';

const lobby = new LobbyClient({ server: 'http://localhost:8000' });

// List games
const games = await lobby.listGames();
// => ['tic-tac-toe', 'chess']

// List matches
const { matches } = await lobby.listMatches('tic-tac-toe');
// => [{ matchID, players, setupData }]

// Get specific match
const match = await lobby.getMatch('tic-tac-toe', 'match-123');
// => { matchID, players, setupData }

// Create match
const { matchID } = await lobby.createMatch('tic-tac-toe', {
  numPlayers: 2,
  setupData: { custom: 'data' },
  unlisted: false,
});

// Join match
const { playerCredentials, playerID } = await lobby.joinMatch(
  'tic-tac-toe',
  matchID,
  {
    playerID: '0',          // Optional, auto-assigned if omitted
    playerName: 'Alice',
    data: { avatar: 'url' },
  }
);

// Update player
await lobby.updatePlayer('tic-tac-toe', matchID, {
  playerID: '0',
  credentials: playerCredentials,
  newName: 'Alicia',
  data: { avatar: 'new-url' },
});

// Leave match
await lobby.leaveMatch('tic-tac-toe', matchID, {
  playerID: '0',
  credentials: playerCredentials,
});

// Play again (creates new match)
const { nextMatchID } = await lobby.playAgain('tic-tac-toe', matchID, {
  playerID: '0',
  credentials: playerCredentials,
  numPlayers: 4,            // Optional, defaults to previous
  setupData: { ... },       // Optional, defaults to previous
});
```

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/games` | List game types |
| GET | `/games/{name}` | List matches |
| GET | `/games/{name}/{id}` | Get match details |
| POST | `/games/{name}/create` | Create match |
| POST | `/games/{name}/{id}/join` | Join match |
| POST | `/games/{name}/{id}/update` | Update player |
| POST | `/games/{name}/{id}/leave` | Leave match |
| POST | `/games/{name}/{id}/playAgain` | Create rematch |

---

## Multiplayer Modes

### Local Master (Testing)

All clients share an in-memory game master:

```typescript
import { Local } from 'boardgame.io/multiplayer';

const client0 = Client({
  game: MyGame,
  multiplayer: Local(),
  playerID: '0',
});

const client1 = Client({
  game: MyGame,
  multiplayer: Local(),
  playerID: '1',
});

// Both clients see same game state
```

**Options**:
```typescript
Local({
  persist: true,        // Save to localStorage
  storageKey: 'bgio',   // localStorage key prefix
});
```

### Remote Master (Production)

Connect to server via WebSocket:

```typescript
import { SocketIO } from 'boardgame.io/multiplayer';

const client = Client({
  game: MyGame,
  multiplayer: SocketIO({
    server: 'https://game.example.com:8000',
    socketOpts: { /* socket.io options */ },
  }),
  matchID: 'match-123',
  playerID: '0',
  credentials: 'player-token',
});

// Handle initial null state
client.subscribe(state => {
  if (state === null) {
    showLoading();
    return;
  }
  renderGame(state);
});
```

### Spectators

Clients without `playerID` are spectators:

```typescript
const spectator = Client({
  game: MyGame,
  multiplayer: SocketIO({ server: '...' }),
  matchID: 'match-123',
  // No playerID = spectator
});
// Can see state, cannot make moves
```

---

## Randomness

### Random API

Available in moves via the `random` object:

```typescript
moves: {
  roll: ({ G, random }) => {
    // Dice rolls
    G.d6 = random.D6();              // 1-6
    G.d20 = random.D20();            // 1-20
    G.custom = random.Die(12);       // 1-12
    G.multiple = random.D6(3);       // [1-6, 1-6, 1-6]
    
    // Other
    G.float = random.Number();       // 0-1
    G.deck = random.Shuffle(G.deck); // Shuffled array
  },
}
```

### Available Functions

| Function | Description | Example |
|----------|-------------|---------|
| `Die(n)` | Roll n-sided die | `Die(12)` → 1-12 |
| `Die(n, count)` | Roll multiple dice | `Die(6, 3)` → [1-6, 1-6, 1-6] |
| `D4()`, `D6()`, `D8()`, `D10()`, `D12()`, `D20()` | Standard dice | `D6()` → 1-6 |
| `Number()` | Random 0-1 | `Number()` → 0.4231 |
| `Shuffle(array)` | Shuffle array | `Shuffle([1,2,3])` → [3,1,2] |

### Seeding

Set seed for reproducible games:

```typescript
const game = {
  seed: 'my-seed-string',  // or number
  // ...
};
```

---

## Secret State

### PlayerView

Filter state before sending to clients:

```typescript
const game = {
  setup: () => ({
    secret: { answerKey: [1, 2, 3] },
    players: {
      '0': { hand: ['A', 'K', 'Q'] },
      '1': { hand: ['J', '10', '9'] },
    },
    board: [],
  }),
  
  // Custom filter
  playerView: ({ G, ctx, playerID }) => {
    const { secret, players, ...rest } = G;
    return {
      ...rest,
      myHand: players[playerID]?.hand,
      // Don't include secret or other players' hands
    };
  },
};
```

### STRIP_SECRETS Helper

```typescript
import { PlayerView } from 'boardgame.io/core';

const game = {
  playerView: PlayerView.STRIP_SECRETS,
};

// Automatically:
// - Removes G.secret
// - From G.players, keeps only current player's data
```

### Server-Only Moves

Moves accessing secret state should not run on client:

```typescript
moves: {
  drawSecretCard: {
    move: ({ G, random }) => {
      const card = G.secret.deck.pop();
      G.hand.push(card);
    },
    client: false,  // Only run on server
  },
}
```

---

## Bots / AI

### Defining AI

```typescript
const game = {
  // ... moves, setup, etc.
  
  ai: {
    enumerate: (G, ctx) => {
      const moves = [];
      
      // Return all legal moves
      for (let i = 0; i < 9; i++) {
        if (G.cells[i] === null) {
          moves.push({
            move: 'clickCell',
            args: [i],
          });
        }
      }
      
      return moves;
    },
  },
};
```

### Using Bots

The Debug Panel provides bot controls:
- `play` - Bot makes one move
- `simulate` - Bot plays entire game

The bot uses MCTS (Monte Carlo Tree Search) to find good moves.

### Running Bots Programmatically

```typescript
import { Client } from 'boardgame.io/client';
import { MCTSBot } from 'boardgame.io/ai';

const bot = new MCTSBot({
  game: MyGame,
  enumerate: MyGame.ai.enumerate,
  iterations: 1000,  // MCTS iterations per move
});

// Get bot's chosen move
const { action } = await bot.play(state, playerID);
// action = { type: 'MAKE_MOVE', payload: { type: 'clickCell', args: [4] } }
```

---

## Plugins

### Using Built-in Plugins

```typescript
import { PluginPlayer } from 'boardgame.io/plugins';

const game = {
  plugins: [
    PluginPlayer({
      setup: (playerID) => ({
        hand: [],
        score: 0,
      }),
      playerView: (players, playerID) => ({
        [playerID]: players[playerID],
      }),
    }),
  ],
  
  moves: {
    play: ({ ctx }) => {
      // Access current player's state
      const myState = ctx.player.get();
      
      // Modify current player's state
      ctx.player.set({ ...myState, score: myState.score + 1 });
      
      // Access opponent (2-player games)
      const opponent = ctx.player.opponent.get();
    },
  },
};
```

### Creating Custom Plugins

```typescript
const MyPlugin = {
  name: 'my-plugin',
  
  // Initialize plugin data
  setup: ({ G, ctx, game }) => ({
    customData: [],
  }),
  
  // Create API available in ctx
  api: ({ G, ctx, game, data, playerID }) => ({
    doSomething: () => { /* ... */ },
    getData: () => data.customData,
  }),
  
  // Persist changes
  flush: ({ G, ctx, game, data, api }) => ({
    customData: [...data.customData, 'new'],
  }),
  
  // Wrap move execution
  fnWrap: (fn, fnType) => ({ G, ...rest }, ...args) => {
    // Pre-processing
    G = fn({ G, ...rest }, ...args);
    // Post-processing
    return G;
  },
  
  // Force server-side execution
  noClient: ({ G, ctx, data, api }) => false,
  
  // Validate state
  isInvalid: ({ G, ctx, data, api }) => {
    if (invalid) return 'Error message';
    return false;
  },
  
  // Filter plugin data for clients
  playerView: ({ G, ctx, data, playerID }) => {
    return { /* filtered data */ };
  },
};
```

---

## Storage Adapters

### FlatFile

```typescript
const { Server, FlatFile } = require('boardgame.io/server');

const server = Server({
  games: [MyGame],
  db: new FlatFile({
    dir: '/storage/directory',
    logging: true,
    ttl: 3600000,  // Optional TTL in ms
  }),
});
```

**Requires**: `npm install node-persist`

### Other Backends

| Backend | Package |
|---------|---------|
| Firebase | [bgio-firebase](https://github.com/delucis/bgio-firebase) |
| Azure Storage | [bgio-azure-storage](https://github.com/c-w/bgio-azure-storage) |
| Postgres | [bgio-postgres](https://github.com/janKir/bgio-postgres) |

### Caching

```typescript
import { StorageCache } from '@boardgame.io/storage-cache';

const server = Server({
  db: new StorageCache(new FlatFile({ dir: '/data' })),
});
```

---

## Undo / Redo

### Usage

```typescript
// From client
client.undo();
client.redo();
client.reset();
```

### Disabling Undo

```typescript
// For entire game
const game = {
  disableUndo: true,
};

// For specific moves
moves: {
  rollDice: {
    move: ({ G, random }) => { G.roll = random.D6(); },
    undoable: false,
  },
  
  // Can also use function
  drawCard: {
    move: ({ G }) => { /* ... */ },
    undoable: ({ G, ctx }) => G.canUndoDraw,
  },
}
```

---

## Chat

### Sending Messages

```typescript
// Plain text
client.sendChatMessage('Hello!');

// With metadata
client.sendChatMessage({
  text: 'Hello!',
  timestamp: Date.now(),
  emoji: '👋',
});
```

### Receiving Messages

```typescript
// Access received messages
client.chatMessages
// => [
//   { id: 'abc', sender: '0', payload: 'Hello!' },
//   { id: 'def', sender: '1', payload: { text: 'Hi!', timestamp: 1234 } },
// ]

// React: via board props
function Board({ chatMessages, sendChatMessage }) {
  return (
    <div>
      {chatMessages.map(msg => (
        <div key={msg.id}>
          Player {msg.sender}: {msg.payload}
        </div>
      ))}
      <button onClick={() => sendChatMessage('GG!')}>Say GG</button>
    </div>
  );
}
```

**Note**: Chat is ephemeral - not persisted, only received while connected.

---

## Testing

### Unit Testing Moves

```typescript
import { clickCell } from './Game';

test('clickCell places marker', () => {
  const G = { cells: Array(9).fill(null) };
  clickCell({ G, playerID: '0' }, 4);
  expect(G.cells[4]).toBe('0');
});
```

### Scenario Testing

```typescript
import { Client } from 'boardgame.io/client';
import { MyGame } from './Game';

test('player 1 wins', () => {
  const client = Client({
    game: {
      ...MyGame,
      setup: () => ({ cells: ['0', '0', null, '1', '1', null, ...] }),
    },
  });
  
  client.moves.clickCell(8);
  client.moves.clickCell(5);
  
  const { ctx } = client.getState();
  expect(ctx.gameover).toEqual({ winner: '1' });
});
```

### Multiplayer Testing

```typescript
import { Local } from 'boardgame.io/multiplayer';

test('multiplayer sync', () => {
  const spec = { game: MyGame, multiplayer: Local() };
  
  const p0 = Client({ ...spec, playerID: '0' });
  const p1 = Client({ ...spec, playerID: '1' });
  
  p0.start();
  p1.start();
  
  p0.moves.play();
  p0.events.endTurn();
  
  expect(p1.getState().ctx.currentPlayer).toBe('1');
});
```

### Testing Randomness

```typescript
// Fixed seed
const client = Client({
  game: { ...MyGame, seed: 'test-seed' },
});

// Mock random
import { MockRandom } from 'boardgame.io/testing';

const client = Client({
  game: {
    ...MyGame,
    plugins: [...(MyGame.plugins || []), MockRandom({ D6: () => 6 })],
  },
});
```

---

## Debug Panel

### Controls

| Key | Action |
|-----|--------|
| `1` | Reset game |
| `2` | Save state |
| `3` | Restore state |
| `.` | Toggle panel |

### Configuration

```typescript
const client = Client({
  debug: {
    impl: Debug,            // Include in production build
    collapseOnLoad: true,   // Start collapsed
    hideToggleButton: true, // Hide toggle button
  },
});
```

### Custom Log Metadata

```typescript
moves: {
  attack: ({ G, log }, target) => {
    const damage = calculateDamage();
    log.setMetadata(`Dealt ${damage} damage to ${target}`);
    G.health[target] -= damage;
  },
}
```

---

## TypeScript

### Game Definition

```typescript
import type { Game, Move, Ctx } from 'boardgame.io';

interface GameState {
  cells: (string | null)[];
  winner: string | null;
}

interface SetupData {
  boardSize: number;
}

const clickCell: Move<GameState> = ({ G, ctx, playerID }, id: number) => {
  G.cells[id] = playerID;
};

export const MyGame: Game<GameState, Ctx, SetupData> = {
  name: 'my-game',
  setup: ({ ctx }, setupData) => ({
    cells: Array(setupData?.boardSize ?? 9).fill(null),
    winner: null,
  }),
  moves: { clickCell },
};
```

### React Board

```tsx
import type { BoardProps } from 'boardgame.io/react';
import type { GameState } from './Game';

interface MyBoardProps extends BoardProps<GameState> {
  theme?: 'light' | 'dark';
}

export function Board({ G, ctx, moves, isActive }: MyBoardProps) {
  // G is typed as GameState
  // moves.clickCell is typed
}
```

---

## Common Patterns

### Auto-End Turn After Move

```typescript
turn: {
  minMoves: 1,
  maxMoves: 1,  // Turn ends after 1 move
}
```

### Sequential Player Actions

```typescript
phases: {
  roll: {
    moves: { RollDice },
    turn: { maxMoves: 1 },
    next: 'move',
    start: true,
  },
  move: {
    moves: { MoveToken },
    turn: { maxMoves: 1 },
    endIf: ({ G }) => G.turnComplete,
    next: 'roll',
  },
}
```

### Simultaneous Actions

```typescript
turn: {
  activePlayers: ActivePlayers.ALL_ONCE,
  stages: {
    selectCard: {
      moves: {
        select: ({ G, playerID }, card) => {
          G.selections[playerID] = card;
        },
      },
    },
  },
}
```

### Auction/Bidding

```typescript
phases: {
  bidding: {
    turn: {
      order: TurnOrder.CONTINUE,
      minMoves: 1,
      maxMoves: 1,
    },
    moves: {
      bid: ({ G, playerID }, amount) => {
        G.currentBid = amount;
        G.lastBidder = playerID;
      },
      pass: ({ G, playerID }) => {
        G.passedPlayers.push(playerID);
      },
    },
    endIf: ({ G, ctx }) => 
      G.passedPlayers.length >= ctx.numPlayers - 1,
    next: 'resolution',
  },
}
```

### Card Drafting

```typescript
phases: {
  draft: {
    turn: {
      activePlayers: ActivePlayers.ALL,
      stages: {
        pick: {
          moves: {
            pickCard: ({ G, playerID }, cardIndex) => {
              const card = G.draftPools[playerID][cardIndex];
              G.hands[playerID].push(card);
              G.draftPools[playerID].splice(cardIndex, 1);
            },
          },
        },
      },
    },
    onEnd: ({ G }) => {
      // Rotate draft pools
      const pools = [...G.draftPools];
      G.draftPools = [pools.pop(), ...pools.slice(0, -1)];
    },
    endIf: ({ G }) => G.draftPools.every(p => p.length === 0),
  },
}
```

---

## Quick Reference

### Imports

```typescript
// Core
import { INVALID_MOVE, TurnOrder, ActivePlayers, Stage, PlayerView } from 'boardgame.io/core';

// Client
import { Client } from 'boardgame.io/client';        // Plain JS
import { Client } from 'boardgame.io/react';         // React
import { LobbyClient } from 'boardgame.io/client';   // Lobby

// Multiplayer
import { Local, SocketIO } from 'boardgame.io/multiplayer';

// Server
import { Server, Origins, FlatFile } from 'boardgame.io/server';

// Plugins
import { PluginPlayer } from 'boardgame.io/plugins';

// AI
import { MCTSBot, RandomBot } from 'boardgame.io/ai';

// Testing
import { MockRandom } from 'boardgame.io/testing';

// Debug (production)
import { Debug } from 'boardgame.io/debug';

// Types
import type { Game, Move, Ctx, BoardProps } from 'boardgame.io';
```

### State Flow

```
Client.moves.X() 
    → Move runs (updates G)
    → Events processed (updates ctx)
    → endIf checks run
    → Hooks (onMove, endIf) run
    → State broadcast to clients
```

### Key Lifecycle Hooks

| Hook | Location | When |
|------|----------|------|
| `setup` | game | Game creation |
| `onBegin` | turn/phase | Start of turn/phase |
| `onEnd` | turn/phase/game | End of turn/phase/game |
| `onMove` | turn | After each move |
| `endIf` | turn/phase/game | Check if should end |

---

## Resources

- **Documentation**: https://boardgame.io/documentation/#/
- **GitHub**: https://github.com/boardgameio/boardgame.io
- **Examples**: https://github.com/boardgameio/boardgame.io/tree/main/examples
- **Discord**: https://discord.gg/MRhSsX2n (may be outdated)
