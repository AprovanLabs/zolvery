export interface AppScore {
  PK: string;           // "LEADERBOARD#poetry-slam#2025-07-01"
  SK: string;           // "SCORE#user123#timestamp"
  userId: string;       // User identifier
  appId: string;        // App identifier
  day: string;          // Date in YYYY-MM-DD format
  score: number;        // Final score
  rank?: number;        // Calculated rank
  appData?: any;        // App-specific data (poem, votes, etc.)
  timestamp: string;    // ISO timestamp
  createdAt: number;    // Unix timestamp for sorting
}

export interface LeaderboardEntry {
  PK: string;           // "LEADERBOARD#poetry-slam#GLOBAL" or "LEADERBOARD#poetry-slam#2025-07-01"
  SK: string;           // "USER#user123"
  userId: string;
  username: string;
  score: number;
  submittedTimestamp: string;
  rank: number;
  GSI1PK?: string;     // For user-centric queries
  GSI1SK?: string;     // For time-based queries
}

export interface SubmitScoreRequest {
  score: number;
  appData?: any;
  day?: string; // Optional, defaults to today
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard?: LeaderboardEntry[];
  userRank?: number;
  totalPlayers?: number;
  error?: string;
  timestamp: string;
}
