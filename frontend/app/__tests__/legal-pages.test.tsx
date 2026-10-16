// ============================================================
// Legal & Compliance Pages — Render & Contract Verification Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/terms',
  redirect: vi.fn(),
}));

import TermsOfServicePage, { metadata as termsMetadata } from '../terms/page';
import PrivacyPolicyPage, { metadata as privacyMetadata } from '../privacy/page';
import DmcaPolicyPage, { metadata as dmcaMetadata } from '../dmca/page';
import BroadcastingStandardsPage, { metadata as standardsMetadata } from '../standards/page';
import { FOOTER_COLUMNS } from '@/lib/constants/role-config';

describe('Legal & Compliance Pages', () => {
  it('has proper SEO metadata configured for all 4 legal pages', () => {
    expect(termsMetadata.title).toContain('Điều Khoản Dịch Vụ');
    expect(privacyMetadata.title).toContain('Chính Sách Quyền Riêng Tư');
    expect(dmcaMetadata.title).toContain('Bản Quyền & DMCA');
    expect(standardsMetadata.title).toContain('Tiêu Chuẩn Phát Sóng');
  });

  it('renders Terms of Service page with expected chapters', () => {
    const html = renderToString(<TermsOfServicePage />);
    expect(html).toContain('Điều Khoản Dịch Vụ');
    expect(html).toContain('Ma Trận Quyền Hạn RBAC');
    expect(html).toContain('GUEST');
    expect(html).toContain('VIEWER');
    expect(html).toContain('STAFF');
    expect(html).toContain('ADMIN');
  });

  it('renders Privacy Policy page with Decree 13/2023/ND-CP compliance', () => {
    const html = renderToString(<PrivacyPolicyPage />);
    expect(html).toContain('Chính Sách Quyền Riêng Tư');
    expect(html).toContain('Nghị định 13/2023/NĐ-CP');
    expect(html).toContain('Argon2 Password Hash');
    expect(html).toContain('dpo@omnicast.tv');
  });

  it('renders DMCA Policy page with takedown procedure and template', () => {
    const html = renderToString(<DmcaPolicyPage />);
    expect(html).toContain('Bản Quyền &amp; Chính Sách DMCA');
    expect(html).toContain('dmca@omnicast.tv');
    expect(html).toContain('PEXELS_LICENSE');
    expect(html).toContain('Three Strikes');
  });

  it('renders Broadcasting Standards page with content rating badges', () => {
    const html = renderToString(<BroadcastingStandardsPage />);
    expect(html).toContain('Tiêu Chuẩn Phát Sóng');
    expect(html).toContain('Phổ Biến (General Audiences)');
    expect(html).toContain('Khán Giả Thiếu Nhi');
    expect(html).toContain('Teens 13+');
    expect(html).toContain('Mature 16+');
    expect(html).toContain('Adults 18+');
    expect(html).toContain('Cấm Phổ Biến');
    expect(html).toContain('AI Curator');
  });

  it('FOOTER_COLUMNS points to the four dedicated legal routes', () => {
    const legalCol = FOOTER_COLUMNS.find((c) => c.title === 'Pháp Lý & Bảo Mật');
    expect(legalCol).toBeDefined();
    const links = legalCol!.links;
    expect(links.find((l) => l.label === 'Điều Khoản Dịch Vụ')?.href).toBe('/terms');
    expect(links.find((l) => l.label === 'Chính Sách Quyền Riêng Tư')?.href).toBe('/privacy');
    expect(links.find((l) => l.label === 'Bản Quyền & DMCA')?.href).toBe('/dmca');
    expect(links.find((l) => l.label === 'Tiêu Chuẩn Phát Sóng')?.href).toBe('/standards');
  });
});
