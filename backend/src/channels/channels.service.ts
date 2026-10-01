// ============================================================
// OmniCast - Channels Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';
import { LiveCategory } from '@prisma/client';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CHANNEL CRUD
  // ============================================================

  async create(createChannelDto: CreateChannelDto, userId?: string) {
    // Check for duplicate slug
    const existing = await this.prisma.liveChannel.findUnique({
      where: { slug: createChannelDto.slug },
    });

    if (existing) {
      throw new ConflictException('Channel slug already exists');
    }

    return this.prisma.liveChannel.create({
      data: {
        ...createChannelDto,
        ownerId: userId,
      },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    category?: LiveCategory;
    isActive?: boolean;
    isFeatured?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const {
      category,
      isActive = true,
      isFeatured,
      search,
    } = options || {};

    const where: any = {};

    if (category) where.category = category;
    if (isActive !== undefined) {
      where.isActive = typeof isActive === 'string' ? String(isActive) === 'true' : Boolean(isActive);
    }
    if (isFeatured !== undefined) {
      where.isFeatured = typeof isFeatured === 'string' ? String(isFeatured) === 'true' : Boolean(isFeatured);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [channels, total] = await Promise.all([
      this.prisma.liveChannel.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isFeatured: 'desc' },
          { followerCount: 'desc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.liveChannel.count({ where }),
    ]);

    return {
      data: channels,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private isUuid(value: string): boolean {
    return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private async resolveChannel(idOrSlug: string) {
    if (!idOrSlug) {
      throw new NotFoundException('Channel identifier is required');
    }
    const channel = await this.prisma.liveChannel.findUnique({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!channel) {
      throw new NotFoundException(`Channel not found with identifier '${idOrSlug}'`);
    }
    return channel;
  }

  async findOne(id: string) {
    if (!id) {
      throw new NotFoundException('Channel ID is required');
    }
    const channel = await this.prisma.liveChannel.findUnique({
      where: this.isUuid(id) ? { id } : { slug: id },
      include: {
        _count: {
          select: {
            liveEvents: true,
            recordings: true,
            followers: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Channel not found with identifier '${id}'`);
    }

    return channel;
  }

  async findBySlug(slug: string) {
    const channel = await this.prisma.liveChannel.findUnique({
      where: { slug },
      include: {
        liveEvents: {
          where: { status: 'LIVE' },
          take: 1,
        },
        _count: {
          select: {
            liveEvents: true,
            recordings: true,
            followers: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Channel not found with slug '${slug}'`);
    }

    return channel;
  }

  async update(id: string, updateChannelDto: UpdateChannelDto) {
    const channel = await this.resolveChannel(id);

    return this.prisma.liveChannel.update({
      where: { id: channel.id },
      data: updateChannelDto,
    });
  }

  async remove(id: string) {
    const channel = await this.resolveChannel(id);

    return this.prisma.liveChannel.delete({
      where: { id: channel.id },
    });
  }

  async incrementFollower(channelId: string) {
    const isIdUuid = this.isUuid(channelId);
    return this.prisma.liveChannel.update({
      where: isIdUuid ? { id: channelId } : { slug: channelId },
      data: {
        followerCount: { increment: 1 },
      },
    });
  }

  async decrementFollower(channelId: string) {
    const isIdUuid = this.isUuid(channelId);
    return this.prisma.liveChannel.update({
      where: isIdUuid ? { id: channelId } : { slug: channelId },
      data: {
        followerCount: { decrement: 1 },
      },
    });
  }

  async incrementViews(channelId: string, count: bigint = BigInt(1)) {
    const isIdUuid = this.isUuid(channelId);
    return this.prisma.liveChannel.update({
      where: isIdUuid ? { id: channelId } : { slug: channelId },
      data: {
        totalViews: { increment: count },
      },
    });
  }

  async getCategories() {
    const counts = await this.prisma.liveChannel.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true,
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });
    return counts.map((item) => ({
      category: item.category,
      count: item._count,
      _count: item._count,
    }));
  }

  // ============================================================
  // FOLLOW/UNFOLLOW
  // ============================================================

  async followChannel(channelId: string, userId: string) {
    const channel = await this.resolveChannel(channelId);

    if (!channel.isPublic && channel.ownerId !== userId) {
      throw new BadRequestException('Cannot follow private channel');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_channelId: {
          followerId: userId,
          channelId: channel.id,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this channel');
    }

    // Create follow
    await this.prisma.follow.create({
      data: {
        followerId: userId,
        channelId: channel.id,
      },
    });

    // Increment follower count
    await this.prisma.liveChannel.update({
      where: { id: channel.id },
      data: { followerCount: { increment: 1 } },
    });

    return { message: 'Successfully followed channel', channelId: channel.id };
  }

  async unfollowChannel(channelId: string, userId: string) {
    const channel = await this.resolveChannel(channelId);

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_channelId: {
          followerId: userId,
          channelId: channel.id,
        },
      },
    });

    if (!existingFollow) {
      throw new BadRequestException('Not following this channel');
    }

    // Delete follow
    await this.prisma.follow.delete({
      where: { id: existingFollow.id },
    });

    // Decrement follower count
    await this.prisma.liveChannel.update({
      where: { id: channel.id },
      data: { followerCount: { decrement: 1 } },
    });

    return { message: 'Successfully unfollowed channel', channelId: channel.id };
  }

  async getFollowedChannels(userId: string, options?: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              category: true,
              followerCount: true,
              description: true,
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      data: follows.map(f => f.channel),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFollowers(channelId: string, options?: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);

    const channel = await this.resolveChannel(channelId);

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { channelId: channel.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { channelId: channel.id } }),
    ]);

    return {
      data: follows.map(f => f.follower),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async isFollowing(channelId: string, userId: string) {
    const channel = await this.prisma.liveChannel.findUnique({
      where: this.isUuid(channelId) ? { id: channelId } : { slug: channelId },
    });

    if (!channel) {
      return { isFollowing: false };
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_channelId: {
          followerId: userId,
          channelId: channel.id,
        },
      },
    });

    return { isFollowing: !!follow };
  }
}
