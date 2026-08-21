'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import type { WorkerProfile } from '@/lib/types';
import { Button, Card, Eyebrow, StatusPill } from '@/components/ui';

export default function WorkerDashboardPage() {
  return (
    <RequireRole role="worker">
      <WorkerDashboard />
    </RequireRole>
  );
}

function WorkerDashboard() {
  const { session, refreshProfile } = useAuth();
  const profile = session?.profile as WorkerProfile | undefined;

  // The session caches the profile from login time, so rating, completed jobs
  // and verification status would otherwise never change on screen. Re-fetch on
  // mount. Mount-only: refreshProfile writes the session, so depending on it
  // would loop.
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
        {profile?.firstName ?? 'Worker'}
      </h1>

      {profile && (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-4">
            <StatusPill status={profile.availability} />
            <StatusPill status={profile.verificationStatus} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Item label="Rate" value={`${profile.currency} ${profile.minRate} / ${profile.rateUnit}`} />
            <Item
              label="Rating"
              value={`${profile.rating} · ${profile.completedJobs} ${profile.completedJobs === 1 ? 'job' : 'jobs'}`}
            />
            <Item label="City" value={profile.city ?? '—'} />
            <Item label="Experience" value={`${profile.yearsExperience} yrs`} />
          </dl>
        </Card>
      )}

      <div className="mt-6 flex gap-4">
        <Link href="/worker/jobs">
          <Button>Browse open jobs</Button>
        </Link>
        <Link href="/worker/applications">
          <Button variant="secondary">My applications</Button>
        </Link>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-body">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
