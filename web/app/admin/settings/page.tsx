'use client';

import { useState, type FormEvent } from 'react';
import { AdminShell, ErrorNote, SmallButton } from '@/components/admin/admin-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDate, useAdminApi, useAdminQuery, type AdminUser } from '@/lib/admin';

const inputCls =
  'mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

export default function SettingsPage() {
  const { session } = useAuth();
  const api = useAdminApi();
  const { data: admins, error, reload } = useAdminQuery<AdminUser[]>('/v1/admin/admins');
  const [form, setForm] = useState({ phone: '', email: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddMsg(null);
    try {
      await api('/v1/admin/admins', 'POST', {
        phone: form.phone.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
      });
      setForm({ phone: '', email: '', password: '' });
      setAddMsg({ ok: true, text: 'Admin added. Share the password with them privately.' });
      reload();
    } catch (err) {
      setAddMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not add admin' });
    } finally {
      setAdding(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: 'The new passwords do not match.' });
    if (pw.next === pw.current) return setPwMsg({ ok: false, text: 'Choose a password different from the current one.' });
    setPwBusy(true);
    try {
      await apiFetch('/v1/auth/change-password', {
        method: 'POST',
        token: session?.accessToken,
        body: { currentPassword: pw.current, newPassword: pw.next },
      });
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not change password' });
    } finally {
      setPwBusy(false);
    }
  }

  async function toggle() {
    if (!target) return;
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/v1/admin/users/${target.id}/active`, 'PATCH', { isActive: !target.isActive });
      setTarget(null);
      reload();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink">Admins</h2>
          {error && <ErrorNote>{error}</ErrorNote>}
          <ul className="mt-3 divide-y divide-line text-sm">
            {admins?.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-medium text-ink">{a.email ?? a.phone}</span>
                  {a.id === session?.user.id && <span className="ml-2 text-xs text-body">(you)</span>}
                  <div className="text-xs text-body">
                    {a.phone} · last login {formatDate(a.lastLoginAt, true)}
                    {!a.isActive && <span className="ml-1 font-medium text-warn">· deactivated</span>}
                  </div>
                </span>
                {a.id !== session?.user.id && (
                  <SmallButton tone={a.isActive ? 'danger' : 'default'} onClick={() => setTarget(a)}>
                    {a.isActive ? 'Deactivate' : 'Reactivate'}
                  </SmallButton>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={addAdmin} className="mt-5 space-y-3 border-t border-line pt-5" aria-label="Add admin">
            <h3 className="text-sm font-semibold text-ink">Add an admin</h3>
            <label className="block text-sm text-body">
              Phone (used to log in)
              <input required type="tel" pattern="\+?[0-9]{7,15}" placeholder="+919000000000" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="block text-sm text-body">
              Email (optional)
              <input type="email" maxLength={255} className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block text-sm text-body">
              Temporary password (8+ characters)
              <input required type="password" minLength={8} maxLength={72} autoComplete="new-password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            {addMsg && <p className={`text-sm ${addMsg.ok ? 'text-teal-dark' : 'text-warn'}`}>{addMsg.text}</p>}
            <SmallButton type="submit" tone="primary" disabled={adding}>
              {adding ? 'Adding…' : 'Add admin'}
            </SmallButton>
          </form>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink">Change your password</h2>
          <form onSubmit={changePassword} className="mt-3 space-y-3" aria-label="Change password">
            <label className="block text-sm text-body">
              Current password
              <input required type="password" autoComplete="current-password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </label>
            <label className="block text-sm text-body">
              New password (8+ characters)
              <input required type="password" minLength={8} maxLength={72} autoComplete="new-password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </label>
            <label className="block text-sm text-body">
              Repeat new password
              <input required type="password" minLength={8} maxLength={72} autoComplete="new-password" className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </label>
            {pwMsg && <p className={`text-sm ${pwMsg.ok ? 'text-teal-dark' : 'text-warn'}`}>{pwMsg.text}</p>}
            <SmallButton type="submit" tone="primary" disabled={pwBusy}>
              {pwBusy ? 'Changing…' : 'Change password'}
            </SmallButton>
          </form>
        </section>
      </div>
      <ConfirmDialog
        open={target !== null}
        title={target?.isActive ? 'Deactivate this admin?' : 'Reactivate this admin?'}
        body={target?.isActive ? 'They will be signed out and lose access to the admin panel.' : 'They will be able to log in again.'}
        confirmLabel={target?.isActive ? 'Deactivate' : 'Reactivate'}
        busy={busy}
        error={dialogError}
        onConfirm={toggle}
        onClose={() => {
          setTarget(null);
          setDialogError(null);
        }}
      />
    </AdminShell>
  );
}
