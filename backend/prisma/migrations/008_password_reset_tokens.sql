-- ============================================================
-- 008_password_reset_tokens.sql
-- Adds a `PasswordResetToken` table backing the new
-- `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password`
-- endpoints. Tokens are signed JWTs hashed before persistence
-- (we store the SHA256 hash; the raw token is only ever returned
-- via email). Each token has a 1-hour TTL and is single-use
-- (`usedAt` is stamped on consumption).
--
-- Migration is idempotent (CREATE TABLE IF NOT EXISTS …).
-- ============================================================

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "tokenHash" VARCHAR(255) UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt"    TIMESTAMP,
  "ipAddress" VARCHAR(50),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_user"
  ON "PasswordResetToken" ("userId");

CREATE INDEX IF NOT EXISTS "idx_password_reset_expires"
  ON "PasswordResetToken" ("expiresAt");
