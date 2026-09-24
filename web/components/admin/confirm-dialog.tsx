'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SmallButton } from './admin-shell';

/**
 * An in-page confirmation for destructive actions. Uses <dialog> for focus
 * trapping and Escape-to-close, and never window.confirm(). When
 * `confirmText` is set, the admin must type it before the button enables:
 * used for permanent deletes.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmText,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  confirmText?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const matches = !confirmText || typed.trim() === confirmText.trim();

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="p-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-2 text-sm text-body">{body}</div>
        {confirmText && (
          <label className="mt-4 block text-sm text-body">
            Type <strong className="text-ink">{confirmText}</strong> to confirm
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </label>
        )}
        {error && <p className="mt-3 text-sm text-warn">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <SmallButton onClick={onClose}>Cancel</SmallButton>
          <SmallButton tone="danger" disabled={!matches || busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </SmallButton>
        </div>
      </div>
    </dialog>
  );
}
