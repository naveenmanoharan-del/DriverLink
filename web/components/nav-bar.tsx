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
    <div className="sticky top-4 z-30 mx-auto w-full max-w-5xl px-4">
      <header className="flex animate-fade-up items-center justify-between rounded-full border border-line bg-white/90 py-2 pl-6 pr-5 shadow-[0_2px_16px_rgba(22,24,29,0.08)] backdrop-blur transition-shadow duration-300 hover:shadow-[0_4px_24px_rgba(22,24,29,0.12)]">
        <Link href="/" className="shrink-0">
          {/* The lockup already spells the name, so no text beside it. Height comes from .ys-logo
              (48px, 44px on phones); width/height attributes reserve space while it loads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/brand/yukti-logo-horizontal.svg" alt="Yukti Solutions" width={158} height={48} className="ys-logo" />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {loading ? null : session ? (
            <>
              <Link
                href={homeFor(session.user.role)}
                className="hidden font-medium text-body transition-colors duration-200 hover:text-ink sm:inline"
              >
                {session.user.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
              <span className="hidden text-body sm:inline">{session.user.phone}</span>
              <Button variant="secondary" arrow={false} onClick={handleLogout} className="px-4 py-2 text-xs">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden font-medium text-body transition-colors duration-200 hover:text-ink sm:inline">
                Log in
              </Link>
              <Link href="/register/worker">
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
