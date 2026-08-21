import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export const inputClass =
  'mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-body focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

export function Field({
  label,
  children,
  ...rest
}: { label: string; children: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="block" {...rest}>
      <span className="text-sm font-medium text-body">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  secondary: 'border border-ink/15 text-ink hover:bg-bg-soft',
  // For use on photos / colored panels, where a solid accent button wouldn't have enough contrast.
  // Each is a fully self-contained color combo — never override bg/text color via `className` on
  // Button, since Tailwind's cascade order (not JSX class order) decides which of two conflicting
  // color utilities wins, and it silently produced invisible white-on-white text once already.
  onDark: 'bg-white text-ink hover:bg-white/90',
  onDarkOutline: 'border border-white/40 text-white hover:bg-white/10',
  onAccentPanel: 'bg-white text-accent-dark hover:bg-white/90',
  onTealPanel: 'bg-white text-teal-dark hover:bg-white/90',
} as const;

export function Button({
  variant = 'primary',
  arrow = true,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS; arrow?: boolean }) {
  // `group` lets the arrow react to hover on the button as a whole.
  const base =
    'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ' +
    'transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out ' +
    'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(22,24,29,0.12)] active:translate-y-0 active:shadow-none ' +
    'disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:shadow-none';
  return (
    <button {...rest} className={`${base} ${BUTTON_VARIANTS[variant]} ${className}`}>
      {children}
      {arrow && (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1"
        >
          <path d="M2 8h11M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function Card({
  className = '',
  children,
  interactive = false,
}: {
  className?: string;
  children: ReactNode;
  /** Adds a hover lift — only for cards that are themselves clickable. */
  interactive?: boolean;
}) {
  const motion = interactive
    ? 'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_10px_30px_rgba(22,24,29,0.10)]'
    : '';
  return (
    <div
      className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(22,24,29,0.04)] ${motion} ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-body">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </p>
  );
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-accent/10 text-accent-dark',
  available: 'bg-accent/10 text-accent-dark',
  applied: 'bg-teal/10 text-teal-dark',
  assigned: 'bg-teal/10 text-teal-dark',
  accepted: 'bg-teal/10 text-teal-dark',
  verified: 'bg-teal/10 text-teal-dark',
  in_progress: 'bg-teal/10 text-teal-dark',
  completed: 'bg-ink/8 text-ink',
  pending: 'bg-bg-soft text-body',
  offline: 'bg-bg-soft text-body',
  engaged: 'bg-bg-soft text-body',
  rejected: 'bg-warn/10 text-warn',
  withdrawn: 'bg-warn/10 text-warn',
  cancelled: 'bg-warn/10 text-warn',
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-bg-soft text-body';
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
