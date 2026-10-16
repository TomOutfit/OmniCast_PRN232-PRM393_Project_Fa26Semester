'use client';

// ============================================================
// OmniCast · Legal Page Layout Component
// ============================================================
// Shared cinematic layout for all 4 legal & compliance documents:
//   - Terms of Service (/terms)
//   - Privacy Policy (/privacy)
//   - Copyright & DMCA (/dmca)
//   - Broadcasting Standards (/standards)
//
// Features:
//   - Cyberpunk dark cinema header with glowing badge
//   - Responsive 4-tab legal switcher
//   - In-page live section search / filter
//   - Interactive Table of Contents (TOC) with smooth scrolling
//   - Print & Copy link utility actions
//   - Official compliance metadata & contact dispatch
// ============================================================

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Shield,
  Scale,
  Radio,
  ChevronLeft,
  Printer,
  Copy,
  Check,
  Mail,
  Search,
  ExternalLink,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';

export interface TocItem {
  id: string;
  title: string;
  badge?: string;
}

export interface LegalPageLayoutProps {
  currentTab: 'terms' | 'privacy' | 'dmca' | 'standards';
  title: string;
  subtitle: string;
  lastUpdated?: string;
  version?: string;
  toc: TocItem[];
  children: React.ReactNode;
}

const LEGAL_TABS = [
  {
    key: 'terms',
    label: 'Điều Khoản Dịch Vụ',
    shortLabel: 'Điều Khoản',
    href: '/terms',
    icon: FileText,
    accent: 'cyan',
  },
  {
    key: 'privacy',
    label: 'Chính Sách Quyền Riêng Tư',
    shortLabel: 'Quyền Riêng Tư',
    href: '/privacy',
    icon: Shield,
    accent: 'purple',
  },
  {
    key: 'dmca',
    label: 'Bản Quyền & DMCA',
    shortLabel: 'Bản Quyền & DMCA',
    href: '/dmca',
    icon: Scale,
    accent: 'amber',
  },
  {
    key: 'standards',
    label: 'Tiêu Chuẩn Phát Sóng',
    shortLabel: 'Tiêu Chuẩn',
    href: '/standards',
    icon: Radio,
    accent: 'emerald',
  },
] as const;

export function LegalPageLayout({
  currentTab,
  title,
  subtitle,
  lastUpdated = '16 Tháng 10, 2026',
  version = 'v2.4',
  toc,
  children,
}: LegalPageLayoutProps) {
  const pathname = usePathname();
  const [copied, setCopied] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeSection, setActiveSection] = React.useState<string>(toc[0]?.id || '');

  // Observe active section for TOC highlighting
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );

    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [toc]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const filteredToc = toc.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#080d1a] to-[#04060c] text-slate-200">
      {/* ── Top Header Bar ──────────────────────────────────────── */}
      <div className="border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xs font-mono font-medium text-slate-400">
              Pháp Lý & Bảo Mật
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              title="Sao chép liên kết tài liệu"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã chép link</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Sao chép link</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              title="In hoặc lưu dạng PDF"
            >
              <Printer className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">In văn bản</span>
            </button>

            <a
              href="mailto:legal@omnicast.tv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ban Pháp Chế</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* ── Document Hero Banner ─────────────────────────────────── */}
        <header className="mb-8 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-slate-900/90 via-[#0d1627]/90 to-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-300">
                <FileCheck2 className="h-3 w-3" />
                Văn Bản Pháp Lý Chính Thức · OmniCast Network
              </span>
              <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-mono text-slate-400">
                Phiên bản {version}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono text-emerald-400">
                Có hiệu lực từ {lastUpdated}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          </div>
        </header>

        {/* ── 4-Tabs Navigation Bar ───────────────────────────────── */}
        <nav
          aria-label="Legal Documents Navigation"
          className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
        >
          {LEGAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`relative flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border transition-all duration-200 group ${
                  isActive
                    ? 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 shadow-lg shadow-cyan-950/30 text-white'
                    : 'border-white/[0.06] bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-white/20 hover:bg-slate-900/70'
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-white/[0.04] text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/10'
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold truncate">
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
                    {isActive ? '● Đang xem' : 'Xem tài liệu →'}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── Main Content Grid with Sidebar ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Column */}
          <main className="lg:col-span-8 min-w-0 space-y-6">
            {children}

            {/* Bottom Support / Feedback Card */}
            <div className="mt-12 rounded-xl border border-white/10 bg-[#090f1d] p-6 text-sm text-slate-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-cyan-400" />
                    Cần giải đáp hoặc tư vấn thêm về pháp lý?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bộ phận Pháp lý & Tuân thủ OmniCast sẵn sàng hỗ trợ bạn qua email chính thức.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href="mailto:legal@omnicast.tv"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    legal@omnicast.tv
                  </a>
                  <Link
                    href="/help"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] text-slate-200 text-xs hover:bg-white/10 transition"
                  >
                    Trung tâm hỗ trợ
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </main>

          {/* Sticky Sidebar (TOC & Fast Navigation) */}
          <aside className="lg:col-span-4 space-y-5 sticky top-20">
            {/* TOC Card */}
            <div className="rounded-xl border border-white/[0.08] bg-[#070b14]/90 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08] mb-3">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Mục lục tài liệu ({toc.length})
                </h2>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Tự động cuộn
                </span>
              </div>

              {/* Quick Search in Document */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm mục trong văn bản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredToc.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    Không tìm thấy mục phù hợp.
                  </p>
                ) : (
                  filteredToc.map((item, idx) => {
                    const isActive = activeSection === item.id;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`group flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="font-mono text-[10px] text-slate-600 group-hover:text-cyan-400 mt-0.5">
                          {(idx + 1).toString().padStart(2, '0')}.
                        </span>
                        <span className="flex-1 leading-snug">{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">
                            {item.badge}
                          </span>
                        )}
                      </a>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Summary Pill Box */}
            <div className="rounded-xl border border-white/[0.08] bg-[#070b14]/70 p-4 text-xs space-y-3">
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-amber-400" />
                Cơ quan chủ quản & Liên hệ
              </h3>
              <ul className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  <span className="text-slate-300 font-semibold">Tổ chức:</span>{' '}
                  Mạng Truyền Hình Số OmniCast TV
                </li>
                <li>
                  <span className="text-slate-300 font-semibold">Địa chỉ:</span>{' '}
                  Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh
                </li>
                <li>
                  <span className="text-slate-300 font-semibold">Khẩn cấp DMCA:</span>{' '}
                  <span className="text-amber-300 font-mono">dmca@omnicast.tv</span>
                </li>
                <li>
                  <span className="text-slate-300 font-semibold">Bảo vệ dữ liệu (DPO):</span>{' '}
                  <span className="text-purple-300 font-mono">dpo@omnicast.tv</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
