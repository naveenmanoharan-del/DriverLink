'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { SmallButton } from './admin-shell';
import {
  CONTRACT_LABELS,
  PLACEMENT_STATUS_LABELS,
  qs,
  useAdminApi,
  useAdminQuery,
  type CandidateRow,
  type Paged,
  type Placement,
} from '@/lib/admin';
import { SECTOR_LABELS } from '@/lib/types';

/** Today as YYYY-MM-DD in the browser's time zone (toISOString is UTC, which
 *  is still "yesterday" in India until 5:30 am). */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const inputCls =
  'mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

/**
 * Records a new placement, or edits one. With `candidate` fixed (from a
 * candidate's page) the picker is skipped; otherwise the admin searches
 * registered candidates or types a name for someone not on the platform.
 */
export function PlacementForm({
  candidate,
  existing,
  onSaved,
  onCancel,
}: {
  candidate?: { id: string; name: string; position?: string };
  existing?: Placement;
  onSaved: (placement: Placement) => void;
  onCancel: () => void;
}) {
  const api = useAdminApi();
  const { data: companies } = useAdminQuery<string[]>('/v1/admin/companies');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(candidate ?? null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [form, setForm] = useState({
    candidateName: existing?.candidateName ?? '',
    companyName: existing?.companyName ?? '',
    position: existing?.position ?? candidate?.position ?? '',
    projectName: existing?.projectName ?? '',
    contractType: existing?.contractType ?? 'gc',
    sector: existing?.sector ?? 'railways',
    location: existing?.location ?? '',
    startDate: existing?.startDate ?? localToday(),
    endDate: existing?.endDate ?? '',
    monthlyRemuneration: existing?.monthlyRemuneration ? String(Number(existing.monthlyRemuneration)) : '',
    status: existing?.status ?? 'active',
    notes: existing?.notes ?? '',
  });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: matches } = useAdminQuery<Paged<CandidateRow>>(
    !existing && !candidate && debounced.length >= 2 ? `/v1/admin/candidates${qs({ q: debounced, pageSize: 6 })}` : null,
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.endDate && form.endDate < form.startDate) return setError('End date cannot be before the start date.');
    if (!existing && !picked && !form.candidateName.trim())
      return setError('Pick a registered candidate or type the candidate’s name.');
    setSaving(true);
    try {
      const common = {
        companyName: form.companyName.trim(),
        position: form.position.trim(),
        projectName: form.projectName.trim() || undefined,
        contractType: form.contractType,
        sector: form.sector || undefined,
        location: form.location.trim() || undefined,
        startDate: form.startDate,
        monthlyRemuneration: form.monthlyRemuneration || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      const saved = existing
        ? await api<Placement>(`/v1/admin/placements/${existing.id}`, 'PATCH', {
            ...common,
            endDate: form.endDate || null,
          })
        : await api<Placement>('/v1/admin/placements', 'POST', {
            ...common,
            endDate: form.endDate || undefined,
            ...(picked ? { workerId: picked.id } : { candidateName: form.candidateName.trim() }),
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" aria-label={existing ? 'Edit placement' : 'Record placement'}>
      {!existing && !candidate && (
        <div className="sm:col-span-2">
          {picked ? (
            <p className="text-sm text-ink">
              Candidate: <strong>{picked.name}</strong>{' '}
              <button type="button" className="ml-2 text-accent-dark underline" onClick={() => setPicked(null)}>
                change
              </button>
            </p>
          ) : (
            <>
              <label className="block text-sm text-body">
                Candidate
                <input
                  className={inputCls}
                  placeholder="Search registered candidates by name or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {matches && matches.data.length > 0 && (
                <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
                  {matches.data.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-soft"
                        onClick={() => {
                          setPicked({ id: m.id, name: m.name });
                          if (!form.position) update('position', m.category);
                        }}
                      >
                        <span className="font-medium text-ink">{m.name}</span>{' '}
                        <span className="text-body">
                          · {m.category} · {m.phone}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-3 block text-sm text-body">
                …or someone not registered
                <input
                  className={inputCls}
                  placeholder="Full name"
                  maxLength={255}
                  value={form.candidateName}
                  onChange={(e) => update('candidateName', e.target.value)}
                />
              </label>
            </>
          )}
        </div>
      )}
      <label className="text-sm text-body">
        Company
        <input
          required
          maxLength={255}
          list="placement-companies"
          className={inputCls}
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
        />
        <datalist id="placement-companies">
          {companies?.map((c) => <option key={c} value={c} />)}
        </datalist>
      </label>
      <label className="text-sm text-body">
        Position
        <input required maxLength={255} className={inputCls} value={form.position} onChange={(e) => update('position', e.target.value)} />
      </label>
      <label className="text-sm text-body">
        Project / contract
        <input maxLength={255} className={inputCls} value={form.projectName} onChange={(e) => update('projectName', e.target.value)} />
      </label>
      <label className="text-sm text-body">
        Contract type
        <select className={inputCls} value={form.contractType} onChange={(e) => update('contractType', e.target.value as typeof form.contractType)}>
          {Object.entries(CONTRACT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-body">
        Sector
        <select className={inputCls} value={form.sector ?? ''} onChange={(e) => update('sector', e.target.value as typeof form.sector)}>
          {Object.entries(SECTOR_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-body">
        Location
        <input maxLength={255} className={inputCls} value={form.location} onChange={(e) => update('location', e.target.value)} />
      </label>
      <label className="text-sm text-body">
        Start date
        <input required type="date" className={inputCls} value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
      </label>
      <label className="text-sm text-body">
        End date (optional)
        <input type="date" min={form.startDate} className={inputCls} value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
      </label>
      <label className="text-sm text-body">
        Monthly remuneration (₹)
        <input
          type="number"
          min={0}
          step="0.01"
          className={inputCls}
          value={form.monthlyRemuneration}
          onChange={(e) => update('monthlyRemuneration', e.target.value)}
        />
      </label>
      <label className="text-sm text-body">
        Status
        <select className={inputCls} value={form.status} onChange={(e) => update('status', e.target.value as typeof form.status)}>
          {Object.entries(PLACEMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-body sm:col-span-2">
        Notes
        <textarea rows={2} maxLength={5000} className={inputCls} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      </label>
      {error && <p className="text-sm text-warn sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <SmallButton type="submit" tone="primary" disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Record placement'}
        </SmallButton>
        <SmallButton onClick={onCancel}>Cancel</SmallButton>
      </div>
    </form>
  );
}
