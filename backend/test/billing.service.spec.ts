// ============================================================
// Unit tests for BillingService
// ============================================================

import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceUnavailableException } from '@nestjs/common';
import { BillingService } from '../src/billing/billing.service';

class FakePrisma {
  public user = {
    update: async (args: any) => ({ id: args.where.id, premiumUntil: args.data.premiumUntil }),
  };
}

class FakeConfig {
  get(key: string, def?: any) {
    const map: Record<string, any> = {
      NODE_ENV: 'test',
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
    svc = new BillingService(prisma as any, cfg as any);
  });

  test('stamps 30 days for the monthly product (dev stub)', async () => {
    const result = await svc.verifyAndroidReceipt({
      userId: 'u1',
      productId: 'omnicast_vip_monthly',
      purchaseToken: 't',
    });
    assert.equal(result.success, true);
    assert.equal(result.verified, false);
    assert.equal(result.productId, 'omnicast_vip_monthly');
    const days =
      (new Date(result.premiumUntil).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000);
    assert.ok(days > 29 && days < 31, `Expected ~30 days, got ${days}`);
  });

  test('stamps 365 days for the yearly product', async () => {
    const result = await svc.verifyAndroidReceipt({
      userId: 'u1',
      productId: 'omnicast_vip_yearly',
      purchaseToken: 't',
    });
    const days =
      (new Date(result.premiumUntil).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000);
    assert.ok(days > 364 && days < 366, `Expected ~365 days, got ${days}`);
  });

  test('refuses to stamp in production without GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', async () => {
    const prodCfg = {
      get: (k: string) =>
        k === 'NODE_ENV' ? 'production' : k === 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON' ? undefined : undefined,
    };
    const prodSvc = new BillingService(prisma as any, prodCfg as any);
    await assert.rejects(
      async () => {
        await prodSvc.verifyAndroidReceipt({
          userId: 'u1',
          productId: 'omnicast_vip_monthly',
          purchaseToken: 't',
        });
      },
      (err: any) => err instanceof ServiceUnavailableException,
    );
  });
});
