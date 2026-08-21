'use client';

import { useState } from 'react';

const CATEGORIES = [
  {
    label: 'Physical labour',
    image: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=1000&q=80',
    description: 'Loaders, cleaners, security guards and general site helpers — booked by the day, verified before they arrive.',
  },
  {
    label: 'Drivers',
    image: 'https://images.unsplash.com/photo-1612630741022-b29ec17d013d?w=1000&q=80',
    description: 'Car, truck, heavy vehicle and delivery riders, licensed and rated by the clients who’ve booked them before.',
  },
  {
    label: 'Artisans',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&q=80',
    description: 'Electricians, plumbers, carpenters and welders — set their own day-rate, apply to the jobs that fit.',
  },
  {
    label: 'Office staff',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1000&q=80',
    description: 'Data entry, reception, accounts and admin support, available on short notice or ongoing contract.',
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent p-6 pt-16">
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
