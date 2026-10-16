// ============================================================
// Unit tests for UsersService.updateRole
// ============================================================
//
// Validates the role-elevation guard: API requests cannot promote
// a user to `ADMIN`. The audit log entry must be present on every
// blocked attempt so SOC dashboards surface these signals.
// ============================================================

import 'reflect-metadata';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';

class FakePrisma {
  public user = {
    findUnique: async () => null,
    update: async (args: any) => ({ id: args.where.id, role: args.data.role }),
    findMany: async () => [],
    count: async () => 0,
    create: async (args: any) => ({ id: 'new', ...args.data }),
  };
}

class FakeAudit {
  public calls: any[] = [];
  public log = async (entry: any) => {
    this.calls.push(entry);
    return entry;
  };
}

describe('UsersService.updateRole — admin elevation guard', () => {
  let svc: UsersService;
  let prisma: FakePrisma;
  let audit: FakeAudit;

  const validUuid = 'a1b2c3d4-e5f6-7890-1234-56789abcdef0';

  beforeEach(() => {
    prisma = new FakePrisma();
    audit = new FakeAudit();
    svc = new UsersService(prisma as any, audit as any);
  });

  test('throws BadRequest + audits when promoting to ADMIN via enum', async () => {
    await assert.rejects(
      async () => {
        await svc.updateRole(validUuid, 'ADMIN');
      },
      (err: any) => err instanceof BadRequestException,
    );
    assert.equal(audit.calls.length, 1);
    assert.equal(audit.calls[0].action, 'ADMIN_PROMOTION_BLOCKED');
  });

  test('throws BadRequest when promoting via numeric code "3"', async () => {
    await assert.rejects(
      async () => {
        await svc.updateRole(validUuid, '3');
      },
      (err: any) => err instanceof BadRequestException,
    );
    assert.equal(audit.calls.length, 1);
  });

  test('updates role to STAFF successfully (allowed)', async () => {
    prisma.user.update = async () => ({
      id: validUuid,
      role: 'STAFF',
    }) as any;
    const result = await svc.updateRole(validUuid, 'STAFF');
    assert.equal(result.role, 'STAFF');
    assert.equal(audit.calls.length, 0);
  });

  test('rejects non-uuid ids with NotFoundException', async () => {
    await assert.rejects(
      async () => {
        await svc.updateRole('not-a-uuid', 'STAFF');
      },
      (err: any) => err instanceof NotFoundException,
    );
  });
});
