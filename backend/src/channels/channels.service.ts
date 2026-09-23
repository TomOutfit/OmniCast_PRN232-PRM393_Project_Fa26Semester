// ============================================================
// OmniCast - Channels Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';
import { LiveCategory } from '@prisma/client';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const {
      page = 1,
      limit = 20,
      category,
      isActive = true,
      isFeatured,
      search,
    } = options || {};

    const where: any = {};

    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
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

  async findOne(id: string) {
    const channel = await this.prisma.liveChannel.findUnique({
      where: { id },
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
      throw new NotFoundException('Channel not found');
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
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async update(id: string, updateChannelDto: UpdateChannelDto) {
    const channel = await this.prisma.liveChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.prisma.liveChannel.update({
      where: { id },
      data: updateChannelDto,
    });
  }

  async remove(id: string) {
    const channel = await this.prisma.liveChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.prisma.liveChannel.delete({
      where: { id },
    });
  }

  async incrementFollower(channelId: string) {
    return this.prisma.liveChannel.update({
      where: { id: channelId },
      data: {
        followerCount: { increment: 1 },
      },
    });
  }

  async decrementFollower(channelId: string) {
    return this.prisma.liveChannel.update({
      where: { id: channelId },
      data: {
        followerCount: { decrement: 1 },
      },
    });
  }

  async incrementViews(channelId: string, count: bigint = BigInt(1)) {
    return this.prisma.liveChannel.update({
      where: { id: channelId },
      data: {
        totalViews: { increment: count },
      },
    });
  }

  async getCategories() {
    return this.prisma.liveChannel.groupBy({
      by: ['category'],
      _count: true,
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });
  }
}
