import { type User } from "../user.js";

/**
 * API request/response types
 */
export interface CreateEventRequest {
  appId: string;
  eventKey: string;
  value: unknown;
  day?: string;
}

export interface AppEvent {
  eventKey: string;
  value: unknown;
  timestamp: string;
  appId: string;
  userId: string;
  day: string;
  ttl?: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  metadata?: Record<string, unknown>;
}

export interface SubmitScoreRequest {
  score: number;
  appData?: unknown;
  day?: string;
  validationData?: {
    submissionValue?: string;
    proofOfWork?: unknown;
  };
  votes?: VoteSubmission[]; // All votes submitted in one batch
}

export interface VoteSubmission {
  targetUserId: string;
  score: number; // Vote weight/score (0-10)
}

/**
 * Client API for communicating with the backend
 */
export class ClientAPI {
  private baseUrl: string;
  private authToken?: string;

  public constructor(
    baseUrl: string,
    private user: User,
    private appId?: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Set app ID
   */
  public setAppId(appId: string): void {
    this.appId = appId;
  }

  /**
   * Get app data for a specific day
   */
  public async getAppData(day: string, key?: string): Promise<unknown> {
    const url = key
      ? `${this.baseUrl}/app-data/${this.getAppId()}/${day}/${key}`
      : `${this.baseUrl}/app-data/${this.getAppId()}/${day}`;

    return this.request("GET", url);
  }

  /**
   * Create an event
   */
  public async createEvent(request: CreateEventRequest): Promise<AppEvent> {
    const url = `${this.baseUrl}/events/${request.appId}`;
    return this.request("POST", url, request) as Promise<AppEvent>;
  }

  /**
   * Get events for a specific day
   */
  public async getEvents(day: string): Promise<AppEvent[]> {
    const url = `${this.baseUrl}/events/${this.getAppId()}/${day}`;
    return this.request("GET", url) as Promise<AppEvent[]>;
  }

  /**
   * Get a specific event
   */
  public async getEvent(day: string, eventKey: string): Promise<AppEvent | null> {
    const url = `${this.baseUrl}/events/${this.getAppId()}/${day}/${eventKey}`;
    return this.request("GET", url) as Promise<AppEvent | null>;
  }

  /**
   * Submit score to leaderboard
   */
  public async submitScore(request: SubmitScoreRequest): Promise<unknown> {
    const url = `${this.baseUrl}/leaderboard/score`;
    return this.request("POST", url, {
      appId: this.getAppId(),
      ...request,
    });
  }

  /**
   * Get leaderboard
   */
  public async getLeaderboard(type: "global" | "friends" = "global"): Promise<LeaderboardEntry[]> {
    const url = `${this.baseUrl}/leaderboard/${this.getAppId()}?type=${type}`;
    return this.request("GET", url) as Promise<LeaderboardEntry[]>;
  }

  /**
   * Get internationalization data
   */
  public async getI18nData(locale: string): Promise<Record<string, string>> {
    const url = `${this.baseUrl}/i18n/${this.getAppId()}/${locale}`;
    return this.request("GET", url) as Promise<Record<string, string>>;
  }

  /**
   * Get users (for multiplayer contexts)
   */
  public async getUsers(): Promise<User[]> {
    // This would typically come from a real-time connection
    // For now, return current user
    return [this.user];
  }

  /**
   * Make HTTP request with error handling
   */
  private async request(method: string, url: string, body?: unknown): Promise<unknown> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : (undefined as string | undefined),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      return ((data.data as unknown) || data) as unknown;
    } catch (error) {
      console.error(`API request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  /**
   * Get app ID from context (this should be set during client initialization)
   */
  private getAppId(): string {
    if (!this.appId) {
      throw new Error("App ID not set. Call setAppId() first.");
    }
    return this.appId;
  }
}
