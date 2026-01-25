/**
 * Git CLI client
 * Provides typed access to git commands
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/** Commit-ish identifier */
type Ref = string;

/**
 * Git status commands
 */
export interface GitStatusCommands {
  (args?: {
    short?: boolean;
    branch?: boolean;
    porcelain?: boolean;
  }): Promise<string>;
}

/**
 * Git log commands
 */
export interface GitLogCommands {
  (
    ref?: Ref,
    args?: {
      oneline?: boolean;
      graph?: boolean;
      maxCount?: number;
      format?: string;
      author?: string;
      since?: string;
      until?: string;
    },
  ): Promise<string>;
}

/**
 * Git diff commands
 */
export interface GitDiffCommands {
  (
    ref?: Ref | [Ref, Ref],
    args?: {
      staged?: boolean;
      cached?: boolean;
      nameOnly?: boolean;
      nameStatus?: boolean;
      stat?: boolean;
    },
  ): Promise<string>;
}

/**
 * Git branch commands
 */
export interface GitBranchCommands {
  (
    name?: string,
    args?: {
      list?: boolean;
      delete?: boolean;
      force?: boolean;
      move?: boolean;
      remote?: boolean;
      all?: boolean;
    },
  ): Promise<string>;
}

/**
 * Git checkout commands
 */
export interface GitCheckoutCommands {
  (ref: Ref, args?: { b?: boolean; force?: boolean }): Promise<string>;
}

/**
 * Git commit commands
 */
export interface GitCommitCommands {
  (args?: {
    message?: string;
    all?: boolean;
    amend?: boolean;
    noEdit?: boolean;
  }): Promise<string>;
}

/**
 * Git push commands
 */
export interface GitPushCommands {
  (
    remote?: string,
    args?: {
      force?: boolean;
      forceWithLease?: boolean;
      setUpstream?: boolean;
      tags?: boolean;
    },
  ): Promise<string>;
}

/**
 * Git pull commands
 */
export interface GitPullCommands {
  (remote?: string, args?: { rebase?: boolean; ff?: boolean }): Promise<string>;
}

/**
 * Git fetch commands
 */
export interface GitFetchCommands {
  (
    remote?: string,
    args?: { all?: boolean; prune?: boolean; tags?: boolean },
  ): Promise<string>;
}

/**
 * Git merge commands
 */
export interface GitMergeCommands {
  (
    ref: Ref,
    args?: { noFf?: boolean; squash?: boolean; abort?: boolean },
  ): Promise<string>;
}

/**
 * Git rebase commands
 */
export interface GitRebaseCommands {
  (
    ref?: Ref,
    args?: {
      interactive?: boolean;
      continue?: boolean;
      abort?: boolean;
      skip?: boolean;
    },
  ): Promise<string>;
}

/**
 * Git stash commands
 */
export interface GitStashCommands {
  (args?: {
    list?: boolean;
    pop?: boolean;
    drop?: boolean;
    apply?: boolean;
  }): Promise<string>;
  list: () => Promise<string>;
  pop: (args?: { index?: number }) => Promise<string>;
  apply: (args?: { index?: number }) => Promise<string>;
  drop: (args?: { index?: number }) => Promise<string>;
}

/**
 * Git remote commands
 */
export interface GitRemoteCommands {
  (args?: { verbose?: boolean }): Promise<string>;
  add: (name: string, url: string) => Promise<string>;
  remove: (name: string) => Promise<string>;
  setUrl: (name: string, url: string) => Promise<string>;
}

/**
 * Git show commands
 */
export interface GitShowCommands {
  (
    ref?: Ref,
    args?: { nameOnly?: boolean; stat?: boolean; format?: string },
  ): Promise<string>;
}

/**
 * Git reset commands
 */
export interface GitResetCommands {
  (
    ref?: Ref,
    args?: { hard?: boolean; soft?: boolean; mixed?: boolean },
  ): Promise<string>;
}

/**
 * Git add commands
 */
export interface GitAddCommands {
  (
    pathspec: string | string[],
    args?: { all?: boolean; patch?: boolean },
  ): Promise<string>;
}

/**
 * Git clone commands
 */
export interface GitCloneCommands {
  (
    repository: string,
    args?: {
      depth?: number;
      branch?: string;
      singleBranch?: boolean;
      bare?: boolean;
    },
  ): Promise<string>;
}

/**
 * Git init commands
 */
export interface GitInitCommands {
  (args?: { bare?: boolean; initialBranch?: string }): Promise<string>;
}

/**
 * Git config commands
 */
export interface GitConfigCommands {
  (
    key?: string,
    args?: {
      global?: boolean;
      local?: boolean;
      list?: boolean;
      get?: boolean;
    },
  ): Promise<string>;
}

/**
 * Git CLI client interface
 */
export interface GitClient {
  status: GitStatusCommands & CliClientProxy;
  log: GitLogCommands & CliClientProxy;
  diff: GitDiffCommands & CliClientProxy;
  branch: GitBranchCommands & CliClientProxy;
  checkout: GitCheckoutCommands & CliClientProxy;
  commit: GitCommitCommands & CliClientProxy;
  push: GitPushCommands & CliClientProxy;
  pull: GitPullCommands & CliClientProxy;
  fetch: GitFetchCommands & CliClientProxy;
  merge: GitMergeCommands & CliClientProxy;
  rebase: GitRebaseCommands & CliClientProxy;
  stash: GitStashCommands & CliClientProxy;
  remote: GitRemoteCommands & CliClientProxy;
  show: GitShowCommands & CliClientProxy;
  reset: GitResetCommands & CliClientProxy;
  add: GitAddCommands & CliClientProxy;
  clone: GitCloneCommands & CliClientProxy;
  init: GitInitCommands & CliClientProxy;
  config: GitConfigCommands & CliClientProxy;
  /** Access any git subcommand dynamically */
  [key: string]: CliClientProxy;
}

/**
 * Pre-configured Git CLI client
 *
 * @example
 * // git status --short
 * const status = await git.status({ short: true });
 *
 * // git log --oneline --max-count=10
 * const log = await git.log({ oneline: true, maxCount: 10 });
 *
 * // git diff HEAD~1
 * const diff = await git.diff('HEAD~1');
 *
 * // git checkout -b feature-branch
 * await git.checkout('feature-branch', { b: true });
 */
export const git = createCliClient({
  command: 'git',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as GitClient;

/**
 * Get a Git client instance
 * @returns Git client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): GitClient => git;

export default git;
