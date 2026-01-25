#!/usr/bin/env node
/**
 * URPC MCP Server Entry Point
 *
 * Starts an MCP server that provides script execution, storage, and search capabilities.
 *
 * Usage:
 *   npx ts-node mcp/main.ts [options]
 *   node dist/mcp/main.js [options]
 *
 * Options:
 *   --port <number>         Port to listen on (default: 3000, env: PORT)
 *   --cache-dir <path>      Directory for script storage (default: .urpc, env: URPC_CACHE_DIR)
 *   --providers <list>      Comma-separated list of enabled providers (default: all)
 *   --stdio                 Use stdio transport instead of HTTP
 *
 * Examples:
 *   # Start HTTP server on port 3000
 *   npx ts-node mcp/main.ts
 *
 *   # Start with specific providers
 *   npx ts-node mcp/main.ts --providers gh,git,datadog
 *
 *   # Start as stdio server (for Claude Desktop, etc.)
 *   npx ts-node mcp/main.ts --stdio
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from '../src/core/mcp';
import * as path from 'path';

interface CliArgs {
  port: number;
  cacheDir: string;
  providers: string[];
  stdio: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    port: parseInt(process.env.PORT ?? '3000', 10),
    cacheDir: process.env.URPC_CACHE_DIR ?? path.join(process.cwd(), '.urpc'),
    providers: [],
    stdio: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--port':
        result.port = parseInt(args[++i] ?? '3000', 10);
        break;
      case '--cache-dir':
        result.cacheDir = args[++i] ?? result.cacheDir;
        break;
      case '--providers':
        result.providers = (args[++i] ?? '').split(',').filter(Boolean);
        break;
      case '--stdio':
        result.stdio = true;
        break;
      case '--help':
      case '-h':
        console.log(`
URPC MCP Server

Usage: npx ts-node mcp/main.ts [options]

Options:
  --port <number>         Port to listen on (default: 3000)
  --cache-dir <path>      Directory for script storage (default: .urpc)
  --providers <list>      Comma-separated list of enabled providers
  --stdio                 Use stdio transport instead of HTTP
  --help, -h              Show this help message

Available providers:
  gh, git, aws, ffmpeg, tar, grep, find, diff, curl, datadog
`);
        process.exit(0);
    }
  }

  return result;
}

async function startHttpServer(
  mcpServer: Awaited<ReturnType<typeof createMcpServer>>,
  port: number,
) {
  const Koa = (await import('koa')).default;
  const Router = (await import('@koa/router')).default;
  const bodyParser = (await import('koa-bodyparser')).default;

  type KoaApp = InstanceType<typeof Koa>;
  type KoaContext = Parameters<Parameters<KoaApp['use']>[0]>[0];

  const app = new Koa();
  const router = new Router();

  app.use(
    bodyParser({
      enableTypes: ['json', 'form'],
      formLimit: '10mb',
      jsonLimit: '10mb',
    }),
  );

  router.post('/mcp', async (ctx: KoaContext) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    ctx.res.on('close', () => transport.close());

    await mcpServer.connect(transport);
    await transport.handleRequest(
      ctx.req,
      ctx.res,
      (ctx.request as { body?: unknown }).body,
    );
  });

  router.get('/health', (ctx: KoaContext) => {
    ctx.body = { status: 'ok', name: 'urpc-mcp', version: '1.0.0' };
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(port, () => {
    console.log(`🚀 URPC MCP server running at http://localhost:${port}/mcp`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
  });
}

async function startStdioServer(
  mcpServer: Awaited<ReturnType<typeof createMcpServer>>,
) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('URPC MCP server running on stdio');
}

async function main() {
  const args = parseArgs();

  console.error(`Initializing URPC MCP server...`);
  console.error(`  Cache directory: ${args.cacheDir}`);
  console.error(
    `  Providers: ${
      args.providers.length > 0 ? args.providers.join(', ') : 'all'
    }`,
  );

  const mcpServer = await createMcpServer({
    name: 'urpc',
    version: '1.0.0',
    cacheDir: args.cacheDir,
    enabledProviders: args.providers.length > 0 ? args.providers : undefined,
  });

  if (args.stdio) {
    await startStdioServer(mcpServer);
  } else {
    await startHttpServer(mcpServer, args.port);
  }
}

main().catch((error) => {
  console.error('Failed to start URPC MCP server:', error);
  process.exit(1);
});
