// ============================================================
// Unit tests for BillingService
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ServiceUnavailableException,
} from '@nestjs/common';
import { BillingService } from '../src/billing/billing.service';

class FakePrisma {
  public user = { update: vi.fn() };
}

class FakeConfig {
  get(key: string, def?: any) {
    const map: Record<string, any> = {
      NODE_ENV: 'test',
      // GOOGLE_PLAY_SERVICE_ACCOUNT_JSON intentionally absent
    };
    return map[key] ?? def;
  }
}

describe('BillingService.verifyAndroidReceipt', () => {
  let svc: BillingService;
  let prisma: FakePrisma;
  let cfg: FakeConfig;

  beforeEach(() => {
    prisma = new FakePrisma();
    cfg = new FakeConfig();
    prisma.user.update.mockResolvedValue({ id: 'u1', premiumUntil: new Date() });
    svc = new BillingService(prisma as any, cfg as any);
  });

  it('stamps 30 days for the monthly product (dev stub)', async () => {
    const result = await svc.verifyAndroidReceipt({
      userId: 'u1',
      productId: 'omnicast_vip_monthly',
      purchaseToken: 't',
    });
    expect(result.success).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.productId).toBe('omnicast_vip_monthly');
    const days =
      (new Date(result.premiumUntil).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  it('stamps 365 days for the yearly product', async () => {
    const result = await svc.verifyAndroidReceipt({
      userId: 'u1',
      productId: 'omnicast_vip_yearly',
      purchaseToken: 't',
    });
    const days =
      (new Date(result.premiumUntil).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(364);
    expect(days).toBeLessThan(366);
  });

  it('refuses to stamp in production without GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', async () => {
    const prodCfg = {
      get: (k: string) =>
        k === 'NODE_ENV' ? 'production' : k === 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON' ? undefined : undefined,
    };
    const prodSvc = new BillingService(prisma as any, prodCfg as any);
    await expect(
      prodSvc.verifyAndroidReceipt({
        userId: 'u1',
        productId: 'omnicast_vip_monthly',
        purchaseToken: 't',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
