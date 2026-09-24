'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminShell, Detail, ErrorNote, SmallButton } from '@/components/admin/admin-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PlacementForm } from '@/components/admin/placement-form';
import { StatusPill } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import {
  CONTRACT_LABELS,
  PIPELINE_LABELS,
  fetchFile,
  formatDate,
  formatInr,
  saveBlob,
  useAdminApi,
  useAdminQuery,
  type CandidateDetail,
  type PipelineStatus,
} from '@/lib/admin';
import { BACKGROUND_LABELS, GROUP_LABELS, SECTOR_LABELS } from '@/lib/types';
import { formatSize } from '@/components/resume-input';

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useAdminApi();
  const { session } = useAuth();
  const { data: c, error, reload, setData } = useAdminQuery<CandidateDetail>(`/v1/admin/candidates/${id}`);

  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [dialog, setDialog] = useState<'delete' | 'deactivate' | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Free the preview's object URL when it changes or the page closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function openResume(mode: 'preview' | 'download') {
    if (!c || !session) return;
    setFileError(null);
    try {
      const { blob, fileName } = await fetchFile(
        `/v1/admin/candidates/${c.id}/resume${mode === 'preview' ? '?inline=true' : ''}`,
        session.accessToken,
      );
      if (mode === 'download') saveBlob(blob, fileName);
      else setPreview(URL.createObjectURL(blob));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not open the resume');
    }
  }

  async function confirmDialog() {
    if (!c) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog === 'delete') {
        await api(`/v1/admin/users/${c.userId}`, 'DELETE');
        router.replace('/admin/candidates');
        return;
      }
      await api(`/v1/admin/users/${c.userId}/active`, 'PATCH', { isActive: !c.isActive });
      setDialog(null);
      reload();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setDialogBusy(false);
    }
  }

  return (
    <AdminShell
      title={c?.name ?? 'Candidate'}
      actions={
        c && (
          <>
            {c.isActive ? (
              <SmallButton onClick={() => setDialog('deactivate')}>Deactivate account</SmallButton>
            ) : (
              <SmallButton tone="primary" onClick={confirmDialog}>
                Reactivate account
              </SmallButton>
            )}
            <SmallButton tone="danger" onClick={() => setDialog('delete')}>
              Delete permanently
            </SmallButton>
          </>
        )
      }
    >
      <Link href="/admin/candidates" className="text-sm font-medium text-accent-dark underline">
        ← All candidates
      </Link>
      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {c && (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {!c.isActive && (
              <ErrorNote>This account is deactivated: the candidate cannot log in and is hidden from clients.</ErrorNote>
            )}
            <section className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap gap-2">
                <StatusPill status={c.pipelineStatus} />
                <StatusPill status={c.verificationStatus} />
                {c.sectors.map((s) => (
                  <span key={s} className="rounded-full bg-bg-soft px-3 py-1 text-xs font-semibold text-body">
                    {SECTOR_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Detail label="Position">{c.category}</Detail>
                <Detail label="Department">{GROUP_LABELS[c.group] ?? 'Legacy category'}</Detail>
                <Detail label="Background">{c.background ? BACKGROUND_LABELS[c.background] : null}</Detail>
                <Detail label="Qualification">{c.qualification}</Detail>
                <Detail label="Experience">{`${c.yearsExperience} years`}</Detail>
                <Detail label="Retirement year">{c.retirementYear ? String(c.retirementYear) : null}</Detail>
                <Detail label="Last designation">{c.lastDesignation}</Detail>
                <Detail label="Last organisation">{c.lastOrganisation}</Detail>
                <Detail label="City">{c.city}</Detail>
                <Detail label="Expected">{`${formatInr(c.minRate)} / ${c.rateUnit}`}</Detail>
                <Detail label="Phone">
                  <a className="text-accent-dark underline" href={`tel:${c.phone}`}>
                    {c.phone}
                  </a>
                </Detail>
                <Detail label="Email">
                  {c.email && (
                    <a className="text-accent-dark underline" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>
                  )}
                </Detail>
                <Detail label="Registered">{formatDate(c.createdAt, true)}</Detail>
                <Detail label="Last login">{formatDate(c.lastLoginAt, true)}</Detail>
                <Detail label="Profile updated">{formatDate(c.updatedAt, true)}</Detail>
              </dl>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-ink">Resume</h2>
              {c.resume ? (
                <>
                  <p className="mt-1 text-sm text-body">
                    {c.resume.fileName} · {formatSize(c.resume.sizeBytes)} · uploaded {formatDate(c.resume.updatedAt, true)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {c.resume.mimeType === 'application/pdf' && (
                      <SmallButton tone="primary" onClick={() => (preview ? setPreview(null) : openResume('preview'))}>
                        {preview ? 'Hide preview' : 'Preview'}
                      </SmallButton>
                    )}
                    <SmallButton onClick={() => openResume('download')}>Download</SmallButton>
                  </div>
                  {preview && (
                    <iframe title="Resume preview" src={preview} className="mt-4 h-[70vh] w-full rounded-xl border border-line" />
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-warn">No resume uploaded.</p>
              )}
              {fileError && <p className="mt-2 text-sm text-warn">{fileError}</p>}
            </section>

            <section className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink">Placements</h2>
                {!placing && (
                  <SmallButton tone="primary" onClick={() => setPlacing(true)}>
                    Record placement
                  </SmallButton>
                )}
              </div>
              {placing && (
                <div className="mt-4">
                  <PlacementForm
                    candidate={{ id: c.id, name: c.name, position: c.category }}
                    onSaved={() => {
                      setPlacing(false);
                      reload();
                    }}
                    onCancel={() => setPlacing(false)}
                  />
                </div>
              )}
              {c.placements.length === 0 && !placing && <p className="mt-2 text-sm text-body">Not placed yet.</p>}
              <ul className="mt-3 divide-y divide-line">
                {c.placements.map((p) => (
                  <li key={p.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink">
                        {p.position} · {p.companyName}
                      </span>
                      <StatusPill status={p.status} />
                    </div>
                    <p className="mt-0.5 text-body">
                      {[p.projectName, CONTRACT_LABELS[p.contractType], p.location].filter(Boolean).join(' · ')} ·{' '}
                      {formatDate(p.startDate)} – {p.endDate ? formatDate(p.endDate) : 'ongoing'} · {formatInr(p.monthlyRemuneration)}/mo
                    </p>
                  </li>
                ))}
              </ul>
              <Link href={`/admin/placements?workerId=${c.id}`} className="mt-2 inline-block text-sm text-accent-dark underline">
                Manage in Placements
              </Link>
            </section>

            {c.applications.length > 0 && (
              <section className="rounded-2xl border border-line bg-white p-5">
                <h2 className="text-[15px] font-semibold text-ink">Applications on the platform</h2>
                <ul className="mt-3 divide-y divide-line text-sm">
                  {c.applications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2">
                      <span className="text-ink">{a.jobTitle}</span>
                      <span className="flex items-center gap-3 text-body">
                        {formatDate(a.createdAt)} <StatusPill status={a.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {/* Keyed on updatedAt: a fresh copy of the record resets the form. */}
            <RecruitmentPanel key={c.updatedAt} candidate={c} onSaved={setData} />
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={dialog !== null}
        title={dialog === 'delete' ? 'Delete this candidate permanently?' : 'Deactivate this account?'}
        body={
          dialog === 'delete' ? (
            <>
              This removes {c?.name}&apos;s account, profile, resume and applications. It cannot be undone. Placement records
              are kept, with the name.
            </>
          ) : (
            <>They will be signed out everywhere and unable to log in until you reactivate them. Nothing is deleted.</>
          )
        }
        confirmLabel={dialog === 'delete' ? 'Delete permanently' : 'Deactivate'}
        confirmText={dialog === 'delete' ? c?.name : undefined}
        busy={dialogBusy}
        error={dialogError}
        onConfirm={confirmDialog}
        onClose={() => {
          setDialog(null);
          setDialogError(null);
        }}
      />
    </AdminShell>
  );
}

/** Pipeline, verification and private notes, saved together. */
function RecruitmentPanel({ candidate: c, onSaved }: { candidate: CandidateDetail; onSaved: (c: CandidateDetail) => void }) {
  const api = useAdminApi();
  const [pipeline, setPipeline] = useState<PipelineStatus>(c.pipelineStatus);
  const [verification, setVerification] = useState(c.verificationStatus);
  const [notes, setNotes] = useState(c.adminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = pipeline !== c.pipelineStatus || verification !== c.verificationStatus || notes !== (c.adminNotes ?? '');

  async function save() {
    setSaving(true);
    setSaveState(null);
    try {
      const body: Record<string, string> = {};
      if (pipeline !== c.pipelineStatus) body.pipelineStatus = pipeline;
      if (verification !== c.verificationStatus) body.verificationStatus = verification;
      if (notes !== (c.adminNotes ?? '')) body.adminNotes = notes;
      onSaved(await api<CandidateDetail>(`/v1/admin/candidates/${c.id}`, 'PATCH', body));
    } catch (err) {
      setSaveState({ ok: false, text: err instanceof Error ? err.message : 'Save failed' });
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24">
      <h2 className="text-[15px] font-semibold text-ink">Recruitment</h2>
      <label className="mt-4 block text-sm text-body">
        Pipeline status
        <select
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-ink"
          value={pipeline}
          onChange={(e) => setPipeline(e.target.value as PipelineStatus)}
        >
          {Object.entries(PIPELINE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm text-body">
        Verification
        <select
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-ink"
          value={verification}
          onChange={(e) => setVerification(e.target.value as typeof verification)}
        >
          <option value="pending">Pending</option>
          <option value="verified">Verified (documents checked)</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label className="mt-4 block text-sm text-body">
        Private notes <span className="text-xs">(only admins see these)</span>
        <textarea
          rows={6}
          maxLength={5000}
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interview feedback, availability, references…"
        />
        <span className="text-xs">{notes.length}/5000</span>
      </label>
      <div className="mt-3 flex items-center gap-3">
        <SmallButton tone="primary" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </SmallButton>
        {saveState && (
          <span role="status" className={`text-sm ${saveState.ok ? 'text-teal-dark' : 'text-warn'}`}>
            {saveState.text}
          </span>
        )}
        {c.updatedAt && !dirty && !saveState && <span className="text-xs text-body">Saved {formatDate(c.updatedAt, true)}</span>}
      </div>
    </section>
  );
}
