/**
 * Client Factory Utilities
 *
 * Provides helpers for creating singleton client instances with lazy initialization
 */

/**
 * Creates a lazily-initialized singleton client with optional config
 *
 * @param factory - Function that creates the client instance given config
 * @param loadDefaultConfig - Optional function to load config from environment when no config provided
 * @returns A proxy that initializes the client on first access
 */
export const createClientSingleton = <TClient extends object, TConfig>(
  factory: (config: TConfig) => TClient,
  loadDefaultConfig?: () => TConfig,
): TClient => {
  let instance: TClient | null = null;

  return new Proxy({} as TClient, {
    get(_, prop: string) {
      if (!instance) {
        const config = loadDefaultConfig?.() ?? ({} as TConfig);
        instance = factory(config);
      }
      return instance[prop as keyof TClient];
    },
  });
};

/**
 * Type for a client module that exports getClient and default singleton
 */
export interface ClientModule<TClient, TConfig = undefined> {
  getClient: TConfig extends undefined
    ? () => TClient
    : (config?: TConfig) => TClient;
  default: TClient;
}
