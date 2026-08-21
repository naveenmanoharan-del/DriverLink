'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';

export function NavBar() {
  const { session, logout, loading } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <div className="sticky top-4 z-30 mx-auto w-full max-w-5xl px-4">
      <header className="flex animate-fade-up items-center justify-between rounded-full border border-line bg-white/90 px-5 py-3 shadow-[0_2px_16px_rgba(22,24,29,0.08)] backdrop-blur transition-shadow duration-300 hover:shadow-[0_4px_24px_rgba(22,24,29,0.12)]">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110">
            Y
          </span>
          <span className="text-[15px] font-bold tracking-tight text-ink">Yukti Solutions</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {loading ? null : session ? (
            <>
              <Link
                href={session.user.role === 'worker' ? '/worker' : '/client'}
                className="hidden font-medium text-body transition-colors duration-200 hover:text-ink sm:inline"
              >
                Dashboard
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
                  Get started
                </Button>
              </Link>
            </>
          )}
        </nav>
      </header>
    </div>
  );
}
