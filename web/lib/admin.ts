'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiUrl } from './api';
import { useAuth } from './auth-context';
import type { Background, Sector } from './types';

export type PipelineStatus = 'new' | 'shortlisted' | 'interviewed' | 'placed' | 'on_hold' | 'rejected';
export type PlacementStatus = 'active' | 'completed' | 'terminated';
export type ContractType = 'gc' | 'pmc' | 'pgms' | 'pssa' | 'ae' | 'ie' | 'other';

/** In recruitment order, so the pipeline chart reads as a funnel. */
export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  new: 'New',
  shortlisted: 'Shortlisted',
  interviewed: 'Interviewed',
  placed: 'Placed',
  on_hold: 'On hold',
  rejected: 'Rejected',
};

export const CONTRACT_LABELS: Record<ContractType, string> = {
  gc: 'GC',
  pmc: 'PMC',
  pgms: 'PGMS',
  pssa: 'PSSA',
  ae: 'Authority Engineer',
  ie: 'Independent Engineer',
  other: 'Other',
};

export const PLACEMENT_STATUS_LABELS: Record<PlacementStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  terminated: 'Terminated',
};

/** Groups from the old general-labour taxonomy, shown as one bucket. */
export const LEGACY_GROUPS = ['physical_labour', 'driver', 'artisan', 'office_staff', 'other'];

export interface CandidateRow {
  id: string;
  userId: string;
  name: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  categoryId: string;
  category: string;
  group: string;
  background: Background | null;
  sectors: Sector[];
  qualification: string | null;
  yearsExperience: number;
  lastDesignation: string | null;
  lastOrganisation: string | null;
  retirementYear: number | null;
  city: string | null;
  minRate: string;
  rateUnit: string;
  pipelineStatus: PipelineStatus;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  adminNotes: string | null;
  hasResume: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Placement {
  id: string;
  workerId: string | null;
  candidateName: string;
  clientId: string | null;
  companyName: string;
  position: string;
  projectName: string | null;
  contractType: ContractType;
  sector: Sector | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  monthlyRemuneration: string | null;
  status: PlacementStatus;
  notes: string | null;
  applicationId: string | null;
  createdAt: string;
}

export interface CandidateDetail extends CandidateRow {
  resume: { fileName: string; mimeType: string; sizeBytes: number; updatedAt: string } | null;
  placements: Placement[];
  applications: { id: string; status: string; createdAt: string; jobTitle: string; jobId: string }[];
}

export interface ClientRow {
  id: string;
  userId: string;
  name: string;
  companyName: string | null;
  clientType: 'individual' | 'company';
  city: string | null;
  phone: string;
  email: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  jobCount: number;
  placementCount: number;
}

export interface ClientDetail extends Omit<ClientRow, 'jobCount' | 'placementCount'> {
  address: string | null;
  jobs: { id: string; title: string; status: string; location: string; startsAt: string; createdAt: string; applications: number }[];
  placements: Placement[];
}

export interface Paged<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Keyed {
  key: string;
  count: number;
}

export interface Stats {
  totals: Record<string, number>;
  weekly: { week: string; candidates: number; clients: number }[];
  byGroup: Keyed[];
  byCategory: (Keyed & { group: string })[];
  byBackground: Keyed[];
  bySector: Keyed[];
  byPipeline: Keyed[];
  byCity: Keyed[];
  byExperience: Keyed[];
  byCompany: (Keyed & { active: number })[];
  byContractType: Keyed[];
  placementsMonthly: { month: string; count: number }[];
  recent: { id: string; name: string; category: string; background: Background | null; createdAt: string; hasResume: boolean }[];
  days: number | null;
}

export interface AuditEntry {
  id: string;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Builds a query string, dropping empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    search.set(k, String(v));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * Fetches an admin endpoint. Keeps showing the previous data while a refetch
 * is in flight (`refreshing`), so filtering never blanks the screen.
 */
export function useAdminQuery<T>(path: string | null) {
  const { session } = useAuth();
  const token = session?.accessToken;
  const hasToken = Boolean(token);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Loading is derived rather than set: the request for `key` is in flight
  // until a response for that same key has landed.
  const key = path ? `${path}#${version}` : null;
  const [doneKey, setDoneKey] = useState<string | null>(null);
  // Only the latest request may write state, so a slow earlier response can't
  // overwrite the results of a newer filter.
  const latest = useRef<string | null>(null);

  useEffect(() => {
    if (!path || !token || !key) return;
    latest.current = key;
    apiFetch<T>(path, { token })
      .then((result) => {
        if (latest.current !== key) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (latest.current !== key) return;
        setError(err instanceof Error ? err.message : 'Request failed');
      })
      .finally(() => {
        if (latest.current === key) setDoneKey(key);
      });
    // Keyed on whether there is a token, not on the token itself: the session
    // loads from storage after first render, so the fetch must run once it
    // appears, but a silent token refresh must not refetch everything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hasToken]);

  const loading = key !== null && doneKey !== key;
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, refreshing: loading && data !== null, reload, setData };
}

/** Admin mutations with the current token. */
export function useAdminApi() {
  const { session } = useAuth();
  return useCallback(
    <T,>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) =>
      apiFetch<T>(path, { method, body, token: session?.accessToken }),
    [session?.accessToken],
  );
}

/** Downloads (or opens) an authenticated file endpoint. */
export async function fetchFile(path: string, token: string) {
  const res = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;
    try {
      message = JSON.parse(text).message ?? message;
    } catch {
      // not JSON
    }
    throw new Error(message);
  }
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  return { blob: await res.blob(), fileName: match ? decodeURIComponent(match[1]) : 'download' };
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatInr(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';
}

/** 1,284 → "1,284"; 12,900 → "12.9K". Proportional figures, per the dataviz spec. */
export function compact(n: number) {
  return n >= 10_000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n.toLocaleString('en-IN');
}
