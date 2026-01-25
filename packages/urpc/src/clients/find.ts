/**
 * Find CLI client
 * Provides typed access to find commands for file searching
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * Find name/path matching options
 */
export interface FindNameOptions {
  /** Match filename pattern (case-sensitive) */
  name?: string;
  /** Match filename pattern (case-insensitive) */
  iname?: string;
  /** Match full path pattern */
  path?: string;
  /** Match full path pattern (case-insensitive) */
  ipath?: string;
  /** Match regex against path */
  regex?: string;
  /** Match regex against path (case-insensitive) */
  iregex?: string;
}

/**
 * Find type options
 */
export interface FindTypeOptions {
  /** File type: f=file, d=directory, l=symlink, etc. */
  type?: 'f' | 'd' | 'l' | 'b' | 'c' | 'p' | 's';
  /** Exclude empty files/directories */
  empty?: boolean;
}

/**
 * Find size options
 */
export interface FindSizeOptions {
  /** File size (+n = larger, -n = smaller, n = exact) */
  size?: string;
}

/**
 * Find time options
 */
export interface FindTimeOptions {
  /** Modified time in days */
  mtime?: string;
  /** Accessed time in days */
  atime?: string;
  /** Changed time in days */
  ctime?: string;
  /** Modified time in minutes */
  mmin?: string;
  /** Accessed time in minutes */
  amin?: string;
  /** Changed time in minutes */
  cmin?: string;
  /** Newer than file */
  newer?: string;
}

/**
 * Find permission options
 */
export interface FindPermOptions {
  /** Permission mode */
  perm?: string;
  /** Owner user */
  user?: string;
  /** Owner group */
  group?: string;
  /** Files readable by current user */
  readable?: boolean;
  /** Files writable by current user */
  writable?: boolean;
  /** Files executable by current user */
  executable?: boolean;
}

/**
 * Find depth options
 */
export interface FindDepthOptions {
  /** Maximum depth */
  maxdepth?: number;
  /** Minimum depth */
  mindepth?: number;
  /** Process directory after contents */
  depth?: boolean;
}

/**
 * Find action options
 */
export interface FindActionOptions {
  /** Print pathname */
  print?: boolean;
  /** Print pathname with null terminator */
  print0?: boolean;
  /** Execute command on each file */
  exec?: string;
  /** Execute command with all files as arguments */
  execdir?: string;
  /** Delete found files */
  delete?: boolean;
  /** List in ls -l format */
  ls?: boolean;
  /** Format output */
  printf?: string;
}

/**
 * Find logical options
 */
export interface FindLogicalOptions {
  /** Follow symlinks */
  L?: boolean;
  /** Never follow symlinks */
  P?: boolean;
  /** Follow symlinks (for -exec) */
  H?: boolean;
}

/**
 * Combined find options
 */
export interface FindOptions
  extends FindNameOptions,
    FindTypeOptions,
    FindSizeOptions,
    FindTimeOptions,
    FindPermOptions,
    FindDepthOptions,
    FindActionOptions,
    FindLogicalOptions {}

/**
 * Find CLI client interface
 */
export interface FindClient extends CliClientProxy {
  /** Search for files in directory hierarchy */
  (path: string | string[], args?: FindOptions): Promise<string>;
}

/**
 * Pre-configured Find CLI client
 *
 * @example
 * // Find all JavaScript files
 * const files = await find('.', { name: '*.js', type: 'f' });
 *
 * // Find large files
 * const large = await find('/home', { size: '+100M', type: 'f' });
 *
 * // Find recently modified files
 * const recent = await find('.', { mtime: '-1', type: 'f' });
 *
 * // Find empty directories
 * const empty = await find('.', { type: 'd', empty: true });
 *
 * // Find and delete old files
 * const deleted = await find('/tmp', {
 *   type: 'f',
 *   mtime: '+30',
 *   delete: true,
 * });
 *
 * // Find with depth limit
 * const shallow = await find('.', { maxdepth: 2, type: 'f' });
 */
export const find = createCliClient({
  command: 'find',
  argOptions: {
    kebabCase: true,
    prefix: '-',
  },
}) as unknown as FindClient;

/**
 * Get a find client instance
 * @returns find client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): FindClient => find;

export default find;
