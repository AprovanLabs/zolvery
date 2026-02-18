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
    enumerate: (...args: unknown[]) => unknown;
  };
  // ... other boardgame.io game properties
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
        ai?: unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) => any;
    };
    BoardgameAI?: {
      RandomBot?: () => unknown;
    };
    BoardgameMultiplayer?: {
      Local?: (opts?: { bots?: Record<string, unknown> }) => unknown;
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
    numPlayers = game.maxPlayers ?? game.minPlayers ?? 2,
    defaultPlayerID = '0',
  } = options;

  return (container: HTMLElement, inputs: GameSettings = {}): (() => void) => {
    const {
      BoardgameReact,
      BoardgameAI,
      BoardgameMultiplayer,
      React: R,
      ReactDOM,
    } = window;

    if (!BoardgameReact || !R || !ReactDOM) {
      console.error(
        '[boardgameio] Missing globals: BoardgameReact, React, or ReactDOM',
      );
      container.innerHTML =
        '<div style="color: red; padding: 16px;">Missing required dependencies</div>';
      return () => {};
    }

    const botCount =
      typeof inputs['bot-count'] === 'number' ? inputs['bot-count'] : 0;
    const canUseBots = botCount > 0 && !!game.ai;
    const botFactory = canUseBots ? BoardgameAI?.RandomBot : undefined;

    if (canUseBots && !botFactory) {
      console.warn(
        '[boardgameio] Bot settings enabled, but AI module is unavailable.',
      );
    }

    const enumerate =
      typeof game.ai?.enumerate === 'function' ? game.ai.enumerate : undefined;

    if (canUseBots && !enumerate) {
      console.warn(
        '[boardgameio] Bot settings enabled, but game.ai.enumerate is missing.',
      );
    }

    const botPlayers: Record<string, unknown> = {};
    if (botFactory && enumerate) {
      let added = 0;
      for (let pid = 0; pid < numPlayers && added < botCount; pid += 1) {
        const pidStr = String(pid);
        if (pidStr === defaultPlayerID) continue;
        botPlayers[pidStr] = botFactory;
        added += 1;
      }
    }

    // Check for multiplayer configuration
    const multiplayerConfig = inputs.multiplayer as
      | MultiplayerInput
      | undefined;
    const isMultiplayer = !!multiplayerConfig?.matchID;
    const playerID = multiplayerConfig?.playerID ?? defaultPlayerID;

    // Use P2P transport for multiplayer, Local for single-player
    let multiplayer: unknown;
    if (isMultiplayer && multiplayerConfig) {
      const isHost = multiplayerConfig.isHost ?? playerID === '0';
      multiplayer = createP2PTransport({
        isHost,
      });
    } else if (BoardgameMultiplayer?.Local) {
      multiplayer = BoardgameMultiplayer.Local(
        Object.keys(botPlayers).length > 0 ? { bots: botPlayers } : undefined,
      );
    }

    // Wrap board component to inject isMultiplayer prop
    const WrappedBoard: BoardComponent = (props: Record<string, unknown>) => {
      return R.createElement(Board, { ...props, isMultiplayer });
    };

    // Create the boardgame.io Client
    const GameClient = BoardgameReact.Client({
      game,
      board: WrappedBoard,
      numPlayers,
      ...(multiplayer ? { multiplayer } : {}),
      // Bots are configured via Local transport when enabled.
    });

    // Wrapper that provides settings via context
    const GameWithSettings = () => {
      // matchID and credentials are passed as props to the rendered component
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

    return () => root.unmount();
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
