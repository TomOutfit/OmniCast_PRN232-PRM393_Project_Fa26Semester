// ============================================================
// OmniCast - Auth Service
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { TokenPayload } from './interfaces/auth.interface';

import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    return this.generateTokens(user.id, user.email, user.role);
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

    return this.generateTokens(user.id, user.email, user.role);
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
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ) {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
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
