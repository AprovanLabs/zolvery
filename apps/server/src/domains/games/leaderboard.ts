export type Leaderboard = {
  // 'friends' Internal friends leaderboard
  // 'global' Aggregate votes for all users
  type: 'friends' | 'global',
  scoringType?: 'score' | 'voting' | 'race', // Only for global leaderboards
  // Maximum number of users to vote for
  maximumNumberOfVotes?: number,
  // Maximum number of votes per user
  maximumVotesPerUser?: number,
  validation?: {
    type: 'value' | 'time' | 'custom';
    dailyValue?: string; // For race validation
    timeLimit?: number; // For race validation (seconds)
    customValidator?: string; // Custom validation logic
  };
}
