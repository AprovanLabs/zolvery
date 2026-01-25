/**
 * HTTP Client - Proxy-based interface for REST APIs
 * Enables fluent API access to HTTP endpoints like: api.metrics.query({ from: '1h-ago' })
 */

export interface HttpClientConfig {
  /** Base URL for the API (e.g., 'https://api.datadoghq.com/api/v2') */
  baseUrl: string;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Transform request before sending */
  transformRequest?: (
    request: HttpRequest,
  ) => HttpRequest | Promise<HttpRequest>;
  /** Transform response after receiving */
  transformResponse?: <T>(response: HttpResponse<T>) => T | Promise<T>;
  /** Authentication configuration */
  auth?: HttpAuthConfig;
  /** Custom fetch implementation (useful for testing) */
  fetch?: typeof fetch;
}

export interface HttpAuthConfig {
  /** Authentication type */
  type: 'bearer' | 'basic' | 'api-key' | 'custom';
  /** Token for bearer auth */
  token?: string | (() => string | Promise<string>);
  /** Username for basic auth */
  username?: string;
  /** Password for basic auth */
  password?: string;
  /** API key configuration */
  apiKey?: {
    /** Header name for API key */
    headerName: string;
    /** API key value */
    value: string | (() => string | Promise<string>);
  };
  /** Additional API keys (for services requiring multiple keys) */
  additionalKeys?: Array<{
    headerName: string;
    value: string | (() => string | Promise<string>);
  }>;
  /** Custom auth header builder */
  custom?: () => Record<string, string> | Promise<Record<string, string>>;
}

export interface HttpRequest {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** URL (relative to baseUrl) */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Request body */
  body?: unknown;
  /** Request timeout in milliseconds */
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  /** Response status code */
  status: number;
  /** Response status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  data: T;
  /** Original request */
  request: HttpRequest;
}

export class HttpError extends Error {
  public constructor(
    message: string,
    public readonly response: HttpResponse,
    public readonly request: HttpRequest,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * HTTP request options for method calls
 */
export interface HttpRequestOptions {
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Request body (for POST, PUT, PATCH) */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Path parameters to substitute */
  params?: Record<string, string | number>;
}

/**
 * Result handler for HTTP calls
 */
type HttpCallHandler = <T = unknown>(
  options?: HttpRequestOptions,
) => Promise<T>;

/**
 * Recursive proxy type for HTTP client
 * Allows method chaining like: client.api.v2.metrics.query(options)
 */
export type HttpClientProxy = {
  /** GET request */
  get: <T = unknown>(options?: HttpRequestOptions) => Promise<T>;
  /** POST request */
  post: <T = unknown>(options?: HttpRequestOptions) => Promise<T>;
  /** PUT request */
  put: <T = unknown>(options?: HttpRequestOptions) => Promise<T>;
  /** DELETE request */
  delete: <T = unknown>(options?: HttpRequestOptions) => Promise<T>;
  /** PATCH request */
  patch: <T = unknown>(options?: HttpRequestOptions) => Promise<T>;
} & {
  [key: string]: HttpClientProxy;
};

/**
 * Resolves auth value which can be a string or a function returning a string
 */
const resolveAuthValue = async (
  value: string | (() => string | Promise<string>) | undefined,
): Promise<string | undefined> => {
  if (!value) return undefined;
  if (typeof value === 'function') return await value();
  return value;
};

/**
 * Builds authentication headers based on auth config
 */
const buildAuthHeaders = async (
  auth: HttpAuthConfig | undefined,
): Promise<Record<string, string>> => {
  if (!auth) return {};

  switch (auth.type) {
    case 'bearer': {
      const token = await resolveAuthValue(auth.token);
      return token ? { Authorization: `Bearer ${token}` } : {};
    }

    case 'basic': {
      if (auth.username && auth.password) {
        const credentials = Buffer.from(
          `${auth.username}:${auth.password}`,
        ).toString('base64');
        return { Authorization: `Basic ${credentials}` };
      }
      return {};
    }

    case 'api-key': {
      const headers: Record<string, string> = {};

      if (auth.apiKey) {
        const value = await resolveAuthValue(auth.apiKey.value);
        if (value) {
          headers[auth.apiKey.headerName] = value;
        }
      }

      if (auth.additionalKeys) {
        for (const key of auth.additionalKeys) {
          const value = await resolveAuthValue(key.value);
          if (value) {
            headers[key.headerName] = value;
          }
        }
      }

      return headers;
    }

    case 'custom': {
      return auth.custom ? await auth.custom() : {};
    }

    default:
      return {};
  }
};

/**
 * Builds URL with query parameters
 */
const buildUrl = (
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  params?: Record<string, string | number>,
): string => {
  // Substitute path parameters
  let finalPath = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      finalPath = finalPath.replace(
        `:${key}`,
        encodeURIComponent(String(value)),
      );
      finalPath = finalPath.replace(
        `{${key}}`,
        encodeURIComponent(String(value)),
      );
    }
  }

  // Ensure proper URL joining: baseUrl should end with /, path should not start with /
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = finalPath.startsWith('/')
    ? finalPath.slice(1)
    : finalPath;
  const url = new URL(normalizedPath, normalizedBase);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
};

/**
 * Converts path segments to URL path (kebab-case by default)
 */
const toKebabCase = (str: string): string => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * Creates a proxy-based HTTP client
 *
 * @example
 * const api = createHttpClient({
 *   baseUrl: 'https://api.example.com/v2',
 *   headers: { 'Content-Type': 'application/json' },
 *   auth: {
 *     type: 'bearer',
 *     token: () => process.env.API_TOKEN,
 *   },
 * });
 *
 * // GET /metrics/query?from=1h-ago
 * await api.metrics.query.get({ query: { from: '1h-ago' } });
 *
 * // POST /users with body
 * await api.users.post({ body: { name: 'John' } });
 */
export const createHttpClient = (config: HttpClientConfig): HttpClientProxy => {
  const {
    baseUrl,
    headers: defaultHeaders = {},
    timeout: defaultTimeout,
    transformRequest,
    transformResponse,
    auth,
    fetch: customFetch = globalThis.fetch,
  } = config;

  const createProxy = (path: string[] = []): HttpClientProxy => {
    const methods = [
      'get',
      'post',
      'put',
      'delete',
      'patch',
      'head',
      'options',
    ];

    const handler: ProxyHandler<HttpCallHandler> = {
      apply: async (_target, _thisArg, argsList: [HttpRequestOptions?]) => {
        // This shouldn't be called directly, use .get(), .post(), etc.
        throw new Error(
          'HTTP client paths must end with an HTTP method like .get(), .post(), etc.',
        );
      },

      get: (_target, prop: string) => {
        if (typeof prop !== 'string' || prop === 'then' || prop === 'catch') {
          return undefined;
        }

        // Check if this is an HTTP method
        if (methods.includes(prop.toLowerCase())) {
          // Return a function that makes the HTTP request
          return async <T = unknown>(
            options: HttpRequestOptions = {},
          ): Promise<T> => {
            const method = prop.toUpperCase() as HttpRequest['method'];
            const urlPath = '/' + path.map(toKebabCase).join('/');

            let request: HttpRequest = {
              method,
              url: urlPath,
              headers: { ...options.headers },
              query: options.query,
              body: options.body,
              timeout: options.timeout ?? defaultTimeout,
            };

            // Apply request transform
            if (transformRequest) {
              request = await transformRequest(request);
            }

            // Build auth headers
            const authHeaders = await buildAuthHeaders(auth);

            // Build final URL
            const finalUrl = buildUrl(
              baseUrl,
              request.url,
              request.query,
              options.params,
            );

            // Merge headers
            const finalHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              ...defaultHeaders,
              ...authHeaders,
              ...request.headers,
            };

            // Build fetch options
            const fetchOptions: RequestInit = {
              method: request.method,
              headers: finalHeaders,
            };

            // Add body for methods that support it
            if (
              request.body !== undefined &&
              ['POST', 'PUT', 'PATCH'].includes(request.method)
            ) {
              fetchOptions.body = JSON.stringify(request.body);
            }

            // Add timeout via AbortController
            let timeoutId: NodeJS.Timeout | undefined;
            if (request.timeout) {
              const controller = new AbortController();
              fetchOptions.signal = controller.signal;
              timeoutId = setTimeout(() => controller.abort(), request.timeout);
            }

            try {
              const response = await customFetch(finalUrl, fetchOptions);

              // Parse response headers
              const responseHeaders: Record<string, string> = {};
              response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
              });

              // Parse response body
              let data: unknown;
              const contentType = response.headers.get('content-type') || '';

              if (contentType.includes('application/json')) {
                data = await response.json();
              } else if (contentType.includes('text/')) {
                data = await response.text();
              } else {
                data = await response.text();
              }

              const httpResponse: HttpResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                data,
                request,
              };

              // Check for error status codes
              if (!response.ok) {
                throw new HttpError(
                  `HTTP ${response.status}: ${response.statusText}`,
                  httpResponse,
                  request,
                );
              }

              // Apply response transform
              if (transformResponse) {
                return (await transformResponse(httpResponse)) as T;
              }

              return data as T;
            } finally {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
            }
          };
        }

        // Otherwise, continue building the path
        return createProxy([...path, prop]);
      },
    };

    const callable = (() => {}) as unknown as HttpCallHandler;
    return new Proxy(callable, handler) as unknown as HttpClientProxy;
  };

  return createProxy();
};

/**
 * Creates a typed HTTP client with predefined endpoints
 */
export const createTypedHttpClient = <T extends Record<string, unknown>>(
  config: HttpClientConfig,
): T & HttpClientProxy => {
  return createHttpClient(config) as T & HttpClientProxy;
};

// Re-export types
export type { HttpClientConfig as HttpConfig };
