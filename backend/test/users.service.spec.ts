// ============================================================
// Unit tests for UsersService.updateRole
// ============================================================
//
// Validates the role-elevation guard: API requests cannot promote
// a user to `ADMIN`. The audit log entry must be present on every
// blocked attempt so SOC dashboards surface these signals.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';

class FakePrisma {
  public user = {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  };
}

class FakeAudit {
  public log = vi.fn(async (_entry: any) => _entry);
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

  it('throws BadRequest + audits when promoting to ADMIN via enum', async () => {
    await expect(svc.updateRole(validUuid, 'ADMIN')).rejects.toThrow(
      BadRequestException,
    );
    expect(audit.log).toHaveBeenCalledOnce();
    const call = audit.log.mock.calls[0][0];
    expect(call.action).toBe('ADMIN_PROMOTION_BLOCKED');
  });

  it('throws BadRequest when promoting via numeric code "3"', async () => {
    await expect(svc.updateRole(validUuid, '3')).rejects.toThrow(
      BadRequestException,
    );
    expect(audit.log).toHaveBeenCalledOnce();
  });

  it('updates role to STAFF successfully (allowed)', async () => {
    prisma.user.update.mockResolvedValueOnce({
      id: validUuid,
      role: 'STAFF',
    });
    const result = await svc.updateRole(validUuid, 'STAFF');
    expect(result.role).toBe('STAFF');
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects non-uuid ids with NotFoundException', async () => {
    await expect(svc.updateRole('not-a-uuid', 'STAFF')).rejects.toThrow(
      NotFoundException,
    );
  });
});
