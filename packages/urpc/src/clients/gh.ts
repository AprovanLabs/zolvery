/**
 * GitHub CLI (gh) client
 * Provides typed access to GitHub CLI commands
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/** PR/Issue identifier - number, URL, or branch */
type Identifier = string | number;

/**
 * GitHub PR commands interface
 */
export interface GhPrCommands {
  /** Get the diff of a pull request: gh pr diff <number|url|branch> */
  diff: (id: Identifier, args?: { repo?: string }) => Promise<string>;
  /** View a pull request: gh pr view <number|url|branch> */
  view: (
    id?: Identifier,
    args?: { repo?: string; web?: boolean },
  ) => Promise<string>;
  /** List pull requests */
  list: (args?: {
    state?: 'open' | 'closed' | 'merged' | 'all';
    label?: string;
    limit?: number;
    repo?: string;
  }) => Promise<string>;
  /** Create a pull request */
  create: (args?: {
    title?: string;
    body?: string;
    base?: string;
    head?: string;
    draft?: boolean;
  }) => Promise<string>;
  /** Check out a pull request: gh pr checkout <number|url|branch> */
  checkout: (id: Identifier) => Promise<string>;
  /** Merge a pull request: gh pr merge <number|url|branch> */
  merge: (
    id?: Identifier,
    args?: {
      squash?: boolean;
      rebase?: boolean;
      'delete-branch'?: boolean;
    },
  ) => Promise<string>;
}

/**
 * GitHub Issue commands interface
 */
export interface GhIssueCommands {
  /** View an issue: gh issue view <number|url> */
  view: (
    id?: Identifier,
    args?: { repo?: string; web?: boolean },
  ) => Promise<string>;
  /** List issues */
  list: (args?: {
    state?: 'open' | 'closed' | 'all';
    label?: string;
    assignee?: string;
    limit?: number;
    repo?: string;
  }) => Promise<string>;
  /** Create an issue */
  create: (args?: {
    title?: string;
    body?: string;
    label?: string;
    assignee?: string;
  }) => Promise<string>;
  /** Close an issue: gh issue close <number|url> */
  close: (id: Identifier) => Promise<string>;
}

/**
 * GitHub Repo commands interface
 */
export interface GhRepoCommands {
  /** View repository info: gh repo view [repo] */
  view: (repo?: string, args?: { web?: boolean }) => Promise<string>;
  /** Clone a repository: gh repo clone <repo> */
  clone: (repo: string) => Promise<string>;
  /** Fork a repository: gh repo fork [repo] */
  fork: (repo?: string) => Promise<string>;
  /** List repositories */
  list: (args?: {
    limit?: number;
    visibility?: 'public' | 'private' | 'internal';
  }) => Promise<string>;
}

/**
 * GitHub Workflow/Actions commands interface
 */
export interface GhWorkflowCommands {
  /** List workflows */
  list: (args?: { limit?: number }) => Promise<string>;
  /** View a workflow: gh workflow view <id> */
  view: (id: string) => Promise<string>;
  /** Run a workflow: gh workflow run <workflow> */
  run: (workflow: string, args?: { ref?: string }) => Promise<string>;
}

/**
 * GitHub Run (workflow runs) commands interface
 */
export interface GhRunCommands {
  /** List workflow runs */
  list: (args?: {
    workflow?: string;
    limit?: number;
    status?: string;
  }) => Promise<string>;
  /** View a workflow run: gh run view <run-id> */
  view: (runId: string, args?: { log?: boolean }) => Promise<string>;
  /** Watch a workflow run: gh run watch <run-id> */
  watch: (runId: string) => Promise<string>;
}

/**
 * GitHub CLI client interface
 */
export interface GhClient {
  pr: GhPrCommands & CliClientProxy;
  issue: GhIssueCommands & CliClientProxy;
  repo: GhRepoCommands & CliClientProxy;
  workflow: GhWorkflowCommands & CliClientProxy;
  run: GhRunCommands & CliClientProxy;
  /** Access any gh subcommand dynamically */
  [key: string]: CliClientProxy;
}

/**
 * Pre-configured GitHub CLI client
 *
 * @example
 * // Get PR diff
 * const diff = await gh.pr.diff('123', { repo: 'owner/repo' });
 *
 * // List open issues with a label
 * const issues = await gh.issue.list({ state: 'open', label: 'bug' });
 *
 * // View repository
 * const repo = await gh.repo.view('owner/repo');
 */
export const gh = createCliClient({
  command: 'gh',
  argOptions: {
    kebabCase: true, // gh uses kebab-case flags
  },
}) as unknown as GhClient;

/**
 * Get a GitHub CLI client instance
 * @returns gh client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): GhClient => gh;

export default gh;
