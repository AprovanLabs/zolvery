import type { Logger } from 'pino';

declare global {
  interface ExtendedLogger extends Logger {
    error(error: Error, msg?: string): void;
    error(error: Error, obj: Record<string, any>, msg?: string): void;
    error(obj: unknown, msg?: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
  }
}
