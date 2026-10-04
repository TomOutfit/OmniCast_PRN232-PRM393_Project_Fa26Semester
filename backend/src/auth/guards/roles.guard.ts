// ============================================================
// OmniCast - Roles Guard
// ============================================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

const ROLE_NORMALIZATION: Record<string, string> = {
  '1': 'STAFF',
  STAFF: 'STAFF',
  '2': 'VIEWER',
  VIEWER: 'VIEWER',
  '3': 'ADMIN',
  ADMIN: 'ADMIN',
  '0': 'GUEST',
  GUEST: 'GUEST',
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(UserRole | string | number)[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.role === undefined || user.role === null) {
      return false;
    }

    const userRoleStr = ROLE_NORMALIZATION[String(user.role)] ?? String(user.role).toUpperCase();
    const normalizedRequired = requiredRoles.map(
      (r) => ROLE_NORMALIZATION[String(r)] ?? String(r).toUpperCase(),
    );

    return normalizedRequired.includes(userRoleStr);
  }
}
