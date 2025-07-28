import { User } from './user';

type Leaderboard = {
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

export type Settings = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  description?: string;
  type: 'select' | 'checkbox' | 'input' | 'slider';
  // If true, the setting is required and must be set by the user
  required?: boolean;
}

export type App = {
  appId: string;
  name: string;
  description: string;
  tags: string[];
  leaderboard: Leaderboard;
  version: string;
  runnerTag: string;
  author: User;
  settings: Settings[],
};
