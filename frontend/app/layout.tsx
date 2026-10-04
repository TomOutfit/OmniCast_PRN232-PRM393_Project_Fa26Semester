import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { AppLayoutShell } from '@/components/layout/app-layout-shell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * `font-display` now resolves to **Outfit** (was Space_Grotesk) to match the
 * canonical Stitch Live TV & EPG design. Screen names that previously read
 * `font-display` continue to work without changes.
 */
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'OmniCast | Enterprise Media & Broadcast Intelligence',
    template: '%s | OmniCast',
  },
  description:
    'OmniCast - Hệ thống quản lý lịch phát sóng EPG, phát sóng trực tiếp và nền tảng truyền thông doanh nghiệp',
  keywords: [
    'OmniCast',
    'EPG',
    'lịch phát sóng',
    'broadcasting',
    'streaming',
    'media',
    'truyền hình',
  ],
  authors: [{ name: 'OmniCast Team' }],
  creator: 'OmniCast',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://omnicast.tv',
    siteName: 'OmniCast',
    title: 'OmniCast | Enterprise Media & Broadcast Intelligence',
    description:
      'Hệ thống quản lý lịch phát sóng EPG, phát sóng trực tiếp và nền tảng truyền thông doanh nghiệp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniCast',
    description: 'Enterprise Media & Broadcast Intelligence Network',
  },
  icons: {
    icon: '/omnicast_logo.png',
    shortcut: '/omnicast_logo.png',
    apple: '/omnicast_logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f131d' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-surface text-on-surface antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-black focus:font-extrabold focus:rounded-xl focus:shadow-2xl focus:outline-none"
        >
          Bỏ qua tới nội dung
        </a>
        <Providers>
          <AppLayoutShell>{children}</AppLayoutShell>
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1c1f2a',
              color: '#dfe2f1',
              border: '1px solid #3a494b',
            },
          }}
        />
      </body>
    </html>
  );
}
