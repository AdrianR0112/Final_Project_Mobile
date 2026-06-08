import { createContext, useEffect, useState, ReactNode } from 'react';
import { getStoredToken, getStoredUser, isTokenExpired, clearAuthSession, persistAuthSession, getUserRole } from '../utils/auth';
import { getAuthUser } from '../services/auth.service';

export interface AuthUser {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: { id: number; nombre: string } | string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
  isAuthenticated: false,
  role: null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const storedUser = await getStoredUser();
        const token = await getStoredToken();

        if (!token) {
          setIsLoading(false);
          return;
        }

        if (isTokenExpired(token)) {
          await clearAuthSession();
          setIsLoading(false);
          return;
        }

        if (storedUser) {
          setUser(storedUser as AuthUser);
        }

        const response = await getAuthUser();
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'Sesión inválida');
        }

        if (data.user) {
          await persistAuthSession({ token, user: data.user });
          setUser(data.user as AuthUser);
        }
      } catch {
        await clearAuthSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const role = getUserRole(user as unknown as Record<string, unknown> | null);
  const isAuthenticated = user !== null;

  const logout = async () => {
    await clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, isAuthenticated, role, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
