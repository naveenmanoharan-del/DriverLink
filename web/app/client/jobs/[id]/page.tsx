'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Job, JobApplication } from '@/lib/types';
import { Button, Card, Eyebrow, StatusPill } from '@/components/ui';

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
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [jobResult, applicationsResult] = await Promise.all([
        apiFetch<Job>(`/v1/jobs/${id}`),
        apiFetch<JobApplication[]>(`/v1/jobs/${id}/applications`, { token: session.accessToken }),
      ]);
      setJob(jobResult);
      setApplications(applicationsResult);
    } finally {
      setLoading(false);
    }
  }, [id, session]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(applicationId: string, status: 'accepted' | 'rejected') {
    if (!session) return;
    setActionError(null);
    try {
      await apiFetch(`/v1/applications/${applicationId}`, {
        method: 'PATCH',
        token: session.accessToken,
        body: { status },
      });
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update application');
    }
  }

  if (loading || !job) {
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

      <h2 className="mt-10 text-xl font-bold tracking-tight text-ink">Applicants</h2>
      {actionError && <p className="mt-2 text-sm text-warn">{actionError}</p>}

      {applications.length === 0 ? (
        <p className="mt-3 text-sm text-body">No applications yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {applications.map((app) => (
            <li key={app.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink">
                      Proposed rate: <span className="font-semibold">{app.proposedRate}</span>
                    </p>
                    {app.message && <p className="mt-1 text-sm italic text-ink/70">&ldquo;{app.message}&rdquo;</p>}
                    <div className="mt-1.5">
                      <StatusPill status={app.status} />
                    </div>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <Button onClick={() => decide(app.id, 'accepted')}>Accept</Button>
                      <Button variant="secondary" onClick={() => decide(app.id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
