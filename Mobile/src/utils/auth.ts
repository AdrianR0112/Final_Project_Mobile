import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

    if (typeof atob === 'function') {
      return atob(padded);
    }

    return null;
  } catch {
    return null;
  }
}

function parseTokenPayload(token: string): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const decoded = decodeBase64Url(payload);
    return decoded ? JSON.parse(decoded) : null;
  } catch {
    return null;
  }
}

function getTokenExpirationTime(token: string): number | null {
  const payload = parseTokenPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

export function isTokenExpired(token: string): boolean {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return true;
  return Date.now() >= expirationTime;
}

export function getUserRole(user: Record<string, unknown> | null): string | null {
  if (!user) return null;
  const rol = user.rol as Record<string, unknown> | undefined;
  return (rol?.nombre as string) || (user.rol as string) || null;
}

export async function persistAuthSession({ token, user }: { token: string; user: Record<string, unknown> }): Promise<void> {
  try {
    if (token) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    if (user) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
  } catch {
    // silently fail
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // silently fail
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    if (isTokenExpired(token)) {
      await clearAuthSession();
      return null;
    }

    return token;
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<Record<string, unknown> | null> {
  try {
    const userStr = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch {
    await clearAuthSession();
    return null;
  }
}
