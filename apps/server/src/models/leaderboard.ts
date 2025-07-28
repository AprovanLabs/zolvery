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
  scoringType?: 'score' | 'voting' | 'race';
  votingData?: {
    totalVotes: number;
    averageScore: number;
    voteCount: number;
  };
  raceData?: {
    completionTime: number; // Server-calculated completion time
    timeBonus: number;
  };
}

export interface SubmitScoreRequest {
  score: number;
  appData?: any;
  day?: string; // Optional, defaults to today
  validationData?: {
    submissionValue?: string; // For race validation (client-provided answer)
    proofOfWork?: any; // Additional validation data
  };
  // Note: completionTime is calculated server-side, not client-provided
  votes?: VoteSubmission[]; // All votes submitted in one batch
}

export interface VoteSubmission {
  targetUserId: string;
  score: number; // Vote weight/score (0-10)
}

export interface VotingResult {
  userId: string;
  totalVotes: number;
  averageScore: number;
  voteCount: number;
  finalScore: number; // Calculated score for leaderboard
}

export interface VoteAggregate {
  PK: string; // "VOTE_TOTALS#${appId}#${day}"
  SK: string; // "USER#${targetUserId}"
  appId: string;
  day: string;
  targetUserId: string;
  totalScore: number;
  voteCount: number;
  averageScore: number;
  lastUpdated: string;
}

export interface AppMetadata {
  appId: string;
  name: string;
  description: string;
  tags: string[];
  leaderboard?: {
    type: 'friends' | 'global';
    scoringType?: 'score' | 'voting' | 'race'; // Only for global leaderboards
    maximumNumberOfVotes?: number; // For voting type
    maximumVotesPerUser?: number; // For voting type
    validation?: {
      type: 'value' | 'time' | 'custom';
      dailyValue?: string; // For race validation
      timeLimit?: number; // For race validation (seconds)
      customValidator?: string; // Custom validation logic
    };
  };
  version: string;
  runnerTag: string;
  author: {
    id: string;
    username: string;
  };
  settings: any[];
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard?: LeaderboardEntry[];
  userRank?: number;
  totalPlayers?: number;
  error?: string;
  timestamp: string;
}
