import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { NavBar } from '@/components/nav-bar';
import { Footer } from '@/components/footer';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
});

const description =
  'Key personnel, engineers and office staff for construction and infrastructure projects — railways, metro, highways, buildings and industrial — including retired government and railway officers.';

// Icons come from the app/ file conventions (favicon.ico, icon.svg, apple-icon.png).
export const metadata: Metadata = {
  metadataBase: new URL('https://yuktisolutions.co.in'),
  title: 'Yukti Solutions',
  description,
  manifest: '/site.webmanifest',
  openGraph: {
    siteName: 'Yukti Solutions',
    type: 'website',
    title: 'Yukti Solutions',
    description,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Yukti Solutions logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#13294B',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`h-full antialiased ${poppins.variable}`}>
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
