import Image from 'next/image';
import Link from 'next/link';
import { Github, Twitter, Facebook, Mail, Tv, Radio, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

interface FooterLinkItem {
  name: string;
  href: string;
}

const footerLinks: Record<'live_epg' | 'features' | 'company' | 'legal', FooterLinkItem[]> = {
  live_epg: [
    { name: 'Lịch Phát Sóng EPG 24h', href: '/epg' },
    { name: 'Danh Sách 25 Kênh Live', href: '/channels' },
    { name: 'Catch-Up Xem Lại 7 Ngày', href: '/epg' },
    { name: 'Kho Bản Ghi Cloud VOD', href: '/recordings' },
  ],
  features: [
    { name: 'Multi-Cam 4K UHD 60FPS', href: '/' },
    { name: 'Âm Thanh Dolby Atmos 5.1', href: '/' },
    { name: 'AI Curator Studio', href: '/studio/curator' },
    { name: 'Gói Dịch Vụ OmniPass', href: '/settings' },
  ],
  company: [
    { name: 'Giới Thiệu OmniCast', href: '/' },
    { name: 'Tin Tức Phát Sóng', href: '/' },
    { name: 'Hợp Tác Truyền Dẫn', href: '/' },
    { name: 'Trung Tâm Hỗ Trợ', href: '/' },
  ],
  legal: [
    { name: 'Điều Khoản Dịch Vụ', href: '/' },
    { name: 'Chính Sách Quyền Riêng Tư', href: '/' },
    { name: 'Bản Quyền & DMCA', href: '/' },
    { name: 'Tiêu Chuẩn Phát Sóng', href: '/' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#05080e] border-t border-[#142033] text-slate-300">
      {/* ── Status Banner ─────────────────────────────────────────── */}
      <div className="border-b border-[#121c2d] py-3 px-4 lg:px-6 bg-[#03060a]">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-emerald-400 font-bold">NETWORK STATUS:</span>
            <span>ALL 25 CHANNELS BROADCASTING NOMINAL (4K HDR 60FPS)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>SATELLITE SYNC: UTC+7 (HANOI)</span>
            <span>DOLBY ATMOS 5.1 CERTIFIED</span>
            <span>HEVC / H.265 LOW LATENCY</span>
          </div>
        </div>
      </div>

      {/* ── Main Links ────────────────────────────────────────────── */}
      <div className="max-w-[1680px] mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          
          {/* Brand Col */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(0,242,254,0.2)] overflow-hidden">
                <Image
                  src="/omnicast_logo.png"
                  alt="OmniCast Network Logo"
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full object-contain p-0.5 drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-white flex items-center">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 max-w-sm">
              Nền tảng truyền hình trực tuyến thế hệ mới với hệ thống lịch phát sóng EPG thời gian thực, truyền dẫn Multi-Cam 4K UHD và âm thanh vòm Dolby Atmos.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Github"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 1 */}
          <div>
            <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4 text-cyan-400">
              Truyền Hình & EPG
            </h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.live_epg.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4 text-cyan-400">
              Công Nghệ & Tính Năng
            </h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.features.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4 text-cyan-400">
              Về OmniCast
            </h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-white text-xs font-black uppercase tracking-wider mb-4 text-cyan-400">
              Pháp Lý & Bảo Mật
            </h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#142033] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 OmniCast Enterprise Broadcast Network. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Phiên bản 2.4.0 (Build 2026-10)</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Shield className="w-3.5 h-3.5" />
              DRM Protected & Secured
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
