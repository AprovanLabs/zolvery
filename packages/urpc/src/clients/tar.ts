/**
 * Tar CLI client
 * Provides typed access to tar archive commands
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * Tar operation modes (mutually exclusive)
 */
export interface TarModeOptions {
  /** Create a new archive */
  create?: boolean;
  /** Extract files from archive */
  extract?: boolean;
  /** List archive contents */
  list?: boolean;
  /** Append to archive */
  append?: boolean;
  /** Update archive */
  update?: boolean;
}

/**
 * Tar compression options
 */
export interface TarCompressionOptions {
  /** Use gzip compression */
  gzip?: boolean;
  /** Use bzip2 compression */
  bzip2?: boolean;
  /** Use xz compression */
  xz?: boolean;
  /** Use lzma compression */
  lzma?: boolean;
  /** Use zstd compression */
  zstd?: boolean;
  /** Auto-detect compression */
  autoCompress?: boolean;
}

/**
 * Tar file options
 */
export interface TarFileOptions {
  /** Archive file name */
  file?: string;
  /** Change to directory before operation */
  directory?: string;
  /** Files to include/exclude */
  exclude?: string | string[];
  /** Read file list from file */
  filesFrom?: string;
  /** Strip leading path components */
  stripComponents?: number;
}

/**
 * Tar output options
 */
export interface TarOutputOptions {
  /** Verbose output */
  verbose?: boolean;
  /** Show progress */
  checkpoint?: boolean;
  /** Preserve permissions */
  preservePermissions?: boolean;
  /** Keep old files */
  keepOldFiles?: boolean;
  /** Overwrite existing files */
  overwrite?: boolean;
}

/**
 * Combined tar options
 */
export interface TarOptions
  extends TarModeOptions,
    TarCompressionOptions,
    TarFileOptions,
    TarOutputOptions {}

/**
 * Tar create command options
 */
export interface TarCreateOptions
  extends TarCompressionOptions,
    TarFileOptions,
    TarOutputOptions {
  /** Files/directories to archive */
  files?: string[];
}

/**
 * Tar extract command options
 */
export interface TarExtractOptions
  extends TarCompressionOptions,
    TarFileOptions,
    TarOutputOptions {
  /** Specific files to extract */
  files?: string[];
}

/**
 * Tar list command options
 */
export interface TarListOptions extends TarCompressionOptions, TarFileOptions {
  /** Verbose listing */
  verbose?: boolean;
}

/**
 * Tar commands interface
 */
export interface TarCommands {
  (archive: string, args?: TarOptions): Promise<string>;
}

/**
 * Tar CLI client interface
 */
export interface TarClient extends CliClientProxy {
  /** Create, extract, or list archive */
  (archive: string, args?: TarOptions): Promise<string>;

  /** Create a new archive */
  create: ((
    archive: string,
    files: string | string[],
    args?: Omit<TarCreateOptions, 'file' | 'files'>,
  ) => Promise<string>) &
    CliClientProxy;

  /** Extract files from archive */
  extract: ((
    archive: string,
    args?: Omit<TarExtractOptions, 'file'>,
  ) => Promise<string>) &
    CliClientProxy;

  /** List archive contents */
  list: ((
    archive: string,
    args?: Omit<TarListOptions, 'file'>,
  ) => Promise<string>) &
    CliClientProxy;

  /** Access any tar subcommand dynamically */
  [key: string]: CliClientProxy;
}

/**
 * Pre-configured Tar CLI client
 *
 * @example
 * // Create a gzipped archive
 * await tar('archive.tar.gz', {
 *   create: true,
 *   gzip: true,
 *   file: 'archive.tar.gz',
 *   verbose: true,
 * });
 *
 * // Extract an archive
 * await tar('archive.tar.gz', { extract: true, verbose: true });
 *
 * // List archive contents
 * await tar('archive.tar.gz', { list: true, verbose: true });
 *
 * // Create with directory
 * await tar('backup.tar.gz', {
 *   create: true,
 *   gzip: true,
 *   directory: '/home/user',
 *   verbose: true,
 * });
 */
export const tar = createCliClient({
  command: 'tar',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as TarClient;

/**
 * Get a tar client instance
 * @returns tar client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): TarClient => tar;

export default tar;
