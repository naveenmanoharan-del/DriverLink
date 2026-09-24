'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AdminShell, ErrorNote, Pager } from '@/components/admin/admin-shell';
import { formatDate, qs, useAdminQuery, type AuditEntry, type Paged } from '@/lib/admin';

const TYPES = [
  { value: '', label: 'Everything' },
  { value: 'candidate', label: 'Candidates' },
  { value: 'worker', label: 'Candidate accounts' },
  { value: 'client', label: 'Client accounts' },
  { value: 'placement', label: 'Placements' },
  { value: 'admin', label: 'Admins' },
];

function targetHref(e: AuditEntry) {
  if (!e.targetId || e.action.endsWith('.delete')) return null;
  if (e.targetType === 'candidate') return `/admin/candidates/${e.targetId}`;
  return null;
}

export default function ActivityPage() {
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, refreshing } = useAdminQuery<Paged<AuditEntry>>(`/v1/admin/audit${qs({ targetType, page, pageSize: 50 })}`);

  return (
    <AdminShell title="Activity">
      <p className="text-sm text-body">Every change made by an admin: who did it, and when.</p>
      <select
        aria-label="Filter activity"
        value={targetType}
        onChange={(e) => {
          setTargetType(e.target.value);
          setPage(1);
        }}
        className="mt-4 rounded-xl border border-line px-3 py-2 text-sm"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {data && (
        <div className={`mt-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          {data.total === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-body">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {data.data.map((e) => {
                const href = targetHref(e);
                return (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                    <span className="text-ink">
                      {href ? <Link href={href} className="hover:underline">{e.summary}</Link> : e.summary}
                    </span>
                    <span className="text-xs text-body">
                      {e.actorLabel} · {formatDate(e.createdAt, true)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}
    </AdminShell>
  );
}
