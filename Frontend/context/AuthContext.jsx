'use client';

import { createContext, useEffect, useState } from 'react';
import { clearAuthSession, getStoredToken, getStoredUser, getTokenExpirationTime, isTokenExpired, persistAuthSession, redirectToLogin } from '../utils/auth';
import { getAuthUser } from '../services/auth.service';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getStoredToken();

    setUser(storedUser);

    if (!token) {
      return;
    }

    if (isTokenExpired(token)) {
      clearAuthSession();
      setUser(null);
      redirectToLogin();
      return;
    }

    let cancelled = false;
    const expirationTime = getTokenExpirationTime(token);
    const expirationTimeout = expirationTime
      ? window.setTimeout(() => {
        clearAuthSession();
        setUser(null);
        redirectToLogin();
      }, Math.max(expirationTime - Date.now(), 0))
      : null;

    async function syncAuthenticatedUser() {
      try {
        const response = await getAuthUser();
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'Sesion invalida');
        }

        if (!cancelled && data.user) {
          persistAuthSession({ token, user: data.user });
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setUser(null);
          redirectToLogin();
        }
      }
    }

    syncAuthenticatedUser();

    return () => {
      cancelled = true;
      if (expirationTimeout) {
        window.clearTimeout(expirationTimeout);
      }
    };
  }, []);

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}
