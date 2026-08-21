const FOR_CLIENTS = ['Post a job', 'Browse categories', 'How it works'];
const FOR_WORKERS = ['Find work', 'Set your rate', 'Get verified'];

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
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                Y
              </span>
              <span className="text-[15px] font-bold tracking-tight text-white">
                <HighlightText>Yukti Solutions</HighlightText>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Manpower, on record. Verified labour, drivers, artisans and office staff for businesses and
              households.
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
            <p className="text-sm font-semibold text-white">For workers</p>
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
          <p>Labour, drivers, artisans, office staff — one platform.</p>
        </div>
      </div>
    </footer>
  );
}
