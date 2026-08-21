'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button, Card, Eyebrow, Field, TextInput } from '@/components/ui';

export default function LoginPage() {
  const { loginWithPhone } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await loginWithPhone(phone, password);
      router.push(session.user.role === 'worker' ? '/worker' : '/client');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Eyebrow>Sign in</Eyebrow>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Log in</h1>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Phone number">
            <TextInput
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919000000000"
            />
          </Field>
          <Field label="Password">
            <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-warn">{error}</p>}
          <Button type="submit" disabled={submitting} arrow={false} className="w-full">
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-body">
        New here?{' '}
        <Link href="/register/worker" className="font-medium text-accent-dark underline">
          Register as a worker
        </Link>{' '}
        or{' '}
        <Link href="/register/client" className="font-medium text-accent-dark underline">
          as a client
        </Link>
        .
      </p>
    </div>
  );
}
