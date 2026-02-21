/**
 * Mount helper for boardgame.io widgets
 *
 * Handles mounting automatically when widgets export `game` and `app` (or default).
 * The image detects these exports and creates the mount - widgets don't need to
 * reference image internals.
 *
 * Uses window.React at runtime (preloaded by the compiler).
 */

import { SettingsProvider, useSettings, type GameSettings } from './context.js';
import { createP2PTransport } from './p2p/index.js';
import { ensurePeerJS } from './setup.js';
import {
  BotManager,
  resolveBotConfig,
  computeBotPlayerIDs,
  type BotState,
  type BotDifficulty,
  type DifficultyPreset,
} from './bot-manager.js';

// Re-export for convenience
export { SettingsProvider, useSettings, type GameSettings } from './context.js';

/** Multiplayer configuration passed via inputs */
export interface MultiplayerInput {
  matchID: string;
  playerID: string;
  credentials?: string;
  isHost?: boolean;
}

export interface GameMountOptions {
  /** Number of players for the game */
  numPlayers?: number;
  /** Default player ID */
  defaultPlayerID?: string;
}

export interface BoardgameGame {
  name?: string;
  minPlayers?: number;
  maxPlayers?: number;
  setup: (context: unknown) => unknown;
  ai?: {
    /** Enumerate legal moves for bot players */
    enumerate: (G: unknown, ctx: unknown) => Array<{ move: string; args: unknown[] }>;
    /** Optional game-specific difficulty presets */
    difficulty?: Partial<Record<BotDifficulty, Partial<DifficultyPreset>>>;
  };
}

/** Manifest structure for player count */
export interface WidgetManifest {
  players?: {
    min?: number;
    max?: number;
  };
  [key: string]: unknown;
}

// Generic component type (avoids importing React types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BoardComponent = (props: any) => unknown;

declare global {
  interface Window {
    BoardgameReact?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Client: (opts: {
        game: BoardgameGame;
        board: BoardComponent;
        numPlayers?: number;
        multiplayer?: unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) => any;
    };
    BoardgameMultiplayer?: {
      Local?: () => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React?: any;
    ReactDOM?: {
      createRoot: (el: HTMLElement) => {
        render: (el: unknown) => void;
        unmount: () => void;
      };
    };
  }
}

/**
 * Creates a mount function for a boardgame.io widget.
 *
 * @param game - The boardgame.io game definition
 * @param Board - The React board component
 * @param options - Mount options (numPlayers, defaultPlayerID)
 * @returns A mount function compatible with the patchwork runtime
 *
 * @example
 * ```tsx
 * export const game = { name: 'my-game', setup: () => ({}) };
 * export default function MyBoard({ G, ctx, moves }) { ... }
 * export const mount = createGameMount(game, MyBoard, { numPlayers: 2 });
 * ```
 */
export function createGameMount(
  game: BoardgameGame,
  Board: BoardComponent,
  options: GameMountOptions = {},
): (container: HTMLElement, inputs?: GameSettings) => () => void {
  const {
    numPlayers: defaultNumPlayers = game.maxPlayers ?? game.minPlayers ?? 2,
    defaultPlayerID = '0',
  } = options;

  return (container: HTMLElement, inputs: GameSettings = {}): (() => void) => {
    const { BoardgameReact, BoardgameMultiplayer, React: R, ReactDOM } = window;

    if (!BoardgameReact || !R || !ReactDOM) {
      console.error(
        '[boardgameio] Missing globals: BoardgameReact, React, or ReactDOM',
      );
      container.innerHTML =
        '<div style="color: red; padding: 16px;">Missing required dependencies</div>';
      return () => {};
    }

    // Player configuration
    const numPlayers =
      (inputs.numPlayers as number | undefined) ?? defaultNumPlayers;

    // Check for multiplayer configuration first (needed for bot count default)
    const multiplayerConfig = inputs.multiplayer as
      | MultiplayerInput
      | undefined;
    const isMultiplayer = !!multiplayerConfig?.matchID;

    // Bot count: explicit input, or default to numPlayers - 1 (0 for multiplayer)
    const botCountInput = inputs['bot-count'] ?? inputs.botCount;
    const botCount =
      typeof botCountInput === 'number'
        ? botCountInput
        : isMultiplayer
          ? 0
          : numPlayers - 1;
    const playerID =
      (inputs.playerID as string) ??
      multiplayerConfig?.playerID ??
      defaultPlayerID;

    // Compute which players are bots
    const botPlayerIDs = computeBotPlayerIDs(numPlayers, botCount, playerID);

    console.log('[boardgameio] Bot configuration:', {
      numPlayers,
      botCount,
      botCountInput,
      isMultiplayer,
      playerID,
      botPlayerIDs,
      hasBotEnumerate: !!game.ai?.enumerate,
      inputsBotCount: inputs['bot-count'],
      hasMultiplayerConfig: !!multiplayerConfig,
    });

    // Resolve bot configuration from difficulty presets + explicit overrides
    const botDifficulty = (inputs.botDifficulty as BotDifficulty) ?? 'medium';
    const botConfig = resolveBotConfig(inputs, game.ai?.difficulty);

    // Create bot manager (only if game has ai.enumerate and we have bots)
    const hasBots = botCount > 0 && game.ai?.enumerate;
    let botManager: BotManager | null = null;
    if (hasBots) {
      botManager = new BotManager(game, botConfig);
    }

    // Use P2P transport for multiplayer only
    // Don't use Local() for single-player/local-pass-and-play - it restricts moves
    // to the client's playerID, preventing bots and turn-taking from working
    let multiplayer: unknown;
    if (isMultiplayer && multiplayerConfig) {
      const isHost = multiplayerConfig.isHost ?? playerID === '0';
      multiplayer = createP2PTransport({
        isHost,
      });
    }

    // Wrap board component to inject bot state and additional props
    const WrappedBoard: BoardComponent = (props: Record<string, unknown>) => {
      const [botState, setBotState] = R.useState({
        isThinking: false,
        thinkingPlayer: null,
      }) as [BotState, (state: BotState) => void];

      // Subscribe to bot state changes
      R.useEffect(() => {
        if (!botManager) return;
        return botManager.subscribe(setBotState);
      }, []);

      // Trigger bot moves on state changes
      R.useEffect(() => {
        // Never run bots in multiplayer mode - all players are human
        if (isMultiplayer) {
          return;
        }

        if (!botManager || !props.G) {
          console.log('[boardgameio] Bot effect skipped:', {
            hasBotManager: !!botManager,
            hasG: !!props.G,
          });
          return;
        }

        // Detect current player from G.current (internal tracking) or ctx.currentPlayer
        // Many games use G.current (number) instead of boardgame.io's ctx.currentPlayer
        const gState = props.G as { current?: number; winner?: unknown };
        const ctxState = props.ctx as {
          currentPlayer: string;
          gameover?: unknown;
        };
        const currentPlayer =
          gState.current !== undefined
            ? String(gState.current)
            : ctxState.currentPlayer;

        // Detect gameover from G.winner (internal tracking) or ctx.gameover
        const gameover =
          gState.winner !== undefined ? gState.winner !== null : ctxState.gameover;

        const isBotTurn = botPlayerIDs.includes(currentPlayer);
        console.log('[boardgameio] Bot effect running:', {
          currentPlayer,
          botPlayerIDs,
          isBotTurn,
          gameover,
        });

        const state = {
          G: props.G,
          ctx: {
            ...ctxState,
            currentPlayer,
            gameover,
          },
        };

        botManager.maybePlayBot(state, botPlayerIDs, (type, ...args) => {
          console.log('[boardgameio] Bot making move:', { type, args });
          const moves = props.moves as Record<
            string,
            (...a: unknown[]) => void
          >;
          moves[type]?.(...args);
        });
      }, [
        props.G,
        (props.ctx as { currentPlayer?: string })?.currentPlayer,
        (props.ctx as { turn?: number })?.turn,
        (props.G as { current?: number })?.current,
      ]);

      return R.createElement(Board, {
        ...props,
        isMultiplayer,
        botState,
        botPlayerIDs,
        botCount,
        botDifficulty,
      });
    };

    // Create the boardgame.io Client
    const GameClient = BoardgameReact.Client({
      game,
      board: WrappedBoard,
      numPlayers,
      ...(multiplayer ? { multiplayer } : {}),
    });

    // Wrapper that provides settings via context
    const GameWithSettings = () => {
      const clientProps: Record<string, unknown> = { playerID };
      if (isMultiplayer && multiplayerConfig) {
        clientProps.matchID = multiplayerConfig.matchID;
        clientProps.credentials = multiplayerConfig.credentials;
        console.log('[boardgameio] Multiplayer props:', {
          matchID: multiplayerConfig.matchID,
          playerID,
          isHost: multiplayerConfig.isHost ?? playerID === '0',
        });
      }

      return R.createElement(
        SettingsProvider,
        { settings: inputs },
        R.createElement(GameClient, clientProps),
      );
    };

    const root = ReactDOM.createRoot(container);
    root.render(R.createElement(GameWithSettings));

    return () => {
      botManager?.dispose();
      root.unmount();
    };
  };
}

/**
 * Widget module structure expected by the boardgameio image.
 * Widgets should export `game` and either `app` or `default`.
 */
export interface BoardgameWidgetModule {
  game: BoardgameGame;
  app?: BoardComponent;
  default?: BoardComponent;
}

/**
 * Creates a mount function from a widget module's exports.
 * Called automatically by the runtime when it detects a boardgameio widget.
 *
 * @param module - The widget module with game and app/default exports
 * @param manifest - The widget manifest (for player count settings)
 * @returns A mount function or null if not a valid boardgameio widget
 */
export function createMountFromExports(
  module: BoardgameWidgetModule,
  manifest?: WidgetManifest,
): ((container: HTMLElement, inputs?: GameSettings) => () => void) | null {
  const { game, app, default: defaultExport } = module;

  if (!game || typeof game.setup !== 'function') {
    return null;
  }

  const Board = app || defaultExport;
  if (!Board || typeof Board !== 'function') {
    return null;
  }

  // Get numPlayers from manifest, falling back to game definition
  const numPlayers =
    manifest?.players?.max ??
    manifest?.players?.min ??
    game.maxPlayers ??
    game.minPlayers ??
    2;

  return createGameMount(game, Board, { numPlayers });
}

/**
 * Injects the mount helpers onto the window for runtime access.
 * Called during image setup.
 */
export function injectMountHelper(): void {
  const win = window as unknown as Record<string, unknown>;
  win.createGameMount = createGameMount;
  win.createMountFromExports = createMountFromExports;
  win.useSettings = useSettings;
  win.SettingsProvider = SettingsProvider;
}

/**
 * Image mount function - handles mounting widgets for the boardgameio image.
 *
 * Supports three patterns:
 * 1. BoardGame.io widgets: exports `game` and `app`/`default`
 * 2. Custom mount: exports a `mount` function
 * 3. React component: exports `default` as a React component
 *
 * @param module - The widget module exports
 * @param container - The DOM element to mount into
 * @param inputs - Props/settings to pass to the widget
 * @returns A cleanup function to unmount, or void
 */
export async function mount(
  module: Record<string, unknown>,
  container: HTMLElement,
  inputs: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { React: R, ReactDOM } = window;

  // 1. Custom mount function takes priority
  if (typeof module.mount === 'function') {
    const mountFn = module.mount as (
      el: HTMLElement,
      inp: Record<string, unknown>,
    ) => unknown;
    const result = await mountFn(container, inputs);
    if (typeof result === 'function') {
      return result as () => void;
    }
    return;
  }

  // 2. Boardgame.io widget: exports `game` and `app`/`default`
  const game = module.game as BoardgameGame | undefined;
  if (game && typeof game.setup === 'function') {
    const Board = (module.app || module.default) as BoardComponent | undefined;
    if (Board && typeof Board === 'function') {
      // Get numPlayers from inputs or game definition
      const numPlayers =
        (inputs.numPlayers as number | undefined) ??
        game.maxPlayers ??
        game.minPlayers ??
        2;

      // Load PeerJS if multiplayer is requested
      const multiplayerInput = inputs.multiplayer as
        | MultiplayerInput
        | undefined;
      if (multiplayerInput?.matchID) {
        await ensurePeerJS();
      }

      const gameMount = createGameMount(game, Board, { numPlayers });
      return gameMount(container, inputs as GameSettings);
    }
  }

  // 3. Default export React component
  if (typeof module.default === 'function' && R && ReactDOM) {
    const Component = module.default as BoardComponent;
    const root = ReactDOM.createRoot(container);
    root.render(R.createElement(Component, inputs));
    return () => root.unmount();
  }

  console.warn(
    '[boardgameio] Widget does not export a recognized entry point (mount, game+app, or default)',
  );
}
