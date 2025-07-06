export interface AppData {
  PK: string;           // "APPDATA#poetry-slam#2025-07-01"
  SK: string;           // "CONFIG" or specific data key
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

export interface AppDataResponse {
  success: boolean;
  data?: Record<string, any> | any;
  version?: string;
  error?: string;
  timestamp: string;
}

export interface UpdateAppDataRequest {
  appId: string;
  day: string;
  key: string;
  value: any;
  version?: string;
}
