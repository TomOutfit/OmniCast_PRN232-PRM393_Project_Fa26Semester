import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { AppLayoutShell } from '@/components/layout/app-layout-shell';
import './globals.css';

const themeBootstrap = `(function(){try{var m=localStorage.getItem('omnicast.theme');var light=m==='light'||(m==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('light',light);r.classList.toggle('dark',!light);r.dataset.theme=light?'light':'dark';r.style.colorScheme=light?'light':'dark'}catch(e){}})()`;

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
  themeColor: '#0d1415',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-surface text-on-surface antialiased relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-black focus:font-extrabold focus:rounded-xl focus:shadow-2xl focus:outline-none"
        >
          Bỏ qua tới nội dung
        </a>
        <Providers>
          <AppLayoutShell>{children}</AppLayoutShell>
        </Providers>
      </body>
    </html>
  );
}
