/**
 * Diff CLI client
 * Provides typed access to diff commands for comparing files
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * Diff output format options
 */
export interface DiffFormatOptions {
  /** Output unified diff format */
  unified?: boolean | number;
  /** Output context diff format */
  context?: boolean | number;
  /** Output ed script */
  ed?: boolean;
  /** Output RCS format */
  rcs?: boolean;
  /** Side-by-side output */
  sideBySide?: boolean;
  /** Output only whether files differ */
  brief?: boolean;
  /** Report when files are identical */
  reportIdenticalFiles?: boolean;
}

/**
 * Diff comparison options
 */
export interface DiffCompareOptions {
  /** Ignore case */
  ignoreCase?: boolean;
  /** Ignore all whitespace */
  ignoreAllSpace?: boolean;
  /** Ignore trailing whitespace */
  ignoreTrailingSpace?: boolean;
  /** Ignore space changes */
  ignoreSpaceChange?: boolean;
  /** Ignore blank lines */
  ignoreBlankLines?: boolean;
  /** Ignore differences due to tab expansion */
  ignoreTabExpansion?: boolean;
  /** Strip trailing carriage return */
  stripTrailingCr?: boolean;
  /** Treat all files as text */
  text?: boolean;
}

/**
 * Diff directory options
 */
export interface DiffDirectoryOptions {
  /** Compare directories recursively */
  recursive?: boolean;
  /** Start with file and compare all sequentially */
  startingFile?: string;
  /** Exclude files matching pattern */
  exclude?: string;
  /** Exclude files matching patterns in file */
  excludeFrom?: string;
  /** Report when files are the same */
  new?: boolean;
}

/**
 * Diff output modification options
 */
export interface DiffOutputOptions {
  /** Show function name in hunk header */
  showFunctionLine?: string;
  /** Show C function */
  showCFunction?: boolean;
  /** Label for file in output */
  label?: string;
  /** Set column width for side-by-side */
  width?: number;
  /** Expand tabs to spaces */
  expandTabs?: boolean;
  /** Initial tab */
  initialTab?: boolean;
  /** Use format GTYPE for group headers */
  lineFormat?: string;
  /** Paginate output through pr */
  paginate?: boolean;
  /** Colorize output */
  color?: 'auto' | 'always' | 'never';
}

/**
 * Combined diff options
 */
export interface DiffOptions
  extends DiffFormatOptions,
    DiffCompareOptions,
    DiffDirectoryOptions,
    DiffOutputOptions {}

/**
 * Diff CLI client interface
 */
export interface DiffClient extends CliClientProxy {
  /** Compare files line by line */
  (file1: string, file2?: string, args?: DiffOptions): Promise<string>;
}

/**
 * Diff3 options for three-way merge
 */
export interface Diff3Options {
  /** Output ed script */
  ed?: boolean;
  /** Show all changes, bracketing conflicts */
  merge?: boolean;
  /** Like -A but bracket conditions */
  showAll?: boolean;
  /** Label for file */
  label?: string;
  /** Output only overlapping changes */
  overlap?: boolean;
  /** Show overlap with markers */
  easy?: boolean;
  /** Output only non-overlapping changes */
  text?: boolean;
}

/**
 * Diff3 CLI client interface
 */
export interface Diff3Client extends CliClientProxy {
  /** Three-way file comparison */
  (
    myFile: string,
    oldFile: string,
    yourFile: string,
    args?: Diff3Options,
  ): Promise<string>;
}

/**
 * Pre-configured Diff CLI client
 *
 * @example
 * // Simple file comparison
 * const result = await diff('file1.txt', 'file2.txt');
 *
 * // Unified diff format
 * const patch = await diff('old.js', 'new.js', { unified: 3 });
 *
 * // Side-by-side comparison
 * const result = await diff('a.txt', 'b.txt', { sideBySide: true, width: 120 });
 *
 * // Ignore whitespace changes
 * const result = await diff('a.txt', 'b.txt', { ignoreAllSpace: true });
 *
 * // Compare directories recursively
 * const result = await diff('dir1/', 'dir2/', { recursive: true, brief: true });
 *
 * // Colorized output
 * const result = await diff('a.txt', 'b.txt', { color: 'always' });
 */
export const diff = createCliClient({
  command: 'diff',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as DiffClient;

/**
 * Pre-configured Diff3 CLI client for three-way merges
 *
 * @example
 * // Three-way merge
 * const merged = await diff3('mine.txt', 'original.txt', 'yours.txt', { merge: true });
 */
export const diff3 = createCliClient({
  command: 'diff3',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as Diff3Client;

/**
 * Get a diff client instance
 * @returns diff client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): DiffClient => diff;

export default diff;
