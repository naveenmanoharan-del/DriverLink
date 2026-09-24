'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminShell, ErrorNote, Pager, SmallButton } from '@/components/admin/admin-shell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  PIPELINE_LABELS,
  fetchFile,
  formatDate,
  saveBlob,
  useAdminQuery,
  type CandidateRow,
  type Paged,
} from '@/lib/admin';
import { BACKGROUND_LABELS, GROUP_LABELS, SECTOR_LABELS, type Category } from '@/lib/types';
import { StatusPill } from '@/components/ui';

/** Every filter lives in the URL, so a filtered view can be bookmarked or shared. */
const FILTER_KEYS = [
  'q', 'group', 'categoryId', 'background', 'sector', 'pipelineStatus', 'verificationStatus',
  'hasResume', 'isActive', 'city', 'minExperience', 'maxExperience', 'registeredFrom', 'registeredTo', 'sort',
] as const;

export default function CandidatesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-body">Loading…</p>}>
      <Candidates />
    </Suspense>
  );
}

// max-w-full: long option text (e.g. the backgrounds) would otherwise widen a
// select past a phone screen.
const selectCls =
  'max-w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

function Candidates() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const page = Number(params.get('page') ?? '1') || 1;
  const apiQuery = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = params.get(key);
    if (v) apiQuery.set(key, v);
  }
  const filterQs = apiQuery.toString();
  apiQuery.set('page', String(page));
  apiQuery.set('pageSize', '25');
  const { data, error, loading, refreshing } = useAdminQuery<Paged<CandidateRow>>(`/v1/admin/candidates?${apiQuery}`);

  useEffect(() => {
    apiFetch<Category[]>('/v1/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  // Debounce the free-text search so typing doesn't fire a request per key.
  useEffect(() => {
    if (search === (params.get('q') ?? '')) return;
    const t = setTimeout(() => setParam('q', search.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeFilters = FILTER_KEYS.filter((k) => k !== 'sort' && params.get(k)).length;

  async function exportCsv() {
    if (!session) return;
    setExporting(true);
    setExportError(null);
    try {
      const { blob, fileName } = await fetchFile(`/v1/admin/candidates/export${filterQs ? `?${filterQs}` : ''}`, session.accessToken);
      saveBlob(blob, fileName);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const grouped = categories.reduce<Record<string, Category[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <AdminShell
      title="Candidates"
      actions={
        <SmallButton onClick={exportCsv} disabled={exporting || !data?.total}>
          {exporting ? 'Exporting…' : `Export ${activeFilters ? 'filtered ' : ''}CSV`}
        </SmallButton>
      }
    >
      <div className="rounded-2xl border border-line bg-white p-4">
        <input
          type="search"
          aria-label="Search candidates"
          placeholder="Search name, phone, email, qualification, designation, organisation, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          className={`${selectCls} w-full`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <select aria-label="Department" className={selectCls} value={params.get('group') ?? ''} onChange={(e) => setParam('group', e.target.value)}>
            <option value="">All departments</option>
            {Object.entries(GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Position" className={selectCls} value={params.get('categoryId') ?? ''} onChange={(e) => setParam('categoryId', e.target.value)}>
            <option value="">All positions</option>
            {Object.entries(grouped).map(([group, items]) => (
              <optgroup key={group} label={GROUP_LABELS[group] ?? group}>
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select aria-label="Background" className={selectCls} value={params.get('background') ?? ''} onChange={(e) => setParam('background', e.target.value)}>
            <option value="">Any background</option>
            {Object.entries(BACKGROUND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Sector" className={selectCls} value={params.get('sector') ?? ''} onChange={(e) => setParam('sector', e.target.value)}>
            <option value="">Any sector</option>
            {Object.entries(SECTOR_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Pipeline status" className={selectCls} value={params.get('pipelineStatus') ?? ''} onChange={(e) => setParam('pipelineStatus', e.target.value)}>
            <option value="">Any status</option>
            {Object.entries(PIPELINE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Resume" className={selectCls} value={params.get('hasResume') ?? ''} onChange={(e) => setParam('hasResume', e.target.value)}>
            <option value="">Resume: any</option>
            <option value="true">Has resume</option>
            <option value="false">No resume</option>
          </select>
          <select aria-label="Account" className={selectCls} value={params.get('isActive') ?? ''} onChange={(e) => setParam('isActive', e.target.value)}>
            <option value="">Account: any</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-body">
          <input
            aria-label="City"
            placeholder="City"
            className={`${selectCls} w-32`}
            defaultValue={params.get('city') ?? ''}
            maxLength={100}
            onBlur={(e) => setParam('city', e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && setParam('city', e.currentTarget.value.trim())}
          />
          <span>Experience</span>
          <input
            aria-label="Minimum years of experience"
            type="number"
            min={0}
            max={70}
            placeholder="min"
            className={`${selectCls} w-20`}
            defaultValue={params.get('minExperience') ?? ''}
            onBlur={(e) => setParam('minExperience', e.target.value)}
          />
          <span>to</span>
          <input
            aria-label="Maximum years of experience"
            type="number"
            min={0}
            max={70}
            placeholder="max"
            className={`${selectCls} w-20`}
            defaultValue={params.get('maxExperience') ?? ''}
            onBlur={(e) => setParam('maxExperience', e.target.value)}
          />
          <span>Registered</span>
          <input
            aria-label="Registered from"
            type="date"
            className={selectCls}
            value={params.get('registeredFrom') ?? ''}
            onChange={(e) => setParam('registeredFrom', e.target.value)}
          />
          <span>to</span>
          <input
            aria-label="Registered to"
            type="date"
            className={selectCls}
            value={params.get('registeredTo') ?? ''}
            onChange={(e) => setParam('registeredTo', e.target.value)}
          />
          <select aria-label="Sort" className={selectCls} value={params.get('sort') ?? 'newest'} onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="experience_desc">Most experienced</option>
            <option value="experience_asc">Least experienced</option>
          </select>
          {activeFilters > 0 && (
            <button
              type="button"
              className="font-medium text-accent-dark underline"
              onClick={() => {
                setSearch('');
                router.replace(pathname);
              }}
            >
              Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {exportError && <div className="mt-4"><ErrorNote>{exportError}</ErrorNote></div>}
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {loading && !data && <p className="mt-6 text-sm text-body">Loading…</p>}

      {data && (
        <div className={`mt-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          <p className="text-sm text-body" aria-live="polite">
            {data.total.toLocaleString('en-IN')} candidate{data.total === 1 ? '' : 's'}
          </p>
          {data.total === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-body">
              No candidates match these filters.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-bg-soft text-left text-xs text-body">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Position</th>
                    <th className="px-4 py-2.5 font-medium">Background</th>
                    <th className="px-4 py-2.5 text-right font-medium">Exp.</th>
                    <th className="px-4 py-2.5 font-medium">City</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Resume</th>
                    <th className="px-4 py-2.5 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.data.map((c) => (
                    <tr key={c.id} className="hover:bg-bg-soft">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/candidates/${c.id}`} className="font-medium text-ink underline-offset-2 hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-xs text-body">{c.phone}</div>
                        {!c.isActive && <div className="text-xs font-medium text-warn">Deactivated</div>}
                      </td>
                      <td className="px-4 py-2.5 text-ink">{c.category}</td>
                      <td className="px-4 py-2.5 text-body">
                        {c.background ? BACKGROUND_LABELS[c.background].split(' (')[0].split(' /')[0] : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink">{c.yearsExperience}</td>
                      <td className="px-4 py-2.5 text-body">{c.city ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={c.pipelineStatus} />
                      </td>
                      <td className="px-4 py-2.5">
                        {c.hasResume ? <span className="text-teal-dark">Yes</span> : <span className="text-warn">No</span>}
                      </td>
                      <td className="px-4 py-2.5 text-body">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setParam('page', String(p))} />
        </div>
      )}
    </AdminShell>
  );
}
