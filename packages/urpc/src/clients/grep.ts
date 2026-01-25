/**
 * Grep CLI client
 * Provides typed access to grep search commands
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * Grep pattern matching options
 */
export interface GrepPatternOptions {
  /** Use extended regular expressions */
  extendedRegexp?: boolean;
  /** Use fixed strings (not regex) */
  fixedStrings?: boolean;
  /** Use Perl-compatible regex */
  perlRegexp?: boolean;
  /** Use basic regular expressions */
  basicRegexp?: boolean;
  /** Pattern to search for */
  regexp?: string;
  /** Read patterns from file */
  file?: string;
  /** Ignore case distinctions */
  ignoreCase?: boolean;
  /** Match only whole words */
  wordRegexp?: boolean;
  /** Match only whole lines */
  lineRegexp?: boolean;
}

/**
 * Grep output options
 */
export interface GrepOutputOptions {
  /** Print count of matching lines */
  count?: boolean;
  /** Print only filenames with matches */
  filesWithMatches?: boolean;
  /** Print only filenames without matches */
  filesWithoutMatch?: boolean;
  /** Print only the matching part */
  onlyMatching?: boolean;
  /** Suppress normal output (exit status only) */
  quiet?: boolean;
  /** Suppress error messages */
  noMessages?: boolean;
}

/**
 * Grep line prefix options
 */
export interface GrepPrefixOptions {
  /** Print byte offset */
  byteOffset?: boolean;
  /** Print filename with each match */
  withFilename?: boolean;
  /** Suppress filename prefix */
  noFilename?: boolean;
  /** Print null byte after filename */
  null?: boolean;
  /** Print line number */
  lineNumber?: boolean;
}

/**
 * Grep context options
 */
export interface GrepContextOptions {
  /** Print NUM lines of trailing context */
  afterContext?: number;
  /** Print NUM lines of leading context */
  beforeContext?: number;
  /** Print NUM lines of context */
  context?: number;
  /** Group separator */
  groupSeparator?: string;
  /** No separator between groups */
  noGroupSeparator?: boolean;
}

/**
 * Grep file selection options
 */
export interface GrepFileOptions {
  /** Search recursively */
  recursive?: boolean;
  /** Dereference symlinks */
  dereference?: boolean;
  /** Recurse and dereference all symlinks */
  dereferenceRecursive?: boolean;
  /** Include only matching files */
  include?: string;
  /** Exclude matching files */
  exclude?: string;
  /** Exclude directories */
  excludeDir?: string;
  /** Read file list from file */
  filesFrom?: string;
}

/**
 * Grep miscellaneous options
 */
export interface GrepMiscOptions {
  /** Invert match (select non-matching lines) */
  invertMatch?: boolean;
  /** Stop after NUM matches */
  maxCount?: number;
  /** Process binary files as text */
  text?: boolean;
  /** Skip binary files */
  binary?: boolean;
  /** Use color output */
  color?: 'auto' | 'always' | 'never';
  /** Print matches with context */
  label?: string;
  /** Line buffered output */
  lineBuffered?: boolean;
}

/**
 * Combined grep options
 */
export interface GrepOptions
  extends GrepPatternOptions,
    GrepOutputOptions,
    GrepPrefixOptions,
    GrepContextOptions,
    GrepFileOptions,
    GrepMiscOptions {}

/**
 * Grep commands interface
 */
export interface GrepCommands {
  (
    pattern: string,
    files?: string | string[],
    args?: GrepOptions,
  ): Promise<string>;
}

/**
 * Grep CLI client interface
 */
export interface GrepClient extends CliClientProxy {
  /** Search for pattern in files */
  (
    pattern: string,
    files?: string | string[],
    args?: GrepOptions,
  ): Promise<string>;
}

/**
 * Pre-configured Grep CLI client
 *
 * @example
 * // Simple search
 * const result = await grep('pattern', 'file.txt');
 *
 * // Case-insensitive search
 * const result = await grep('pattern', '*.js', { ignoreCase: true });
 *
 * // Recursive search with line numbers
 * const result = await grep('TODO', '.', {
 *   recursive: true,
 *   lineNumber: true,
 * });
 *
 * // Count matches
 * const count = await grep('error', 'log.txt', { count: true });
 *
 * // Search with context
 * const result = await grep('function', 'src/', {
 *   recursive: true,
 *   context: 3,
 * });
 */
export const grep = createCliClient({
  command: 'grep',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as GrepClient;

/**
 * Get a grep client instance
 * @returns grep client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): GrepClient => grep;

export default grep;
