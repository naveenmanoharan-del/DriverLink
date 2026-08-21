'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import type { ClientProfile } from '@/lib/types';
import { Button, Eyebrow } from '@/components/ui';

export default function ClientDashboardPage() {
  return (
    <RequireRole role="client">
      <ClientDashboard />
    </RequireRole>
  );
}

function ClientDashboard() {
  const { session, refreshProfile } = useAuth();
  const profile = session?.profile as ClientProfile | undefined;

  // The session caches the profile from login time, so edits made elsewhere
  // (including on the phone) would never show here. Mount-only: refreshProfile
  // writes the session, so depending on it would loop.
  useEffect(() => {
    refreshProfile().catch(() => {
      // Keep showing the cached profile if the refresh fails.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        {profile?.name ?? 'Dashboard'}
      </h1>
      {profile?.companyName && <p className="mt-1 text-sm text-body">{profile.companyName}</p>}

      <div className="mt-6 flex gap-4">
        <Link href="/client/jobs/new">
          <Button>Post a new job</Button>
        </Link>
        <Link href="/client/jobs">
          <Button variant="secondary">My job postings</Button>
        </Link>
      </div>
    </div>
  );
}
