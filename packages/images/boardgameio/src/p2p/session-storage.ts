import type { LogEntry, Server, State } from 'boardgame.io';

const STORAGE_PREFIX = 'p2p-session:';
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PersistedSession {
  matchID: string;
  gameName: string;
  numPlayers: number;
  state: State;
  initialState: State;
  log: LogEntry[];
  metadata: Server.MatchData;
  createdAt: number;
  updatedAt: number;
}

function getStorageKey(matchID: string): string {
  return `${STORAGE_PREFIX}${matchID}`;
}

/**
 * Check if a session exists and is not expired
 */
export function hasValidSession(matchID: string): boolean {
  const session = loadSession(matchID);
  return session !== null;
}

/**
 * Load a persisted session from localStorage
 * Returns null if not found or expired
 */
export function loadSession(matchID: string): PersistedSession | null {
  try {
    const key = getStorageKey(matchID);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const session = JSON.parse(raw) as PersistedSession;
    const now = Date.now();

    // Check if session has expired
    if (now - session.updatedAt > SESSION_TTL_MS) {
      console.log('[P2PSessionStorage] Session expired, removing:', matchID);
      removeSession(matchID);
      return null;
    }

    console.log('[P2PSessionStorage] Loaded session:', {
      matchID,
      stateID: session.state._stateID,
      age: Math.round((now - session.updatedAt) / 1000) + 's',
    });

    return session;
  } catch (err) {
    console.error('[P2PSessionStorage] Failed to load session:', err);
    return null;
  }
}

/**
 * Save or update a session in localStorage
 */
export function saveSession(session: PersistedSession): void {
  try {
    const key = getStorageKey(session.matchID);
    session.updatedAt = Date.now();
    const serialized = JSON.stringify(session);
    localStorage.setItem(key, serialized);
    console.log('[P2PSessionStorage] Saved session:', {
      matchID: session.matchID,
      stateID: session.state._stateID,
      gameName: session.gameName,
      sizeBytes: serialized.length,
    });
  } catch (err) {
    console.error('[P2PSessionStorage] Failed to save session:', err);
    // Check for quota exceeded
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('[P2PSessionStorage] Storage quota exceeded, cleaning up old sessions');
      cleanupExpiredSessions();
    }
  }
}

/**
 * Update just the state portion of a session (faster than full save)
 */
export function updateSessionState(
  matchID: string,
  state: State,
  log?: LogEntry[],
): void {
  const session = loadSession(matchID);
  if (!session) return;

  session.state = state;
  if (log) session.log = log;
  saveSession(session);
}

/**
 * Remove a session from localStorage
 */
export function removeSession(matchID: string): void {
  try {
    const key = getStorageKey(matchID);
    localStorage.removeItem(key);
    console.log('[P2PSessionStorage] Removed session:', matchID);
  } catch (err) {
    console.error('[P2PSessionStorage] Failed to remove session:', err);
  }
}

/**
 * Remove all expired sessions from localStorage
 */
export function cleanupExpiredSessions(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const session = JSON.parse(raw) as PersistedSession;
        if (now - session.updatedAt > SESSION_TTL_MS) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      console.log('[P2PSessionStorage] Cleaned up expired session:', key);
    }
  } catch (err) {
    console.error('[P2PSessionStorage] Cleanup failed:', err);
  }
}

/**
 * Extend the TTL of a session (call periodically to keep session alive)
 */
export function touchSession(matchID: string): void {
  const session = loadSession(matchID);
  if (session) {
    saveSession(session);
  }
}
