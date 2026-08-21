'use client';

import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { JobApplication } from '@/lib/types';
import { Button, Card, Eyebrow, StatusPill } from '@/components/ui';
import { LoadState, messageFor } from '@/components/load-state';

export default function WorkerApplicationsPage() {
  return (
    <RequireRole role="worker">
      <ApplicationsList />
    </RequireRole>
  );
}

function ApplicationsList() {
  const { session } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<JobApplication[]>('/v1/applications/mine', { token: session.accessToken });
      setApplications(result);
    } catch (err) {
      setError(messageFor(err, 'Could not load your applications.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function withdraw(id: string) {
    if (!session) return;
    await apiFetch(`/v1/applications/${id}/withdraw`, { method: 'PATCH', token: session.accessToken });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Eyebrow>Your applications</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        My applications
      </h1>

      <LoadState
        loading={loading}
        error={error}
        isEmpty={applications.length === 0}
        emptyMessage="You haven't applied to any jobs yet."
        onRetry={load}
      />

      {!loading && !error && applications.length > 0 && (
        <ul className="mt-6 space-y-3">
          {applications.map((app, i) => (
            <li key={app.id} className="animate-fade-up" style={{ '--delay': `${Math.min(i, 8) * 60}ms` } as React.CSSProperties}>
              <Card className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm text-ink">
                    Proposed rate: <span className="font-semibold">{app.proposedRate}</span>
                  </p>
                  <div className="mt-1.5">
                    <StatusPill status={app.status} />
                  </div>
                </div>
                {app.status === 'pending' && (
                  <Button variant="secondary" onClick={() => withdraw(app.id)}>
                    Withdraw
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
