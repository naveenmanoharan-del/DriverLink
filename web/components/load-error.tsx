'use client';

/**
 * Shown in place of a picker whose options could not be loaded. It names what
 * is missing and offers the one action that can fix it, rather than leaving an
 * empty required field with no explanation.
 */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2.5 text-sm text-warn">
      <span>{what} could not be loaded.</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-medium underline underline-offset-2 hover:no-underline"
      >
        Try again
      </button>
    </p>
  );
}
