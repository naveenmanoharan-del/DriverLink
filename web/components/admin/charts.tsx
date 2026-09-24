'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';
import { compact } from '@/lib/admin';

/*
 * Single-series charts in the brand accent. Every chart here plots one measure,
 * so identity never rests on colour; the brand's accent/teal pair failed the
 * colour-vision validator as a two-series palette and is deliberately not used
 * to tell series apart. Values are direct-labelled and every chart has a table
 * view, so the tooltip only ever repeats what is reachable without it.
 */

const BAR = 'var(--color-accent)';
const BAR_HOVER = 'var(--color-accent-dark)';

export function ChartCard({
  title,
  subtitle,
  table,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  /** Rows for the table view: [label, value]. */
  table?: [string, string | number][];
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-body">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-body hover:bg-bg-soft"
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </header>
      <div className="mt-4">
        {showTable && table ? (
          <table className="w-full text-sm">
            <tbody>
              {table.map(([label, value]) => (
                <tr key={label} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-3 text-body">{label}</td>
                  <td className="py-1.5 text-right font-medium text-ink tabular-nums">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  /** Secondary line for the tooltip, e.g. "12 active". */
  detail?: string;
  /** Clicking the bar opens this (e.g. the filtered candidate list). */
  href?: string;
}

/** Horizontal bars: magnitude by category, largest first unless `keepOrder`. */
export function BarList({
  data,
  keepOrder = false,
  emptyMessage = 'No data yet.',
  unit = '',
}: {
  data: BarDatum[];
  keepOrder?: boolean;
  emptyMessage?: string;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = keepOrder ? data : [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (rows.length === 0 || total === 0) return <p className="py-6 text-center text-sm text-body">{emptyMessage}</p>;

  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => {
        const pct = total ? Math.round((row.value / total) * 100) : 0;
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 font-medium text-ink tabular-nums">
                {compact(row.value)}
                {unit}
                <span className="ml-1.5 text-xs font-normal text-body">{pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-3">
              {/* Square at the baseline, 4px round at the data end. */}
              <div
                className="h-full rounded-r-[4px] transition-[width,background-color] duration-300 ease-out"
                style={{
                  width: `${Math.max(row.value > 0 ? 1.5 : 0, (row.value / max) * 100)}%`,
                  background: hover === i ? BAR_HOVER : BAR,
                }}
              />
            </div>
            {hover === i && row.detail && <p className="mt-1 text-xs text-body">{row.detail}</p>}
          </>
        );
        const common = {
          onPointerEnter: () => setHover(i),
          onPointerLeave: () => setHover(null),
          onFocus: () => setHover(i),
          onBlur: () => setHover(null),
          className: 'block rounded-lg px-1 py-0.5 -mx-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        };
        return (
          <li key={row.label}>
            {row.href ? (
              <Link href={row.href} {...common} aria-label={`${row.label}: ${row.value}. Open list`}>
                {inner}
              </Link>
            ) : (
              <div tabIndex={0} {...common} aria-label={`${row.label}: ${row.value}`}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical columns over time, one series, with a hover/focus readout. */
export function ColumnChart({
  data,
  formatLabel,
  valueName,
}: {
  data: { label: string; value: number }[];
  formatLabel: (label: string) => string;
  valueName: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const height = 160;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const last = data.length - 1;
  const focus = hover ?? last;

  return (
    <div>
      <p id={titleId} className="text-sm text-body" aria-live="polite">
        <span className="text-2xl font-semibold text-ink">{compact(data[focus]?.value ?? 0)}</span>{' '}
        {valueName} · {hover === null ? 'this period' : formatLabel(data[focus].label)}
      </p>
      <div className="relative mt-3 flex" style={{ height }}>
        {/* y ticks */}
        <div className="relative w-8 shrink-0 text-[11px] text-body tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: height - (t / max) * height }}>
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-[#c3c2b7]' : 'bg-line'}`}
              style={{ top: height - (t / max) * height }}
            />
          ))}
          <ul className="absolute inset-0 flex items-end" aria-labelledby={titleId}>
            {data.map((d, i) => (
              <li
                key={d.label}
                className="flex h-full flex-1 items-end justify-center outline-none"
                tabIndex={0}
                aria-label={`${formatLabel(d.label)}: ${d.value} ${valueName}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div
                  className="w-full max-w-6 rounded-t-[4px] transition-[height,background-color] duration-300 ease-out"
                  style={{
                    height: `${(d.value / max) * 100}%`,
                    minHeight: d.value > 0 ? 2 : 0,
                    background: hover === i ? BAR_HOVER : BAR,
                    // 2px surface gap between neighbours.
                    marginInline: 1,
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex text-[11px] text-body">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center">
            {i % 2 === last % 2 ? formatLabel(d.label) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rounds an axis maximum up to a clean number (1, 2, 5 × 10ⁿ). */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 5, 10]) if (step * exp >= value) return step * exp;
  return 10 * exp;
}

export function StatTile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: number | string;
  note?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-body">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">
        {typeof value === 'number' ? compact(value) : value}
      </p>
      {note && <p className="mt-1 text-xs text-body">{note}</p>}
    </>
  );
  const cls = 'block rounded-2xl border border-line bg-white p-5';
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-accent/50 hover:bg-bg-soft`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
