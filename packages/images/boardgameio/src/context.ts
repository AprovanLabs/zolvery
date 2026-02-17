/**
 * Settings Context for boardgame.io widgets
 *
 * Provides game settings to board components via React context.
 * Uses window.React at runtime (preloaded by the compiler).
 */

// Generic settings type - games can define their own specific types
export type GameSettings = Record<string, unknown>;

// Get React from window (preloaded at runtime)
interface ReactLike {
  createContext: (defaultValue: unknown) => unknown;
  useContext: (context: unknown) => unknown;
  createElement: (
    type: unknown,
    props?: unknown,
    ...children: unknown[]
  ) => unknown;
}

const getReact = (): ReactLike => {
  const win = window as unknown as { React?: ReactLike };
  if (!win.React) {
    throw new Error(
      '[boardgameio] React not found on window. Ensure React is preloaded.',
    );
  }
  return win.React;
};

// Lazy-init context to ensure React is available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SettingsContext: any = null;

function getSettingsContext(): unknown {
  if (!SettingsContext) {
    SettingsContext = getReact().createContext({});
  }
  return SettingsContext;
}

export interface SettingsProviderProps {
  settings: GameSettings;
  children: unknown;
}

export function SettingsProvider({
  settings,
  children,
}: SettingsProviderProps): unknown {
  const React = getReact();
  const Context = getSettingsContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return React.createElement(
    (Context as any).Provider,
    { value: settings },
    children,
  );
}

/**
 * Hook to access game settings from within a board component.
 *
 * @example
 * ```tsx
 * function MyBoard({ G, ctx, moves }: BoardProps) {
 *   const settings = useSettings<{ difficulty: string }>();
 *   // ...
 * }
 * ```
 */
export function useSettings<T extends GameSettings = GameSettings>(): T {
  const React = getReact();
  const Context = getSettingsContext();
  return React.useContext(Context) as T;
}
