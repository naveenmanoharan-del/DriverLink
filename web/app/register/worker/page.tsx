'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Category, RateUnit } from '@/lib/types';
import { Button, Card, Eyebrow, Field, Select, TextInput } from '@/components/ui';

const GROUP_LABELS: Record<string, string> = {
  physical_labour: 'Physical labour',
  driver: 'Drivers',
  artisan: 'Artisans',
  office_staff: 'Office staff',
  other: 'Other',
};

export default function RegisterWorkerPage() {
  const { registerWorker } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    categoryId: '',
    yearsExperience: '0',
    minRate: '',
    rateUnit: 'day' as RateUnit,
    city: '',
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
    setError(null);
    setSubmitting(true);
    try {
      await registerWorker({
        phone: form.phone,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        categoryId: form.categoryId,
        yearsExperience: Number(form.yearsExperience) || 0,
        minRate: form.minRate,
        rateUnit: form.rateUnit,
        city: form.city || undefined,
      });
      router.push('/worker');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Eyebrow>Join the register</Eyebrow>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Register as a worker</h1>
      <p className="mt-1 text-sm text-body">Find labour, driving, artisan or office work near you.</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <TextInput required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </Field>
            <Field label="Last name">
              <TextInput value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </Field>
          </div>

          <Field label="Phone number">
            <TextInput
              type="tel"
              required
              placeholder="+919000000000"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </Field>

          <Field label="Password">
            <TextInput
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>

          <Field label="Category / trade">
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Years of experience">
              <TextInput
                type="number"
                min={0}
                value={form.yearsExperience}
                onChange={(e) => update('yearsExperience', e.target.value)}
              />
            </Field>
            <Field label="City">
              <TextInput value={form.city} onChange={(e) => update('city', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum rate (INR)">
              <TextInput
                type="number"
                required
                min={0}
                value={form.minRate}
                onChange={(e) => update('minRate', e.target.value)}
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
            {submitting ? 'Creating account…' : 'Create worker account'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-body">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-accent-dark underline">
          Log in
        </Link>
        . Hiring instead?{' '}
        <Link href="/register/client" className="font-medium text-accent-dark underline">
          Register as a client
        </Link>
        .
      </p>
    </div>
  );
}
