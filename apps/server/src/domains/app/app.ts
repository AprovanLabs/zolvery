export interface AppData {
  appId: string;
  day: string;
  key: string;         // Data key (e.g., "prompt", "examples", "config")
  value: any;          // JSON data
  version: string;     // Data version for caching
  updatedAt: string;
  ttl?: number;        // Optional TTL
}

export interface AppDataRequest {
  appId: string;
  day: string;
}

export interface UpdateAppDataRequest {
  appId: string;
  day: string;
  key: string;
  value: any;
  version?: string;
}
