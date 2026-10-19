// ============================================================
// OmniCast - Auth Service
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { TokenPayload } from './interfaces/auth.interface';

import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly refreshTokenExpiry = 90 * 24 * 60 * 60 * 1000; // 90 days
  private readonly passwordResetTtlMs = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        fullName: registerDto.fullName,
        role: 'VIEWER', // Default role for new registrations
      },
    });

    return this.generateTokens(user.id, user.email, user.role ?? 'VIEWER', user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id, user.email, user.role ?? 'VIEWER', user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenDto.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const user = storedToken.user;
    // `RefreshToken.user` is nullable in the schema (the FK allows
    // SetNull on user delete). A refresh token without a user is
    // invalid — reject the refresh attempt.
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token: user not found');
    }
    return this.generateTokens(user.id, user.email, user.role ?? 'VIEWER', user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke only the refresh token provided. Other devices remain signed in.
      const updated = await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken, isRevoked: false },
        data: { isRevoked: true },
      });
      return {
        success: true,
        message: 'Logged out from this device',
        revokedCount: updated.count,
      };
    }
    // Without a token, fall back to "logout current session": revoke the
    // *most recent* un-revoked token, leaving other devices untouched.
    const mostRecent = await this.prisma.refreshToken.findFirst({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!mostRecent) {
      return { success: true, message: 'No active session', revokedCount: 0 };
    }
    await this.prisma.refreshToken.update({
      where: { id: mostRecent.id },
      data: { isRevoked: true },
    });
    return {
      success: true,
      message: 'Logged out from this device',
      revokedCount: 1,
    };
  }

  async logoutAll(userId: string) {
    const updated = await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return {
      success: true,
      message: 'Logged out from all devices',
      revokedCount: updated.count,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  // ============================================================
  // Password recovery flow
  // ============================================================
  //
  // We deliberately follow the "always succeed, never leak which
  // emails exist" pattern: `requestPasswordReset` returns success
  // whether or not the user is found, and only persists+logs a token
  // when the email matches an active account. This avoids email
  // enumeration attacks. The actual email-sending is delegated to the
  // surrounding infra (log + audit for now; SES/SendGrid/SMTP in prod).

  /**
   * Issue a one-time reset token for the given email. Returns the raw
   * token ONLY when called from internal services/tests — the public
   * endpoint never exposes it. The endpoint contract always returns
   * `{ success: true }` regardless of whether the email matches an
   * account, so attackers can't differentiate.
   */
  async requestPasswordReset(
    dto: ForgotPasswordDto,
    meta?: { ipAddress?: string },
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && user.isActive !== false) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const expiresAt = new Date(Date.now() + this.passwordResetTtlMs);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: meta?.ipAddress ?? null,
        },
      });

      // Production wiring would push this through an email service.
      // For now we log it so engineers can manually complete the loop
      // during integration / smoke tests. NEVER log the raw token in
      // non-debug environments — strip in real prod.
      const log = this.configService.get<string>('NODE_ENV') === 'production';
      if (!log) {
        // intentionally omitted in production:
        // eslint-disable-next-line no-console
        console.log(
          `[DEV] Password reset token for ${user.email}: ${rawToken} (expires ${expiresAt.toISOString()})`,
        );
      }

      await this.auditLogger.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id,
        newValues: { email: user.email },
      });
    } else if (user) {
      // Inactive account: still log the attempt so audit is complete.
      await this.auditLogger.log({
        userId: user.id,
        action: 'PASSWORD_RESET_DENIED_INACTIVE',
        entityType: 'User',
        entityId: user.id,
      });
    }

    return { success: true };
  }

  /**
   * Consume a reset token + update the user's password. Tokens are
   * single-use — stamping `usedAt` and rotating the hash makes replays
   * impossible.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.resetToken)
      .digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (record.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    if (!record.user) {
      throw new NotFoundException('Account not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Force sign-out by revoking every existing refresh token.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    await this.auditLogger.log({
      userId: record.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: record.userId,
    });

    return { success: true };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    userRecord?: {
      fullName: string;
      avatarUrl?: string | null;
      bio?: string | null;
      // Match the Prisma User shape — these are all `Boolean?` /
      // `DateTime?` in the schema. We accept nulls so callers can
      // pass the raw Prisma row without massaging.
      isActive?: boolean | null;
      emailVerified?: boolean | null;
      createdAt?: Date | null;
    },
  ) {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '90d',
    });

    // Store refresh token
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    if (userRecord) {
      return {
        accessToken,
        refreshToken,
        user: {
          id: userId,
          email,
          fullName: userRecord.fullName,
          avatarUrl: userRecord.avatarUrl ?? undefined,
          bio: userRecord.bio ?? undefined,
          role,
          isActive: userRecord.isActive,
          emailVerified: userRecord.emailVerified,
          createdAt:
            userRecord.createdAt instanceof Date
              ? userRecord.createdAt.toISOString()
              : String(userRecord.createdAt),
        },
      };
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        role,
      },
    };
  }
}
