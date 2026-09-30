/**
 * OmniCast - Auth service unit tests
 *
 * Covers the high-traffic auth flows: register, login, refresh,
 * logout, logoutAll. Mocks Prisma + bcrypt + JwtService so we can
 * run as pure unit tests.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../src/auth/auth.service';

// ---------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------

function buildFakePrisma() {
  const users: any[] = [];
  const refreshTokens: any[] = [];
  return {
    users,
    refreshTokens,
    user: {
      findUnique: async (args: any) => {
        if (args.where.email) {
          return users.find((u) => u.email === args.where.email) ?? null;
        }
        if (args.where.id) {
          return users.find((u) => u.id === args.where.id) ?? null;
        }
        return null;
      },
      create: async (args: any) => {
        const user = {
          id: `user-${users.length + 1}`,
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          avatarUrl: null,
          bio: null,
          ...args.data,
        };
        users.push(user);
        return user;
      },
      update: async (args: any) => {
        const idx = users.findIndex((u) => u.id === args.where.id);
        Object.assign(users[idx], args.data);
        return users[idx];
      },
    },
    refreshToken: {
      create: async (args: any) => {
        const token = { id: `rt-${refreshTokens.length + 1}`, isRevoked: false, ...args.data };
        refreshTokens.push(token);
        return token;
      },
      findUnique: async (args: any) => {
        const t = refreshTokens.find((x) => x.token === args.where.token);
        if (!t) return null;
        return { ...t, user: users.find((u) => u.id === t.userId) };
      },
      update: async (args: any) => {
        const idx = refreshTokens.findIndex((t) => t.id === args.where.id);
        Object.assign(refreshTokens[idx], args.data);
        return refreshTokens[idx];
      },
      updateMany: async (args: any) => {
        let count = 0;
        for (const t of refreshTokens) {
          let match = true;
          for (const [k, v] of Object.entries(args.where)) {
            if (t[k] !== v) {
              match = false;
              break;
            }
          }
          if (match) {
            Object.assign(t, args.data);
            count++;
          }
        }
        return { count };
      },
      findFirst: async (args: any) => {
        const filtered = refreshTokens
          .filter((t) => {
            for (const [k, v] of Object.entries(args.where)) {
              if (k === 'isRevoked' && t.isRevoked !== v) return false;
              if (k === 'userId' && t.userId !== v) return false;
            }
            return true;
          })
          .sort((a, b) => b.createdAt - a.createdAt);
        return filtered[0] ?? null;
      },
    },
  };
}

function makeService() {
  const prisma = buildFakePrisma();
  const usersService = { findById: async (id: string) => prisma.users.find((u) => u.id === id) ?? null } as any;
  const jwtService = {
    sign: (payload: any, opts?: any) => `jwt.${payload.sub}.${opts?.expiresIn ?? '1h'}`,
  } as any;
  const configService = { get: (_: string) => 'test' } as any;
  const service = new AuthService(prisma as any, usersService, jwtService, configService);
  return { service, prisma };
}

// ---------------------------------------------------------------------
// register
// ---------------------------------------------------------------------

test('register creates a new user with hashed password', async () => {
  const { service, prisma } = makeService();
  const out = await service.register({
    email: 'a@test.com',
    password: 'passw0rd!',
    fullName: 'Alice',
  } as any);
  assert.ok(out.accessToken);
  assert.ok(out.refreshToken);
  assert.equal(prisma.users.length, 1);
  // Password must be hashed, not plaintext
  assert.notEqual(prisma.users[0].passwordHash, 'passw0rd!');
  assert.match(prisma.users[0].passwordHash, /^\$2[ab]\$/); // bcrypt prefix
});

test('register throws ConflictException for duplicate email', async () => {
  const { service, prisma } = makeService();
  prisma.users.push({ id: 'u1', email: 'a@test.com', passwordHash: 'x' });
  await assert.rejects(
    () => service.register({ email: 'a@test.com', password: 'p', fullName: 'A' } as any),
    (err: unknown) => err instanceof ConflictException,
  );
});

// ---------------------------------------------------------------------
// login
// ---------------------------------------------------------------------

test('login rejects unknown email', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.login({ email: 'nobody@test.com', password: 'p' } as any),
    UnauthorizedException,
  );
});

test('login rejects wrong password', async () => {
  const { service, prisma } = makeService();
  // bcrypt hash of "right" (cost 4 to keep test fast)
  const bcrypt = await import('bcrypt');
  prisma.users.push({
    id: 'u1',
    email: 'a@test.com',
    passwordHash: await bcrypt.hash('right', 4),
    isActive: true,
  });
  await assert.rejects(
    () => service.login({ email: 'a@test.com', password: 'wrong' } as any),
    UnauthorizedException,
  );
});

test('login succeeds and updates lastLoginAt', async () => {
  const { service, prisma } = makeService();
  const bcrypt = await import('bcrypt');
  prisma.users.push({
    id: 'u1',
    email: 'a@test.com',
    passwordHash: await bcrypt.hash('correct', 4),
    isActive: true,
  });
  const out = await service.login({ email: 'a@test.com', password: 'correct' } as any);
  assert.ok(out.accessToken);
  assert.ok(out.refreshToken);
  assert.ok(prisma.users[0].lastLoginAt instanceof Date);
});

test('login rejects deactivated accounts', async () => {
  const { service, prisma } = makeService();
  const bcrypt = await import('bcrypt');
  prisma.users.push({
    id: 'u1',
    email: 'a@test.com',
    passwordHash: await bcrypt.hash('correct', 4),
    isActive: false,
  });
  await assert.rejects(
    () => service.login({ email: 'a@test.com', password: 'correct' } as any),
    UnauthorizedException,
  );
});

// ---------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------

test('refreshToken rejects an unknown token', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.refreshToken({ refreshToken: 'nope' } as any),
    UnauthorizedException,
  );
});

test('refreshToken rejects an expired token', async () => {
  const { service, prisma } = makeService();
  prisma.users.push({ id: 'u1', email: 'a@test.com', role: 'VIEWER' });
  prisma.refreshTokens.push({
    id: 'rt-old',
    token: 'old',
    userId: 'u1',
    isRevoked: false,
    expiresAt: new Date(Date.now() - 1000),
  });
  await assert.rejects(
    () => service.refreshToken({ refreshToken: 'old' } as any),
    UnauthorizedException,
  );
});

test('refreshToken rotates the token (revokes old, issues new)', async () => {
  const { service, prisma } = makeService();
  prisma.users.push({ id: 'u1', email: 'a@test.com', role: 'VIEWER' });
  prisma.refreshTokens.push({
    id: 'rt-ok',
    token: 'good',
    userId: 'u1',
    isRevoked: false,
    expiresAt: new Date(Date.now() + 60_000),
  });
  const out = await service.refreshToken({ refreshToken: 'good' } as any);
  assert.ok(out.accessToken);
  assert.equal(prisma.refreshTokens[0].isRevoked, true);
  // A new refresh token row must have been created
  assert.equal(prisma.refreshTokens.length, 2);
});

// ---------------------------------------------------------------------
// logout / logoutAll
// ---------------------------------------------------------------------

test('logoutAll revokes every active refresh token for the user', async () => {
  const { service, prisma } = makeService();
  prisma.users.push({ id: 'u1', email: 'a@test.com' });
  prisma.refreshTokens.push(
    { id: 'r1', token: 't1', userId: 'u1', isRevoked: false, expiresAt: new Date(Date.now() + 60_000) },
    { id: 'r2', token: 't2', userId: 'u1', isRevoked: false, expiresAt: new Date(Date.now() + 60_000) },
    { id: 'r3', token: 't3', userId: 'other', isRevoked: false, expiresAt: new Date(Date.now() + 60_000) },
  );
  const out = await service.logoutAll('u1');
  assert.equal(out.revokedCount, 2);
  assert.equal(prisma.refreshTokens.find((t) => t.id === 'r1').isRevoked, true);
  assert.equal(prisma.refreshTokens.find((t) => t.id === 'r2').isRevoked, true);
  // Other user is untouched
  assert.equal(prisma.refreshTokens.find((t) => t.id === 'r3').isRevoked, false);
});
