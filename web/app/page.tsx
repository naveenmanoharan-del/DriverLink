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
          alt="Engineers in hard hats on a construction site"
          // Slow drift keeps the hero alive without competing with the copy.
          className="h-full w-full animate-fade-in object-cover motion-safe:animate-[fade-in_1.2s_ease-out_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-14">
          <div className="mx-auto max-w-5xl">
            {/* Staggered entrance: headline, body, then the actions. */}
            <h1
              className="max-w-2xl animate-fade-up text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl"
              style={{ '--delay': '220ms' } as React.CSSProperties}
            >
              The right key personnel for every project.
            </h1>
            <p
              className="mt-4 max-w-lg animate-fade-up text-[15px] leading-relaxed text-white"
              style={{ '--delay': '340ms' } as React.CSSProperties}
            >
              Yukti Solutions supplies experts, engineers and office staff to contractors, consultants and
              developers across the construction industry — infrastructure, buildings, industrial, water and
              power projects — including experienced retired government and railway officers.
            </p>
            <div
              className="mt-8 flex animate-fade-up flex-wrap gap-4"
              style={{ '--delay': '460ms' } as React.CSSProperties}
            >
              <Link href="/register/worker">
                <Button variant="onDark">Submit your CV</Button>
              </Link>
              <Link href="/register/client">
                <Button variant="onDarkOutline">Hire for a contract</Button>
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
              CVs that meet the requirement, from people who have done the work.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-body">
              Construction projects and bids are won and lost on key personnel. We maintain a register of
              project managers, resident engineers, structural, geotechnical, MEP, planning, QA/QC and safety
              experts, and the site-office staff behind them — serving and retired professionals from
              contractors, consultancies, Indian Railways, NHAI, CPWD, state PWDs and PSUs — with CVs ready for
              your technical proposal or your site.
            </p>
            <Link href="/register/client" className="mt-6 inline-block">
              <Button>Source personnel for a bid</Button>
            </Link>
          </Reveal>
          <Reveal delay={140}>
            <div className="group aspect-[4/3] overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1000&q=80"
                alt="Workers tying reinforcement bars on a construction site"
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
                title: 'Bid-ready CVs',
                body: 'Qualifications, experience and last postings captured up front, so matching a CV to the requirement is quick.',
              },
              {
                title: 'Retired government expertise',
                body: 'Engineers and officers retired from Indian Railways, NHAI, CPWD, state PWDs and PSUs bring decades of field experience.',
              },
              {
                title: 'Across construction',
                body: 'One register for railways, metro, highways, buildings, industrial, water and power projects — consultancy, EPC and contracting roles alike.',
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
            From team leader to site office.
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
            <p className="text-sm text-white">For contractors &amp; consultants</p>
            <h3 className="mt-2 text-2xl font-bold">Tell us the positions you need</h3>
            <p className="mt-3 text-[15px] text-white">
              Post the role, location and remuneration. We put forward candidates who fit the requirement.
            </p>
            <Link href="/register/client" className="mt-6 inline-block">
              <Button variant="onAccentPanel">Hire for a contract</Button>
            </Link>
          </div>
          <div className="bg-teal p-10 text-white">
            <p className="text-sm text-white">For professionals</p>
            <h3 className="mt-2 text-2xl font-bold">Retired or serving, put your experience to work</h3>
            <p className="mt-3 text-[15px] text-white">Register once, upload your CV, and we&apos;ll contact you when a contract fits.</p>
            <Link href="/register/worker" className="mt-6 inline-block">
              <Button variant="onTealPanel">Submit your CV</Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
