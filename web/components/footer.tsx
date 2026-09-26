const FOR_CLIENTS = ['Post a requirement', 'Key personnel for projects', 'Site office staffing'];
const FOR_WORKERS = ['Submit your CV', 'Retired government officers', 'Construction & infrastructure roles'];

function HighlightText({ children }: { children: string }) {
  return (
    <span className="inline-block -mx-1.5 -my-0.5 rounded px-1.5 py-0.5 transition-colors hover:bg-white/15">
      {children}
    </span>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-navy bg-accent text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            {/* Reverse lockup: the full-colour logo is for light backgrounds only. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/yukti-logo-horizontal-reverse.svg"
              alt="Yukti Solutions"
              width={144}
              height={44}
              className="h-11 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Key personnel, engineers and office staff for construction and infrastructure projects.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">For clients</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {FOR_CLIENTS.map((item) => (
                <li key={item}>
                  <HighlightText>{item}</HighlightText>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">For professionals</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {FOR_WORKERS.map((item) => (
                <li key={item}>
                  <HighlightText>{item}</HighlightText>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Yukti Solutions. All rights reserved.</p>
          <p>Infrastructure · Buildings · Industrial · Water · Power</p>
        </div>
      </div>
    </footer>
  );
}
