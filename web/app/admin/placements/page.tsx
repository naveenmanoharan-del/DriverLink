'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminShell, ErrorNote, Pager, SmallButton } from '@/components/admin/admin-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PlacementForm } from '@/components/admin/placement-form';
import { StatusPill } from '@/components/ui';
import {
  CONTRACT_LABELS,
  PLACEMENT_STATUS_LABELS,
  formatDate,
  formatInr,
  qs,
  useAdminApi,
  useAdminQuery,
  type Paged,
  type Placement,
} from '@/lib/admin';

export default function PlacementsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-body">Loading…</p>}>
      <Placements />
    </Suspense>
  );
}

function Placements() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const api = useAdminApi();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Placement | null>(null);
  const [deleting, setDeleting] = useState<Placement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const page = Number(params.get('page') ?? '1') || 1;
  const filters = {
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? undefined,
    contractType: params.get('contractType') ?? undefined,
    workerId: params.get('workerId') ?? undefined,
  };
  const { data, error, refreshing, reload } = useAdminQuery<Paged<Placement>>(
    `/v1/admin/placements${qs({ ...filters, page, pageSize: 25 })}`,
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  useEffect(() => {
    if (search === (params.get('q') ?? '')) return;
    const t = setTimeout(() => setParam('q', search.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/v1/admin/placements/${deleting.id}`, 'DELETE');
      setDeleting(null);
      reload();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Placements"
      actions={
        !adding && (
          <SmallButton tone="primary" onClick={() => setAdding(true)}>
            Record placement
          </SmallButton>
        )
      }
    >
      {(adding || editing) && (
        <section className="mb-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-ink">
            {editing ? `Edit placement: ${editing.candidateName}` : 'Record a placement'}
          </h2>
          <PlacementForm
            key={editing?.id ?? 'new'}
            existing={editing ?? undefined}
            onSaved={() => {
              setAdding(false);
              setEditing(null);
              reload();
            }}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="Search placements"
          placeholder="Search candidate, company, position, project, location…"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-64 flex-1 rounded-xl border border-line px-3 py-2 text-sm"
        />
        <select aria-label="Status" className="rounded-xl border border-line px-3 py-2 text-sm" value={filters.status ?? ''} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Any status</option>
          {Object.entries(PLACEMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select aria-label="Contract type" className="rounded-xl border border-line px-3 py-2 text-sm" value={filters.contractType ?? ''} onChange={(e) => setParam('contractType', e.target.value)}>
          <option value="">Any contract</option>
          {Object.entries(CONTRACT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {filters.workerId && (
          <button type="button" className="text-sm font-medium text-accent-dark underline" onClick={() => setParam('workerId', '')}>
            Showing one candidate · show all
          </button>
        )}
      </div>

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {data && (
        <div className={`mt-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          {data.total === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-body">No placements found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-bg-soft text-left text-xs text-body">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Candidate</th>
                    <th className="px-4 py-2.5 font-medium">Company</th>
                    <th className="px-4 py-2.5 font-medium">Position / project</th>
                    <th className="px-4 py-2.5 font-medium">Contract</th>
                    <th className="px-4 py-2.5 font-medium">Period</th>
                    <th className="px-4 py-2.5 text-right font-medium">Per month</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.data.map((p) => (
                    <tr key={p.id} className="hover:bg-bg-soft">
                      <td className="px-4 py-2.5 font-medium text-ink">
                        {p.workerId ? (
                          <Link className="hover:underline" href={`/admin/candidates/${p.workerId}`}>{p.candidateName}</Link>
                        ) : (
                          p.candidateName
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink">
                        {p.clientId ? <Link className="hover:underline" href={`/admin/clients/${p.clientId}`}>{p.companyName}</Link> : p.companyName}
                      </td>
                      <td className="px-4 py-2.5 text-body">
                        <div className="text-ink">{p.position}</div>
                        {p.projectName && <div className="text-xs">{p.projectName}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-body">{CONTRACT_LABELS[p.contractType]}</td>
                      <td className="px-4 py-2.5 text-body">
                        {formatDate(p.startDate)} – {p.endDate ? formatDate(p.endDate) : 'ongoing'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatInr(p.monthlyRemuneration)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={p.status} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <button
                          type="button"
                          className="mr-3 text-accent-dark underline"
                          onClick={() => {
                            setAdding(false);
                            setEditing(p);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="text-warn underline" onClick={() => setDeleting(p)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setParam('page', String(p))} />
        </div>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this placement?"
        body={deleting && <>Removes the record of {deleting.candidateName} at {deleting.companyName}. This cannot be undone.</>}
        confirmLabel="Delete"
        busy={busy}
        error={dialogError}
        onConfirm={remove}
        onClose={() => {
          setDeleting(null);
          setDialogError(null);
        }}
      />
    </AdminShell>
  );
}
