import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';

export let telemetrySDK: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry with auto-instrumentation for Koa and other Node.js libraries
 */
export const initTelemetry = (): NodeSDK | null => {
  // Skip telemetry initialization if OTEL_EXPORTER_OTLP_ENDPOINT is not set
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!otlpEndpoint) {
    console.log(
      'OpenTelemetry: OTEL_EXPORTER_OTLP_ENDPOINT not set, skipping initialization',
    );
    return null;
  }

  console.log('OpenTelemetry: Initializing with endpoint:', otlpEndpoint);

  // Configure trace exporter with error handling
  const traceExporter = new OTLPTraceExporter({
    url: otlpEndpoint,
    headers: {},
  });

  // Configure logs exporter with error handling
  const logExporter = new OTLPLogExporter({
    url: otlpEndpoint,
    headers: {},
  });

  // Configure metrics exporter with error handling
  const metricExporter = new OTLPMetricExporter({
    url: otlpEndpoint,
    headers: {},
  });

  // Create SDK with auto-instrumentations
  telemetrySDK = new NodeSDK({
    serviceName: 'kossabos-server',
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: process.env.environment === 'dev' ? 1000 : 30000,
    }),
    logRecordProcessor: new SimpleLogRecordProcessor(logExporter),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable specific instrumentations
        '@opentelemetry/instrumentation-koa': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreOutgoingRequestHook: (req) => {
            // Ignore health check requests to reduce noise
            return req.path === '/health';
          },
        },
        '@opentelemetry/instrumentation-aws-sdk': {
          enabled: true,
        },
        // Disable instrumentations we don't need
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
      new PinoInstrumentation({
        logKeys: {
          traceId: 'traceId',
          spanId: 'spanId',
          traceFlags: 'traceFlags',
        },
      }),
    ],
  });

  try {
    telemetrySDK.start();
    console.log('OpenTelemetry: Initialized successfully');
    return telemetrySDK;
  } catch (error) {
    console.error('OpenTelemetry: Failed to initialize:', error);
    return null;
  }
};

/**
 * Gracefully shutdown telemetry
 */
export const shutdownTelemetry = async (sdk: NodeSDK | null): Promise<void> => {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('OpenTelemetry: Shutdown successfully');
    } catch (error) {
      console.error('OpenTelemetry: Failed to shutdown:', error);
    }
  }
};
