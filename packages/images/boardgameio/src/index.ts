/**
 * @aprovan/patchwork-image-boardgameio
 *
 * Boardgame.io image for browser widgets with React.
 *
 * Games should export:
 * - `game` - The boardgame.io game definition with ai.enumerate for bot support
 * - `app` - The React board component (or use default export)
 *
 * The image automatically handles mounting and bot management.
 * Widgets don't need to reference image internals or call createGameMount directly.
 *
 * Player count is read from the manifest's `players` field.
 * Bot count defaults to numPlayers - 1 for single-player experience.
 *
 * @example
 * ```tsx
 * // zolvery.json:
 * // { "players": { "min": 2, "max": 4 }, ... }
 *
 * export const game = {
 *   name: 'my-game',
 *   setup: () => ({ board: [] }),
 *   moves: { makeMove: ({ G }, pos) => { G.board[pos] = 1; } },
 *   ai: {
 *     enumerate: (G, ctx) => G.board.map((v, i) => v === null ? { move: 'makeMove', args: [i] } : null).filter(Boolean),
 *   },
 * };
 *
 * export function app({ G, ctx, moves, botState, botDifficulty }: BoardPropsWithBots) {
 *   return (
 *     <div>
 *       {botState.isThinking && <span>Thinking...</span>}
 *       <Board disabled={botState.isThinking} />
 *     </div>
 *   );
 * }
 * ```
 */

export { setup, cleanup, ensurePeerJS, type SetupOptions } from './setup.js';
export {
  mount,
  createGameMount,
  createMountFromExports,
  injectMountHelper,
  type GameMountOptions,
  type BoardgameGame,
  type BoardgameWidgetModule,
  type WidgetManifest,
  type MultiplayerInput,
} from './mount.js';
export {
  SettingsProvider,
  useSettings,
  type GameSettings,
  type SettingsProviderProps,
} from './context.js';
export {
  getMultiplayer,
  generateMatchID,
  type MultiplayerConfig,
} from './multiplayer.js';
export {
  P2PTransport,
  P2PHost,
  P2PDB,
  createP2PTransport,
  generateCredentials,
  generateKeyPair,
  type P2PTransportOpts,
  type TransportConfig,
} from './p2p/index.js';
export {
  BotManager,
  resolveBotConfig,
  computeBotPlayerIDs,
  DIFFICULTY_PRESETS,
  type BotConfig,
  type ResolvedBotConfig,
  type BotState,
  type BotStrategy,
  type BotDifficulty,
  type DifficultyPreset,
  type BoardgameState,
} from './bot-manager.js';
export {
  type BoardPropsWithBots,
  type BoardProps,
  type BotGameSettings,
  type Ctx,
} from './types.js';
