/**
 * Datadog REST API client
 * Provides typed access to Datadog API for querying metrics and logs
 *
 * @see https://docs.datadoghq.com/api/latest/
 */

import { createHttpClient, type HttpClientProxy } from '../core/http';
import { loadEnvConfig, assertConfigRequired } from '../core/config';
import { createClientSingleton } from '../core/client';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Datadog client configuration options
 */
export interface DatadogClientOptions {
  /** API key for authentication (required) */
  apiKey: string;
  /** Application key for authentication (required) */
  appKey: string;
  /** Datadog site (e.g., datadoghq.com, datadoghq.eu). Defaults to datadoghq.com */
  site?: string;
}

/**
 * Build base URL for Datadog API based on site
 */
const getBaseUrl = (site: string, version: 'v1' | 'v2' = 'v2'): string => {
  // Handle different Datadog sites
  // https://docs.datadoghq.com/getting_started/site/
  const baseHost = site.includes('.')
    ? `api.${site}`
    : `api.${site}.datadoghq.com`;

  return `https://${baseHost}/api/${version}`;
};

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Time series point
 */
export interface MetricPoint {
  /** Timestamp in seconds since epoch */
  timestamp: number;
  /** Value at timestamp */
  value: number;
}

/**
 * Metric series data
 */
export interface MetricSeries {
  /** Metric name */
  metric: string;
  /** Display name */
  displayName?: string;
  /** Tags */
  tags?: string[];
  /** Unit */
  unit?: Array<{
    family: string;
    name: string;
    plural: string;
    shortName: string;
    scaleFactor: number;
  }>;
  /** Point list */
  pointlist: Array<[number, number | null]>;
  /** Query index */
  queryIndex?: number;
  /** Scope */
  scope?: string;
  /** Aggregation type */
  aggr?: string;
  /** Expression */
  expression?: string;
}

/**
 * Metrics query response
 */
export interface MetricsQueryResponse {
  /** Status of the query */
  status: string;
  /** Response type */
  respVersion?: number;
  /** Series data */
  series: MetricSeries[];
  /** Query string */
  query: string;
  /** From timestamp */
  fromDate?: number;
  /** To timestamp */
  toDate?: number;
  /** Group by */
  groupBy?: string[];
  /** Message */
  message?: string;
  /** Error */
  error?: string;
}

/**
 * Metrics list response
 */
export interface MetricsListResponse {
  /** List of metrics */
  metrics: string[];
  /** From timestamp */
  from?: string;
}

/**
 * Metric metadata
 */
export interface MetricMetadata {
  /** Type of metric */
  type?: 'gauge' | 'rate' | 'count' | 'distribution';
  /** Description */
  description?: string;
  /** Short name */
  shortName?: string;
  /** Unit */
  unit?: string;
  /** Per unit */
  perUnit?: string;
  /** Statsd interval */
  statsdInterval?: number;
}

// ============================================================================
// Logs Types
// ============================================================================

/**
 * Log event
 */
export interface LogEvent {
  /** Unique ID */
  id: string;
  /** Attributes */
  attributes: {
    /** Timestamp */
    timestamp: string;
    /** Host */
    host?: string;
    /** Service */
    service?: string;
    /** Status */
    status?: 'info' | 'warning' | 'error' | 'critical' | 'debug';
    /** Message */
    message?: string;
    /** Tags */
    tags?: string[];
    /** Attributes */
    attributes?: Record<string, unknown>;
  };
  /** Type */
  type: 'log';
}

/**
 * Logs search response
 */
export interface LogsSearchResponse {
  /** Data */
  data: LogEvent[];
  /** Links */
  links?: {
    next?: string;
  };
  /** Meta */
  meta?: {
    page?: {
      after?: string;
    };
    status?: string;
    requestId?: string;
    elapsed?: number;
  };
}

/**
 * Logs aggregate response
 */
export interface LogsAggregateResponse {
  /** Meta */
  meta?: {
    status?: string;
    requestId?: string;
    elapsed?: number;
    page?: {
      after?: string;
    };
  };
  /** Data */
  data?: {
    /** Buckets */
    buckets: Array<{
      /** Bucket values by key */
      by?: Record<string, string>;
      /** Computed values */
      computes?: Record<string, unknown>;
    }>;
  };
}

/**
 * Log filter options
 */
export interface LogsFilterOptions {
  /** Search query */
  query: string;
  /** Time range */
  from?: string;
  /** Time range */
  to?: string;
  /** Indexes to search */
  indexes?: string[];
}

/**
 * Log sort options
 */
export interface LogsSortOptions {
  /** Sort field */
  sort?: 'timestamp' | '-timestamp';
}

/**
 * Log pagination options
 */
export interface LogsPaginationOptions {
  /** Max results per page */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
}

// ============================================================================
// Client Interface Types
// ============================================================================

/**
 * Metrics query options
 */
export interface MetricsQueryOptions {
  /** Metrics query string */
  query: string;
  /** Start of the queried time period, seconds since Unix epoch */
  from: number;
  /** End of the queried time period, seconds since Unix epoch */
  to: number;
}

/**
 * Metrics list options
 */
export interface MetricsListOptions {
  /** Filter metrics by name */
  q?: string;
}

/**
 * Logs search options
 */
export interface LogsSearchOptions {
  /** Filter for logs */
  filter: LogsFilterOptions;
  /** Sort options */
  sort?: LogsSortOptions['sort'];
  /** Page options */
  page?: LogsPaginationOptions;
}

/**
 * Logs aggregate options
 */
export interface LogsAggregateOptions {
  /** Filter for logs */
  filter: LogsFilterOptions;
  /** Compute operations */
  compute?: Array<{
    /** Aggregation type */
    aggregation:
      | 'count'
      | 'cardinality'
      | 'pc75'
      | 'pc90'
      | 'pc95'
      | 'pc98'
      | 'pc99'
      | 'sum'
      | 'min'
      | 'max'
      | 'avg';
    /** Metric path */
    metric?: string;
    /** Type */
    type?: 'total' | 'timeseries';
  }>;
  /** Group by */
  groupBy?: Array<{
    /** Facet to group by */
    facet: string;
    /** Limit */
    limit?: number;
    /** Sort */
    sort?: {
      aggregation: string;
      order?: 'asc' | 'desc';
    };
  }>;
}

/**
 * Datadog Metrics API client interface
 */
export interface DatadogMetricsClient {
  /**
   * Query timeseries points for a metric
   *
   * @example
   * const result = await datadog.metrics.query({
   *   query: 'avg:system.cpu.user{*}',
   *   from: Math.floor(Date.now() / 1000) - 3600,
   *   to: Math.floor(Date.now() / 1000),
   * });
   */
  query: (options: MetricsQueryOptions) => Promise<MetricsQueryResponse>;

  /**
   * Get list of actively reporting metrics
   *
   * @example
   * const result = await datadog.metrics.list({ q: 'system.cpu' });
   */
  list: (options?: MetricsListOptions) => Promise<MetricsListResponse>;

  /**
   * Get metadata for a specific metric
   *
   * @example
   * const metadata = await datadog.metrics.getMetadata('system.cpu.user');
   */
  getMetadata: (metricName: string) => Promise<MetricMetadata>;

  /**
   * Search for metrics by name
   *
   * @example
   * const metrics = await datadog.metrics.search('cpu');
   */
  search: (query: string) => Promise<{ results: { metrics: string[] } }>;
}

/**
 * Datadog Logs API client interface
 */
export interface DatadogLogsClient {
  /**
   * Search for logs
   *
   * @example
   * const logs = await datadog.logs.search({
   *   filter: {
   *     query: 'service:my-app status:error',
   *     from: 'now-1h',
   *     to: 'now',
   *   },
   *   sort: '-timestamp',
   *   page: { limit: 100 },
   * });
   */
  search: (options: LogsSearchOptions) => Promise<LogsSearchResponse>;

  /**
   * Aggregate logs
   *
   * @example
   * const aggregation = await datadog.logs.aggregate({
   *   filter: {
   *     query: 'service:my-app',
   *     from: 'now-1h',
   *     to: 'now',
   *   },
   *   compute: [{ aggregation: 'count' }],
   *   groupBy: [{ facet: 'status' }],
   * });
   */
  aggregate: (options: LogsAggregateOptions) => Promise<LogsAggregateResponse>;
}

/**
 * Datadog v1 API client interface
 */
export interface DatadogV1Client {
  /** Metrics API (v1) */
  metrics: DatadogMetricsClient;
  /** Raw HTTP client proxy for v1 endpoints */
  api: HttpClientProxy;
}

/**
 * Datadog v2 API client interface
 */
export interface DatadogV2Client {
  /** Logs API (v2) */
  logs: DatadogLogsClient;
  /** Raw HTTP client proxy for v2 endpoints */
  api: HttpClientProxy;
}

/**
 * Datadog client interface
 */
export interface DatadogClient {
  /** v1 API */
  v1: DatadogV1Client;
  /** v2 API */
  v2: DatadogV2Client;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Creates a Datadog API client
 *
 * @param options - Client configuration with apiKey and appKey required
 *
 * @example
 * const datadog = createDatadogClient({
 *   apiKey: 'your-api-key',
 *   appKey: 'your-app-key',
 *   site: 'datadoghq.com', // optional, defaults to datadoghq.com
 * });
 *
 * // Query metrics (v1 API)
 * const metrics = await datadog.v1.metrics.query({
 *   query: 'avg:system.cpu.user{*}',
 *   from: Math.floor(Date.now() / 1000) - 3600,
 *   to: Math.floor(Date.now() / 1000),
 * });
 *
 * // Search logs (v2 API)
 * const logs = await datadog.v2.logs.search({
 *   filter: {
 *     query: 'service:my-app status:error',
 *     from: 'now-1h',
 *     to: 'now',
 *   },
 *   page: { limit: 100 },
 * });
 */
const createDatadogClient = (options: DatadogClientOptions): DatadogClient => {
  const { apiKey, appKey, site = 'datadoghq.com' } = options;

  // Create base HTTP client for v1 API (metrics query uses v1)
  const v1HttpClient = createHttpClient({
    baseUrl: getBaseUrl(site, 'v1'),
    headers: {
      'Content-Type': 'application/json',
    },
    auth: {
      type: 'api-key',
      apiKey: {
        headerName: 'DD-API-KEY',
        value: apiKey,
      },
      additionalKeys: [
        {
          headerName: 'DD-APPLICATION-KEY',
          value: appKey,
        },
      ],
    },
    transformResponse: (response) => response.data,
  });

  // Create base HTTP client for v2 API
  const v2HttpClient = createHttpClient({
    baseUrl: getBaseUrl(site, 'v2'),
    headers: {
      'Content-Type': 'application/json',
    },
    auth: {
      type: 'api-key',
      apiKey: {
        headerName: 'DD-API-KEY',
        value: apiKey,
      },
      additionalKeys: [
        {
          headerName: 'DD-APPLICATION-KEY',
          value: appKey,
        },
      ],
    },
    transformResponse: (response) => response.data,
  });

  // Build metrics client
  const metrics: DatadogMetricsClient = {
    query: async (opts: MetricsQueryOptions): Promise<MetricsQueryResponse> => {
      return v1HttpClient.query.get({
        query: {
          query: opts.query,
          from: opts.from,
          to: opts.to,
        },
      });
    },

    list: async (
      opts: MetricsListOptions = {},
    ): Promise<MetricsListResponse> => {
      return v1HttpClient.metrics.get({
        query: {
          q: opts.q,
        },
      });
    },

    getMetadata: async (metricName: string): Promise<MetricMetadata> => {
      return v1HttpClient.metrics[metricName].get();
    },

    search: async (
      query: string,
    ): Promise<{ results: { metrics: string[] } }> => {
      return v1HttpClient.search.get({
        query: { q: `metrics:${query}` },
      });
    },
  };

  // Build logs client
  const logs: DatadogLogsClient = {
    search: async (opts: LogsSearchOptions): Promise<LogsSearchResponse> => {
      const body: Record<string, unknown> = {
        filter: {
          query: opts.filter.query,
          from: opts.filter.from,
          to: opts.filter.to,
          indexes: opts.filter.indexes,
        },
      };

      if (opts.sort) {
        body.sort = opts.sort;
      }

      if (opts.page) {
        body.page = {
          limit: opts.page.limit,
          cursor: opts.page.cursor,
        };
      }

      return v2HttpClient.logs.events.search.post({ body });
    },

    aggregate: async (
      opts: LogsAggregateOptions,
    ): Promise<LogsAggregateResponse> => {
      const body: Record<string, unknown> = {
        filter: {
          query: opts.filter.query,
          from: opts.filter.from,
          to: opts.filter.to,
          indexes: opts.filter.indexes,
        },
      };

      if (opts.compute) {
        body.compute = opts.compute;
      }

      if (opts.groupBy) {
        body.group_by = opts.groupBy;
      }

      return v2HttpClient.logs.analytics.aggregate.post({ body });
    },
  };

  return {
    v1: {
      metrics,
      api: v1HttpClient,
    },
    v2: {
      logs,
      api: v2HttpClient,
    },
  };
};

/**
 * Pre-configured Datadog client singleton
 *
 * @example
 * import { datadog } from '@urpc/clients';
 *
 * // Query CPU metrics (v1 API)
 * const cpuMetrics = await datadog.v1.metrics.query({
 *   query: 'avg:system.cpu.user{*}',
 *   from: Math.floor(Date.now() / 1000) - 3600,
 *   to: Math.floor(Date.now() / 1000),
 * });
 *
 * // Search error logs (v2 API)
 * const errorLogs = await datadog.v2.logs.search({
 *   filter: {
 *     query: 'status:error',
 *     from: 'now-1h',
 *     to: 'now',
 *   },
 * });
 */

/**
 * Load Datadog configuration from environment variables
 * Internal helper for default singleton initialization
 */
const loadDefaultConfig = (): DatadogClientOptions => {
  const config = loadEnvConfig({ service: 'datadog', fallbackPrefix: 'DD' }, [
    'apiKey',
    'appKey',
    'site',
  ]);
  assertConfigRequired(config, ['apiKey', 'appKey'], 'Datadog');
  return {
    apiKey: config.apiKey!,
    appKey: config.appKey!,
    site: config.site ?? 'datadoghq.com',
  };
};

/**
 * Get a Datadog client instance
 *
 * @param config - Optional configuration. If not provided, loads from environment variables.
 * @returns Datadog client instance
 *
 * @example
 * // Use environment variables (URPC_DATADOG_API_KEY, etc.)
 * const client = getClient();
 *
 * // Or provide explicit config
 * const client = getClient({
 *   apiKey: 'your-api-key',
 *   appKey: 'your-app-key',
 *   site: 'datadoghq.com',
 * });
 */
export const getClient = (config?: DatadogClientOptions): DatadogClient => {
  if (config) {
    return createDatadogClient(config);
  }
  return createDatadogClient(loadDefaultConfig());
};

/**
 * Pre-configured Datadog client singleton
 * Automatically loads config from environment variables on first access
 */
export const datadog = createClientSingleton(
  createDatadogClient,
  loadDefaultConfig,
);

export default datadog;
