'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AdminShell, ErrorNote } from '@/components/admin/admin-shell';
import { BarList, ChartCard, ColumnChart, StatTile } from '@/components/admin/charts';
import {
  CONTRACT_LABELS,
  LEGACY_GROUPS,
  PIPELINE_LABELS,
  formatDate,
  qs,
  useAdminQuery,
  type ContractType,
  type PipelineStatus,
  type Stats,
} from '@/lib/admin';
import { BACKGROUND_LABELS, GROUP_LABELS, SECTOR_LABELS, type Background, type Sector } from '@/lib/types';

const RANGES = [
  { days: undefined, label: 'All time' },
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
] as const;

const SHORT_BACKGROUND: Record<string, string> = {
  retired_railway: 'Retired railway',
  retired_govt: 'Retired govt / PSU',
  private_sector: 'Private sector',
  fresher: 'Fresher',
  unspecified: 'Not stated',
};

export default function AdminDashboardPage() {
  const [days, setDays] = useState<number | undefined>(undefined);
  const [series, setSeries] = useState<'candidates' | 'clients'>('candidates');
  const { data, error, refreshing } = useAdminQuery<Stats>(`/v1/admin/stats${qs({ days })}`);
  const rangeLabel = RANGES.find((r) => r.days === days)?.label.toLowerCase() ?? 'all time';

  return (
    <AdminShell
      title="Dashboard"
      actions={
        <Link
          href="/admin/candidates"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Review candidates
        </Link>
      }
    >
      {error && <ErrorNote>Could not load the dashboard: {error}</ErrorNote>}
      {!data && !error && <p className="text-sm text-body">Loading…</p>}
      {data && (
        <div className={`space-y-8 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          <Totals stats={data} />

          <ChartCard
            title={series === 'candidates' ? 'New candidates per week' : 'New clients per week'}
            subtitle="Last 12 weeks, India time"
            table={data.weekly.map((w) => [`Week of ${weekLabel(w.week)}`, w[series]])}
          >
            <div className="mb-4 inline-flex rounded-full border border-line p-0.5 text-xs font-medium" role="group">
              {(['candidates', 'clients'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={series === s}
                  onClick={() => setSeries(s)}
                  className={`rounded-full px-3 py-1 capitalize ${series === s ? 'bg-ink text-white' : 'text-body hover:text-ink'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <ColumnChart
              data={data.weekly.map((w) => ({ label: w.week, value: w[series] }))}
              formatLabel={weekLabel}
              valueName={series === 'candidates' ? 'new candidates' : 'new clients'}
            />
          </ChartCard>

          <section>
            {/* One filter row, scoping every breakdown below it. */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-lg font-bold text-ink">Who has registered</h2>
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  aria-pressed={days === r.days}
                  onClick={() => setDays(r.days)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    days === r.days ? 'border-ink bg-ink text-white' : 'border-line text-body hover:bg-bg-soft'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-body">
              Charts below count candidates registered {rangeLabel === 'all time' ? 'at any time' : `in the ${rangeLabel}`}. Click a
              bar to see those candidates.
            </p>
            <Breakdowns stats={data} />
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink">Placements</h2>
            <p className="mt-1 text-xs text-body">All time. Includes placements recorded by admins and applications clients accepted.</p>
            <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
              <ChartCard
                title="Placements by company"
                subtitle="Top 12 companies"
                table={data.byCompany.map((c) => [c.key, `${c.count} (${c.active} active)`])}
              >
                <BarList
                  emptyMessage="No placements recorded yet."
                  data={data.byCompany.map((c) => ({
                    label: c.key,
                    value: c.count,
                    detail: `${c.active} currently active`,
                    href: `/admin/placements${qs({ q: c.key })}`,
                  }))}
                />
              </ChartCard>
              <ChartCard
                title="Placements by contract type"
                table={data.byContractType.map((c) => [CONTRACT_LABELS[c.key as ContractType] ?? c.key, c.count])}
              >
                <BarList
                  emptyMessage="No placements recorded yet."
                  data={data.byContractType.map((c) => ({
                    label: CONTRACT_LABELS[c.key as ContractType] ?? c.key,
                    value: c.count,
                    href: `/admin/placements${qs({ contractType: c.key })}`,
                  }))}
                />
              </ChartCard>
              <ChartCard
                title="Placements started per month"
                subtitle="Last 12 months"
                className="lg:col-span-2"
                table={data.placementsMonthly.map((m) => [monthLabel(m.month), m.count])}
              >
                <ColumnChart
                  data={data.placementsMonthly.map((m) => ({ label: m.month, value: m.count }))}
                  formatLabel={monthLabel}
                  valueName="placements started"
                />
              </ChartCard>
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-ink">Latest sign-ups</h2>
              <Link href="/admin/candidates" className="text-sm font-medium text-accent-dark underline">
                All candidates
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
              {data.recent.length === 0 && <li className="p-4 text-sm text-body">Nobody has registered yet.</li>}
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/candidates/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-bg-soft">
                    <span>
                      <span className="font-medium text-ink">{r.name}</span>
                      <span className="ml-2 text-sm text-body">{r.category}</span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-body">
                      {r.background && <span>{SHORT_BACKGROUND[r.background]}</span>}
                      {!r.hasResume && <span className="rounded-full bg-warn/10 px-2 py-0.5 font-medium text-warn">No resume</span>}
                      <span>{formatDate(r.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function Totals({ stats }: { stats: Stats }) {
  const t = stats.totals;
  const delta = t.candidates_7d - t.candidates_prev_7d;
  const resumePct = t.candidates ? Math.round((t.with_resume / t.candidates) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        label="Candidates"
        value={t.candidates}
        href="/admin/candidates"
        note={
          <>
            {t.candidates_7d} this week ({delta >= 0 ? '+' : '−'}
            {Math.abs(delta)} vs last week)
          </>
        }
      />
      <StatTile
        label="Awaiting review"
        value={t.awaiting_review}
        href="/admin/candidates?pipelineStatus=new"
        note="Pipeline status “New”"
      />
      <StatTile
        label="Placed now"
        value={t.placements_active}
        href="/admin/placements?status=active"
        note={`${t.placed_candidates} people placed · ${t.companies_served} companies`}
      />
      <StatTile label="Clients" value={t.clients} href="/admin/clients" note={`${t.clients_30d} in the last 30 days`} />
      <StatTile
        label="Resumes on file"
        value={`${resumePct}%`}
        href="/admin/candidates?hasResume=false"
        note={`${t.candidates - t.with_resume} candidates without one`}
      />
      <StatTile
        label="Retired railway"
        value={t.retired_railway}
        href="/admin/candidates?background=retired_railway"
        note="Officers and staff from IR and its PSUs"
      />
      <StatTile label="Total placements" value={t.placements_total} href="/admin/placements" note="Including completed" />
      <StatTile label="Open client jobs" value={t.open_jobs} note="Posted on the platform" />
    </div>
  );
}

function Breakdowns({ stats }: { stats: Stats }) {
  // Old-taxonomy groups collapse into one bucket rather than cluttering the chart.
  const groups = new Map<string, number>();
  for (const g of stats.byGroup) {
    const key = LEGACY_GROUPS.includes(g.key) ? 'legacy' : g.key;
    groups.set(key, (groups.get(key) ?? 0) + g.count);
  }
  const groupLabel = (k: string) => (k === 'legacy' ? 'Legacy categories' : (GROUP_LABELS[k] ?? k));
  const pipelineOrder = Object.keys(PIPELINE_LABELS) as PipelineStatus[];
  const pipeline = pipelineOrder.map((k) => ({
    key: k,
    count: stats.byPipeline.find((p) => p.key === k)?.count ?? 0,
  }));

  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
      <ChartCard title="By department" table={[...groups].map(([k, v]) => [groupLabel(k), v])}>
        <BarList
          data={[...groups].map(([k, v]) => ({
            label: groupLabel(k),
            value: v,
            href: k === 'legacy' ? undefined : `/admin/candidates${qs({ group: k })}`,
          }))}
        />
      </ChartCard>
      <ChartCard title="Recruitment pipeline" subtitle="In process order" table={pipeline.map((p) => [PIPELINE_LABELS[p.key], p.count])}>
        <BarList
          keepOrder
          data={pipeline.map((p) => ({
            label: PIPELINE_LABELS[p.key],
            value: p.count,
            href: `/admin/candidates${qs({ pipelineStatus: p.key })}`,
          }))}
        />
      </ChartCard>
      <ChartCard title="Top positions" subtitle="Up to 15" table={stats.byCategory.map((c) => [c.key, c.count])}>
        <BarList
          data={stats.byCategory.map((c) => ({
            label: c.key,
            value: c.count,
            detail: LEGACY_GROUPS.includes(c.group) ? 'Legacy category' : GROUP_LABELS[c.group],
          }))}
        />
      </ChartCard>
      <ChartCard
        title="Background"
        table={stats.byBackground.map((b) => [SHORT_BACKGROUND[b.key] ?? b.key, b.count])}
      >
        <BarList
          data={stats.byBackground.map((b) => ({
            label: SHORT_BACKGROUND[b.key] ?? b.key,
            value: b.count,
            detail: BACKGROUND_LABELS[b.key as Background],
            href: b.key === 'unspecified' ? undefined : `/admin/candidates${qs({ background: b.key })}`,
          }))}
        />
      </ChartCard>
      <ChartCard
        title="Sector"
        subtitle="A candidate can choose both"
        table={stats.bySector.map((s) => [SECTOR_LABELS[s.key as Sector] ?? s.key, s.count])}
      >
        <BarList
          data={stats.bySector.map((s) => ({
            label: SECTOR_LABELS[s.key as Sector] ?? s.key,
            value: s.count,
            href: `/admin/candidates${qs({ sector: s.key })}`,
          }))}
        />
      </ChartCard>
      <ChartCard title="Experience" table={stats.byExperience.map((e) => [e.key, e.count])}>
        <BarList keepOrder data={stats.byExperience.map((e) => ({ label: e.key, value: e.count }))} />
      </ChartCard>
      <ChartCard title="Top cities" subtitle="Up to 10" table={stats.byCity.map((c) => [c.key, c.count])}>
        <BarList
          data={stats.byCity.map((c) => ({
            label: c.key,
            value: c.count,
            href: `/admin/candidates${qs({ city: c.key })}`,
          }))}
        />
      </ChartCard>
    </div>
  );
}

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function monthLabel(ym: string) {
  return new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}
