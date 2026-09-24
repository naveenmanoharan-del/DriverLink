'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminShell, Detail, ErrorNote, SmallButton } from '@/components/admin/admin-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { StatusPill } from '@/components/ui';
import { formatDate, useAdminApi, useAdminQuery, type ClientDetail } from '@/lib/admin';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useAdminApi();
  const { data: c, error, reload } = useAdminQuery<ClientDetail>(`/v1/admin/clients/${id}`);
  const [dialog, setDialog] = useState<'delete' | 'deactivate' | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const label = c ? c.companyName || c.name : '';

  async function act(kind: 'delete' | 'deactivate' | 'activate') {
    if (!c) return;
    setBusy(true);
    setDialogError(null);
    try {
      if (kind === 'delete') {
        await api(`/v1/admin/users/${c.userId}`, 'DELETE');
        router.replace('/admin/clients');
        return;
      }
      await api(`/v1/admin/users/${c.userId}/active`, 'PATCH', { isActive: kind === 'activate' });
      setDialog(null);
      reload();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title={label || 'Client'}
      actions={
        c && (
          <>
            {c.isActive ? (
              <SmallButton onClick={() => setDialog('deactivate')}>Deactivate account</SmallButton>
            ) : (
              <SmallButton tone="primary" onClick={() => act('activate')}>
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
      <Link href="/admin/clients" className="text-sm font-medium text-accent-dark underline">
        ← All clients
      </Link>
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {c && (
        <div className="mt-4 space-y-6">
          {!c.isActive && <ErrorNote>This account is deactivated and cannot log in.</ErrorNote>}
          <section className="rounded-2xl border border-line bg-white p-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Detail label="Contact person">{c.name}</Detail>
              <Detail label="Type">{c.clientType === 'company' ? 'Company' : 'Individual'}</Detail>
              <Detail label="Phone">
                <a className="text-accent-dark underline" href={`tel:${c.phone}`}>{c.phone}</a>
              </Detail>
              <Detail label="Email">
                {c.email && <a className="text-accent-dark underline" href={`mailto:${c.email}`}>{c.email}</a>}
              </Detail>
              <Detail label="City">{c.city}</Detail>
              <Detail label="Address">{c.address}</Detail>
              <Detail label="Joined">{formatDate(c.createdAt, true)}</Detail>
              <Detail label="Last login">{formatDate(c.lastLoginAt, true)}</Detail>
            </dl>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink">Jobs posted ({c.jobs.length})</h2>
            {c.jobs.length === 0 ? (
              <p className="mt-2 text-sm text-body">No jobs posted.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {c.jobs.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-ink">
                      {j.title} <span className="text-body">· {j.location}</span>
                    </span>
                    <span className="flex items-center gap-3 text-body">
                      {j.applications} applicant{j.applications === 1 ? '' : 's'} · {formatDate(j.createdAt)}
                      <StatusPill status={j.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink">Placements ({c.placements.length})</h2>
            {c.placements.length === 0 ? (
              <p className="mt-2 text-sm text-body">No placements linked to this client.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {c.placements.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-ink">
                      {p.workerId ? (
                        <Link className="underline" href={`/admin/candidates/${p.workerId}`}>{p.candidateName}</Link>
                      ) : (
                        p.candidateName
                      )}{' '}
                      <span className="text-body">· {p.position}</span>
                    </span>
                    <span className="flex items-center gap-3 text-body">
                      {formatDate(p.startDate)} <StatusPill status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog === 'delete' ? 'Delete this client permanently?' : 'Deactivate this client?'}
        body={
          dialog === 'delete' ? (
            <>This removes the account, its jobs and their applications. Placement records are kept. It cannot be undone.</>
          ) : (
            <>They will be signed out and unable to log in until reactivated.</>
          )
        }
        confirmLabel={dialog === 'delete' ? 'Delete permanently' : 'Deactivate'}
        confirmText={dialog === 'delete' ? label : undefined}
        busy={busy}
        error={dialogError}
        onConfirm={() => act(dialog === 'delete' ? 'delete' : 'deactivate')}
        onClose={() => {
          setDialog(null);
          setDialogError(null);
        }}
      />
    </AdminShell>
  );
}
