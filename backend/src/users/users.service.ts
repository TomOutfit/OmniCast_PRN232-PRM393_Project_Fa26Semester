// ============================================================
// OmniCast - Users Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value?: string): boolean {
    return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  async findById(id: string) {
    if (!this.isUuid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isActive: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens to force re-login on other devices
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    role?: string;
  }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const { role } = options || {};

    const where = role ? { role: role as any } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deactivate(id: string) {
    if (!this.isUuid(id)) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    if (!this.isUuid(id)) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async updateRole(id: string, role: string) {
    if (!this.isUuid(id)) {
      throw new NotFoundException('User not found');
    }
    const roleMapping: Record<string, string> = {
      '1': 'STAFF',
      STAFF: 'STAFF',
      '2': 'VIEWER',
      VIEWER: 'VIEWER',
      '3': 'ADMIN',
      ADMIN: 'ADMIN',
      '0': 'GUEST',
      GUEST: 'GUEST',
    };
    const normalizedRole = roleMapping[role] ?? String(role).toUpperCase();
    if (normalizedRole === 'ADMIN') {
      throw new BadRequestException('Security Policy: Cannot promote another user to Admin from API');
    }
    if (!['STAFF', 'VIEWER', 'GUEST'].includes(normalizedRole)) {
      throw new BadRequestException('Invalid target role. Allowed: STAFF (1), VIEWER (2), GUEST (0)');
    }
    return this.prisma.user.update({
      where: { id },
      data: { role: normalizedRole as any },
    });
  }

  // ============================================================
  // USER STATS & FOLLOWS
  // ============================================================

  async getUserStats(userId: string) {
    if (!this.isUuid(userId)) {
      throw new NotFoundException('User not found');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [followedCount, commentsCount, reactionsCount, recordingsCount] =
      await Promise.all([
        this.prisma.follow.count({ where: { followerId: userId } }),
        this.prisma.comment.count({ where: { userId } }),
        this.prisma.reaction.count({ where: { userId } }),
        this.prisma.recording.count({ where: { channel: { ownerId: userId } } }),
      ]);

    // Aggregate watch history minutes
    const watchAgg = await this.prisma.watchHistory.aggregate({
      where: { userId },
      _sum: { progressSeconds: true },
    });
    const totalWatchMinutes = Math.round(
      (watchAgg._sum.progressSeconds || 0) / 60,
    );

    return {
      role: user.role,
      memberSince: user.createdAt,
      followedChannels: followedCount,
      commentsPosted: commentsCount,
      reactionsGiven: reactionsCount,
      totalWatchMinutes,
      totalWatchHours: Math.round(totalWatchMinutes / 60),
      // Staff-specific counters (0 for non-staff)
      programsReviewed: user.role === 'STAFF' || user.role === 'ADMIN' ? recordingsCount : 0,
      aiReportsGenerated: 0,
    };
  }

  async getFollowedChannels(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              logoUrl: true,
              category: true,
              followerCount: true,
              isVerified: true,
              isFeatured: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      data: items
        .filter((f) => f.channel)
        .map((f) => ({
          ...f.channel,
          followedAt: f.createdAt,
        })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
