'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { PhoneField } from '@/components/phone-field';
import { Button, Card, Eyebrow, Field, Select, TextInput } from '@/components/ui';

export default function RegisterClientPage() {
  const { registerClient } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    email: '',
    password: '',
    name: '',
    companyName: '',
    clientType: 'company' as 'individual' | 'company',
    city: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerClient({
        phone: form.phone,
        email: form.email,
        password: form.password,
        name: form.name,
        companyName: form.companyName || undefined,
        clientType: form.clientType,
        city: form.city || undefined,
      });
      router.push('/client');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Eyebrow>Join the register</Eyebrow>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Register as a client</h1>
      <p className="mt-1 text-sm text-body">Source key personnel and office staff for railway and highway contracts.</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Your name">
            <TextInput required maxLength={150} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Field>

          <Field label="Account type">
            <Select
              value={form.clientType}
              onChange={(e) => update('clientType', e.target.value as 'individual' | 'company')}
            >
              <option value="company">Company / consultancy firm</option>
              <option value="individual">Individual</option>
            </Select>
          </Field>

          {form.clientType === 'company' && (
            <Field label="Company name">
              <TextInput maxLength={255} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
            </Field>
          )}

          <Field label="Phone number">
            <PhoneField required value={form.phone} onChange={(phone) => update('phone', phone)} />
          </Field>

          <Field label="Email">
            <TextInput type="email" required maxLength={255} value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Field>

          <Field label="Password">
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

          {error && <p className="text-sm text-warn">{error}</p>}

          <Button type="submit" disabled={submitting} arrow={false} className="w-full">
            {submitting ? 'Creating account…' : 'Create client account'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-body">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-accent-dark underline">
          Log in
        </Link>
        . Looking for work instead?{' '}
        <Link href="/register/worker" className="font-medium text-accent-dark underline">
          Register as a worker
        </Link>
        .
      </p>
    </div>
  );
}
