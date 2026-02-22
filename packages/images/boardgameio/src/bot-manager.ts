/**
 * Bot Manager for boardgame.io widgets
 *
 * Centralizes bot execution with support for:
 * - Multiple strategies (Random, MCTS, Custom)
 * - Configurable delays with variable timing
 * - Difficulty presets with mistake rates
 * - Observable thinking state
 */

import type { BoardgameGame } from './mount.js';

// Type for boardgame.io state
export interface BoardgameState {
  G: unknown;
  ctx: {
    currentPlayer: string;
    gameover?: unknown;
    turn?: number;
    phase?: string;
  };
}

export type BotStrategy = 'random' | 'mcts' | 'custom';
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
  customBot?: () => BotInstance;
}

export interface ResolvedBotConfig {
  strategy: BotStrategy;
  delay: number;
  minDelay: number;
  mctsIterations: number;
  mistakeRate: number;
  customBot?: () => BotInstance;
}

export interface BotState {
  /** Whether a bot is currently "thinking" */
  isThinking: boolean;

  /** Which player ID is thinking (null if none) */
  thinkingPlayer: string | null;

  /** Estimated time remaining for bot move (ms, if calculable) */
  estimatedTime?: number;
}

// Interface for bot instances (RandomBot, MCTSBot)
interface BotInstance {
  play(
    state: BoardgameState,
    playerID: string,
  ): Promise<BotAction | null> | BotAction | null;
}

interface BotAction {
  action?: {
    payload: {
      type: string;
      args: unknown[];
    };
  };
}

// Move definition from game.ai.enumerate
interface EnumeratedMove {
  move: string;
  args: unknown[];
}

// Augment window type for boardgame.io AI module
declare global {
  interface Window {
    BoardgameAI?: {
      RandomBot?: new (opts: {
        game: BoardgameGame;
        enumerate: (G: unknown, ctx: unknown) => EnumeratedMove[];
      }) => BotInstance;
      MCTSBot?: new (opts: {
        game: BoardgameGame;
        enumerate: (G: unknown, ctx: unknown) => EnumeratedMove[];
        iterations?: number;
        playoutDepth?: number;
      }) => BotInstance;
    };
  }
}

/**
 * Resolves bot configuration from inputs, game-specific overrides, and defaults.
 *
 * Resolution order:
 * 1. Explicit input values (e.g., inputs.mctsIterations)
 * 2. Game-specific difficulty preset (game.ai.difficulty[level])
 * 3. Global difficulty preset (DIFFICULTY_PRESETS[level])
 */
export function resolveBotConfig(
  inputs: Record<string, unknown>,
  gameAiDifficulty?: Partial<Record<BotDifficulty, Partial<DifficultyPreset>>>,
): ResolvedBotConfig {
  const difficulty = (inputs.botDifficulty as BotDifficulty) ?? 'medium';
  const globalPreset = DIFFICULTY_PRESETS[difficulty];
  const gamePreset = gameAiDifficulty?.[difficulty] ?? {};

  // Merge: global -> game-specific -> explicit inputs
  return {
    strategy:
      (inputs.botStrategy as BotStrategy) ??
      gamePreset.strategy ??
      globalPreset.strategy,
    mctsIterations:
      (inputs.mctsIterations as number) ??
      gamePreset.mctsIterations ??
      globalPreset.mctsIterations,
    delay:
      (inputs.botDelay as number) ?? gamePreset.delay ?? globalPreset.delay,
    minDelay:
      (inputs.botMinDelay as number) ??
      gamePreset.minDelay ??
      globalPreset.minDelay,
    mistakeRate:
      (inputs.botMistakeRate as number) ??
      gamePreset.mistakeRate ??
      globalPreset.mistakeRate,
    customBot: inputs.customBot as (() => BotInstance) | undefined,
  };
}

/**
 * Computes which player IDs should be controlled by bots.
 *
 * Bots fill all slots except the human player's slot.
 */
export function computeBotPlayerIDs(
  numPlayers: number,
  botCount: number,
  humanPlayerID: string,
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

export class BotManager {
  private config: ResolvedBotConfig;
  private bot: BotInstance | null = null;
  private pendingMove: ReturnType<typeof setTimeout> | null = null;
  private stateListeners: Set<(state: BotState) => void> = new Set();
  private currentState: BotState = { isThinking: false, thinkingPlayer: null };
  private moveInProgress = false;

  constructor(
    private game: BoardgameGame,
    config: ResolvedBotConfig,
  ) {
    this.config = config;
    this.initializeBot();
  }

  private initializeBot(): void {
    const { BoardgameAI } = window;
    const enumerate = this.game.ai?.enumerate;

    if (!enumerate) {
      console.warn(
        '[BotManager] game.ai.enumerate is required for bot support',
      );
      return;
    }

    switch (this.config.strategy) {
      case 'mcts':
        if (BoardgameAI?.MCTSBot) {
          this.bot = new BoardgameAI.MCTSBot({
            game: this.game,
            enumerate: enumerate as (
              G: unknown,
              ctx: unknown,
            ) => EnumeratedMove[],
            iterations: this.config.mctsIterations,
          });
        } else {
          // Fall back to RandomBot if MCTS not available
          console.warn(
            '[BotManager] MCTSBot not available, falling back to RandomBot',
          );
          if (BoardgameAI?.RandomBot) {
            this.bot = new BoardgameAI.RandomBot({
              game: this.game,
              enumerate: enumerate as (
                G: unknown,
                ctx: unknown,
              ) => EnumeratedMove[],
            });
          }
        }
        break;

      case 'random':
        if (BoardgameAI?.RandomBot) {
          this.bot = new BoardgameAI.RandomBot({
            game: this.game,
            enumerate: enumerate as (
              G: unknown,
              ctx: unknown,
            ) => EnumeratedMove[],
          });
        }
        break;

      case 'custom':
        if (this.config.customBot) {
          this.bot = this.config.customBot();
        } else {
          console.error(
            '[BotManager] Custom strategy requires customBot factory',
          );
        }
        break;
    }

    if (!this.bot) {
      console.warn(
        '[BotManager] Could not initialize bot. AI module may not be loaded.',
      );
    }
  }

  /**
   * Select a move, potentially with mistakes for easier difficulties.
   */
  private async selectMove(
    state: BoardgameState,
    playerID: string,
  ): Promise<BotAction | null> {
    const enumerate = this.game.ai?.enumerate;
    if (!enumerate) {
      console.log('[BotManager] No enumerate function');
      return null;
    }

    const legalMoves = (
      enumerate as (G: unknown, ctx: unknown) => EnumeratedMove[]
    )(state.G, state.ctx);

    console.log('[BotManager] Legal moves:', legalMoves);

    if (legalMoves.length === 0) {
      console.log('[BotManager] No legal moves available');
      return null;
    }

    // Check if bot should make a "mistake"
    if (this.config.mistakeRate > 0 && Math.random() < this.config.mistakeRate) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      const randomMove = legalMoves[randomIndex];
      return {
        action: {
          payload: {
            type: randomMove.move,
            args: randomMove.args,
          },
        },
      };
    }

  // Use the bot's calculated best move
  if (!this.bot) {
    // Fallback to random if no bot
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const randomMove = legalMoves[randomIndex];
    return {
      action: {
        payload: {
          type: randomMove.move,
          args: randomMove.args,
        },
      },
    };
  }

  const result = await this.bot.play(state, playerID);

  // If bot returns null action but we have legal moves, fall back to random
  // This can happen when games use manual turn management (G.current instead of ctx.currentPlayer)
  // which prevents MCTS from properly simulating future game states
  if (!result?.action && legalMoves.length > 0) {
    console.log('[BotManager] Bot returned null action, falling back to random selection');
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const randomMove = legalMoves[randomIndex];
    return {
      action: {
        payload: {
          type: randomMove.move,
          args: randomMove.args,
        },
      },
    };
  }

  return result;
}

  /**
   * Check if it's a bot's turn and schedule a move if so.
   * Call this after every state update.
   */
  async maybePlayBot(
    state: BoardgameState,
    botPlayerIDs: string[],
    makeMove: (type: string, ...args: unknown[]) => void,
  ): Promise<void> {
    const { ctx } = state;

    console.log('[BotManager] maybePlayBot called:', {
      currentPlayer: ctx.currentPlayer,
      botPlayerIDs,
      moveInProgress: this.moveInProgress,
      gameover: ctx.gameover,
    });

    // Prevent concurrent move processing
    if (this.moveInProgress) {
      console.log('[BotManager] Skipping - move already in progress');
      return;
    }

    // Check if current player is a bot
    const isBotTurn = botPlayerIDs.includes(ctx.currentPlayer);
    if (!isBotTurn || ctx.gameover) {
      console.log('[BotManager] Not bot turn or gameover:', { isBotTurn, gameover: ctx.gameover });
      this.cancelPendingMove();
      this.notifyState({ isThinking: false, thinkingPlayer: null });
      return;
    }

    // Mark move in progress
    this.moveInProgress = true;

    // Notify thinking state
    this.notifyState({ isThinking: true, thinkingPlayer: ctx.currentPlayer });

    // Calculate delay (optionally variable)
    const delay =
      this.config.minDelay > 0
        ? this.config.minDelay +
          Math.random() * (this.config.delay - this.config.minDelay)
        : this.config.delay;

    try {
      // Get bot move
      console.log('[BotManager] Selecting move for player:', ctx.currentPlayer);
      const action = await this.selectMove(state, ctx.currentPlayer);
      console.log('[BotManager] Selected action:', action);
      if (!action?.action) {
        console.log('[BotManager] No action returned, skipping');
        this.notifyState({ isThinking: false, thinkingPlayer: null });
        this.moveInProgress = false;
        return;
      }

      // Schedule move after delay
      console.log('[BotManager] Scheduling move after delay:', delay);
      this.pendingMove = setTimeout(() => {
        const { type, args } = action.action!.payload;
        console.log('[BotManager] Executing move:', { type, args });
        makeMove(type, ...args);
        this.notifyState({ isThinking: false, thinkingPlayer: null });
        this.moveInProgress = false;
      }, delay);
    } catch (error) {
      console.error('[BotManager] Error computing move:', error);
      this.notifyState({ isThinking: false, thinkingPlayer: null });
      this.moveInProgress = false;
    }
  }

  /** Subscribe to bot state changes */
  subscribe(listener: (state: BotState) => void): () => void {
    this.stateListeners.add(listener);
    // Immediately notify current state
    listener(this.currentState);
    return () => this.stateListeners.delete(listener);
  }

  /** Get current bot state */
  getState(): BotState {
    return this.currentState;
  }

  private notifyState(state: BotState): void {
    this.currentState = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  private cancelPendingMove(): void {
    if (this.pendingMove) {
      clearTimeout(this.pendingMove);
      this.pendingMove = null;
    }
    this.moveInProgress = false;
  }

  dispose(): void {
    this.cancelPendingMove();
    this.stateListeners.clear();
  }
}
