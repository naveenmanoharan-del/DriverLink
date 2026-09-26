'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { PhoneField } from '@/components/phone-field';
import { apiFetch } from '@/lib/api';
import {
  BACKGROUND_LABELS,
  GROUP_LABELS,
  SECTOR_LABELS,
  type Background,
  type Category,
  type Sector,
} from '@/lib/types';
import { Button, Card, Eyebrow, Field, Select, TextInput } from '@/components/ui';
import { ResumeInput, validateResume } from '@/components/resume-input';

export default function RegisterWorkerPage() {
  const { registerWorker } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resume, setResume] = useState<File | null>(null);

  const [form, setForm] = useState({
    phone: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    categoryId: '',
    background: '' as Background | '',
    sectors: [] as Sector[],
    qualification: '',
    yearsExperience: '',
    lastDesignation: '',
    lastOrganisation: '',
    retirementYear: '',
    minRate: '',
    city: '',
  });

  useEffect(() => {
    apiFetch<Category[]>('/v1/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  const grouped = categories.reduce<Record<string, Category[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  // Any edit clears the last error, so it never describes a problem that's fixed.
  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setError(null);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleSector(sector: Sector) {
    setError(null);
    setForm((f) => ({
      ...f,
      sectors: f.sectors.includes(sector) ? f.sectors.filter((s) => s !== sector) : [...f.sectors, sector],
    }));
  }

  const retired = form.background === 'retired_railway' || form.background === 'retired_govt';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.sectors.length === 0) return setError('Choose at least one sector.');
    if (!resume) return setError('Please attach your resume.');
    const resumeError = validateResume(resume);
    if (resumeError) return setError(resumeError);

    setSubmitting(true);
    try {
      await registerWorker(
        {
          phone: form.phone,
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName || undefined,
          categoryId: form.categoryId,
          background: form.background || undefined,
          sectors: form.sectors,
          qualification: form.qualification || undefined,
          yearsExperience: Number(form.yearsExperience) || 0,
          lastDesignation: form.lastDesignation || undefined,
          lastOrganisation: form.lastOrganisation || undefined,
          retirementYear: retired && form.retirementYear ? Number(form.retirementYear) : undefined,
          minRate: form.minRate,
          rateUnit: 'month',
          city: form.city || undefined,
        },
        resume,
      );
      router.push('/worker');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Eyebrow>Join the register</Eyebrow>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Submit your CV</h1>
      <p className="mt-1 text-sm text-body">
        For construction and infrastructure projects — consultancy, EPC and contracting roles across railways,
        metro, highways, buildings, industrial, water and power. Retired government and railway officers are
        especially welcome.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <SectionTitle>About you</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <TextInput required maxLength={100} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
            </Field>
            <Field label="Last name">
              <TextInput maxLength={100} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone number">
              <PhoneField required value={form.phone} onChange={(phone) => update('phone', phone)} />
            </Field>
            <Field label="Email">
              <TextInput type="email" required maxLength={255} value={form.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
          </div>

          <Field label="Password (to log in later)">
            <TextInput
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </Field>

          <Field label="City">
            <TextInput maxLength={100} value={form.city} onChange={(e) => update('city', e.target.value)} />
          </Field>

          <SectionTitle>Your experience</SectionTitle>
          <Field label="Position you are applying for">
            <Select required value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
              <option value="" disabled>
                Select a position
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

          <Field label="Background">
            <Select
              required
              value={form.background}
              onChange={(e) => update('background', e.target.value as Background)}
            >
              <option value="" disabled>
                Select your background
              </option>
              {Object.entries(BACKGROUND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset>
            <legend className="text-sm font-medium text-body">Sectors you will work in</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(SECTOR_LABELS) as Sector[]).map((sector) => {
                const on = form.sectors.includes(sector);
                return (
                  <label
                    key={sector}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      on ? 'border-accent bg-accent/10 text-accent-dark' : 'border-line text-body hover:bg-bg-soft'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleSector(sector)}
                      className="accent-[var(--color-accent)]"
                    />
                    {SECTOR_LABELS[sector]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Highest qualification">
              <TextInput
                required
                placeholder="e.g. B.E. Civil"
                maxLength={255}
                value={form.qualification}
                onChange={(e) => update('qualification', e.target.value)}
              />
            </Field>
            <Field label="Total experience (years)">
              <TextInput
                type="number"
                required
                min={0}
                max={70}
                value={form.yearsExperience}
                onChange={(e) => update('yearsExperience', e.target.value.slice(0, 2))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={retired ? 'Designation at retirement' : 'Current / last designation'}>
              <TextInput
                placeholder={retired ? 'e.g. Chief Engineer' : 'e.g. Senior Bridge Engineer'}
                maxLength={255}
                value={form.lastDesignation}
                onChange={(e) => update('lastDesignation', e.target.value)}
              />
            </Field>
            <Field label={retired ? 'Department / organisation' : 'Current / last employer'}>
              <TextInput
                placeholder={retired ? 'e.g. Southern Railway, CPWD' : ''}
                maxLength={255}
                value={form.lastOrganisation}
                onChange={(e) => update('lastOrganisation', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {retired && (
              <Field label="Year of retirement">
                <TextInput
                  type="number"
                  min={1970}
                  max={new Date().getFullYear()}
                  value={form.retirementYear}
                  onChange={(e) => update('retirementYear', e.target.value.slice(0, 4))}
                />
              </Field>
            )}
            <Field label="Expected salary (₹ / month)">
              <TextInput
                type="number"
                required
                min={0}
                value={form.minRate}
                onChange={(e) => update('minRate', e.target.value.slice(0, 12))}
              />
            </Field>
          </div>

          <SectionTitle>Resume</SectionTitle>
          <ResumeInput
            file={resume}
            onChange={(file) => {
              setError(null);
              setResume(file);
            }}
          />

          {error && <p className="text-sm text-warn">{error}</p>}

          <Button type="submit" disabled={submitting} arrow={false} className="w-full">
            {submitting ? 'Submitting…' : 'Create account & submit CV'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-body">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-accent-dark underline">
          Log in
        </Link>
        . Hiring for a contract instead?{' '}
        <Link href="/register/client" className="font-medium text-accent-dark underline">
          Register as a client
        </Link>
        .
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="border-b border-line pb-2 pt-2 text-sm font-semibold text-ink first:pt-0">{children}</p>;
}
