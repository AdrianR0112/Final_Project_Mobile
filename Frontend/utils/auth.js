export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function isBrowser() {
  return typeof window !== 'undefined';
}

function setCookie(name, value, maxAge = COOKIE_MAX_AGE) {
  if (!isBrowser()) {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  if (typeof atob === 'function') {
    return atob(padded);
  }

  return null;
}

export function parseTokenPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const decoded = decodeBase64Url(payload);
    return decoded ? JSON.parse(decoded) : null;
  } catch {
    return null;
  }
}

export function getTokenExpirationTime(token) {
  const payload = parseTokenPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

export function isTokenExpired(token) {
  const expirationTime = getTokenExpirationTime(token);

  if (!expirationTime) {
    return true;
  }

  return Date.now() >= expirationTime;
}

function getTokenCookieMaxAge(token) {
  const expirationTime = getTokenExpirationTime(token);

  if (!expirationTime) {
    return COOKIE_MAX_AGE;
  }

  const remainingSeconds = Math.floor((expirationTime - Date.now()) / 1000);
  return remainingSeconds > 0 ? remainingSeconds : 0;
}

export function buildLoginRedirectUrl(nextPath) {
  if (!isBrowser()) {
    return '/login';
  }

  const currentPath = nextPath || `${window.location.pathname}${window.location.search}`;
  const loginUrl = new URL('/login', window.location.origin);

  if (currentPath && !currentPath.startsWith('/login')) {
    loginUrl.searchParams.set('next', currentPath);
  }

  return loginUrl.toString();
}

export function redirectToLogin(nextPath) {
  if (!isBrowser()) {
    return;
  }

  window.location.assign(buildLoginRedirectUrl(nextPath));
}

export function expireAuthSession(nextPath) {
  clearAuthSession();
  redirectToLogin(nextPath);
}

export function getUserRole(user) {
  return user?.rol?.nombre || user?.rol || null;
}

export function persistAuthSession({ token, user }) {
  if (!isBrowser()) {
    return;
  }

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setCookie(AUTH_TOKEN_KEY, token, getTokenCookieMaxAge(token));
  }

  if (user) {
    const serializedUser = JSON.stringify(user);
    const role = getUserRole(user);

    localStorage.setItem(AUTH_USER_KEY, serializedUser);
    setCookie(AUTH_USER_KEY, serializedUser);

    if (role) {
      setCookie('auth_role', role);
    }
  }
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);

  setCookie(AUTH_TOKEN_KEY, '', 0);
  setCookie(AUTH_USER_KEY, '', 0);
  setCookie('auth_role', '', 0);
}

export function getStoredToken() {
  if (!isBrowser()) {
    return null;
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }

  return token;
}

export function getStoredUser() {
  if (!isBrowser()) {
    return null;
  }

  const user = localStorage.getItem(AUTH_USER_KEY);

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    clearAuthSession();
    return null;
  }
}
