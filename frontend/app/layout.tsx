import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
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
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
            },
          }}
        />
      </body>
    </html>
  );
}
