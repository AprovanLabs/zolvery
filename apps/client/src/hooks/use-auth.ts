import { useState, useEffect, useCallback } from 'react';
import {
  configure,
  initializeAuthListener,
  removeAuthListener,
  login as mobileLogin,
  logout as mobileLogout,
  getStoredUser,
  getStoredTokens,
  isAuthenticated as checkAuth,
  isMobile,
  type AuthUser,
  type AuthTokens,
  type AuthConfig,
} from '../services/mobile-auth';

interface UseAuthOptions {
  config: AuthConfig;
}

interface UseAuthReturn {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMobile: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth({ config }: UseAuthOptions): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    configure(config);

    const init = async () => {
      setIsLoading(true);
      await initializeAuthListener();

      const [storedUser, storedTokens, authed] = await Promise.all([
        getStoredUser(),
        getStoredTokens(),
        checkAuth(),
      ]);

      setUser(storedUser);
      setTokens(storedTokens);
      setIsAuthenticated(authed);
      setIsLoading(false);
    };

    init();

    return () => {
      removeAuthListener();
    };
  }, [config]);

  const login = useCallback(async () => {
    setIsLoading(true);
    const newTokens = await mobileLogin();

    if (newTokens) {
      const storedUser = await getStoredUser();
      setUser(storedUser);
      setTokens(newTokens);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await mobileLogout();
    setUser(null);
    setTokens(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  return {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    isMobile: isMobile(),
    login,
    logout,
  };
}
