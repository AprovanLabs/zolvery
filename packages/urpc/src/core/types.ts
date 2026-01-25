export interface UrpcClient {
  call<T = any>(method: string, params?: any): Promise<T>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export type UrpcConfig =
  | {
      transport: 'http' | 'websocket' | 'sse';
      url: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  | {
      transport: 'cli';
      command: string;
    };
