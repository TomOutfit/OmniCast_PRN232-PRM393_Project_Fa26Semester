// ============================================================
// Unit test: idempotency + JSON parsing of AuditService.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from '../src/audit/audit.service';

class FakePrisma {
  public auditLog = {
    create: vi.fn(),
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = new FakePrisma();
    service = new AuditService(prisma as any);
  });

  it('persists a new entry and broadcasts it', async () => {
    prisma.auditLog.create.mockResolvedValueOnce({ id: 'abc' });
    const spy = vi.fn();
    const sub = service.stream().subscribe(spy);

    const result = await service.write({
      id: 'abc',
      userId: 'u1',
      action: 'LOGIN',
      entityType: 'User',
      entityId: 'u1',
      oldValuesJson: '{"a":1}',
      newValuesJson: '{"b":2}',
    });

    expect(result).toEqual({ id: 'abc', deduplicated: false });
    expect(spy).toHaveBeenCalledOnce();
    sub.unsubscribe();
  });

  it('returns deduplicated=true when the entry already exists', async () => {
    const err: any = new Error('unique');
    err.code = 'P2002';
    prisma.auditLog.create.mockRejectedValueOnce(err);

    const result = await service.write({ id: 'dupe', action: 'LOGIN' });
    expect(result).toEqual({ id: 'dupe', deduplicated: true });
  });

  it('returns undefined when the JSON payload is malformed', async () => {
    prisma.auditLog.create.mockResolvedValueOnce({ id: 'x' });
    await service.write({
      id: 'x',
      action: 'A',
      oldValuesJson: 'not-json',
    });
    const args = prisma.auditLog.create.mock.calls[0][0];
    expect(args.data.oldValues).toBeUndefined();
  });
});
