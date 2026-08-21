'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { RequireRole } from '@/components/require-role';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Category, Job, RateUnit } from '@/lib/types';
import { Button, Card, Eyebrow, Field, Select, Textarea, TextInput } from '@/components/ui';

const GROUP_LABELS: Record<string, string> = {
  physical_labour: 'Physical labour',
  driver: 'Drivers',
  artisan: 'Artisans',
  office_staff: 'Office staff',
  other: 'Other',
};

export default function NewJobPage() {
  return (
    <RequireRole role="client">
      <NewJobForm />
    </RequireRole>
  );
}

function NewJobForm() {
  const { session } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    categoryId: '',
    title: '',
    description: '',
    location: '',
    workersRequired: '1',
    offeredRate: '',
    rateUnit: 'day' as RateUnit,
    startsAt: '',
  });

  useEffect(() => {
    apiFetch<Category[]>('/v1/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  const grouped = categories.reduce<Record<string, Category[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError(null);
    setSubmitting(true);
    try {
      const job = await apiFetch<Job>('/v1/jobs', {
        method: 'POST',
        token: session.accessToken,
        body: {
          categoryId: form.categoryId,
          title: form.title,
          description: form.description || undefined,
          location: form.location,
          workersRequired: Number(form.workersRequired) || 1,
          offeredRate: form.offeredRate,
          rateUnit: form.rateUnit,
          startsAt: new Date(form.startsAt).toISOString(),
        },
      });
      router.push(`/client/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Eyebrow>New posting</Eyebrow>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Post a job</h1>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Title">
            <TextInput required value={form.title} onChange={(e) => update('title', e.target.value)} />
          </Field>

          <Field label="Category">
            <Select required value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
              <option value="" disabled>
                Select a category
              </option>
              {Object.entries(grouped).map(([group, items]) => (
                <optgroup key={group} label={GROUP_LABELS[group] ?? group}>
                  {items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field label="Location">
            <TextInput required value={form.location} onChange={(e) => update('location', e.target.value)} />
          </Field>

          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Workers required">
              <TextInput
                type="number"
                min={1}
                value={form.workersRequired}
                onChange={(e) => update('workersRequired', e.target.value)}
              />
            </Field>
            <Field label="Starts at">
              <TextInput
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => update('startsAt', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Offered rate (INR)">
              <TextInput
                type="number"
                required
                min={0}
                value={form.offeredRate}
                onChange={(e) => update('offeredRate', e.target.value)}
              />
            </Field>
            <Field label="Per">
              <Select value={form.rateUnit} onChange={(e) => update('rateUnit', e.target.value as RateUnit)}>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="job">Job</option>
              </Select>
            </Field>
          </div>

          {error && <p className="text-sm text-warn">{error}</p>}

          <Button type="submit" disabled={submitting} arrow={false} className="w-full">
            {submitting ? 'Posting…' : 'Post job'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
