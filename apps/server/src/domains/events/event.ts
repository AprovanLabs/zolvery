export interface AppEvent {
  eventKey: string;    // Event identifier (e.g., "poem", "vote", "phase")
  value: any;          // Event data (JSON)
  timestamp: string;   // ISO timestamp
  appId: string;       // App identifier
  userId: string;      // User identifier
  day: string;         // Date in YYYY-MM-DD format
  ttl?: number;        // Optional TTL for cleanup
}

export interface CreateEventRequest {
  appId: string;
  eventKey: string;
  value: any;
  day?: string;
}

export interface EventResponse {
  success: boolean;
  event?: AppEvent;
  events?: AppEvent[];
  error?: string;
  timestamp: string;
}
