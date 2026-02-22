import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

export interface AuthConfig {
  cognitoDomain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthUser {
  sub: string;
  email: string;
  username: string;
  groups: string[];
}

const TOKEN_STORAGE_KEY = 'zolvery_auth_tokens';
const USER_STORAGE_KEY = 'zolvery_auth_user';

let config: AuthConfig | null = null;
let authListenerHandle: Promise<{ remove: () => void }> | null = null;
let loginResolve: ((tokens: AuthTokens | null) => void) | null = null;

export function isMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export function configure(authConfig: AuthConfig): void {
  config = authConfig;
}

function parseJwt(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(jsonPayload);
}

function extractTokensFromUrl(url: string): AuthTokens | null {
  const hashParams = new URLSearchParams(url.split('#')[1] || '');
  const queryParams = new URLSearchParams(
    url.split('?')[1]?.split('#')[0] || '',
  );

  const accessToken =
    hashParams.get('access_token') || queryParams.get('access_token');
  const idToken = hashParams.get('id_token') || queryParams.get('id_token');
  const refreshToken =
    hashParams.get('refresh_token') || queryParams.get('refresh_token');
  const expiresIn =
    hashParams.get('expires_in') || queryParams.get('expires_in');

  if (!accessToken || !idToken) {
    return null;
  }

  return {
    accessToken,
    idToken,
    refreshToken: refreshToken || '',
    expiresAt: Date.now() + parseInt(expiresIn || '3600', 10) * 1000,
  };
}

function extractUserFromIdToken(idToken: string): AuthUser | null {
  try {
    const payload = parseJwt(idToken);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      username: (payload['cognito:username'] || payload.email) as string,
      groups: (payload['cognito:groups'] || []) as string[],
    };
  } catch {
    return null;
  }
}

async function storeTokens(tokens: AuthTokens): Promise<void> {
  await Preferences.set({
    key: TOKEN_STORAGE_KEY,
    value: JSON.stringify(tokens),
  });
}

async function storeUser(user: AuthUser): Promise<void> {
  await Preferences.set({
    key: USER_STORAGE_KEY,
    value: JSON.stringify(user),
  });
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const { value } = await Preferences.get({ key: TOKEN_STORAGE_KEY });
  if (!value) return null;

  try {
    const tokens = JSON.parse(value) as AuthTokens;
    if (tokens.expiresAt < Date.now()) {
      await clearAuth();
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const { value } = await Preferences.get({ key: USER_STORAGE_KEY });
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  await Preferences.remove({ key: TOKEN_STORAGE_KEY });
  await Preferences.remove({ key: USER_STORAGE_KEY });
}

async function handleAppUrl(event: URLOpenListenerEvent): Promise<void> {
  const tokens = extractTokensFromUrl(event.url);

  if (tokens && loginResolve) {
    const user = extractUserFromIdToken(tokens.idToken);
    if (user) {
      await storeTokens(tokens);
      await storeUser(user);
    }
    loginResolve(tokens);
    loginResolve = null;
  }

  await Browser.close();
}

export async function initializeAuthListener(): Promise<void> {
  if (!isMobile()) return;

  authListenerHandle = App.addListener('appUrlOpen', handleAppUrl);
}

export async function removeAuthListener(): Promise<void> {
  if (authListenerHandle) {
    const handle = await authListenerHandle;
    handle.remove();
    authListenerHandle = null;
  }
}

export async function login(): Promise<AuthTokens | null> {
  if (!config) {
    throw new Error('Auth not configured. Call configure() first.');
  }

  if (!isMobile()) {
    window.location.href = buildLoginUrl();
    return null;
  }

  return new Promise(async (resolve) => {
    loginResolve = resolve;

    await Browser.open({
      url: buildLoginUrl(),
      windowName: '_self',
    });
  });
}

export async function logout(): Promise<void> {
  if (!config) {
    throw new Error('Auth not configured. Call configure() first.');
  }

  await clearAuth();

  if (!isMobile()) {
    window.location.href = buildLogoutUrl();
    return;
  }

  await Browser.open({
    url: buildLogoutUrl(),
    windowName: '_self',
  });

  await Browser.close();
}

function buildLoginUrl(): string {
  if (!config) throw new Error('Auth not configured');

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'token',
    scope: 'openid profile email',
    redirect_uri: config.redirectUri,
  });

  return `${config.cognitoDomain}/login?${params.toString()}`;
}

function buildLogoutUrl(): string {
  if (!config) throw new Error('Auth not configured');

  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.logoutUri,
  });

  return `${config.cognitoDomain}/logout?${params.toString()}`;
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null;
}
