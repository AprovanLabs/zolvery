declare module 'pino' {
  interface Logger {
    /**
     * Log at 'error' level with Error as first argument
     */
    error(error: Error, msg?: string): void;
    error(error: Error, obj: Record<string, any>, msg?: string): void;
  }
}
