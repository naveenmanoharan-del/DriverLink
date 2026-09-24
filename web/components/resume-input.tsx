'use client';

import { useRef } from 'react';

const MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_ACCEPT = '.pdf,.doc,.docx';

/** Client-side pre-check; the API re-validates the file's actual contents. */
export function validateResume(file: File): string | null {
  if (!/\.(pdf|docx?)$/i.test(file.name)) return 'Resume must be a PDF or Word document.';
  if (file.size > MAX_BYTES) return 'Resume must be 5 MB or smaller.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** A drop-zone style file picker for a single PDF / Word resume. */
export function ResumeInput({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const invalid = file ? validateResume(file) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) onChange(dropped);
        }}
        className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line px-4 py-6 text-center transition-colors hover:border-accent hover:bg-bg-soft"
      >
        {file ? (
          <>
            <span className="text-sm font-semibold text-ink">{file.name}</span>
            <span className="text-xs text-body">{formatSize(file.size)} · click to choose a different file</span>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-ink">Choose your resume</span>
            <span className="text-xs text-body">PDF or Word, up to 5 MB — or drag it here</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={RESUME_ACCEPT}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {invalid && <p className="mt-2 text-sm text-warn">{invalid}</p>}
    </div>
  );
}
