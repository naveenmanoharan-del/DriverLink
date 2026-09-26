'use client';

import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, apiUrl } from '@/lib/api';
import { BACKGROUND_LABELS, SECTOR_LABELS, type ResumeMeta, type WorkerProfile } from '@/lib/types';
import { Button, Card, Eyebrow, StatusPill } from '@/components/ui';
import { formatSize, ResumeInput, validateResume } from '@/components/resume-input';

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
        {profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : 'Candidate'}
      </h1>

      {profile && (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-4">
            <StatusPill status={profile.verificationStatus} />
            {profile.sectors?.map((s) => (
              <span key={s} className="rounded-full bg-bg-soft px-3 py-1 text-xs font-semibold text-body">
                {SECTOR_LABELS[s] ?? s}
              </span>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Item label="Background" value={profile.background ? BACKGROUND_LABELS[profile.background] : '—'} />
            <Item label="Qualification" value={profile.qualification ?? '—'} />
            <Item label="Experience" value={`${profile.yearsExperience} yrs`} />
            <Item
              label="Last designation"
              value={[profile.lastDesignation, profile.lastOrganisation].filter(Boolean).join(', ') || '—'}
            />
            {profile.retirementYear && <Item label="Retired" value={String(profile.retirementYear)} />}
            <Item label="City" value={profile.city ?? '—'} />
            <Item label="Expected" value={`${profile.currency} ${profile.minRate} / ${profile.rateUnit}`} />
          </dl>
        </Card>
      )}

      {session && <ResumeCard token={session.accessToken} />}

    </div>
  );
}

function ResumeCard({ token }: { token: string }) {
  const [meta, setMeta] = useState<ResumeMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiFetch<ResumeMeta | null>('/v1/workers/me/resume', { token })
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoaded(true));
    // Mount-only: a refreshed token must not re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file) return;
    const invalid = validateResume(file);
    if (invalid) return setMessage({ ok: false, text: invalid });
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('resume', file);
      const saved = await apiFetch<ResumeMeta>('/v1/workers/me/resume', { method: 'PUT', body: form, token });
      setMeta(saved);
      setFile(null);
      setMessage({ ok: true, text: 'Resume uploaded. Our team has been notified.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setBusy(false);
    }
  }

  // The download needs the auth header, so it can't be a plain link.
  async function download() {
    const res = await fetch(apiUrl('/v1/workers/me/resume/file'), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return setMessage({ ok: false, text: 'Could not download — try logging in again.' });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = meta?.fileName ?? 'resume';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="text-lg font-bold text-ink">Resume</h2>
      {!loaded ? (
        <p className="mt-2 text-sm text-body">Loading…</p>
      ) : meta ? (
        <p className="mt-2 text-sm text-body">
          <button onClick={download} className="font-medium text-accent-dark underline">
            {meta.fileName}
          </button>{' '}
          · {formatSize(meta.sizeBytes)} · uploaded {new Date(meta.updatedAt).toLocaleDateString()}
        </p>
      ) : (
        <p className="mt-2 text-sm text-warn">No resume on file yet — upload one so we can put you forward.</p>
      )}

      <div className="mt-4 space-y-3">
        <ResumeInput file={file} onChange={setFile} />
        {file && (
          <Button onClick={upload} disabled={busy} arrow={false}>
            {busy ? 'Uploading…' : meta ? 'Replace resume' : 'Upload resume'}
          </Button>
        )}
        {message && <p className={`text-sm ${message.ok ? 'text-teal-dark' : 'text-warn'}`}>{message.text}</p>}
      </div>
    </Card>
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
