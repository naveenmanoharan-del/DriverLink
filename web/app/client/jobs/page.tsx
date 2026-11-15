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
  // One state value set only from the request's own callbacks, so the effect
  // below starts the fetch without setting state synchronously as it runs.
  const [{ jobs, loading, error }, setState] = useState<{
    jobs: Job[];
    loading: boolean;
    error: string | null;
  }>({ jobs: [], loading: true, error: null });

  // Written as a promise chain rather than async/await on purpose: state is
  // then only ever set from a callback, which is what makes it safe to call
  // straight from the effect below.
  const load = useCallback(() => {
    if (!session) return;
    apiFetch<Job[]>('/v1/jobs/mine', { token: session.accessToken })
      .then((list) => setState({ jobs: list, loading: false, error: null }))
      .catch((err: unknown) =>
        setState({
          jobs: [],
          loading: false,
          error: messageFor(err, 'Could not load your job postings.'),
        }),
      );
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  // Retrying is user-triggered, so it can show the loading state immediately.
  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
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
        onRetry={retry}
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
