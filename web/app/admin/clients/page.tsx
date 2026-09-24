'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell, ErrorNote, Pager } from '@/components/admin/admin-shell';
import { formatDate, qs, useAdminQuery, type ClientRow, type Paged } from '@/lib/admin';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, refreshing } = useAdminQuery<Paged<ClientRow>>(`/v1/admin/clients${qs({ q, isActive, page, pageSize: 25 })}`);

  return (
    <AdminShell title="Clients">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="Search clients"
          placeholder="Search company, contact, phone, email, city…"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-64 flex-1 rounded-xl border border-line px-3 py-2 text-sm"
        />
        <select
          aria-label="Account"
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-line px-3 py-2 text-sm"
        >
          <option value="">All accounts</option>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
        </select>
      </div>
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {data && (
        <div className={`mt-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          {data.total === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-body">No clients found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-bg-soft text-left text-xs text-body">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Company / name</th>
                    <th className="px-4 py-2.5 font-medium">Contact</th>
                    <th className="px-4 py-2.5 font-medium">City</th>
                    <th className="px-4 py-2.5 text-right font-medium">Jobs</th>
                    <th className="px-4 py-2.5 text-right font-medium">Placements</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.data.map((c) => (
                    <tr key={c.id} className="hover:bg-bg-soft">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/clients/${c.id}`} className="font-medium text-ink hover:underline">
                          {c.companyName || c.name}
                        </Link>
                        {!c.isActive && <div className="text-xs font-medium text-warn">Deactivated</div>}
                      </td>
                      <td className="px-4 py-2.5 text-body">
                        {c.name}
                        <div className="text-xs">{c.phone}{c.email ? ` · ${c.email}` : ''}</div>
                      </td>
                      <td className="px-4 py-2.5 text-body">{c.city ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.jobCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.placementCount}</td>
                      <td className="px-4 py-2.5 text-body">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}
    </AdminShell>
  );
}
