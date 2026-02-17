/**
 * @kossabos/patchwork-image-boardgameio
 *
 * Boardgame.io image for browser widgets with React.
 *
 * Games should export:
 * - `game` - The boardgame.io game definition
 * - `app` - The React board component (or use default export)
 *
 * The image automatically handles mounting - widgets don't need to
 * reference image internals or call createGameMount directly.
 *
 * Player count is read from the manifest's `players` field.
 *
 * @example
 * ```tsx
 * // kossabos.json:
 * // { "players": { "min": 4, "max": 4 }, ... }
 *
 * export const game = { name: 'my-game', setup: () => ({}) };
 *
 * export function app({ G, ctx, moves }: BoardProps) {
 *   const settings = useSettings<{ difficulty: string }>();
 *   // ...
 * }
 * ```
 */

export { setup, cleanup, type SetupOptions } from './setup.js';
export {
  mount,
  createGameMount,
  createMountFromExports,
  injectMountHelper,
  type GameMountOptions,
  type BoardgameGame,
  type BoardgameWidgetModule,
  type WidgetManifest,
} from './mount.js';
export {
  SettingsProvider,
  useSettings,
  type GameSettings,
  type SettingsProviderProps,
} from './context.js';
