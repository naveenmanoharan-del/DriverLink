'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiFetch, setTokenRefresher } from './api';
import type { ClientProfile, RegisterClientInput, RegisterWorkerInput, User, WorkerProfile } from './types';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
  profile: WorkerProfile | ClientProfile | null;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  loginWithPhone: (phone: string, password: string) => Promise<Session>;
  registerWorker: (dto: RegisterWorkerInput) => Promise<Session>;
  registerClient: (dto: RegisterClientInput) => Promise<Session>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'manpower_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  // The refresher below runs outside React's render cycle, so it reads the
  // session from a ref to avoid capturing a stale copy.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  function persist(next: Session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    sessionRef.current = next;
    setSession(next);
  }

  useEffect(() => {
    setTokenRefresher(async () => {
      const current = sessionRef.current;
      if (!current?.refreshToken) return null;
      try {
        const renewed = await apiFetch<{ accessToken: string; refreshToken: string }>('/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken: current.refreshToken },
        });
        persist({ ...current, accessToken: renewed.accessToken, refreshToken: renewed.refreshToken });
        return renewed.accessToken;
      } catch {
        // Refresh token is expired or revoked — drop the session so the user
        // is sent back to log in rather than looping on failed requests.
        localStorage.removeItem(STORAGE_KEY);
        sessionRef.current = null;
        setSession(null);
        return null;
      }
    });
    return () => setTokenRefresher(null);
  }, []);

  async function loginWithPhone(phone: string, password: string) {
    const result = await apiFetch<Session>('/v1/auth/login', { method: 'POST', body: { phone, password } });
    persist(result);
    return result;
  }

  async function registerWorker(dto: RegisterWorkerInput) {
    const result = await apiFetch<Session>('/v1/auth/register/worker', { method: 'POST', body: dto });
    persist(result);
    return result;
  }

  async function registerClient(dto: RegisterClientInput) {
    const result = await apiFetch<Session>('/v1/auth/register/client', { method: 'POST', body: dto });
    persist(result);
    return result;
  }

  async function refreshProfile() {
    if (!session) return;
    const result = await apiFetch<{ user: User; profile: WorkerProfile | ClientProfile | null }>('/v1/auth/me', {
      token: session.accessToken,
    });
    persist({ ...session, user: result.user, profile: result.profile });
  }

  function logout() {
    const refreshToken = sessionRef.current?.refreshToken;

    // Clear locally first so the UI never appears stuck behind a network call.
    localStorage.removeItem(STORAGE_KEY);
    sessionRef.current = null;
    setSession(null);

    // Then revoke server-side, so the refresh token can't be reused for the
    // rest of its 7-day life. Fire-and-forget: a failure here must not block
    // signing out.
    if (refreshToken) {
      apiFetch('/v1/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {});
    }
  }

  return (
    <AuthContext.Provider value={{ session, loading, loginWithPhone, registerWorker, registerClient, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
