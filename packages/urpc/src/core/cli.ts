/**
 * CLI Client - Proxy-based interface for CLI tools
 * Enables fluent API access to CLI commands like: gh.pr.diff({ repo: 'owner/repo' })
 */

import { execute, executeAndGetOutput, type ExecuteOptions } from './execute';
import { buildArgs, toKebabCase, type ArgOptions, type ArgValue } from './args';

export interface CliClientConfig {
  /** Base command (e.g., 'gh', 'git', 'aws') */
  command: string;
  /** Default execution options */
  defaultOptions?: ExecuteOptions;
  /** Default argument formatting options */
  argOptions?: ArgOptions;
  /** Transform the final result */
  transformResult?: (result: string) => string;
}

/**
 * Positional arguments - can be a single value or array
 */
type Positional = string | number | (string | number)[];

/**
 * Result handler that can be either a simple value return or complex handling
 */
type CliCallHandler = (
  positionalOrArgs?: Positional | Record<string, ArgValue>,
  args?: Record<string, ArgValue>,
) => Promise<string>;

/**
 * Recursive proxy type for CLI client
 * Allows chaining like: client.pr.diff.view(args)
 *
 * @example
 * // With positional and options
 * gh.pr.diff('123', { repo: 'owner/repo' })
 *
 * // With just positional
 * gh.pr.diff('123')
 *
 * // With just options
 * gh.pr.list({ state: 'open' })
 */
export type CliClientProxy = {
  (positional: Positional, args?: Record<string, ArgValue>): Promise<string>;
  (args?: Record<string, ArgValue>): Promise<string>;
} & {
  [key: string]: CliClientProxy;
};

/**
 * Creates a proxy-based CLI client
 *
 * @example
 * const gh = createCliClient({ command: 'gh' });
 *
 * // gh pr diff 123 --repo owner/repo
 * await gh.pr.diff('123', { repo: 'owner/repo' });
 *
 * // gh issue list --state open --label bug
 * await gh.issue.list({ state: 'open', label: 'bug' });
 */
export const createCliClient = (config: CliClientConfig): CliClientProxy => {
  const {
    command,
    defaultOptions = {},
    argOptions = {},
    transformResult,
  } = config;

  const createProxy = (path: string[] = []): CliClientProxy => {
    const handler: ProxyHandler<CliCallHandler> = {
      apply: async (
        _target,
        _thisArg,
        argsList: [
          (Positional | Record<string, ArgValue>)?,
          Record<string, ArgValue>?,
        ],
      ) => {
        const [first, second] = argsList;

        // Parse arguments: (positional, options) or (options) or ()
        let positionalArgs: string[] = [];
        let flagArgs: Record<string, ArgValue> = {};

        if (first !== undefined) {
          if (
            typeof first === 'string' ||
            typeof first === 'number' ||
            Array.isArray(first)
          ) {
            // First arg is positional
            positionalArgs = Array.isArray(first)
              ? first.map(String)
              : [String(first)];
            flagArgs = (second ?? {}) as Record<string, ArgValue>;
          } else {
            // First arg is options object
            flagArgs = first as Record<string, ArgValue>;
          }
        }

        // Build the full command (convert path to kebab-case if enabled)
        const commandPath = argOptions.kebabCase ? path.map(toKebabCase) : path;

        const fullCommand = [
          command,
          ...commandPath,
          ...positionalArgs,
          ...buildArgs(flagArgs, argOptions),
        ];

        const result = await executeAndGetOutput(fullCommand, defaultOptions);
        return transformResult ? transformResult(result) : result;
      },

      get: (_target, prop: string) => {
        if (typeof prop === 'string' && prop !== 'then' && prop !== 'catch') {
          return createProxy([...path, prop]);
        }
        return undefined;
      },
    };

    // Create a callable function that also has properties
    const callable = (() => {}) as unknown as CliCallHandler;
    return new Proxy(callable, handler) as unknown as CliClientProxy;
  };

  return createProxy();
};

/**
 * Creates a typed CLI client with predefined subcommands
 * Useful for better TypeScript inference
 */
export const createTypedCliClient = <T extends Record<string, unknown>>(
  config: CliClientConfig,
): T & CliClientProxy => {
  return createCliClient(config) as T & CliClientProxy;
};

// Re-export types and utilities
export {
  type ExecuteOptions,
  type ExecuteResult,
  ExecuteError,
} from './execute';
export { execute, executeAndGetOutput, commandExists } from './execute';
export {
  buildArgs,
  buildCommand,
  buildPositionalArgs,
  toKebabCase,
  type ArgOptions,
  type ArgValue,
} from './args';
