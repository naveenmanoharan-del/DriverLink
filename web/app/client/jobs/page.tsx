'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Job } from '@/lib/types';
import { Button, Card, Eyebrow, StatusPill } from '@/components/ui';
import { LoadState, messageFor } from '@/components/load-state';

export default function ClientJobsPage() {
  return (
    <RequireRole role="client">
      <MyJobs />
    </RequireRole>
  );
}

function MyJobs() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      setJobs(await apiFetch<Job[]>('/v1/jobs/mine', { token: session.accessToken }));
    } catch (err) {
      setError(messageFor(err, 'Could not load your job postings.'));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>Your postings</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            My job postings
          </h1>
        </div>
        <Link href="/client/jobs/new">
          <Button>Post a job</Button>
        </Link>
      </div>

      <LoadState
        loading={loading}
        error={error}
        isEmpty={jobs.length === 0}
        emptyMessage="You haven't posted any jobs yet."
        onRetry={load}
      />

      {!loading && !error && jobs.length > 0 && (
        <ul className="mt-6 space-y-3">
          {jobs.map((job, i) => (
            <li key={job.id} className="animate-fade-up" style={{ '--delay': `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}>
              <Link href={`/client/jobs/${job.id}`}>
                <Card interactive className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-lg font-bold tracking-tight text-ink">{job.title}</p>
                    <p className="text-sm text-ink/70">{job.location}</p>
                  </div>
                  <StatusPill status={job.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
