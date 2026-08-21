import Link from 'next/link';
import { Button, Eyebrow } from '@/components/ui';
import { CategoryExplorer } from '@/components/category-explorer';
import { Reveal } from '@/components/reveal';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative mt-6 h-[560px] w-full overflow-hidden sm:h-[620px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&q=80"
          alt="Construction workers on site"
          // Slow drift keeps the hero alive without competing with the copy.
          className="h-full w-full animate-fade-in object-cover motion-safe:animate-[fade-in_1.2s_ease-out_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-14">
          <div className="mx-auto max-w-5xl">
            {/* Staggered entrance: label, headline, body, then the actions. */}
            <p className="animate-fade-up text-sm text-white" style={{ '--delay': '120ms' } as React.CSSProperties}>
              Manpower, on record
            </p>
            <h1
              className="mt-3 max-w-2xl animate-fade-up text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl"
              style={{ '--delay': '220ms' } as React.CSSProperties}
            >
              Every worker, verified and on the books.
            </h1>
            <p
              className="mt-4 max-w-lg animate-fade-up text-[15px] leading-relaxed text-white"
              style={{ '--delay': '340ms' } as React.CSSProperties}
            >
              Yukti Solutions connects businesses and households with verified workers — labour, drivers,
              artisans, office staff — with an ID, a day-rate, and a verification stamp behind every name.
            </p>
            <div
              className="mt-8 flex animate-fade-up flex-wrap gap-4"
              style={{ '--delay': '460ms' } as React.CSSProperties}
            >
              <Link href="/register/client">
                <Button variant="onDark">Hire a worker</Button>
              </Link>
              <Link href="/register/worker">
                <Button variant="onDarkOutline">Find work</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <Eyebrow>About us</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
              Welcome to Yukti Solutions, a manpower partner built for accountability.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-body">
              We supply verified labour, drivers, artisans and office staff for businesses and households —
              every worker carries an ID, a day-rate, and a track record clients can see before they hire.
            </p>
            <Link href="/register/client" className="mt-6 inline-block">
              <Button>About hiring with us</Button>
            </Link>
          </Reveal>
          <Reveal delay={140}>
            <div className="group aspect-[4/3] overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1516216628859-9bccecab13ca?w=1000&q=80"
                alt="Workers on a construction site"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-bg-soft py-20">
        <div className="mx-auto max-w-5xl px-4">
          <Reveal>
            <Eyebrow>Why Yukti Solutions</Eyebrow>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: 'Verified, not just listed',
                body: 'Every worker profile carries a verification status clients can check before they book.',
              },
              {
                title: 'Set your own rate',
                body: 'Workers post a day, hour or job rate up front — no back-and-forth negotiating on-site.',
              },
              {
                title: 'No agency middleman',
                body: 'Clients post a job, workers apply directly, and the client picks who shows up.',
              },
            ].map((v, i) => (
              // Stagger left-to-right so the row resolves as one gesture.
              <Reveal key={v.title} delay={i * 120}>
                <h3 className="text-lg font-bold text-ink">{v.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-body">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <Reveal>
          <Eyebrow>Who&apos;s on the register</Eyebrow>
          <h2 className="mt-4 max-w-lg text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            Every category of work, one platform.
          </h2>
        </Reveal>
        <Reveal delay={120} className="mt-10">
          <CategoryExplorer />
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <Reveal className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
          <div className="bg-accent p-10 text-white">
            <p className="text-sm text-white">For clients</p>
            <h3 className="mt-2 text-2xl font-bold">Post a job, see who&apos;s available</h3>
            <p className="mt-3 text-[15px] text-white">List the trade, the rate and the start date. Verified workers apply.</p>
            <Link href="/register/client" className="mt-6 inline-block">
              <Button variant="onAccentPanel">Hire a worker</Button>
            </Link>
          </div>
          <div className="bg-teal p-10 text-white">
            <p className="text-sm text-white">For workers</p>
            <h3 className="mt-2 text-2xl font-bold">Set your rate, get booked</h3>
            <p className="mt-3 text-[15px] text-white">Build a profile once and apply to jobs near you.</p>
            <Link href="/register/worker" className="mt-6 inline-block">
              <Button variant="onTealPanel">Find work</Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
