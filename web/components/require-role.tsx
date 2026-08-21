'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.user.role !== role) {
      router.replace(session.user.role === 'worker' ? '/worker' : '/client');
    }
  }, [loading, session, role, router]);

  if (loading || !session || session.user.role !== role) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-body">Loading…</div>;
  }

  return <>{children}</>;
}
