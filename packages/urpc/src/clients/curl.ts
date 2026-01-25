/**
 * cURL CLI client
 * Provides typed access to curl commands for HTTP requests
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * cURL request options
 */
export interface CurlRequestOptions {
  /** HTTP method */
  request?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** Request data */
  data?: string;
  /** Request data from file */
  dataRaw?: string;
  /** URL-encoded data */
  dataUrlencode?: string;
  /** JSON data */
  json?: string;
  /** Form data */
  form?: string | string[];
  /** Upload file */
  uploadFile?: string;
}

/**
 * cURL header options
 */
export interface CurlHeaderOptions {
  /** Custom header */
  header?: string | string[];
  /** Include response headers in output */
  include?: boolean;
  /** Fetch headers only */
  head?: boolean;
  /** User-Agent header */
  userAgent?: string;
  /** Referer header */
  referer?: string;
  /** Cookie */
  cookie?: string;
  /** Cookie jar file */
  cookieJar?: string;
  /** Read cookies from file */
  cookieFile?: string;
}

/**
 * cURL output options
 */
export interface CurlOutputOptions {
  /** Write output to file */
  output?: string;
  /** Write to file named like remote file */
  remoteNameAll?: boolean;
  /** Remote name */
  remoteName?: boolean;
  /** Resume transfer */
  continueAt?: string | number;
  /** Silent mode */
  silent?: boolean;
  /** Show errors */
  showError?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Write timing info */
  writeOut?: string;
  /** Progress bar */
  progressBar?: boolean;
}

/**
 * cURL authentication options
 */
export interface CurlAuthOptions {
  /** User credentials (user:password) */
  user?: string;
  /** Use HTTP Basic auth */
  basic?: boolean;
  /** Use HTTP Digest auth */
  digest?: boolean;
  /** OAuth2 bearer token */
  oauth2Bearer?: string;
  /** AWS Signature v4 */
  awsSigv4?: string;
  /** Netrc file for credentials */
  netrc?: boolean;
}

/**
 * cURL SSL/TLS options
 */
export interface CurlSslOptions {
  /** Verify SSL certificate */
  insecure?: boolean;
  /** CA certificate bundle */
  cacert?: string;
  /** Client certificate */
  cert?: string;
  /** Client key */
  key?: string;
  /** Certificate type */
  certType?: 'PEM' | 'DER' | 'ENG';
}

/**
 * cURL connection options
 */
export interface CurlConnectionOptions {
  /** Maximum time for operation */
  maxTime?: number;
  /** Connection timeout */
  connectTimeout?: number;
  /** Limit transfer speed */
  limitRate?: string;
  /** Follow redirects */
  location?: boolean;
  /** Maximum redirects */
  maxRedirs?: number;
  /** Proxy server */
  proxy?: string;
  /** Resolve host to address */
  resolve?: string;
  /** Retry on failure */
  retry?: number;
  /** Maximum retry time */
  retryMaxTime?: number;
  /** Delay between retries */
  retryDelay?: number;
}

/**
 * Combined curl options
 */
export interface CurlOptions
  extends CurlRequestOptions,
    CurlHeaderOptions,
    CurlOutputOptions,
    CurlAuthOptions,
    CurlSslOptions,
    CurlConnectionOptions {}

/**
 * cURL CLI client interface
 */
export interface CurlClient extends CliClientProxy {
  /** Make HTTP request */
  (url: string, args?: CurlOptions): Promise<string>;
}

/**
 * Pre-configured cURL CLI client
 *
 * @example
 * // Simple GET request
 * const html = await curl('https://example.com');
 *
 * // POST with JSON
 * const response = await curl('https://api.example.com/data', {
 *   request: 'POST',
 *   header: 'Content-Type: application/json',
 *   data: JSON.stringify({ key: 'value' }),
 * });
 *
 * // Download file
 * await curl('https://example.com/file.zip', { output: 'file.zip' });
 *
 * // With authentication
 * const data = await curl('https://api.example.com/secure', {
 *   user: 'username:password',
 *   basic: true,
 * });
 *
 * // Follow redirects with timeout
 * const html = await curl('https://short.url/abc', {
 *   location: true,
 *   maxTime: 30,
 * });
 */
export const curl = createCliClient({
  command: 'curl',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as CurlClient;

/**
 * Get a curl client instance
 * @returns curl client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): CurlClient => curl;

export default curl;
