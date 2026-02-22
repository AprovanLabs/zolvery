# BoardGame.io AI Integration Spec

> **Status**: Draft  
> **Last Updated**: 2026-02-21

## Overview

Standardize bot/AI handling in the BoardgameIO image to provide a seamless developer experience while supporting both simple (Random) and complex (MCTS) bot strategies. This includes centralizing bot turn delays, exposing loading/thinking states, and simplifying player/bot count configuration.

## Goals

1. **Unified bot execution** — Single approach that works for both client-side and server-authoritative games
2. **Configurable bot strategies** — Support Random, MCTS, and custom bot implementations
3. **Standardized delays & UX** — Centralized bot turn delays with exposed "thinking" state
4. **Simplified player configuration** — Clear relationship between `numPlayers`, `humanPlayers`, and `botCount`
5. **Minimal game-side changes** — Developers only need to implement `game.ai.enumerate`

## Current State Analysis

### Problems with Component-Based Bots (Current Default)

```tsx
// connect-4/main.tsx - Current pattern
useEffect(() => {
  if (over || myTurn || !hasBot) return;
  const timer = setTimeout(() => {
    const pick = getBotMove(G.cells);
    if (pick !== -1) moves.dropToken(pick);
  }, BOT_DELAY_MS);
  return () => clearTimeout(timer);
}, [G.cells, G.current, ...]);
```

**Issues**:
- Every game re-implements bot logic and delays
- No standardized "thinking" indicator
- Custom bot algorithms (like `getBotMove`) duplicated per game
- Won't work for server-authoritative multiplayer
- No way to switch between bot strategies

### Problems with Transport-Based Bots

```typescript
// mount.ts - Transport bot setup
const useTransportBots = game.botMode === 'transport' && botCount > 0;
const botFactory = canConfigureTransportBots ? BoardgameAI?.RandomBot : undefined;
```

**Issues**:
- Only RandomBot supported (no MCTS)
- No delay configuration
- No "thinking" state exposure
- Requires explicit `botMode: 'transport'` opt-in

### Player Count Configuration Confusion

Currently, player counts come from multiple sources:
- `game.minPlayers` / `game.maxPlayers`
- `manifest.players.min` / `manifest.players.max`
- `inputs.numPlayers`
- `inputs['bot-count']`

No clear relationship between these values, leading to:
- Games needing to track `botCount` in `G` state
- Unclear how lobby should handle bot slots
- No standard for "waiting for players" vs "can start"

---

## Proposed Architecture

### 1. Bot Manager (New)

Create a `BotManager` class that centralizes bot execution.

```typescript
// packages/images/boardgameio/src/bot-manager.ts

import type { State } from 'boardgame.io';
import type { MCTSBot, RandomBot } from 'boardgame.io/ai';

export type BotStrategy = 'random' | 'mcts' | 'custom';

export interface BotConfig {
  /** Difficulty preset: 'easy', 'medium', 'hard', or 'custom' */
  difficulty?: BotDifficulty;
  
  /** Bot strategy: 'random' or 'mcts' (overrides difficulty preset) */
  strategy?: BotStrategy;
  
  /** Delay before bot makes move (ms). Default from difficulty. */
  delay?: number;
  
  /** Min delay for variable timing (ms). If set, delay becomes max. */
  minDelay?: number;
  
  /** MCTS iterations (only for strategy: 'mcts'). Default from difficulty. */
  mctsIterations?: number;
  
  /** Chance bot picks suboptimal move (0-1). Default from difficulty. */
  mistakeRate?: number;
  
  /** Custom bot factory (only for strategy: 'custom') */
  customBot?: () => Bot;
}

export interface BotState {
  /** Whether a bot is currently "thinking" */
  isThinking: boolean;
  
  /** Which player ID is thinking (null if none) */
  thinkingPlayer: string | null;
  
  /** Estimated time remaining for bot move (ms, if calculable) */
  estimatedTime?: number;
}

export class BotManager {
  private config: Required<BotConfig>;
  private bot: MCTSBot | RandomBot | null = null;
  private pendingMove: ReturnType<typeof setTimeout> | null = null;
  private stateListeners: Set<(state: BotState) => void> = new Set();
  
  constructor(
    private game: BoardgameGame,
    config: BotConfig = {}
  ) {
    this.config = {
      strategy: config.strategy ?? 'random',
      delay: config.delay ?? 800,
      minDelay: config.minDelay ?? 0,
      mctsIterations: config.mctsIterations ?? 1000,
      customBot: config.customBot ?? (() => { throw new Error('No custom bot'); }),
    };
    
    this.initializeBot();
  }
  
  private initializeBot(): void {
    const { BoardgameAI } = window;
    if (!BoardgameAI) return;
    
    switch (this.config.strategy) {
      case 'mcts':
        this.bot = new BoardgameAI.MCTSBot({
          game: this.game,
          enumerate: this.game.ai?.enumerate,
          iterations: this.config.mctsIterations,
        });
        break;
      case 'random':
        this.bot = new BoardgameAI.RandomBot({
          game: this.game,
          enumerate: this.game.ai?.enumerate,
        });
        break;
      case 'custom':
        this.bot = this.config.customBot();
        break;
    }
  }
  
  /**
   * Check if it's a bot's turn and schedule a move if so.
   * Call this after every state update.
   */
  async maybePlayBot(
    state: State,
    botPlayerIDs: string[],
    makeMove: (type: string, ...args: unknown[]) => void
  ): Promise<void> {
    const { ctx } = state;
    
    // Check if current player is a bot
    const isBotTurn = botPlayerIDs.includes(ctx.currentPlayer);
    if (!isBotTurn || ctx.gameover) {
      this.cancelPendingMove();
      this.notifyState({ isThinking: false, thinkingPlayer: null });
      return;
    }
    
    // Notify thinking state
    this.notifyState({ isThinking: true, thinkingPlayer: ctx.currentPlayer });
    
    // Calculate delay (optionally variable)
    const delay = this.config.minDelay > 0
      ? this.config.minDelay + Math.random() * (this.config.delay - this.config.minDelay)
      : this.config.delay;
    
    // Get bot move
    const action = await this.bot?.play(state, ctx.currentPlayer);
    if (!action?.action) {
      this.notifyState({ isThinking: false, thinkingPlayer: null });
      return;
    }
    
    // Schedule move after delay
    this.pendingMove = setTimeout(() => {
      const { type, args } = action.action.payload;
      makeMove(type, ...args);
      this.notifyState({ isThinking: false, thinkingPlayer: null });
    }, delay);
  }
  
  /** Subscribe to bot state changes */
  subscribe(listener: (state: BotState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }
  
  private notifyState(state: BotState): void {
    this.stateListeners.forEach(fn => fn(state));
  }
  
  private cancelPendingMove(): void {
    if (this.pendingMove) {
      clearTimeout(this.pendingMove);
      this.pendingMove = null;
    }
  }
  
  dispose(): void {
    this.cancelPendingMove();
    this.stateListeners.clear();
  }
}
```

### 2. Player Configuration Model

Simplify to three core concepts:

```typescript
export interface PlayerConfig {
  /** Total player slots for the game (from game definition) */
  numPlayers: number;
  
  /** Human players currently in the game */
  humanPlayers: string[];
  
  /** Number of bot slots (numPlayers - humanPlayers.length by default) */
  botCount: number;
}
```

**Rules**:
1. `numPlayers` comes from `game.maxPlayers` (or inputs override)
2. `botCount` defaults to `numPlayers - 1` (single human player)
3. As humans join via lobby, they take bot slots: `botCount = numPlayers - humanPlayers.length`
4. Game can start when `humanPlayers.length + botCount === numPlayers`
5. From lobby, `botCount` can be adjusted (within `0` to `numPlayers - humanPlayers.length`)

**Settings Input Schema**:

```typescript
// In zolvery.json or settings
{
  "inputs": {
    "numPlayers": {
      "type": "number",
      "default": 2,      // Uses game.maxPlayers if not set
      "min": "{{game.minPlayers}}",
      "max": "{{game.maxPlayers}}"
    },
    "botCount": {
      "type": "number",
      "default": "{{numPlayers - 1}}",
      "min": 0,
      "max": "{{numPlayers - 1}}"
    },
    "botStrategy": {
      "type": "select",
      "options": ["random", "mcts"],
      "default": "random"
    },
    "botDelay": {
      "type": "number",
      "default": 800,
      "min": 0,
      "max": 5000
    }
  }
}
```

### 3. Updated Mount Function

```typescript
// packages/images/boardgameio/src/mount.ts

export function createGameMount(
  game: BoardgameGame,
  Board: BoardComponent,
  options: GameMountOptions = {},
): MountFunction {
  return (container: HTMLElement, inputs: GameSettings = {}): (() => void) => {
    const { BoardgameReact, BoardgameMultiplayer, React: R, ReactDOM } = window;
    
    // Player configuration
    const numPlayers = inputs.numPlayers ?? game.maxPlayers ?? game.minPlayers ?? 2;
    const botCount = inputs.botCount ?? (numPlayers - 1);
    const botPlayerIDs = computeBotPlayerIDs(numPlayers, botCount, inputs.playerID ?? '0');
    
    // Bot configuration - resolved from difficulty preset + explicit overrides
    const botConfig = resolveBotConfig(inputs, game.ai?.difficulty);
    
    // Create bot manager (only if game has ai.enumerate)
    const botManager = game.ai?.enumerate 
      ? new BotManager(game, botConfig)
      : null;
    
    // Wrapper that integrates bot manager
    const WrappedBoard: BoardComponent = (props) => {
      const [botState, setBotState] = R.useState<BotState>({
        isThinking: false,
        thinkingPlayer: null,
      });
      
      // Subscribe to bot state
      R.useEffect(() => {
        if (!botManager) return;
        return botManager.subscribe(setBotState);
      }, []);
      
      // Trigger bot moves on state changes
      R.useEffect(() => {
        if (!botManager || !props.G) return;
        botManager.maybePlayBot(
          { G: props.G, ctx: props.ctx },
          botPlayerIDs,
          (type, ...args) => props.moves[type]?.(...args)
        );
      }, [props.G, props.ctx?.currentPlayer]);
      
      return R.createElement(Board, {
        ...props,
        botState,        // { isThinking, thinkingPlayer }
        botPlayerIDs,    // ['1', '2', ...] - which players are bots
        botCount,        // number of bots
        botDifficulty: inputs.botDifficulty ?? 'medium',
      });
    };
    
    // Create client with Local multiplayer (no transport bots)
    const GameClient = BoardgameReact.Client({
      game,
      board: WrappedBoard,
      numPlayers,
      multiplayer: BoardgameMultiplayer?.Local(),
    });
    
    const root = ReactDOM.createRoot(container);
    root.render(R.createElement(GameClient, { playerID: inputs.playerID ?? '0' }));
    
    return () => {
      botManager?.dispose();
      root.unmount();
    };
  };
}

function computeBotPlayerIDs(
  numPlayers: number,
  botCount: number,
  humanPlayerID: string
): string[] {
  const botIDs: string[] = [];
  for (let i = 0; i < numPlayers && botIDs.length < botCount; i++) {
    const id = String(i);
    if (id !== humanPlayerID) {
      botIDs.push(id);
    }
  }
  return botIDs;
}
```

### 4. Board Props Interface

```typescript
export interface BoardPropsWithBots<G = unknown> {
  // Standard BoardgameIO props
  G: G;
  ctx: Ctx;
  moves: Record<string, (...args: unknown[]) => void>;
  events: Record<string, (...args: unknown[]) => void>;
  playerID: string;
  isActive: boolean;
  
  // Bot-related props (injected by mount)
  botState: BotState;            // Current bot thinking state
  botPlayerIDs: string[];        // Which players are bots
  botCount: number;              // Total bot count
  botDifficulty: BotDifficulty;  // Current difficulty setting
  
  // Multiplayer props
  isMultiplayer: boolean;
}
```

### 5. Example: Using Bot State in UI

```tsx
// connect-4/main.tsx - Simplified with new architecture

export const game = {
  name: 'connect-4',
  setup: () => ({
    cells: createBoard(),
    winner: null,
  }),
  moves: {
    dropToken: ({ G, ctx }, col: number) => {
      // ... move logic
    },
  },
  ai: {
    enumerate: (G, ctx) => {
      return getValidMoves(G.cells).map(col => ({
        move: 'dropToken',
        args: [col],
      }));
    },
  },
};

export function app({ G, ctx, moves, botState, botPlayerIDs }: BoardPropsWithBots<GameState>) {
  const myTurn = ctx.currentPlayer === '0';
  const isBotThinking = botState.isThinking;
  
  return (
    <div>
      {/* Turn indicator with thinking state */}
      <div className="flex items-center gap-2">
        <span>Turn: Player {ctx.currentPlayer}</span>
        {isBotThinking && (
          <span className="animate-pulse text-sm text-slate-500">
            Thinking...
          </span>
        )}
      </div>
      
      {/* Board - disabled during bot turn */}
      <div className="grid grid-cols-7 gap-1">
        {G.cells.map((cell, i) => (
          <button
            key={i}
            disabled={!myTurn || isBotThinking}
            onClick={() => moves.dropToken(i)}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Implementation Tasks

### Phase 1: Core Bot Infrastructure

- [ ] **1.1** Create `BotManager` class in `packages/images/boardgameio/src/bot-manager.ts`
  - Implement strategy pattern for Random/MCTS/Custom bots
  - Add delay configuration with optional min/max range
  - Implement difficulty presets with mistakeRate support
  - Expose `BotState` via subscription pattern
  - Handle cleanup and pending move cancellation

- [ ] **1.2** Update `mount.ts` to integrate `BotManager`
  - Remove `botMode` configuration (always use BotManager)
  - Compute `botPlayerIDs` from `numPlayers` and `botCount`
  - Inject `botState`, `botPlayerIDs`, `botCount` as board props
  - Wire up state subscription and bot move triggering

- [ ] **1.3** Add TypeScript types for new props
  - Create `BoardPropsWithBots<G>` interface
  - Export from package index

- [ ] **1.4** Load MCTS bot module conditionally
  - Only load `boardgame.io/ai` when needed
  - Handle missing module gracefully

### Phase 2: Player Configuration

- [ ] **2.1** Standardize player count resolution
  - Priority: `inputs.numPlayers` > `game.maxPlayers` > `game.minPlayers` > `2`
  - Document resolution order

- [ ] **2.2** Implement `botCount` defaults
  - Default to `numPlayers - 1` for single-player experience
  - Validate `botCount <= numPlayers - 1`

- [ ] **2.3** Update settings schema
  - Add `botCount`, `botDifficulty`, `botStrategy`, `botDelay` to standard inputs
  - Implement difficulty preset resolution (easy/medium/hard/custom)
  - Support conditional visibility for custom difficulty options
  - Support in `zolvery.json` and runtime settings

- [ ] **2.4** Implement difficulty presets
  - Create `DIFFICULTY_PRESETS` constant with tuned values
  - Support game-specific difficulty overrides via `game.ai.difficulty`
  - Implement mistakeRate for controlled imperfection

### Phase 3: Migrate Existing Games

- [ ] **3.1** Update `connect-4` example
  - Remove custom `getBotMove` function
  - Remove `useEffect` bot logic
  - Remove `botCount` from game state
  - Add `game.ai.enumerate` (already present)
  - Use `botState.isThinking` for UI

- [ ] **3.2** Update other games with bots
  - Audit all examples for bot patterns
  - Migrate to standardized approach

- [ ] **3.3** Remove deprecated code
  - Remove `game.botMode` option
  - Remove transport-based bot setup from mount
  - Update documentation

### Phase 4: Lobby Integration

- [ ] **4.1** Design lobby bot slot management
  - Show bot/human slots in lobby UI
  - Allow host to adjust bot count
  - Handle player join/leave with bot slot adjustment

- [ ] **4.2** Implement multiplayer bot support
  - Bots run on host's client in P2P mode
  - Consider server-side bot execution for authoritative games

### Phase 5: Documentation & Polish

- [ ] **5.1** Update BoardgameIO image documentation
  - Document new props interface
  - Document bot configuration options
  - Provide migration guide

- [ ] **5.2** Add examples
  - Simple random bot example
  - MCTS bot with custom iterations
  - Custom bot implementation example

---

## Configuration Reference

### Game Definition (Required for Bots)

```typescript
export const game = {
  name: 'my-game',
  setup: () => ({ /* initial state */ }),
  moves: { /* ... */ },
  
  // Required for bot support
  ai: {
    enumerate: (G, ctx) => {
      // Return array of legal moves
      return [
        { move: 'moveName', args: [arg1, arg2] },
        // ...
      ];
    },
  },
};
```

### Settings Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `numPlayers` | number | `game.maxPlayers` | Total player slots |
| `botCount` | number | `numPlayers - 1` | Number of bot players |
| `botDifficulty` | `'easy'` \| `'medium'` \| `'hard'` \| `'custom'` | `'medium'` | Bot difficulty preset |
| `botStrategy` | `'random'` \| `'mcts'` | (from difficulty) | Bot algorithm (overrides difficulty) |
| `botDelay` | number | (from difficulty) | Delay before bot move (ms) |
| `botMinDelay` | number | - | Min delay for variable timing |
| `mctsIterations` | number | (from difficulty) | MCTS search iterations |
| `botMistakeRate` | number | (from difficulty) | Chance bot picks suboptimal move (0-1) |

### Board Props

| Prop | Type | Description |
|------|------|-------------|
| `botState.isThinking` | boolean | Bot is computing a move |
| `botState.thinkingPlayer` | string \| null | Player ID of thinking bot |
| `botPlayerIDs` | string[] | List of bot player IDs |
| `botCount` | number | Total number of bots |
| `botDifficulty` | string | Current difficulty setting |

---

## Difficulty Configuration

### Difficulty Presets

User-friendly difficulty levels that map to underlying bot parameters:

| Difficulty | Strategy | Iterations | Delay | Mistake Rate | Description |
|------------|----------|------------|-------|--------------|-------------|
| `easy` | `random` | - | 400ms | 0.3 | Random moves with frequent mistakes |
| `medium` | `mcts` | 500 | 800ms | 0.1 | Decent play, occasional mistakes |
| `hard` | `mcts` | 2000 | 1200ms | 0 | Strong play, no mistakes |
| `custom` | (manual) | (manual) | (manual) | (manual) | Use explicit settings |

### Difficulty Resolution

```typescript
export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'custom';

export interface DifficultyPreset {
  strategy: BotStrategy;
  mctsIterations: number;
  delay: number;
  minDelay: number;
  mistakeRate: number;
}

export const DIFFICULTY_PRESETS: Record<BotDifficulty, DifficultyPreset> = {
  easy: {
    strategy: 'random',
    mctsIterations: 0,
    delay: 400,
    minDelay: 200,
    mistakeRate: 0.3,
  },
  medium: {
    strategy: 'mcts',
    mctsIterations: 500,
    delay: 800,
    minDelay: 400,
    mistakeRate: 0.1,
  },
  hard: {
    strategy: 'mcts',
    mctsIterations: 2000,
    delay: 1200,
    minDelay: 600,
    mistakeRate: 0,
  },
  custom: {
    strategy: 'mcts',
    mctsIterations: 1000,
    delay: 800,
    minDelay: 0,
    mistakeRate: 0,
  },
};

function resolveBotConfig(inputs: GameSettings): BotConfig {
  const difficulty = (inputs.botDifficulty as BotDifficulty) ?? 'medium';
  const preset = DIFFICULTY_PRESETS[difficulty];
  
  // Explicit settings override preset values
  return {
    strategy: inputs.botStrategy ?? preset.strategy,
    mctsIterations: inputs.mctsIterations ?? preset.mctsIterations,
    delay: inputs.botDelay ?? preset.delay,
    minDelay: inputs.botMinDelay ?? preset.minDelay,
    mistakeRate: inputs.botMistakeRate ?? preset.mistakeRate,
  };
}
```

### Mistake Rate Implementation

The `mistakeRate` adds controlled imperfection to bot play, making lower difficulties feel more human:

```typescript
class BotManager {
  private async selectMove(state: State, playerID: string): Promise<BotAction | null> {
    if (!this.bot || !this.game.ai?.enumerate) return null;
    
    const legalMoves = this.game.ai.enumerate(state.G, state.ctx);
    if (legalMoves.length === 0) return null;
    
    // Check if bot should make a "mistake"
    if (this.config.mistakeRate > 0 && Math.random() < this.config.mistakeRate) {
      // Pick a random legal move instead of the optimal one
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      return { action: { payload: legalMoves[randomIndex] } };
    }
    
    // Otherwise, use the bot's calculated best move
    return this.bot.play(state, playerID);
  }
}
```

### Game-Specific Difficulty Overrides

Games can provide custom difficulty presets that override the defaults:

```typescript
export const game = {
  name: 'chess',
  // ...
  
  ai: {
    enumerate: (G, ctx) => getValidChessMoves(G),
    
    // Optional: game-specific difficulty tuning
    difficulty: {
      easy: { mctsIterations: 100, mistakeRate: 0.4 },
      medium: { mctsIterations: 1000, mistakeRate: 0.15 },
      hard: { mctsIterations: 5000, mistakeRate: 0 },
    },
  },
};
```

Resolution order:
1. Explicit input values (`inputs.mctsIterations`)
2. Game-specific difficulty preset (`game.ai.difficulty[level]`)
3. Global difficulty preset (`DIFFICULTY_PRESETS[level]`)

### Settings UI Schema

```json
{
  "inputs": {
    "botDifficulty": {
      "type": "select",
      "label": "Bot Difficulty",
      "options": [
        { "value": "easy", "label": "Easy" },
        { "value": "medium", "label": "Medium" },
        { "value": "hard", "label": "Hard" }
      ],
      "default": "medium"
    }
  }
}
```

For advanced users, expose custom settings conditionally:

```json
{
  "inputs": {
    "botDifficulty": {
      "type": "select",
      "options": ["easy", "medium", "hard", "custom"],
      "default": "medium"
    },
    "mctsIterations": {
      "type": "number",
      "label": "Search Depth",
      "min": 100,
      "max": 10000,
      "default": 1000,
      "showIf": { "botDifficulty": "custom" }
    },
    "botMistakeRate": {
      "type": "slider",
      "label": "Mistake Rate",
      "min": 0,
      "max": 0.5,
      "step": 0.05,
      "default": 0,
      "showIf": { "botDifficulty": "custom" }
    }
  }
}
```

### Difficulty in Board Props

The current difficulty is exposed to the board for UI purposes:

```tsx
export function app({ botState, botDifficulty }: BoardPropsWithBots) {
  return (
    <div>
      <div className="text-sm text-slate-500">
        Playing against {botDifficulty} bot
      </div>
      
      {/* Optionally show different thinking animations by difficulty */}
      {botState.isThinking && (
        <ThinkingIndicator 
          intensity={botDifficulty === 'hard' ? 'high' : 'low'} 
        />
      )}
    </div>
  );
}
```

---

## Migration Guide

### Before (Component-Based Bots)

```tsx
const BOT_DELAY_MS = 500;

export const game = {
  setup: () => ({ cells: [...], botCount: 1 }),
  // ...
};

export function app({ G, moves }) {
  useEffect(() => {
    if (G.current !== 'bot') return;
    const timer = setTimeout(() => {
      const move = calculateBotMove(G);
      moves.makeMove(move);
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G]);
  
  return <Board />;
}
```

### After (BotManager)

```tsx
export const game = {
  setup: () => ({ cells: [...] }),  // No botCount in state
  ai: {
    enumerate: (G, ctx) => getLegalMoves(G),
  },
};

export function app({ G, moves, botState }) {
  // No useEffect needed - BotManager handles it
  
  return (
    <div>
      {botState.isThinking && <ThinkingIndicator />}
      <Board disabled={botState.isThinking} />
    </div>
  );
}
```

---

## Open Questions

1. **Server-side bots for authoritative games**: Should bots run on server for true multiplayer, or is host-based execution acceptable for P2P?

2. **Async enumerate**: Should `game.ai.enumerate` support async for games needing server data?

3. **Bot move preview**: Should we support showing what move a bot is "considering" before executing?

4. **Per-bot difficulty**: In games with multiple bots, should each bot have independent difficulty settings?

5. **Adaptive difficulty**: Should we support dynamic difficulty adjustment based on player performance?

---

## References

- [BoardGame.io AI Documentation](https://boardgame.io/documentation/#/tutorial?id=bots)
- [MCTS Algorithm](https://en.wikipedia.org/wiki/Monte_Carlo_tree_search)
- Current implementation: `packages/images/boardgameio/src/mount.ts`
- Example with bots: `packages/examples/src/classics/connect-4/client/main.tsx`
