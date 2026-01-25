/**
 * Argument builder utilities for CLI commands
 * Transforms structured arguments into CLI argument arrays
 */

export type ArgValue = string | number | boolean | undefined | null;

export interface ArgOptions {
  /** Use single dash for single-char flags (e.g., -v instead of --v) */
  shortFlags?: boolean;
  /** Use equals sign for values (e.g., --key=value instead of --key value) */
  useEquals?: boolean;
  /** Custom flag prefix (default: '--') */
  prefix?: string;
  /** Convert camelCase keys to kebab-case */
  kebabCase?: boolean;
}

/**
 * Converts a camelCase string to kebab-case
 */
export const toKebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Formats a single argument key with the appropriate prefix
 */
const formatKey = (key: string, options: ArgOptions = {}): string => {
  const prefix =
    options.prefix ?? (options.shortFlags && key.length === 1 ? '-' : '--');
  const formattedKey = options.kebabCase ? toKebabCase(key) : key;
  return `${prefix}${formattedKey}`;
};

/**
 * Builds CLI arguments from an object
 *
 * @example
 * buildArgs({ repo: 'owner/repo', number: 123 })
 * // Returns: ['--repo', 'owner/repo', '--number', '123']
 *
 * @example
 * buildArgs({ verbose: true, quiet: false })
 * // Returns: ['--verbose']
 *
 * @example
 * buildArgs({ output: 'json' }, { useEquals: true })
 * // Returns: ['--output=json']
 */
export const buildArgs = (
  args: Record<string, ArgValue>,
  options: ArgOptions = {},
): string[] => {
  const result: string[] = [];

  for (const [key, value] of Object.entries(args)) {
    // Skip undefined/null values
    if (value === undefined || value === null) {
      continue;
    }

    const formattedKey = formatKey(key, options);

    // Boolean flags
    if (typeof value === 'boolean') {
      if (value) {
        result.push(formattedKey);
      }
      continue;
    }

    // String/number values
    const stringValue = String(value);
    if (options.useEquals) {
      result.push(`${formattedKey}=${stringValue}`);
    } else {
      result.push(formattedKey, stringValue);
    }
  }

  return result;
};

/**
 * Builds positional arguments (non-flag arguments)
 */
export const buildPositionalArgs = (args: (string | number)[]): string[] =>
  args.map(String);

/**
 * Combines command parts, subcommands, positional args, and flag arguments
 *
 * @example
 * buildCommand('gh', ['pr', 'diff'], { repo: 'owner/repo' }, ['123'])
 * // Returns: ['gh', 'pr', 'diff', '123', '--repo', 'owner/repo']
 */
export const buildCommand = (
  command: string,
  subcommands: string[] = [],
  flagArgs: Record<string, ArgValue> = {},
  positionalArgs: (string | number)[] = [],
  options: ArgOptions = {},
): string[] => [
  command,
  ...subcommands,
  ...buildPositionalArgs(positionalArgs),
  ...buildArgs(flagArgs, options),
];
