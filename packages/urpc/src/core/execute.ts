/**
 * CLI command executor
 * Spawns child processes and handles output/errors
 */

import { spawn, type SpawnOptions } from 'child_process';

export interface ExecuteOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Encoding for output (default: 'utf-8') */
  encoding?: BufferEncoding;
  /** Shell to use (default: true for cross-platform compatibility) */
  shell?: boolean | string;
  /** Maximum buffer size for stdout/stderr in bytes (default: 10MB) */
  maxBuffer?: number;
}

export interface ExecuteResult {
  /** Exit code from the command */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether the command timed out */
  timedOut: boolean;
  /** Whether the command was killed */
  killed: boolean;
}

export class ExecuteError extends Error {
  public constructor(
    message: string,
    public readonly result: ExecuteResult,
    public readonly command: string[],
  ) {
    super(message);
    this.name = 'ExecuteError';
  }
}

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const DEFAULT_ENCODING: BufferEncoding = 'utf-8';

/**
 * Executes a CLI command and returns the result
 *
 * @param command - Array of command parts (e.g., ['gh', 'pr', 'diff', '--repo', 'owner/repo'])
 * @param options - Execution options
 * @returns Promise resolving to the execution result
 * @throws ExecuteError if the command fails with a non-zero exit code
 *
 * @example
 * const result = await execute(['gh', 'pr', 'diff', '123', '--repo', 'owner/repo']);
 * console.log(result.stdout);
 */
export const execute = (
  command: string[],
  options: ExecuteOptions = {},
): Promise<ExecuteResult> => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command;

    if (!cmd) {
      reject(new Error('Command cannot be empty'));
      return;
    }

    const {
      cwd,
      env,
      timeout,
      encoding = DEFAULT_ENCODING,
      shell = true,
      maxBuffer = DEFAULT_MAX_BUFFER,
    } = options;

    const spawnOptions: SpawnOptions = {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      shell,
    };

    const child = spawn(cmd, args, spawnOptions);

    let stdout = '';
    let stderr = '';
    let stdoutSize = 0;
    let stderrSize = 0;
    let timedOut = false;
    let killed = false;
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeout && timeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        killed = true;
        child.kill('SIGTERM');
      }, timeout);
    }

    child.stdout?.setEncoding(encoding);
    child.stderr?.setEncoding(encoding);

    child.stdout?.on('data', (data: string) => {
      const chunk = String(data);
      stdoutSize += Buffer.byteLength(chunk, encoding);
      if (stdoutSize <= maxBuffer) {
        stdout += chunk;
      } else if (!killed) {
        killed = true;
        child.kill('SIGTERM');
      }
    });

    child.stderr?.on('data', (data: string) => {
      const chunk = String(data);
      stderrSize += Buffer.byteLength(chunk, encoding);
      if (stderrSize <= maxBuffer) {
        stderr += chunk;
      } else if (!killed) {
        killed = true;
        child.kill('SIGTERM');
      }
    });

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);

      const exitCode = code ?? 1;
      const result: ExecuteResult = {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        killed,
      };

      if (exitCode !== 0) {
        const errorMessage =
          stderr || stdout || `Command failed with exit code ${exitCode}`;
        reject(new ExecuteError(errorMessage, result, command));
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Executes a command and returns only stdout
 * Convenience wrapper around execute()
 */
export const executeAndGetOutput = async (
  command: string[],
  options: ExecuteOptions = {},
): Promise<string> => {
  const result = await execute(command, options);
  return result.stdout;
};

/**
 * Checks if a command exists/is available
 */
export const commandExists = async (command: string): Promise<boolean> => {
  try {
    const checkCmd =
      process.platform === 'win32' ? ['where', command] : ['which', command];
    await execute(checkCmd, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};
