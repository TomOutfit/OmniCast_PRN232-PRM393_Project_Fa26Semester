// ============================================================
// OmniCast - Auth Interfaces
// ============================================================

import { UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: string;      // User ID
  email: string;
  role: UserRole;
  iat?: number;     // Issued at
  exp?: number;     // Expiration
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
