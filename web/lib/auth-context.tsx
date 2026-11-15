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
  registerWorker: (dto: RegisterWorkerInput, resume?: File) => Promise<Session>;
  registerClient: (dto: RegisterClientInput) => Promise<Session>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'manpower_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Session and loading move together on every transition, so they are one
  // state value: restoring from storage is then a single update rather than
  // two renders where the session is known but the app still says "loading".
  const [{ session, loading }, setState] = useState<{
    session: Session | null;
    loading: boolean;
  }>({ session: null, loading: true });

  // The refresher below runs outside React's render cycle, so it reads the
  // session from a ref to avoid capturing a stale copy. The ref is written
  // alongside every state change (never during render, which is not safe
  // under concurrent rendering — React may render twice and discard one).
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    let restored: Session | null = null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        restored = JSON.parse(raw) as Session;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    sessionRef.current = restored;
    // localStorage does not exist until the component is mounted in a browser,
    // so the stored session cannot be read during render without the server
    // and client producing different markup. One update on mount is the price
    // of that, and it is why this rule is suppressed on this line alone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ session: restored, loading: false });
  }, []);

  function persist(next: Session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    sessionRef.current = next;
    setState({ session: next, loading: false });
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    sessionRef.current = null;
    setState({ session: null, loading: false });
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
        clearSession();
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

  async function registerWorker(dto: RegisterWorkerInput, resume?: File) {
    // Multipart so the resume travels with the registration in one request.
    const form = new FormData();
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined || value === '') continue;
      form.append(key, Array.isArray(value) ? value.join(',') : String(value));
    }
    if (resume) form.append('resume', resume);
    const result = await apiFetch<Session>('/v1/auth/register/worker', { method: 'POST', body: form });
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
    clearSession();

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
