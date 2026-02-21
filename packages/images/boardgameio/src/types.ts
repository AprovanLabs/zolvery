/**
 * Type definitions for boardgame.io widgets with bot support.
 */

import type { BotDifficulty, BotState } from './bot-manager.js';

/**
 * BoardGame.io context object
 */
export interface Ctx {
  currentPlayer: string;
  numPlayers: number;
  turn: number;
  phase: string | null;
  gameover?: unknown;
  playOrder: string[];
  playOrderPos: number;
  activePlayers: Record<string, string> | null;
}

/**
 * Extended board props with bot-related information.
 *
 * All board components receive these props when mounted via createGameMount.
 */
export interface BoardPropsWithBots<G = unknown> {
  /** Game state */
  G: G;

  /** BoardGame.io context */
  ctx: Ctx;

  /** Available moves */
  moves: Record<string, (...args: unknown[]) => void>;

  /** BoardGame.io events (endTurn, setActivePlayers, etc) */
  events: Record<string, (...args: unknown[]) => void>;

  /** The player ID for this client */
  playerID: string;

  /** Whether it's this player's turn */
  isActive: boolean;

  /** Bot thinking state (injected by mount) */
  botState: BotState;

  /** List of player IDs controlled by bots */
  botPlayerIDs: string[];

  /** Total number of bots in the game */
  botCount: number;

  /** Current difficulty setting */
  botDifficulty: BotDifficulty;

  /** Whether this is a multiplayer game */
  isMultiplayer: boolean;
}

/**
 * Props for boards that don't use bots.
 * Maintains backward compatibility with existing games.
 */
export interface BoardProps<G = unknown> {
  G: G;
  ctx: Ctx;
  moves: Record<string, (...args: unknown[]) => void>;
  events: Record<string, (...args: unknown[]) => void>;
  playerID: string;
  isActive: boolean;
  isMultiplayer?: boolean;
  botCount?: number;
}

/**
 * Game settings that can be passed via inputs.
 */
export interface BotGameSettings {
  /** Total player count */
  numPlayers?: number;

  /** Number of bot players */
  botCount?: number;

  /** Bot difficulty preset */
  botDifficulty?: BotDifficulty;

  /** Bot strategy override */
  botStrategy?: 'random' | 'mcts' | 'custom';

  /** Delay before bot move (ms) */
  botDelay?: number;

  /** Minimum delay for variable timing (ms) */
  botMinDelay?: number;

  /** MCTS iterations (for mcts strategy) */
  mctsIterations?: number;

  /** Chance of suboptimal move (0-1) */
  botMistakeRate?: number;

  /** Player ID for this client */
  playerID?: string;
}
