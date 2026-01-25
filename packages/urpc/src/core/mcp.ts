/**
 * MCP Server Implementation for URPC
 *
 * Provides an MCP server with:
 * - Script execution (TypeScript/JavaScript)
 * - Script storage and retrieval with dynamic tool exposure
 * - Full-text search over stored scripts using MiniSearch
 * - Integration with URPC providers
 *
 * Key Design Principles:
 * - Scripts are stored with flat names (e.g., "list-s3-buckets" not "aws/list-s3-buckets")
 * - Stored scripts are dynamically exposed as callable MCP tools
 * - Provider discovery is dynamic based on what's available
 * - URPC enables full programming language power for CLI tool orchestration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import MiniSearch from 'minisearch';

// ============================================================================
// Types
// ============================================================================

export interface McpServerConfig {
  /** Name of the MCP server */
  name: string;
  /** Version of the MCP server */
  version: string;
  /** Directory for storing scripts and cache (default: .urpc) */
  cacheDir?: string;
  /** List of enabled provider names from URPC clients */
  enabledProviders?: string[];
}

export interface StoredScript {
  /** Unique identifier */
  id: string;
  /** Script name - flat, kebab-case (e.g., "list-s3-buckets") */
  name: string;
  /** Script content */
  content: string;
  /** Script language */
  language: 'typescript' | 'javascript';
  /** Description for search and tool exposure */
  description?: string;
  /** Tags for categorization and search */
  tags?: string[];
  /** Which providers this script uses (auto-detected) */
  providers?: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Whether to expose this script as a callable tool */
  exposeAsTool?: boolean;
  /** Input schema for exposed tool (JSON Schema) */
  inputSchema?: Record<string, unknown>;
}

interface ScriptIndex {
  scripts: Record<string, StoredScript>;
  version: string;
}

interface SearchResult {
  script: StoredScript;
  score: number;
}

// ============================================================================
// Available Providers - Dynamically discovered
// ============================================================================

interface ProviderInfo {
  name: string;
  key: string;
  description: string;
  capabilities: string[];
  importStatement: string;
  exampleUsage: string[];
}

/**
 * Provider registry - describes what each CLI wrapper can do
 * This is used to generate dynamic context for the LLM
 */
const PROVIDER_REGISTRY: Record<string, ProviderInfo> = {
  aws: {
    name: 'AWS CLI',
    key: 'aws',
    description:
      'Full AWS CLI access - S3, Lambda, EC2, DynamoDB, IAM, CloudFormation, and all other AWS services',
    capabilities: [
      's3',
      'ec2',
      'lambda',
      'dynamodb',
      'iam',
      'cloudformation',
      'sts',
      'secretsmanager',
      'sns',
      'sqs',
    ],
    importStatement: "import { aws } from '@urpc/client';",
    exampleUsage: [
      "await aws.s3('ls') // List all S3 buckets",
      "await aws.s3('ls', 's3://bucket-name/') // List bucket contents",
      "await aws.lambda('list-functions') // List Lambda functions",
      "await aws.dynamodb('list-tables') // List DynamoDB tables",
    ],
  },
  gh: {
    name: 'GitHub CLI',
    key: 'gh',
    description:
      'GitHub CLI for PRs, issues, repos, releases, workflows, and GitHub API access',
    capabilities: [
      'pr',
      'issue',
      'repo',
      'gist',
      'release',
      'workflow',
      'api',
      'auth',
    ],
    importStatement: "import { gh } from '@urpc/client';",
    exampleUsage: [
      "await gh.pr.list({ state: 'open' }) // List open PRs",
      "await gh.issue.list({ state: 'open' }) // List open issues",
      'await gh.repo.view() // View current repo info',
      "await gh.api('/repos/{owner}/{repo}/pulls') // Direct API access",
    ],
  },
  git: {
    name: 'Git',
    key: 'git',
    description:
      'Git version control - status, log, diff, branch, commit, push, pull, and all git operations',
    capabilities: [
      'status',
      'log',
      'diff',
      'branch',
      'commit',
      'push',
      'pull',
      'fetch',
      'stash',
      'rebase',
    ],
    importStatement: "import { git } from '@urpc/client';",
    exampleUsage: [
      'await git.status() // Get current status',
      'await git.log({ n: 10 }) // Last 10 commits',
      'await git.diff() // Current changes',
      'await git.branch() // List branches',
    ],
  },
  curl: {
    name: 'cURL / HTTP',
    key: 'curl',
    description:
      'HTTP requests to any API - GET, POST, PUT, DELETE with headers, auth, and body',
    capabilities: ['get', 'post', 'put', 'delete', 'patch', 'head'],
    importStatement: "import { curl } from '@urpc/client';",
    exampleUsage: [
      "await curl.get('https://api.example.com/data')",
      "await curl.post('https://api.example.com/data', { json: { key: 'value' } })",
      "await curl.get('https://api.example.com/data', { headers: { 'Authorization': 'Bearer token' } })",
    ],
  },
  grep: {
    name: 'Grep',
    key: 'grep',
    description:
      'Text search in files - regex support, recursive search, context lines',
    capabilities: ['search', 'count', 'files', 'context'],
    importStatement: "import { grep } from '@urpc/client';",
    exampleUsage: [
      "await grep.search('pattern', { files: ['*.ts'], recursive: true })",
      "await grep.count('TODO', { files: ['src/**/*.ts'] })",
    ],
  },
  find: {
    name: 'Find',
    key: 'find',
    description:
      'File system search - find files by name, type, size, modification time',
    capabilities: ['files', 'dirs', 'exec', 'filter'],
    importStatement: "import { find } from '@urpc/client';",
    exampleUsage: [
      "await find.files('.', { name: '*.ts', type: 'f' })",
      "await find.dirs('.', { name: 'node_modules', prune: true })",
    ],
  },
  ffmpeg: {
    name: 'FFmpeg',
    key: 'ffmpeg',
    description:
      'Media processing - convert, probe, extract audio/video, transcode',
    capabilities: ['convert', 'probe', 'extract', 'transcode', 'thumbnail'],
    importStatement: "import { ffmpeg } from '@urpc/client';",
    exampleUsage: [
      "await ffmpeg.probe('video.mp4') // Get media info",
      "await ffmpeg.convert('input.mp4', 'output.webm', { codec: 'libvpx' })",
    ],
  },
  tar: {
    name: 'Tar',
    key: 'tar',
    description:
      'Archive operations - create, extract, list tar/gzip/bzip2 archives',
    capabilities: ['create', 'extract', 'list'],
    importStatement: "import { tar } from '@urpc/client';",
    exampleUsage: [
      "await tar.create('archive.tar.gz', ['dir1', 'dir2'], { gzip: true })",
      "await tar.extract('archive.tar.gz', { directory: './output' })",
    ],
  },
  diff: {
    name: 'Diff',
    key: 'diff',
    description:
      'File comparison - compare files, generate patches, apply patches',
    capabilities: ['compare', 'patch', 'merge'],
    importStatement: "import { diff } from '@urpc/client';",
    exampleUsage: [
      "await diff.compare('file1.txt', 'file2.txt')",
      "await diff.patch('file.txt', 'changes.patch')",
    ],
  },
  datadog: {
    name: 'Datadog',
    key: 'datadog',
    description: 'Datadog monitoring - query metrics, logs, events, monitors',
    capabilities: ['metrics', 'events', 'logs', 'monitors', 'dashboards'],
    importStatement: "import { datadog } from '@urpc/client';",
    exampleUsage: [
      "await datadog.v1.metrics.query({ query: 'avg:system.cpu.user{*}', from: Date.now() - 3600000, to: Date.now() })",
      "await datadog.v1.logs.list({ query: 'service:myapp', limit: 100 })",
    ],
  },
};

// ============================================================================
// Script Storage with MiniSearch
// ============================================================================

class ScriptStore {
  private cacheDir: string;
  private scriptsDir: string;
  private indexPath: string;
  private index: ScriptIndex | null = null;
  private searchIndex: MiniSearch<StoredScript> | null = null;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.scriptsDir = path.join(cacheDir, 'scripts');
    this.indexPath = path.join(cacheDir, 'index.json');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.scriptsDir, { recursive: true });
    await this.loadIndex();
    this.rebuildSearchIndex();
  }

  private async loadIndex(): Promise<void> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      this.index = JSON.parse(data);
    } catch {
      this.index = { scripts: {}, version: '2.0.0' };
      await this.saveIndex();
    }
  }

  private async saveIndex(): Promise<void> {
    if (!this.index) return;
    await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  private rebuildSearchIndex(): void {
    this.searchIndex = new MiniSearch<StoredScript>({
      fields: ['name', 'description', 'content', 'tags'],
      storeFields: ['id', 'name', 'description', 'tags', 'providers'],
      searchOptions: {
        boost: { name: 3, description: 2, tags: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
      extractField: (doc, fieldName) => {
        if (fieldName === 'tags') {
          return doc.tags?.join(' ') ?? '';
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (doc as any)[fieldName] ?? '';
      },
    });

    const scripts = Object.values(this.index?.scripts ?? {});
    if (scripts.length > 0) {
      this.searchIndex.addAll(scripts);
    }
  }

  /**
   * Normalize script name to flat kebab-case
   */
  private normalizeName(name: string): string {
    return name
      .replace(/[/\\]/g, '-') // Replace path separators
      .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace invalid chars
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^-|-$/g, '') // Trim leading/trailing dashes
      .toLowerCase();
  }

  /**
   * Auto-detect which providers a script uses
   */
  private detectProviders(content: string): string[] {
    const providers: string[] = [];
    for (const key of Object.keys(PROVIDER_REGISTRY)) {
      // Check for import statements or usage
      if (
        content.includes(key) ||
        new RegExp(`\\b${key}\\s*\\.`).test(content)
      ) {
        providers.push(key);
      }
    }
    return providers;
  }

  async store(
    script: Omit<StoredScript, 'id' | 'createdAt' | 'updatedAt' | 'providers'>,
  ): Promise<StoredScript> {
    if (!this.index) await this.loadIndex();

    const normalizedName = this.normalizeName(script.name);
    const existing = Object.values(this.index!.scripts).find(
      (s) => s.name === normalizedName,
    );
    const now = new Date().toISOString();

    const storedScript: StoredScript = {
      id: existing?.id ?? crypto.randomUUID(),
      ...script,
      name: normalizedName,
      providers: this.detectProviders(script.content),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      exposeAsTool: script.exposeAsTool ?? true, // Default to exposing as tool
    };

    // Save script file (flat structure)
    const scriptPath = path.join(this.scriptsDir, `${normalizedName}.ts`);
    await fs.writeFile(scriptPath, storedScript.content);

    // Update index
    if (existing && this.searchIndex) {
      this.searchIndex.discard(existing.id);
    }
    this.index!.scripts[storedScript.id] = storedScript;
    this.searchIndex?.add(storedScript);
    await this.saveIndex();

    return storedScript;
  }

  async get(name: string): Promise<StoredScript | null> {
    if (!this.index) await this.loadIndex();

    const normalizedName = this.normalizeName(name);
    const script = Object.values(this.index!.scripts).find(
      (s) => s.name === normalizedName,
    );
    return script ?? null;
  }

  async getById(id: string): Promise<StoredScript | null> {
    if (!this.index) await this.loadIndex();
    return this.index!.scripts[id] ?? null;
  }

  async list(): Promise<StoredScript[]> {
    if (!this.index) await this.loadIndex();
    return Object.values(this.index!.scripts);
  }

  async listExposedTools(): Promise<StoredScript[]> {
    const scripts = await this.list();
    return scripts.filter((s) => s.exposeAsTool !== false);
  }

  async delete(name: string): Promise<boolean> {
    if (!this.index) await this.loadIndex();

    const normalizedName = this.normalizeName(name);
    const script = Object.values(this.index!.scripts).find(
      (s) => s.name === normalizedName,
    );
    if (!script) return false;

    delete this.index!.scripts[script.id];
    this.searchIndex?.discard(script.id);
    await this.saveIndex();

    try {
      await fs.unlink(path.join(this.scriptsDir, `${normalizedName}.ts`));
    } catch {
      // Ignore file not found
    }

    return true;
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!this.index) await this.loadIndex();
    if (!this.searchIndex) this.rebuildSearchIndex();

    const results = this.searchIndex!.search(query).slice(0, limit);

    return results.map((result) => ({
      script: this.index!.scripts[result.id],
      score: result.score,
    }));
  }

  async updateToolExposure(name: string, expose: boolean): Promise<boolean> {
    const script = await this.get(name);
    if (!script) return false;

    script.exposeAsTool = expose;
    script.updatedAt = new Date().toISOString();
    this.index!.scripts[script.id] = script;
    await this.saveIndex();
    return true;
  }
}

// ============================================================================
// Script Executor
// ============================================================================

class ScriptExecutor {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  async execute(
    content: string,
    language: 'typescript' | 'javascript',
    args?: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
    stdout?: string;
    stderr?: string;
  }> {
    const { spawn } = await import('child_process');
    const tempDir = path.join(this.cacheDir, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const ext = language === 'typescript' ? 'ts' : 'js';
    const tempFile = path.join(tempDir, `script_${Date.now()}.${ext}`);

    // Wrap content to capture result and handle args
    const wrappedContent = `
// Injected runtime
const __args = ${JSON.stringify(args ?? {})};
const __console_logs: string[] = [];
const __console_errors: string[] = [];

const originalLog = console.log;
const originalError = console.error;
console.log = (...args: unknown[]) => {
  __console_logs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  originalLog(...args);
};
console.error = (...args: unknown[]) => {
  __console_errors.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  originalError(...args);
};

// User script
${content}

// Output collected logs
if (__console_logs.length > 0 || __console_errors.length > 0) {
  console.log('__STDOUT__:' + JSON.stringify(__console_logs));
  console.error('__STDERR__:' + JSON.stringify(__console_errors));
}
`;

    try {
      await fs.writeFile(tempFile, wrappedContent);

      return new Promise((resolve) => {
        const runner = language === 'typescript' ? 'npx' : 'node';
        const runnerArgs =
          language === 'typescript' ? ['tsx', tempFile] : [tempFile];

        const child = spawn(runner, runnerArgs, {
          cwd: this.cacheDir,
          env: { ...process.env, ...(args as Record<string, string>) },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', async (code) => {
          // Clean up temp file
          try {
            await fs.unlink(tempFile);
          } catch {
            // Ignore
          }

          if (code === 0) {
            resolve({
              success: true,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            });
          } else {
            resolve({
              success: false,
              error: stderr.trim() || `Process exited with code ${code}`,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            });
          }
        });

        child.on('error', async (err) => {
          try {
            await fs.unlink(tempFile);
          } catch {
            // Ignore
          }
          resolve({
            success: false,
            error: err.message,
          });
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          child.kill('SIGTERM');
          resolve({
            success: false,
            error: 'Script execution timed out after 30 seconds',
          });
        }, 30000);
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// Dynamic Context Generation
// ============================================================================

/**
 * Generate a dynamic context summary for the LLM based on:
 * - Available providers
 * - Stored scripts that can be reused
 * - Current session state
 */
function generateDynamicContext(
  enabledProviders: string[],
  storedScripts: StoredScript[],
): string {
  const providers = enabledProviders
    .filter((p) => p in PROVIDER_REGISTRY)
    .map((p) => PROVIDER_REGISTRY[p]);

  const sections: string[] = [];

  // Provider summary
  sections.push('## Available CLI Providers\n');
  sections.push('You can write TypeScript to orchestrate these CLI tools:\n');
  for (const provider of providers) {
    sections.push(
      `- **${provider.name}** (\`${provider.key}\`): ${provider.description}`,
    );
  }

  // Quick reference
  sections.push('\n## Quick Import Reference\n');
  sections.push('```typescript');
  for (const provider of providers.slice(0, 5)) {
    sections.push(provider.importStatement);
  }
  sections.push('```\n');

  // Stored scripts that can be reused
  if (storedScripts.length > 0) {
    sections.push('## Available Scripts (call with `run` tool)\n');
    const exposed = storedScripts.filter((s) => s.exposeAsTool !== false);
    for (const script of exposed.slice(0, 10)) {
      const providerList = script.providers?.length
        ? ` [${script.providers.join(', ')}]`
        : '';
      sections.push(
        `- \`${script.name}\`${providerList}: ${
          script.description ?? 'No description'
        }`,
      );
    }
    if (exposed.length > 10) {
      sections.push(
        `\n...and ${
          exposed.length - 10
        } more. Use \`search\` to find specific scripts.`,
      );
    }
  }

  return sections.join('\n');
}

// ============================================================================
// MCP Server Factory
// ============================================================================

export const createMcpServer = async (
  config: McpServerConfig,
): Promise<McpServer> => {
  const cacheDir = config.cacheDir ?? path.join(process.cwd(), '.urpc');
  const store = new ScriptStore(cacheDir);
  const executor = new ScriptExecutor(cacheDir);

  await store.initialize();

  const mcpServer = new McpServer({
    name: config.name,
    version: config.version,
  });

  // Determine enabled providers
  const enabledProviders =
    config.enabledProviders ?? Object.keys(PROVIDER_REGISTRY);

  // ========================================================================
  // Tool: execute
  // ========================================================================
  const executeDescription = `Execute TypeScript to interact with CLI tools. This is the PRIMARY tool for any CLI operation.

URPC gives you the full power of TypeScript to orchestrate CLI tools like AWS CLI, GitHub CLI, git, curl, and more. Instead of making many tool calls, write a single script that does everything.

**When to use:** User asks to do anything with AWS, GitHub, git, APIs, files, media, etc.

**Pattern:**
\`\`\`typescript
import { aws } from '@urpc/client';
const result = await aws.s3('ls');
console.log(result);
\`\`\`

**Available providers:** ${enabledProviders.join(', ')}`;

  mcpServer.tool(
    'execute',
    executeDescription,
    {
      name: z
        .string()
        .describe(
          'Flat kebab-case name (e.g., "list-s3-buckets", "create-github-pr")',
        ),
      content: z
        .string()
        .describe('TypeScript code. Import from "@urpc/clientprovider}".'),
      description: z
        .string()
        .optional()
        .describe(
          'What this script does (used for search and as tool description)',
        ),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      language: z
        .enum(['typescript', 'javascript'])
        .default('typescript')
        .describe('Script language'),
      store: z
        .boolean()
        .default(true)
        .describe('Store for reuse (default: true)'),
      exposeAsTool: z
        .boolean()
        .default(true)
        .describe('Expose as callable tool for future sessions'),
      args: z
        .record(z.unknown())
        .optional()
        .describe('Arguments to pass to the script'),
    },
    async ({
      name,
      content,
      language,
      description,
      tags,
      store: shouldStore,
      exposeAsTool,
      args,
    }) => {
      // Store the script if requested
      let storedScript: StoredScript | null = null;
      if (shouldStore) {
        storedScript = await store.store({
          name,
          content,
          language,
          description,
          tags,
          exposeAsTool,
        });
      }

      // Execute the script
      const result = await executor.execute(content, language, args);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                stored: shouldStore,
                scriptName: storedScript?.name ?? name,
                exposedAsTool: exposeAsTool,
                execution: result,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool: run
  // ========================================================================
  mcpServer.tool(
    'run',
    'Run a previously stored script by name. Use this to re-execute scripts created with `execute`.',
    {
      name: z.string().describe('Script name (e.g., "list-s3-buckets")'),
      args: z
        .record(z.unknown())
        .optional()
        .describe('Arguments to pass to the script'),
    },
    async ({ name, args }) => {
      const script = await store.get(name);

      if (!script) {
        // Suggest similar scripts
        const searchResults = await store.search(name, 5);
        const suggestions = searchResults.map((r) => r.script.name);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Script not found: ${name}`,
                  suggestions: suggestions.length > 0 ? suggestions : undefined,
                  hint: 'Use `search` to find scripts or `execute` to create a new one.',
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const result = await executor.execute(
        script.content,
        script.language,
        args,
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                scriptName: script.name,
                scriptId: script.id,
                providers: script.providers,
                execution: result,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool: search
  // ========================================================================
  mcpServer.tool(
    'search',
    'Full-text search over stored scripts. Use when looking for existing scripts to reuse.',
    {
      query: z.string().describe('Search query (supports fuzzy matching)'),
      limit: z.number().default(10).describe('Maximum results'),
    },
    async ({ query, limit }) => {
      const results = await store.search(query, limit);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                query,
                resultCount: results.length,
                results: results.map((r) => ({
                  name: r.script.name,
                  description: r.script.description,
                  tags: r.script.tags,
                  providers: r.script.providers,
                  score: Math.round(r.score * 100) / 100,
                  exposedAsTool: r.script.exposeAsTool,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool: list
  // ========================================================================
  mcpServer.tool('list', 'List all stored scripts', {}, async () => {
    const scripts = await store.list();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              count: scripts.length,
              scripts: scripts.map((s) => ({
                name: s.name,
                description: s.description,
                tags: s.tags,
                providers: s.providers,
                exposedAsTool: s.exposeAsTool,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  });

  // ========================================================================
  // Tool: get
  // ========================================================================
  mcpServer.tool(
    'get',
    'Get a stored script by name, including its full content',
    {
      name: z.string().describe('Script name'),
    },
    async ({ name }) => {
      const script = await store.get(name);

      if (!script) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Script not found: ${name}`,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                name: script.name,
                description: script.description,
                tags: script.tags,
                providers: script.providers,
                language: script.language,
                content: script.content,
                exposedAsTool: script.exposeAsTool,
                createdAt: script.createdAt,
                updatedAt: script.updatedAt,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool: delete
  // ========================================================================
  mcpServer.tool(
    'delete',
    'Delete a stored script by name',
    {
      name: z.string().describe('Script name to delete'),
    },
    async ({ name }) => {
      const deleted = await store.delete(name);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: deleted,
                message: deleted
                  ? `Script "${name}" deleted successfully`
                  : `Script "${name}" not found`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool: providers
  // ========================================================================
  mcpServer.tool(
    'providers',
    'Get detailed info about available CLI providers and how to use them',
    {
      provider: z
        .string()
        .optional()
        .describe('Specific provider to get details for'),
    },
    async ({ provider }) => {
      if (provider) {
        const info = PROVIDER_REGISTRY[provider];
        if (!info) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Unknown provider: ${provider}`,
                    available: enabledProviders,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  provider: info.key,
                  name: info.name,
                  description: info.description,
                  capabilities: info.capabilities,
                  import: info.importStatement,
                  examples: info.exampleUsage,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Return all providers summary
      const providers = enabledProviders
        .filter((p) => p in PROVIDER_REGISTRY)
        .map((p) => PROVIDER_REGISTRY[p]);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                count: providers.length,
                providers: providers.map((p) => ({
                  key: p.key,
                  name: p.name,
                  description: p.description,
                  capabilities: p.capabilities,
                  import: p.importStatement,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ========================================================================
  // Tool: context
  // ========================================================================
  mcpServer.tool(
    'context',
    'Get dynamic context about available providers and stored scripts for this session',
    {},
    async () => {
      const scripts = await store.list();
      const context = generateDynamicContext(enabledProviders, scripts);

      return {
        content: [
          {
            type: 'text' as const,
            text: context,
          },
        ],
      };
    },
  );

  // ========================================================================
  // Resource: Dynamic context document
  // ========================================================================
  mcpServer.resource('context', 'urpc://context', async () => {
    const scripts = await store.list();
    const context = generateDynamicContext(enabledProviders, scripts);

    return {
      contents: [
        {
          uri: 'urpc://context',
          mimeType: 'text/markdown',
          text: context,
        },
      ],
    };
  });

  // ========================================================================
  // Resource: Provider documentation
  // ========================================================================
  for (const providerKey of enabledProviders) {
    const provider = PROVIDER_REGISTRY[providerKey];
    if (!provider) continue;

    mcpServer.resource(
      `provider/${providerKey}`,
      `urpc://provider/${providerKey}`,
      async () => ({
        contents: [
          {
            uri: `urpc://provider/${providerKey}`,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                key: provider.key,
                name: provider.name,
                description: provider.description,
                capabilities: provider.capabilities,
                import: provider.importStatement,
                examples: provider.exampleUsage,
              },
              null,
              2,
            ),
          },
        ],
      }),
    );
  }

  return mcpServer;
};

// ============================================================================
// Exports
// ============================================================================

export { ScriptStore, ScriptExecutor, PROVIDER_REGISTRY };
export type { ScriptIndex, SearchResult, ProviderInfo };
