'use client';

import { useState } from 'react';

const CATEGORIES = [
  {
    label: 'Key personnel',
    image: 'https://images.unsplash.com/photo-1694521787193-9293daeddbaa?w=1000&q=80',
    description:
      'Team leaders, project managers, resident engineers, and structural, geotechnical, highway, track, MEP, planning, contracts, QA/QC and safety experts for your project.',
  },
  {
    label: 'Engineers & technical staff',
    image: 'https://images.unsplash.com/photo-1545186070-de624ed19875?w=1000&q=80',
    description: 'Site engineers and supervisors, MEP engineers, section engineers and inspectors, surveyors, safety officers, lab technicians and CAD draughtsmen.',
  },
  {
    label: 'Office & support staff',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1000&q=80',
    description: 'Office managers, accountants, document controllers, store keepers, HR, computer operators and stenographers for the project office.',
  },
  {
    label: 'Retired government officers',
    image: 'https://images.unsplash.com/photo-1637995735729-c43250f1ef47?w=1000&q=80',
    description: 'Engineers and officers retired from Indian Railways, NHAI, CPWD, state PWDs and PSUs such as RVNL, IRCON and RITES — decades of field experience, available for project roles.',
  },
];

export function CategoryExplorer() {
  const [active, setActive] = useState(0);
  const current = CATEGORIES[active];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
      <div className="space-y-3">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`block w-full rounded-2xl px-5 py-4 text-left text-[15px] font-medium transition-[background-color,color,transform] duration-300 ease-out ${
              i === active
                ? 'translate-x-1 bg-accent text-white'
                : 'bg-bg-soft text-ink hover:translate-x-1 hover:bg-line'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
        {/* All photos are stacked and cross-faded so switching tabs never
            flashes an empty frame while the next image loads. */}
        {CATEGORIES.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c.image}
            src={c.image}
            alt={c.label}
            aria-hidden={i !== active}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${
              i === active ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/80 via-ink/10 to-transparent p-6 pt-16">
          {/* Keyed so the caption re-runs its fade on every tab change. */}
          <div key={current.label} className="animate-fade-up">
            <p className="text-lg font-semibold text-white">{current.label}</p>
            <p className="mt-1 text-sm text-white/85">{current.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
