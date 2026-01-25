/**
 * URPC Configuration Utilities
 *
 * Generic helpers for loading configuration from environment variables
 * with consistent naming conventions (URPC_* prefix)
 */

export interface EnvConfigOptions {
  /** Service name used for URPC prefix (e.g., 'datadog' -> URPC_DATADOG_*) */
  service: string;
  /** Fallback prefix to check if URPC prefix not found (e.g., 'DD' -> DD_*) */
  fallbackPrefix?: string;
}

/**
 * Load configuration values from environment variables
 *
 * Checks URPC-prefixed first, then falls back to standard names
 *
 * @example
 * const config = loadEnvConfig(
 *   { service: 'datadog', fallbackPrefix: 'DD' },
 *   ['apiKey', 'appKey', 'site']
 * );
 * // Checks: URPC_DATADOG_API_KEY, DD_API_KEY, etc.
 */
export const loadEnvConfig = <K extends string>(
  options: EnvConfigOptions,
  keys: K[],
): Record<K, string | undefined> => {
  const config = {} as Record<K, string | undefined>;
  const urpcPrefix = `URPC_${options.service.toUpperCase()}`;

  for (const key of keys) {
    // Convert camelCase to UPPER_SNAKE_CASE
    const envKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();

    // Try URPC prefix first
    let value = process.env[`${urpcPrefix}_${envKey}`];

    // Fall back to standard prefix if provided
    if (!value && options.fallbackPrefix) {
      value = process.env[`${options.fallbackPrefix}_${envKey}`];
    }

    config[key] = value;
  }

  return config;
};

/**
 * Assert that required config values are present
 *
 * @throws Error if any required keys are missing
 */
export const assertConfigRequired = <T extends Record<string, unknown>>(
  config: T,
  requiredKeys: (keyof T)[],
  serviceName: string,
): void => {
  for (const key of requiredKeys) {
    if (!config[key]) {
      const keyStr = String(key);
      const envKey = keyStr.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
      throw new Error(
        `${serviceName} ${keyStr} is required. Set via:\n` +
          `  - URPC_${serviceName.toUpperCase()}_${envKey} environment variable`,
      );
    }
  }
};
