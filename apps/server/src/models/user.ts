export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  lastActive: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  notifications: boolean;
}

export interface UserSession {
  userId: string;
  appId: string;
  day: string;
  sessionId: string;
  startedAt: string;
  lastActivity: string;
  status: 'active' | 'completed' | 'abandoned';
}
