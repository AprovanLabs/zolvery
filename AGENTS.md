# Zolvery

Use this file to guide loading other context for implementing plans or executing tasks.

## Execution

- [plan.md](./docs/prompts/plan.md): Generate a plan for a feature set
- [implement.md](./docs/prompts/implement.md) Implement a plan

## URPC (Universal RPC)

URPC gives you the **full power of a programming language** to orchestrate CLI tools. Instead of making many sequential tool calls, write a single TypeScript script that handles complex workflows.

### Core Principle

Use `mcp_urpc_execute` when the user asks to interact with any CLI tool or external service. Don't search for existing scripts first—just write and execute code. Check if there is an existing URPC tool with `mcp_urpc_search`.

### Why URPC is Powerful

Traditional approach (many tool calls):
```
1. Call tool to list S3 buckets
2. Call tool to filter results  
3. Call tool to get details for each
4. Call tool to format output
```

URPC approach (one script):
```typescript
import { aws } from '@urpc/clients';

const buckets = await aws.s3('ls');
const filtered = buckets.filter(b => b.includes('prod'));
for (const bucket of filtered) {
  const details = await aws.s3('ls', bucket);
  console.log({ bucket, objectCount: details.length });
}
```

### Available Providers

Use `mcp_urpc_providers` to get current provider details, or `mcp_urpc_context` to see available providers AND stored scripts.

| Provider | Use Case |
|----------|----------|
| `aws` | S3, Lambda, DynamoDB, EC2, IAM, CloudFormation, any AWS service |
| `gh` | GitHub PRs, issues, repos, releases, workflows, API access |
| `git` | Git operations - status, log, diff, branch, commit, push |
| `curl` | HTTP requests to any API |
| `grep` | Text search in files |
| `find` | File system search |
| `ffmpeg` | Media processing |
| `datadog` | Monitoring, metrics, logs |
| `tar` | Archive operations |
| `diff` | File comparison |

### Script Reuse

Scripts created with `execute` are automatically:
- **Stored** with a flat kebab-case name (e.g., `list-s3-buckets`)
- **Searchable** via full-text search with `mcp_urpc_search`
- **Callable** in future sessions with `mcp_urpc_run`
- **Exposed as tools** for the LLM to discover

### Workflow

1. **User asks for CLI operation** → Use `mcp_urpc_execute` immediately
2. **Write TypeScript** using the appropriate provider import
3. **Scripts auto-store** and become available for `mcp_urpc_run`
4. Use `mcp_urpc_context` to see what's available in the current session
5. Use `mcp_urpc_search` only when explicitly looking for existing scripts

### Quick Examples

```typescript
// List S3 buckets
import { aws } from '@urpc/clients';
const result = await aws.s3('ls');
console.log(result);

// Create GitHub PR
import { gh } from '@urpc/clients';
const pr = await gh.pr.create({ 
  title: 'Feature X', 
  body: 'Description...',
  base: 'main' 
});
console.log(pr);

// Complex workflow: find large files and create issue
import { find } from '@urpc/clients';
import { gh } from '@urpc/clients';

const largeFiles = await find.files('.', { size: '+10M' });
if (largeFiles.length > 0) {
  await gh.issue.create({
    title: 'Large files detected',
    body: `Found ${largeFiles.length} files over 10MB:\n${largeFiles.join('\n')}`
  });
}
```
