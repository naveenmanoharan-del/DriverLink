import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { NavBar } from '@/components/nav-bar';
import { Footer } from '@/components/footer';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Yukti Solutions',
  description: 'Hire verified labour, drivers, artisans and office staff — or find work near you.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`h-full antialiased ${jakarta.variable}`}>
      <body className="min-h-full flex flex-col bg-white text-ink">
        <AuthProvider>
          <NavBar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
