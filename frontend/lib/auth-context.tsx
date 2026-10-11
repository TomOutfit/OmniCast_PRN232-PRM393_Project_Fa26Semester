// ============================================================
// OmniCast - Auth Context (JWT + localStorage)
// ============================================================

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiClient } from './api';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '@/types';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  /**
   * Logout from the current device only. Revokes the active refresh
   * token server-side so a stolen JWT cannot be refreshed. Always
   * clears local tokens, even if the server request fails.
   */
  logout: () => Promise<void>;
  /**
   * Logout from every device. Revokes ALL refresh tokens for the
   * user — useful for "I lost my phone" / "suspicious activity" flows.
   */
  logoutAll: () => Promise<{ revokedCount: number }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('omnicast_user');
    try {
      sessionStorage.clear();
      // Purge any authentication cookies if set by browser
      document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'omnicast_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    } catch {
      // Ignore security or sandboxed storage restrictions
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user from server on mount when access token exists
  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get<User>('/users/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    const { accessToken, refreshToken, user: userData } = res.data;
    storeTokens(accessToken, refreshToken);
    setUser(userData);
    return res.data;
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    const { accessToken, refreshToken, user: userData } = res.data;
    storeTokens(accessToken, refreshToken);
    setUser(userData);
    return res.data;
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(ACCESS_TOKEN_KEY)) {
        await apiClient.post('/auth/logout', {
          // Pass the refresh token so the backend revokes the exact
          // session tied to this device instead of the most-recent
          // one (which might be a different active device).
          refreshToken: refreshToken || undefined,
        });
      }
    } catch {
      // ignore network errors on logout — we always clear local state
    } finally {
      clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  };

  const logoutAll = async (): Promise<{ revokedCount: number }> => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(ACCESS_TOKEN_KEY)) {
        const res = await apiClient.post<{ success?: boolean; revokedCount: number }>(
          '/auth/logout-all',
        );
        return { revokedCount: res.data?.revokedCount ?? 0 };
      }
      return { revokedCount: 0 };
    } catch {
      // Even on failure, wipe local state so the current device is
      // logged out — better to over-logout than under-logout.
      return { revokedCount: 0 };
    } finally {
      clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  };

  const refresh = async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token');
    const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken },
    );
    storeTokens(res.data.accessToken, res.data.refreshToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        logoutAll,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
