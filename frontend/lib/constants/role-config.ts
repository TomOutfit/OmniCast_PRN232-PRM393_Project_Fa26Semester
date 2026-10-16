// ============================================================
// OmniCast - Role-Based Layout Config
// ------------------------------------------------------------
// Central source of truth for the public Navbar + Footer.
// Both components read from this file so changes stay in sync.
//
// Role hierarchy (rank):
//   GUEST  (0) – not authenticated
//   VIEWER (1) – public consumer
//   STAFF  (2) – editor / studio operator
//   ADMIN  (3) – full system administrator
//
// All gates use `hasMinimumRole(...)` so promoting a capability
// from VIEWER → STAFF is a one-line edit here.
// ============================================================

import type { UserRole } from '@/types';

// Re-export so consumers can import the role type from a single place
// (matches the convention used by other constants files).
export type { UserRole };
import {
  Home,
  Tv,
  Calendar,
  Film,
  Bookmark,
  Radio,
  Sparkles,
  Shield,
  Settings,
  Cpu,
  Activity,
  Users,
  FileLock,
  Gauge,
  Wand2,
  ServerCog,
  ListChecks,
  Headphones,
  type LucideIcon,
} from 'lucide-react';

// ------------------------------------------------------------
// Role helpers
// ------------------------------------------------------------

const ROLE_RANK: Record<UserRole, number> = {
  GUEST: 0,
  VIEWER: 1,
  STAFF: 2,
  ADMIN: 3,
};

export function hasMinimumRole(
  role: UserRole | undefined | null,
  minimum: UserRole,
): boolean {
  if (!role) return minimum === 'GUEST';
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// ------------------------------------------------------------
// Visual identity for each role
// ------------------------------------------------------------

export interface RoleMeta {
  label: string;
  shortLabel: string;
  rank: number;
  /** Tailwind classes – bg / border / text for inline pill. */
  pillClass: string;
  /** Dot color for status indicator. */
  dotClass: string;
  /** Short Vietnamese description for tooltips / footer status. */
  description: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  GUEST: {
    label: 'Khách',
    shortLabel: 'GUEST',
    rank: 0,
    pillClass:
      'bg-slate-900/70 border-slate-500/40 text-slate-300',
    dotClass: 'bg-slate-400',
    description: 'Chưa đăng nhập – truy cập nội dung công khai',
  },
  VIEWER: {
    label: 'Khán giả',
    shortLabel: 'VIEWER',
    rank: 1,
    pillClass:
      'bg-cyan-950/70 border-cyan-500/50 text-cyan-300',
    dotClass: 'bg-cyan-400',
    description: 'Khán giả 4K HDR – xem trực tiếp & VOD',
  },
  STAFF: {
    label: 'Biên tập viên',
    shortLabel: 'STAFF',
    rank: 2,
    pillClass:
      'bg-purple-950/70 border-purple-500/50 text-purple-300',
    dotClass: 'bg-purple-400',
    description: 'Biên tập viên – quản lý chương trình & Studio',
  },
  ADMIN: {
    label: 'Quản trị viên',
    shortLabel: 'ADMIN',
    rank: 3,
    pillClass:
      'bg-amber-950/70 border-amber-500/50 text-amber-300',
    dotClass: 'bg-amber-400',
    description: 'Quản trị hệ thống – toàn quyền vận hành',
  },
};

// ------------------------------------------------------------
// Navbar configuration
// ------------------------------------------------------------

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Minimum role required to see this link. */
  minRole: UserRole;
  /** Optional highlight (e.g. AI Curator as a "pro" link). */
  accent?: 'cyan' | 'purple' | 'amber';
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Trang Chủ', href: '/', icon: Home, minRole: 'GUEST' },
  { label: 'Truyền Hình', href: '/channels', icon: Tv, minRole: 'GUEST' },
  { label: 'Lịch EPG', href: '/epg', icon: Calendar, minRole: 'GUEST' },
  { label: 'Kho Phim', href: '/recordings', icon: Film, minRole: 'GUEST' },
  { label: 'Watchlist', href: '/watchlist', icon: Bookmark, minRole: 'VIEWER', accent: 'cyan' },
  { label: 'Live Studio', href: '/studio', icon: Radio, minRole: 'STAFF', accent: 'purple' },
  { label: 'AI Curator', href: '/studio/curator', icon: Wand2, minRole: 'STAFF', accent: 'purple' },
  { label: 'Quản Trị', href: '/admin', icon: Shield, minRole: 'ADMIN', accent: 'amber' },
];

/** Resolve the active navigation links for a given role. */
export function getNavLinksForRole(role: UserRole | null | undefined): NavLink[] {
  return NAV_LINKS.filter((link) => hasMinimumRole(role, link.minRole));
}

// ------------------------------------------------------------
// Right-side primary CTA (the orange "Mua gói" button area)
// ------------------------------------------------------------

export interface HeaderCta {
  label: string;
  href: string;
  icon: LucideIcon;
  variant: 'guest' | 'viewer' | 'staff' | 'admin';
  tooltip: string;
}

export const HEADER_CTA: Record<'guest' | 'viewer' | 'staff' | 'admin', HeaderCta> = {
  guest: {
    label: 'Mua gói',
    href: '/settings',
    icon: Sparkles,
    variant: 'guest',
    tooltip: 'Khám phá các gói OmniPass',
  },
  viewer: {
    label: 'Nâng cấp',
    href: '/settings',
    icon: Sparkles,
    variant: 'viewer',
    tooltip: 'Nâng cấp OmniPass để mở kênh Premium',
  },
  staff: {
    label: 'Studio',
    href: '/studio',
    icon: Radio,
    variant: 'staff',
    tooltip: 'Vào Studio phát sóng',
  },
  admin: {
    label: 'Quản trị',
    href: '/admin',
    icon: Shield,
    variant: 'admin',
    tooltip: 'Mở trang Quản trị hệ thống',
  },
};

export function getHeaderCtaForRole(
  role: UserRole | null | undefined,
  isAuthenticated: boolean,
): HeaderCta {
  if (!isAuthenticated) return HEADER_CTA.guest;
  if (role === 'ADMIN') return HEADER_CTA.admin;
  if (role === 'STAFF') return HEADER_CTA.staff;
  return HEADER_CTA.viewer;
}

// ------------------------------------------------------------
// Footer configuration
// ------------------------------------------------------------

export interface FooterColumn {
  title: string;
  icon: LucideIcon;
  /** Tailwind accent class for the column heading. */
  accentClass: string;
  /** Minimum role required to see this column. */
  minRole: UserRole;
  links: { label: string; href: string; external?: boolean }[];
}

/**
 * Each column is gated by `minRole`. A column is only rendered when
 * the current role is at-or-above the gate. This keeps VIEWER footers
 * clean while giving STAFF/ADMIN access to operational shortcuts.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  // ── Public columns (visible to everyone) ────────────────────
  {
    title: 'Truyền Hình & EPG',
    icon: Tv,
    accentClass: 'text-cyan-400',
    minRole: 'GUEST',
    links: [
      { label: 'Lịch Phát Sóng EPG 24h', href: '/epg' },
      { label: 'Danh Sách 25 Kênh Live', href: '/channels' },
      { label: 'Catch-Up Xem Lại 7 Ngày', href: '/epg' },
      { label: 'Kho Bản Ghi Cloud VOD', href: '/recordings' },
    ],
  },
  {
    title: 'Công Nghệ & Tính Năng',
    icon: Headphones,
    accentClass: 'text-cyan-400',
    minRole: 'GUEST',
    links: [
      { label: 'Multi-Cam 4K UHD 60FPS', href: '/' },
      { label: 'Âm Thanh Dolby Atmos 5.1', href: '/' },
      { label: 'Gói Dịch Vụ OmniPass', href: '/settings' },
    ],
  },
  // ── VIEWER column (watchlist) ───────────────────────────────
  {
    title: 'Cá Nhân',
    icon: Bookmark,
    accentClass: 'text-cyan-300',
    minRole: 'VIEWER',
    links: [
      { label: 'Danh Sách Yêu Thích', href: '/watchlist' },
      { label: 'Hồ Sơ Của Tôi', href: '/profile' },
      { label: 'Nâng Cấp OmniPass', href: '/settings' },
    ],
  },
  // ── STAFF columns (editor / studio) ─────────────────────────
  {
    title: 'Studio Phát Sóng',
    icon: Radio,
    accentClass: 'text-purple-400',
    minRole: 'STAFF',
    links: [
      { label: 'Live Studio', href: '/studio' },
      { label: 'AI Curator', href: '/studio/curator' },
      { label: 'Xếp Lịch EPG', href: '/epg' },
      { label: 'Kiểm Duyệt Chương Trình', href: '/studio' },
    ],
  },
  {
    title: 'Vận Hành',
    icon: Activity,
    accentClass: 'text-purple-400',
    minRole: 'STAFF',
    links: [
      { label: 'Bảng Điều Khiển', href: '/admin' },
      { label: 'Thống Kê Phát Sóng', href: '/admin' },
      { label: 'Quản Lý Kênh', href: '/admin' },
    ],
  },
  // ── ADMIN columns ───────────────────────────────────────────
  {
    title: 'Quản Trị Hệ Thống',
    icon: Shield,
    accentClass: 'text-amber-400',
    minRole: 'ADMIN',
    links: [
      { label: 'Quản Lý Người Dùng', href: '/admin/users' },
      { label: 'Nhật Ký Kiểm Tra', href: '/admin/audit-logs' },
      { label: 'Cấu Hình RBAC', href: '/admin' },
    ],
  },
  {
    title: 'Sức Khỏe Hệ Thống',
    icon: ServerCog,
    accentClass: 'text-amber-400',
    minRole: 'ADMIN',
    links: [
      { label: 'Trạng Thái Dịch Vụ', href: '/admin' },
      { label: 'Hàng Đợi Phát Sóng', href: '/admin' },
      { label: 'Bảo Mật & DRM', href: '/admin' },
    ],
  },
  // ── Public legal column (always last) ───────────────────────
  {
    title: 'Pháp Lý & Bảo Mật',
    icon: FileLock,
    accentClass: 'text-cyan-400',
    minRole: 'GUEST',
    links: [
      { label: 'Điều Khoản Dịch Vụ', href: '/terms' },
      { label: 'Chính Sách Quyền Riêng Tư', href: '/privacy' },
      { label: 'Bản Quyền & DMCA', href: '/dmca' },
      { label: 'Tiêu Chuẩn Phát Sóng', href: '/standards' },
    ],
  },
];

export function getFooterColumnsForRole(
  role: UserRole | null | undefined,
): FooterColumn[] {
  return FOOTER_COLUMNS.filter((col) => hasMinimumRole(role, col.minRole));
}

// ------------------------------------------------------------
// Footer status banner (top strip of footer)
// ------------------------------------------------------------

export interface StatusBanner {
  /** Big green text, e.g. "ALL 25 CHANNELS BROADCASTING NOMINAL". */
  status: string;
  /** Side metadata chips, e.g. "DOLBY ATMOS 5.1 CERTIFIED". */
  chips: { label: string; accent?: 'cyan' | 'purple' | 'amber' | 'emerald' }[];
  /** Pulse dot color. */
  pulse: 'emerald' | 'cyan' | 'purple' | 'amber';
  /** Label for the status word. */
  statusLabel: string;
}

const PUBLIC_BANNER: StatusBanner = {
  statusLabel: 'NETWORK STATUS',
  status: 'ALL 25 CHANNELS BROADCASTING NOMINAL (4K HDR 60FPS)',
  chips: [
    { label: 'SATELLITE SYNC: UTC+7 (HANOI)' },
    { label: 'DOLBY ATMOS 5.1 CERTIFIED' },
    { label: 'HEVC / H.265 LOW LATENCY' },
  ],
  pulse: 'emerald',
};

const VIEWER_BANNER: StatusBanner = {
  statusLabel: 'PHÁT SÓNG & CÁ NHÂN',
  status: 'BẠN ĐANG XEM Ở PHIÊN [VIEWER] – KHUYẾN NGHỊ BẬT HDR 4K',
  chips: [
    { label: 'GÓI: OMNIPASS FREE', accent: 'cyan' },
    { label: 'CHẤT LƯỢNG: AUTO (SD → 4K)' },
    { label: 'LỊCH SỬ XEM: ĐÃ ĐỒNG BỘ' },
  ],
  pulse: 'cyan',
};

const STAFF_BANNER: StatusBanner = {
  statusLabel: 'TRẠNG THÁI STUDIO',
  status: 'STUDIO OPERATIONAL · AI CURATOR READY · 0.8ms P50',
  chips: [
    { label: 'CPU: 34% · RAM: 6.2 / 16 GB', accent: 'purple' },
    { label: 'LIVE EVENTS: 4 ĐANG PHÁT', accent: 'purple' },
    { label: 'HÀNG ĐỢI EPG: 12 CHƯƠNG TRÌNH' },
  ],
  pulse: 'purple',
};

const ADMIN_BANNER: StatusBanner = {
  statusLabel: 'SYSTEM HEALTH',
  status: 'ALL SERVICES GREEN · 99.97% UPTIME (30D) · 0 SECURITY INCIDENTS',
  chips: [
    { label: 'API P95: 142ms', accent: 'amber' },
    { label: 'DB POOL: 38/100', accent: 'amber' },
    { label: 'CDN: 25/25 NODES ONLINE', accent: 'emerald' },
    { label: 'AUDIT: 1,247 SỰ KIỆN / 24H' },
  ],
  pulse: 'emerald',
};

export function getStatusBannerForRole(
  role: UserRole | null | undefined,
  isAuthenticated: boolean,
): StatusBanner {
  if (!isAuthenticated) return PUBLIC_BANNER;
  if (role === 'ADMIN') return ADMIN_BANNER;
  if (role === 'STAFF') return STAFF_BANNER;
  return VIEWER_BANNER;
}

// ------------------------------------------------------------
// Quick action bar (between status banner and main columns).
// One-click shortcuts per role.
// ------------------------------------------------------------

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  accent: 'cyan' | 'purple' | 'amber' | 'emerald';
}

export const QUICK_ACTIONS: Record<UserRole, QuickAction[]> = {
  GUEST: [
    { label: 'Xem Truyền Hình', href: '/channels', icon: Tv, description: '25 kênh 4K', accent: 'cyan' },
    { label: 'Lịch Phát Sóng', href: '/epg', icon: Calendar, description: 'EPG 24 giờ', accent: 'cyan' },
    { label: 'Mua OmniPass', href: '/settings', icon: Sparkles, description: 'Mở kênh Premium', accent: 'amber' },
  ],
  VIEWER: [
    { label: 'Danh Sách Yêu Thích', href: '/watchlist', icon: Bookmark, description: 'Xem sau của bạn', accent: 'cyan' },
    { label: 'Lịch Sử Xem', href: '/profile', icon: ListChecks, description: '7 ngày gần nhất', accent: 'cyan' },
    { label: 'Nâng Cấp OmniPass', href: '/settings', icon: Sparkles, description: '4K HDR + Dolby', accent: 'amber' },
  ],
  STAFF: [
    { label: 'Mở Live Studio', href: '/studio', icon: Radio, description: 'Phát trực tiếp', accent: 'purple' },
    { label: 'AI Curator', href: '/studio/curator', icon: Wand2, description: 'Phân tích nội dung', accent: 'purple' },
    { label: 'Xếp Lịch EPG', href: '/epg', icon: Calendar, description: '12 chương trình chờ', accent: 'cyan' },
    { label: 'Kiểm Duyệt', href: '/studio', icon: ListChecks, description: '3 chờ duyệt', accent: 'emerald' },
  ],
  ADMIN: [
    { label: 'Bảng Điều Khiển', href: '/admin', icon: Gauge, description: 'Tổng quan hệ thống', accent: 'amber' },
    { label: 'Quản Lý Users', href: '/admin/users', icon: Users, description: 'RBAC & quyền', accent: 'amber' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileLock, description: '1,247 sự kiện/24h', accent: 'amber' },
    { label: 'Cấu Hình', href: '/admin', icon: Settings, description: 'System & Security', accent: 'amber' },
  ],
};

export function getQuickActionsForRole(
  role: UserRole | null | undefined,
  isAuthenticated: boolean,
): QuickAction[] {
  const effective: UserRole = !isAuthenticated ? 'GUEST' : role ?? 'GUEST';
  return QUICK_ACTIONS[effective];
}

// ------------------------------------------------------------
// Accent utilities – keeps colors consistent across components
// ------------------------------------------------------------

export const ACCENT_CLASSES: Record<
  'cyan' | 'purple' | 'amber' | 'emerald',
  { bg: string; border: string; text: string; dot: string }
> = {
  cyan: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/30',
    text: 'text-cyan-300',
    dot: 'bg-cyan-400',
  },
  purple: {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    dot: 'bg-purple-400',
  },
  amber: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
};
