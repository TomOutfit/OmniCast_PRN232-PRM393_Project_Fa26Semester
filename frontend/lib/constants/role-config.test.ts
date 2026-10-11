/**
 * OmniCast - role-config unit tests
 *
 * Verifies the role-gating logic used by the public Navbar and Footer.
 * These helpers are pure functions so they're easy to test in isolation.
 *
 * Run with: `npx vitest run lib/constants/role-config.test.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  hasMinimumRole,
  getNavLinksForRole,
  getHeaderCtaForRole,
  getFooterColumnsForRole,
  getStatusBannerForRole,
  getQuickActionsForRole,
  ROLE_META,
  NAV_LINKS,
  FOOTER_COLUMNS,
} from './role-config';

describe('hasMinimumRole', () => {
  it('treats null/undefined as GUEST', () => {
    expect(hasMinimumRole(null, 'GUEST')).toBe(true);
    expect(hasMinimumRole(undefined, 'VIEWER')).toBe(false);
  });

  it('respects the GUEST < VIEWER < STAFF < ADMIN ordering', () => {
    expect(hasMinimumRole('GUEST', 'VIEWER')).toBe(false);
    expect(hasMinimumRole('VIEWER', 'GUEST')).toBe(true);
    expect(hasMinimumRole('STAFF', 'VIEWER')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'STAFF')).toBe(true);
    expect(hasMinimumRole('STAFF', 'ADMIN')).toBe(false);
  });

  it('a role is always >= itself', () => {
    for (const role of ['GUEST', 'VIEWER', 'STAFF', 'ADMIN'] as const) {
      expect(hasMinimumRole(role, role)).toBe(true);
    }
  });
});

describe('getNavLinksForRole', () => {
  it('shows only public links to GUEST', () => {
    const links = getNavLinksForRole('GUEST');
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/channels');
    expect(hrefs).toContain('/epg');
    expect(hrefs).toContain('/recordings');
    expect(hrefs).not.toContain('/watchlist');
    expect(hrefs).not.toContain('/studio');
    expect(hrefs).not.toContain('/admin');
  });

  it('adds Watchlist for VIEWER but no Studio / Admin', () => {
    const links = getNavLinksForRole('VIEWER');
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain('/watchlist');
    expect(hrefs).not.toContain('/studio');
    expect(hrefs).not.toContain('/admin');
  });

  it('exposes Studio links to STAFF and ADMIN but not Viewer', () => {
    const staffLinks = getNavLinksForRole('STAFF');
    expect(staffLinks.map((l) => l.href)).toContain('/studio');
    expect(staffLinks.map((l) => l.href)).toContain('/studio/curator');
    expect(staffLinks.map((l) => l.href)).not.toContain('/admin');

    const adminLinks = getNavLinksForRole('ADMIN');
    expect(adminLinks.map((l) => l.href)).toContain('/admin');
    expect(adminLinks.map((l) => l.href)).toContain('/studio');
  });

  it('treats null as GUEST', () => {
    expect(getNavLinksForRole(null).length).toBe(getNavLinksForRole('GUEST').length);
  });
});

describe('getHeaderCtaForRole', () => {
  it('returns the "Mua gói" CTA for unauthenticated users', () => {
    const cta = getHeaderCtaForRole(null, false);
    expect(cta.variant).toBe('guest');
    expect(cta.label).toBe('Mua gói');
  });

  it('returns a "Nâng cấp" CTA for VIEWER', () => {
    const cta = getHeaderCtaForRole('VIEWER', true);
    expect(cta.variant).toBe('viewer');
    expect(cta.label).toBe('Nâng cấp');
  });

  it('returns a "Studio" CTA for STAFF and "Quản trị" for ADMIN', () => {
    expect(getHeaderCtaForRole('STAFF', true).variant).toBe('staff');
    expect(getHeaderCtaForRole('ADMIN', true).variant).toBe('admin');
  });
});

describe('getFooterColumnsForRole', () => {
  it('hides the Cá Nhân column from GUEST', () => {
    const titles = getFooterColumnsForRole('GUEST').map((c) => c.title);
    expect(titles).not.toContain('Cá Nhân');
    expect(titles).not.toContain('Studio Phát Sóng');
    expect(titles).not.toContain('Quản Trị Hệ Thống');
  });

  it('shows Cá Nhân but not Studio / Admin to VIEWER', () => {
    const titles = getFooterColumnsForRole('VIEWER').map((c) => c.title);
    expect(titles).toContain('Cá Nhân');
    expect(titles).not.toContain('Studio Phát Sóng');
    expect(titles).not.toContain('Quản Trị Hệ Thống');
  });

  it('shows Studio + Vận hành columns to STAFF', () => {
    const titles = getFooterColumnsForRole('STAFF').map((c) => c.title);
    expect(titles).toContain('Studio Phát Sóng');
    expect(titles).toContain('Vận Hành');
    expect(titles).not.toContain('Quản Trị Hệ Thống');
  });

  it('exposes the full admin set to ADMIN', () => {
    const titles = getFooterColumnsForRole('ADMIN').map((c) => c.title);
    expect(titles).toContain('Quản Trị Hệ Thống');
    expect(titles).toContain('Sức Khỏe Hệ Thống');
  });
});

describe('getStatusBannerForRole', () => {
  it('returns the public banner when not authenticated', () => {
    const b = getStatusBannerForRole(null, false);
    expect(b.statusLabel).toBe('NETWORK STATUS');
    expect(b.status).toContain('BROADCASTING NOMINAL');
  });

  it('returns the viewer banner for VIEWER', () => {
    const b = getStatusBannerForRole('VIEWER', true);
    expect(b.statusLabel).toBe('PHÁT SÓNG & CÁ NHÂN');
  });

  it('returns the studio banner for STAFF', () => {
    const b = getStatusBannerForRole('STAFF', true);
    expect(b.statusLabel).toBe('TRẠNG THÁI STUDIO');
    expect(b.status).toContain('AI CURATOR READY');
  });

  it('returns the system health banner for ADMIN', () => {
    const b = getStatusBannerForRole('ADMIN', true);
    expect(b.statusLabel).toBe('SYSTEM HEALTH');
    expect(b.status).toContain('UPTIME');
  });
});

describe('getQuickActionsForRole', () => {
  it('returns guest shortcuts when not authenticated', () => {
    const actions = getQuickActionsForRole(null, false);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.map((a) => a.label)).toContain('Mua OmniPass');
  });

  it('returns role-specific shortcuts for authenticated users', () => {
    expect(
      getQuickActionsForRole('STAFF', true).map((a) => a.label),
    ).toContain('Mở Live Studio');
    expect(
      getQuickActionsForRole('ADMIN', true).map((a) => a.label),
    ).toContain('Bảng Điều Khiển');
  });
});

describe('ROLE_META metadata', () => {
  it('has an entry for every role', () => {
    for (const role of ['GUEST', 'VIEWER', 'STAFF', 'ADMIN'] as const) {
      expect(ROLE_META[role]).toBeDefined();
      expect(ROLE_META[role].rank).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses consistent accent colors per role tier', () => {
    expect(ROLE_META.GUEST.pillClass).toContain('slate');
    expect(ROLE_META.VIEWER.pillClass).toContain('cyan');
    expect(ROLE_META.STAFF.pillClass).toContain('purple');
    expect(ROLE_META.ADMIN.pillClass).toContain('amber');
  });
});

describe('Configuration sanity', () => {
  it('NAV_LINKS uses unique hrefs', () => {
    const hrefs = NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('FOOTER_COLUMNS uses unique titles', () => {
    const titles = FOOTER_COLUMNS.map((c) => c.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
