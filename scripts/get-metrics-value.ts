/**
 * Script to query Datadog metrics by name
 *
 * Usage:
 *   ./run get-metrics-value <metric-query>
 *   ./run get-metrics-value --query "avg:system.cpu.user{*}" --from 2h --to now
 *
 * Examples:
 *   ./run get-metrics-value "avg:system.cpu.user{*}"
 *   ./run get-metrics-value "sum:aws.lambda.invocations{*}.as_count()" --from 24h
 *   ./run get-metrics-value "avg:system.mem.used{*}" --json
 */

import { datadog } from '@urpc/clients';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Parse a time string into a Unix timestamp (seconds)
 * Supports: "now", relative times like "1h", "30m", "7d", or Unix timestamps
 */
const parseTime = (value: string | number, referenceTime: number): number => {
  if (typeof value === 'number') {
    return value;
  }

  const str = value.toLowerCase().trim();

  if (str === 'now') {
    return referenceTime;
  }

  // Check if it's a Unix timestamp (all digits)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    // If it looks like milliseconds, convert to seconds
    return num > 1e11 ? Math.floor(num / 1000) : num;
  }

  // Parse relative time (e.g., "1h", "30m", "7d")
  const match = str.match(/^(\d+)(s|m|h|d|w)$/);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };
    return referenceTime - amount * multipliers[unit];
  }

  // Try parsing as ISO date
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return Math.floor(date.getTime() / 1000);
  }

  throw new Error(
    `Invalid time format: "${value}". Use "now", relative time (1h, 30m, 7d), Unix timestamp, or ISO date.`,
  );
};

const formatTimestamp = (ts: number): string => {
  return new Date(ts * 1000).toISOString();
};

interface Args {
  query: string;
  from: string;
  to: string;
  json: boolean;
  raw: boolean;
  verbose: boolean;
}

const main = async () => {
  const argv = (await yargs(hideBin(process.argv))
    .scriptName('get-metrics-value')
    .usage('$0 <query>', 'Query Datadog metrics', (yargs) => {
      return yargs.positional('query', {
        describe: 'Datadog metric query (e.g., "avg:system.cpu.user{*}")',
        type: 'string',
        demandOption: true,
      });
    })
    .option('from', {
      alias: 'f',
      describe:
        'Start time (default: 1h ago). Accepts: "now", relative (1h, 30m, 7d), Unix timestamp, or ISO date',
      type: 'string',
      default: '1h',
    })
    .option('to', {
      alias: 't',
      describe:
        'End time (default: now). Accepts: "now", relative (1h, 30m, 7d), Unix timestamp, or ISO date',
      type: 'string',
      default: 'now',
    })
    .option('json', {
      alias: 'j',
      describe: 'Output results as JSON',
      type: 'boolean',
      default: false,
    })
    .option('raw', {
      alias: 'r',
      describe: 'Output raw API response (implies --json)',
      type: 'boolean',
      default: false,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Show verbose output including min/max stats',
      type: 'boolean',
      default: false,
    })
    .example('$0 "avg:system.cpu.user{*}"', 'Query CPU usage for the last hour')
    .example(
      '$0 "sum:aws.lambda.invocations{*}.as_count()" --from 24h',
      'Query Lambda invocations for last 24 hours',
    )
    .example(
      '$0 "avg:system.mem.used{host:web-1}" --from 7d --to 1d',
      'Query memory from 7 days ago to 1 day ago',
    )
    .example(
      '$0 "avg:system.cpu.user{*}" --json',
      'Output results as JSON for piping',
    )
    .epilogue(
      'Environment variables:\n' +
        '  URPC_DATADOG_API_KEY or DD_API_KEY\n' +
        '  URPC_DATADOG_APP_KEY or DD_APP_KEY\n' +
        '  URPC_DATADOG_SITE or DD_SITE',
    )
    .strict()
    .help()
    .alias('help', 'h')
    .version(false)
    .parse()) as unknown as Args;

  const now = Math.floor(Date.now() / 1000);

  // Parse time arguments
  const fromTime = parseTime(argv.from, now);
  const toTime = parseTime(argv.to, now);

  if (fromTime >= toTime) {
    console.error('Error: --from time must be before --to time');
    process.exit(1);
  }

  if (!argv.json && !argv.raw) {
    console.log(`Querying: ${argv.query}`);
    console.log(
      `Time range: ${formatTimestamp(fromTime)} to ${formatTimestamp(toTime)}`,
    );
    console.log('');
  }

  try {
    const result = await datadog.v1.metrics.query({
      query: argv.query,
      from: fromTime,
      to: toTime,
    });

    // Raw output mode - just dump the API response
    if (argv.raw) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (result.error) {
      if (argv.json) {
        console.log(JSON.stringify({ error: result.error }, null, 2));
      } else {
        console.error('Error:', result.error);
      }
      process.exit(1);
    }

    if (!result.series || result.series.length === 0) {
      if (argv.json) {
        console.log(JSON.stringify({ series: [], message: 'No data found' }));
      } else {
        console.log('No data found for the given query.');
      }
      process.exit(0);
    }

    // JSON output mode
    if (argv.json) {
      const output = result.series.map((series) => {
        const points = series.pointlist ?? [];
        const validPoints = points.filter(
          ([, v]: [number, number | null]) => v !== null,
        );
        const values = validPoints.map(([, v]: [number, number | null]) => v);

        return {
          metric: series.metric,
          scope: series.scope,
          tags: series.tags,
          dataPoints: points.length,
          latest:
            points.length > 0
              ? {
                  timestamp: points[points.length - 1][0],
                  value: points[points.length - 1][1],
                }
              : null,
          stats:
            values.length > 0
              ? {
                  avg:
                    values.reduce((a: number, b: number) => a + b, 0) /
                    values.length,
                  min: Math.min(...(values as number[])),
                  max: Math.max(...(values as number[])),
                }
              : null,
        };
      });
      console.log(JSON.stringify(output, null, 2));
      process.exit(0);
    }

    // Human-readable output
    console.log(`Found ${result.series.length} series:\n`);

    for (const series of result.series) {
      console.log(`Metric: ${series.metric}`);
      if (series.scope) {
        console.log(`Scope: ${series.scope}`);
      }
      if (series.tags && series.tags.length > 0) {
        console.log(`Tags: ${series.tags.join(', ')}`);
      }

      const points = series.pointlist;
      if (points && points.length > 0) {
        const latestPoint = points[points.length - 1];
        const [timestamp, value] = latestPoint;
        console.log(
          `Latest value: ${value} (at ${new Date(timestamp).toISOString()})`,
        );

        const validPoints = points.filter(([, v]) => v !== null);
        if (validPoints.length > 0) {
          const values = validPoints.map(([, v]) => v ?? 0);
          const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);

          console.log(`Average: ${avg.toFixed(4)}`);
          if (argv.verbose) {
            console.log(`Min: ${min.toFixed(4)}`);
            console.log(`Max: ${max.toFixed(4)}`);
          }
          console.log(`Data points: ${validPoints.length}`);
        }
      }
      console.log('');
    }
  } catch (error) {
    if (argv.json) {
      console.log(
        JSON.stringify(
          { error: error instanceof Error ? error.message : String(error) },
          null,
          2,
        ),
      );
    } else {
      console.error('Failed to query metrics:', error);
    }
    process.exit(1);
  }
};

main();
