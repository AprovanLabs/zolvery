/**
 * Pre-built CLI and HTTP clients for common tools and services
 *
 * @example
 * // Direct singleton access (loads config from environment)
 * import { datadog } from '@urpc/clients';
 * await datadog.v1.metrics.query({ ... });
 *
 * // Factory function for custom config
 * import { getClient } from '@urpc/clients';
 * const dd = await getClient('datadog', { apiKey: '...', appKey: '...' });
 */

// Client module mapping for lazy loading
const clientModules = {
  gh: () => import('./gh'),
  git: () => import('./git'),
  aws: () => import('./aws'),
  ffmpeg: () => import('./ffmpeg'),
  ffprobe: () =>
    import('./ffmpeg').then((m) => ({
      default: m.ffprobe,
      getClient: () => m.ffprobe,
    })),
  tar: () => import('./tar'),
  grep: () => import('./grep'),
  find: () => import('./find'),
  diff: () => import('./diff'),
  diff3: () =>
    import('./diff').then((m) => ({
      default: m.diff3,
      getClient: () => m.diff3,
    })),
  curl: () => import('./curl'),
  datadog: () => import('./datadog'),
} as const;

type ClientName = keyof typeof clientModules;

// Type definitions for client configs
type ClientConfigMap = {
  datadog: import('./datadog').DatadogClientOptions;
  gh: undefined;
  git: undefined;
  aws: undefined;
  ffmpeg: undefined;
  ffprobe: undefined;
  tar: undefined;
  grep: undefined;
  find: undefined;
  diff: undefined;
  diff3: undefined;
  curl: undefined;
};

// Type definitions for client return types
type ClientTypeMap = {
  datadog: import('./datadog').DatadogClient;
  gh: import('./gh').GhClient;
  git: import('./git').GitClient;
  aws: import('./aws').AwsClient;
  ffmpeg: import('./ffmpeg').FfmpegClient;
  ffprobe: import('./ffmpeg').FfprobeClient;
  tar: import('./tar').TarClient;
  grep: import('./grep').GrepClient;
  find: import('./find').FindClient;
  diff: import('./diff').DiffClient;
  diff3: import('./diff').Diff3Client;
  curl: import('./curl').CurlClient;
};

/**
 * Get a client instance by name with optional configuration
 *
 * @param name - Client name (e.g., 'datadog', 'git', 'aws')
 * @param config - Optional configuration (required for some clients like datadog)
 * @returns Promise resolving to the client instance
 *
 * @example
 * // Get datadog client with explicit config
 * const datadog = await getClient('datadog', {
 *   apiKey: 'your-api-key',
 *   appKey: 'your-app-key',
 * });
 *
 * // Get CLI client (no config needed)
 * const git = await getClient('git');
 */
export async function getClient<T extends ClientName>(
  name: T,
  config?: ClientConfigMap[T],
): Promise<ClientTypeMap[T]> {
  if (!(name in clientModules)) {
    throw new Error(`Unknown client: ${name}`);
  }

  const mod = await clientModules[name]();
  const clientGetClient = (mod as { getClient: (config?: unknown) => unknown })
    .getClient;

  if (typeof clientGetClient === 'function') {
    return clientGetClient(config) as ClientTypeMap[T];
  }

  // Fallback to default export for clients without getClient
  return mod.default as ClientTypeMap[T];
}

// Cache for loaded clients
const loadedClients: Partial<Record<ClientName, unknown>> = {};

/**
 * Lazy-loading clients proxy
 *
 * @example
 * import { clients } from '@urpc/clients';
 *
 * // Clients are loaded on first access
 * const status = await clients.git.status();
 * const diff = await clients.gh.pr.diff('123');
 */
export const clients = new Proxy({} as Record<ClientName, unknown>, {
  get(_, prop: string) {
    if (!(prop in clientModules)) {
      return undefined;
    }

    const name = prop as ClientName;

    // Return cached client if already loaded
    if (name in loadedClients) {
      return loadedClients[name];
    }

    // Create a proxy that loads the module on first use
    const clientProxy = new Proxy(() => {}, {
      get(__, clientProp) {
        // Synchronously return a function that loads and calls
        return (...args: unknown[]) => {
          return clientModules[name]().then((mod) => {
            const client = mod.default;
            loadedClients[name] = client;
            const method = (client as Record<string, unknown>)[
              clientProp as string
            ];
            if (typeof method === 'function') {
              return method(...args);
            }
            return method;
          });
        };
      },
      apply(__, ___, args) {
        return clientModules[name]().then((mod) => {
          const client = mod.default as (...a: unknown[]) => unknown;
          loadedClients[name] = client;
          return client(...args);
        });
      },
    });

    return clientProxy;
  },
});

export default clients;
