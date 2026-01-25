/**
 * @urpc/clients - Universal RPC Clients
 *
 * Provides proxy-based interfaces for CLI tools and remote services
 */

// Core utilities
export {
  // CLI client factory
  createCliClient,
  createTypedCliClient,
  type CliClientConfig,
  type CliClientProxy,

  // HTTP client factory
  createHttpClient,
  createTypedHttpClient,
  HttpError,
  type HttpClientConfig,
  type HttpClientProxy,
  type HttpAuthConfig,
  type HttpRequest,
  type HttpResponse,
  type HttpRequestOptions,

  // Execution
  execute,
  executeAndGetOutput,
  commandExists,
  ExecuteError,
  type ExecuteOptions,
  type ExecuteResult,

  // Argument building
  buildArgs,
  buildCommand,
  buildPositionalArgs,
  toKebabCase,
  type ArgOptions,
  type ArgValue,
} from './core';

// Types
export type { UrpcClient, UrpcConfig } from './core/types';

// Clients
export { gh } from './clients/gh';
export { git } from './clients/git';
export { aws } from './clients/aws';
export { ffmpeg, ffprobe } from './clients/ffmpeg';
export { tar } from './clients/tar';
export { grep } from './clients/grep';
export { find } from './clients/find';
export { diff, diff3 } from './clients/diff';
export { curl } from './clients/curl';
export { datadog } from './clients/datadog';

export { clients, default } from './clients';
