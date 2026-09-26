'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Job } from '@/lib/types';
import { Eyebrow, StatusPill } from '@/components/ui';

export default function JobDetailPage() {
  return (
    <RequireRole role="client">
      <JobDetail />
    </RequireRole>
  );
}

function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    apiFetch<Job>(`/v1/jobs/${id}`, { token: session.accessToken })
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this requirement'));
  }, [id, session]);

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-warn">{error}</div>;
  }
  if (!job) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-body">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Eyebrow>Job posting</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{job.title}</h1>
      <p className="mt-1 text-sm text-ink/70">{job.location}</p>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-sm text-ink">
          {job.currency} {job.offeredRate} / {job.rateUnit}
        </p>
        <StatusPill status={job.status} />
      </div>
      <p className="mt-2 text-sm text-body">
        {job.workersRequired} position{job.workersRequired === 1 ? '' : 's'} · starts{' '}
        {new Date(job.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      {job.description && <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink">{job.description}</p>}
    </div>
  );
}
