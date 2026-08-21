'use client';

import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Job, JobApplication } from '@/lib/types';
import { Button, Card, Eyebrow, Field, StatusPill, Textarea, TextInput } from '@/components/ui';
import { LoadState, messageFor } from '@/components/load-state';

export default function WorkerJobsPage() {
  return (
    <RequireRole role="worker">
      <JobsBrowser />
    </RequireRole>
  );
}

function JobsBrowser() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [proposedRate, setProposedRate] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Jobs this worker already applied to. The API permits one application per
  // job per worker, so these can never be applied to again.
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  async function loadJobs() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiFetch<{ data: Job[] }>('/v1/jobs?status=open');
      setJobs(result.data);

      if (session) {
        try {
          const mine = await apiFetch<JobApplication[]>('/v1/applications/mine', {
            token: session.accessToken,
          });
          setAppliedJobIds(new Set(mine.map((a) => a.jobId)));
        } catch {
          // Non-fatal: the Apply button stays enabled and the API rejects it.
        }
      }
    } catch (err) {
      setLoadError(messageFor(err, 'Could not load open jobs.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function apply(jobId: string) {
    if (!session) return;
    setStatus(null);
    try {
      await apiFetch(`/v1/jobs/${jobId}/applications`, {
        method: 'POST',
        token: session.accessToken,
        body: { proposedRate, message: message || undefined },
      });
      setStatus('Application submitted.');
      setApplyingId(null);
      setProposedRate('');
      setMessage('');
      setAppliedJobIds((prev) => new Set(prev).add(jobId));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to apply');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Eyebrow>Open postings</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Open jobs</h1>
      {status && <p className="mt-3 text-sm text-teal-dark">{status}</p>}

      <LoadState
        loading={loading}
        error={loadError}
        isEmpty={jobs.length === 0}
        emptyMessage="No open jobs right now."
        onRetry={loadJobs}
      />

      {!loading && !loadError && jobs.length > 0 && (
        <ul className="mt-6 space-y-4">
          {jobs.map((job, i) => (
            // Cap the stagger so a long list doesn't leave later rows waiting.
            <li key={job.id} className="animate-fade-up" style={{ '--delay': `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}>
              <Card interactive className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-ink">{job.title}</h2>
                    <p className="mt-0.5 text-sm text-ink/70">{job.location}</p>
                    <p className="mt-1.5 text-sm text-ink">
                      {job.currency} {job.offeredRate} / {job.rateUnit} · starts{' '}
                      {new Date(job.startsAt).toLocaleDateString()}
                    </p>
                    {job.description && <p className="mt-2 text-sm text-ink/70">{job.description}</p>}
                  </div>
                  {appliedJobIds.has(job.id) ? (
                    <div className="shrink-0">
                      <StatusPill status="applied" />
                    </div>
                  ) : (
                    <Button
                      variant={applyingId === job.id ? 'secondary' : 'primary'}
                      onClick={() => setApplyingId(applyingId === job.id ? null : job.id)}
                      className="shrink-0"
                    >
                      {applyingId === job.id ? 'Cancel' : 'Apply'}
                    </Button>
                  )}
                </div>

                {applyingId === job.id && (
                  <div className="mt-4 animate-fade-up space-y-4 border-t border-ink/10 pt-4">
                    <Field label="Your proposed rate">
                      <TextInput
                        type="number"
                        min={0}
                        value={proposedRate}
                        onChange={(e) => setProposedRate(e.target.value)}
                      />
                    </Field>
                    <Field label="Message (optional)">
                      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
                    </Field>
                    <Button onClick={() => apply(job.id)} disabled={!proposedRate}>
                      Submit application
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
