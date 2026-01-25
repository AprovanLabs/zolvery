/**
 * Generate tool documentation from scripts
 *
 * Parses JSDoc comments and yargs configs to output JSON schema
 * compatible with LLM tool definitions (MCP, OpenAI functions, etc.)
 *
 * Usage: ./run docs [script-name]
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  alias?: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  usage?: string;
  parameters: ToolParameter[];
}

/**
 * Parse the first JSDoc block from file content
 */
const parseJsDoc = (
  content: string,
): { description: string; usage?: string } => {
  const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
  if (!jsdocMatch) return { description: '' };

  const raw = jsdocMatch[1];
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);

  // Find usage line
  const usageIdx = lines.findIndex((l) => l.toLowerCase().startsWith('usage:'));
  const usage =
    usageIdx >= 0 ? lines[usageIdx].replace(/^usage:\s*/i, '') : undefined;

  // Description is everything before @tags or Usage
  const descLines = lines.filter(
    (l) => !l.startsWith('@') && !l.toLowerCase().startsWith('usage:'),
  );

  return {
    description: descLines.join(' ').trim(),
    usage,
  };
};

/**
 * Parse yargs options from file content using regex
 */
const parseYargsOptions = (content: string): ToolParameter[] => {
  const params: ToolParameter[] = [];

  // Match .option('name', { ... }) patterns
  const optionRegex = /\.option\(\s*['"](\w+)['"]\s*,\s*\{([^}]+)\}/g;
  let match;

  while ((match = optionRegex.exec(content)) !== null) {
    const [, name, optionsStr] = match;

    const getField = (field: string): string | undefined => {
      const fieldMatch = optionsStr.match(
        new RegExp(`${field}:\\s*['"]?([^,'"\n]+)['"]?`),
      );
      return fieldMatch?.[1]?.trim();
    };

    const getBoolField = (field: string): boolean => {
      const fieldMatch = optionsStr.match(
        new RegExp(`${field}:\\s*(true|false)`),
      );
      return fieldMatch?.[1] === 'true';
    };

    params.push({
      name,
      type: getField('type') ?? 'string',
      description: getField('description') ?? '',
      required: getBoolField('demandOption'),
      alias: getField('alias'),
    });
  }

  return params;
};

/**
 * Find all TypeScript scripts in directory
 */
const findScripts = (dir: string, prefix = ''): string[] => {
  const scripts: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (
      stat.isDirectory() &&
      !entry.startsWith('.') &&
      entry !== 'node_modules'
    ) {
      scripts.push(...findScripts(fullPath, `${prefix}${entry}/`));
    } else if (entry.endsWith('.ts') && entry !== 'docs.ts') {
      scripts.push(`${prefix}${entry.replace('.ts', '')}`);
    }
  }

  return scripts;
};

/**
 * Generate tool definition for a script
 */
const generateToolDef = (scriptPath: string): ToolDefinition | null => {
  const fullPath = join(__dirname, `${scriptPath}.ts`);

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const jsdoc = parseJsDoc(content);
    const params = parseYargsOptions(content);

    return {
      name: scriptPath.replace(/\//g, '-'),
      description: jsdoc.description,
      usage: jsdoc.usage,
      parameters: params,
    };
  } catch {
    return null;
  }
};

/**
 * Convert to MCP tool format
 */
const toMcpTool = (tool: ToolDefinition) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: {
    type: 'object',
    properties: Object.fromEntries(
      tool.parameters.map((p) => [
        p.name,
        {
          type: p.type,
          description: p.description,
        },
      ]),
    ),
    required: tool.parameters.filter((p) => p.required).map((p) => p.name),
  },
});

// CLI
const argv = await yargs(hideBin(process.argv))
  .usage('Generate tool documentation from scripts')
  .option('format', {
    alias: 'f',
    type: 'string',
    description: 'Output format: json, mcp, markdown',
    default: 'json',
  })
  .option('script', {
    alias: 's',
    type: 'string',
    description: 'Generate docs for a specific script',
  })
  .help()
  .parse();

const scripts = argv.script ? [argv.script] : findScripts(__dirname);
const tools = scripts
  .map(generateToolDef)
  .filter((t): t is ToolDefinition => t !== null);

switch (argv.format) {
  case 'mcp':
    console.log(JSON.stringify(tools.map(toMcpTool), null, 2));
    break;

  case 'markdown':
    for (const tool of tools) {
      console.log(`## ${tool.name}\n`);
      console.log(`${tool.description}\n`);
      if (tool.usage) console.log(`**Usage:** \`${tool.usage}\`\n`);
      if (tool.parameters.length > 0) {
        console.log('**Parameters:**\n');
        for (const p of tool.parameters) {
          const req = p.required ? ' (required)' : '';
          const alias = p.alias ? ` (-${p.alias})` : '';
          console.log(`- \`--${p.name}\`${alias}${req}: ${p.description}`);
        }
        console.log('');
      }
    }
    break;

  default:
    console.log(JSON.stringify(tools, null, 2));
}
