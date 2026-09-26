'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';
import { homeFor } from '@/components/require-role';

export function NavBar() {
  const { session, logout, loading } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <div className="sticky top-4 z-30 mx-auto w-full max-w-5xl px-3 sm:px-4">
      <header className="flex animate-fade-up items-center justify-between rounded-full border border-line bg-white/90 py-2 pl-6 pr-3 shadow-[0_2px_16px_rgba(22,24,29,0.08)] backdrop-blur transition-shadow duration-300 hover:shadow-[0_4px_24px_rgba(22,24,29,0.12)]">
        <Link href="/" className="shrink-0">
          {/* The lockup already spells the name, so no text beside it. Height comes from .ys-logo
              (48px, 44px on phones); width/height attributes reserve space while it loads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/brand/yukti-logo-horizontal.svg" alt="Yukti Solutions" width={158} height={48} className="ys-logo" />
        </Link>
        <nav className="flex items-center gap-2.5 text-sm sm:gap-5 sm:pr-2">
          {loading ? null : session ? (
            <>
              <Link
                href={homeFor(session.user.role)}
                className="whitespace-nowrap font-medium text-body transition-colors duration-200 hover:text-ink"
              >
                {session.user.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
              <span className="hidden text-body sm:inline">{session.user.phone}</span>
              {/* Phones get a plain text link: the pill button beside the logo and the dashboard link
                  doesn't fit a 360-375px header. The wrapper span does the hiding so no display
                  utility has to fight Button's own inline-flex. */}
              <button
                onClick={handleLogout}
                className="whitespace-nowrap font-medium text-body transition-colors duration-200 hover:text-ink sm:hidden"
              >
                Log out
              </button>
              <span className="hidden sm:inline">
                <Button variant="secondary" arrow={false} onClick={handleLogout} className="px-4 py-2 text-xs">
                  Log out
                </Button>
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap font-medium text-body transition-colors duration-200 hover:text-ink">
                Log in
              </Link>
              {/* Below 390px the logo, Log in and this button cannot share one row; the hero
                  right underneath carries the same "Submit your CV" call to action. */}
              <Link href="/register/worker" className="max-[389px]:hidden">
                <Button arrow={false} className="px-4 py-2 text-xs">
                  Submit CV
                </Button>
              </Link>
            </>
          )}
        </nav>
      </header>
    </div>
  );
}
