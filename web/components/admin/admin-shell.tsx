'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { RequireRole } from '@/components/require-role';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/candidates', label: 'Candidates' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/placements', label: 'Placements' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/settings', label: 'Settings' },
];

/** Frame for every admin page: role guard plus the section navigation. */
export function AdminShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireRole role="admin">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1 border-b border-line">
            {NAV.map((item) => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`-mb-px block border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'border-accent text-ink' : 'border-transparent text-body hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </RequireRole>
  );
}

/** A labelled key/value pair for detail pages. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-body">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-ink">{children || '—'}</dd>
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-body">
      <span>
        {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-full border border-line px-4 py-1.5 font-medium text-ink hover:bg-bg-soft disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-full border border-line px-4 py-1.5 font-medium text-ink hover:bg-bg-soft disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function SmallButton({
  children,
  tone = 'default',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'primary' | 'danger' }) {
  const tones = {
    default: 'border border-line text-ink hover:bg-bg-soft',
    primary: 'bg-accent text-white hover:bg-accent-dark',
    danger: 'border border-warn/40 text-warn hover:bg-warn/10',
  };
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${tones[tone]} ${rest.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">
      {children}
    </p>
  );
}
