'use client';

import { Button } from '@/components/ui';

/**
 * Renders the loading / failed / empty states for a list.
 *
 * The important case is `error`: without it a failed request falls through to
 * the empty state, telling someone they have no jobs when the request simply
 * did not come back. Returns null once there is data to show.
 */
export function LoadState({
  loading,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return <p className="mt-6 text-sm text-body">Loading…</p>;
  }

  if (error) {
    return (
      <div className="mt-6">
        <p className="text-sm text-warn">{error}</p>
        {onRetry && (
          <Button variant="secondary" arrow={false} onClick={onRetry} className="mt-3 px-4 py-2 text-xs">
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <p className="mt-6 text-sm text-body">{emptyMessage}</p>;
  }

  return null;
}

/** Turns an unknown thrown value into something worth showing a person. */
export function messageFor(err: unknown, fallback: string) {
  if (err instanceof TypeError) {
    // fetch() rejects with a TypeError when the server can't be reached at all.
    return "Can't reach the server. Check your connection and try again.";
  }
  return err instanceof Error ? err.message : fallback;
}
