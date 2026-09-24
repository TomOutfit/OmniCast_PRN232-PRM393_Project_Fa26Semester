// ============================================================
// OmniCast - Prisma Seed Script
// Diversified Format Live Channels: Sport 1, Sport 2, Show, Entertain, Cine, Drama, News, Music, Kids, Tech, Food, Discovery
// ============================================================

import { PrismaClient, LiveCategory, UserRole, EventStatus, ContentSource, StreamQuality, ContentType, TagType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting OmniCast seed...');

  // ============================================================
  // 1. DEMO USERS
  // Password: Admin123!
  // ============================================================
  
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@omnicast.tv' },
    update: {},
    create: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'admin@omnicast.tv',
      passwordHash,
      fullName: 'OmniCast Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@omnicast.tv' },
    update: {},
    create: {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      email: 'staff@omnicast.tv',
      passwordHash,
      fullName: 'OmniCast Studio',
      role: UserRole.STAFF,
      emailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Staff user created:', staffUser.email);

  const viewers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'viewer1@omnicast.tv' },
      update: {},
      create: {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        email: 'viewer1@omnicast.tv',
        passwordHash,
        fullName: 'Nguyen Van A',
        role: UserRole.VIEWER,
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'viewer2@omnicast.tv' },
      update: {},
      create: {
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        email: 'viewer2@omnicast.tv',
        passwordHash,
        fullName: 'Tran Thi B',
        role: UserRole.VIEWER,
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'viewer3@omnicast.tv' },
      update: {},
      create: {
        id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
        email: 'viewer3@omnicast.tv',
        passwordHash,
        fullName: 'Le Van C',
        role: UserRole.VIEWER,
        emailVerified: true,
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Viewer users created:', viewers.length);

  // ============================================================
  // 2. DIVERSIFIED OMNICAST LIVE CHANNELS (12 Channels)
  // ============================================================

  const channelsData = [
    {
      id: '11111111-1111-1111-1111-111111111101',
      name: 'Omni Sport 1',
      slug: 'sport-1',
      description: 'Kênh thể thao đỉnh cao số 1 OmniCast - Trực tiếp các giải bóng đá vô địch quốc gia, cúp châu Âu, Tennis Grand Slam và bình luận trước - sau trận đấu.',
      tagline: 'Đỉnh Cao Thể Thao Thế Giới',
      logoUrl: '/Channel_Logos/01-omni-sport-1-icon.svg',
      badgeUrl: '/Channel_Logos/01-omni-sport-1-badge.svg',
      bannerColor: '#ef4444',
      category: LiveCategory.SPORTS,
      language: 'vi',
      followerCount: 350000,
      totalViews: 45000000,
      totalVideos: 620,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111102',
      name: 'Omni Sport 2',
      slug: 'sport-2',
      description: 'Kênh thể thao tốc độ và đối kháng - Trực tiếp giải đua xe F1, MotoGP, võ thuật tổng hợp MMA/UFC, Boxing đỉnh cao và thể thao mạo hiểm X-Games.',
      tagline: 'Bứt Phá Mọi Giới Hạn Tốc Độ',
      logoUrl: '/Channel_Logos/02-omni-sport-2-icon.svg',
      badgeUrl: '/Channel_Logos/02-omni-sport-2-badge.svg',
      bannerColor: '#f97316',
      category: LiveCategory.SPORTS,
      language: 'vi',
      followerCount: 220000,
      totalViews: 28000000,
      totalVideos: 410,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111103',
      name: 'Omni Show',
      slug: 'show',
      description: 'Kênh truyền hình thực tế & talkshow độc quyền - Gameshow tương tác trực tiếp, phỏng vấn ngôi sao hàng đầu, thảm đỏ và hậu trường showbiz hấp dẫn.',
      tagline: 'Sân Khấu Showbiz & Truyền Hình Thực Tế',
      logoUrl: '/Channel_Logos/03-omni-show-icon.svg',
      badgeUrl: '/Channel_Logos/03-omni-show-badge.svg',
      bannerColor: '#8b5cf6',
      category: LiveCategory.SHOW,
      language: 'vi',
      followerCount: 410000,
      totalViews: 52000000,
      totalVideos: 580,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111104',
      name: 'Omni Entertain',
      slug: 'entertain',
      description: 'Thế giới giải trí không giới hạn - Hài kịch độc thoại, sân khấu kịch tương tác, chương trình ảo thuật và các khoảnh khắc viral hài hước nhất.',
      tagline: 'Giải Trí Bùng Nổ Mọi Lúc Mọi Nơi',
      logoUrl: '/Channel_Logos/04-omni-entertain-icon.svg',
      badgeUrl: '/Channel_Logos/04-omni-entertain-badge.svg',
      bannerColor: '#eab308',
      category: LiveCategory.ENTERTAINMENT,
      language: 'vi',
      followerCount: 380000,
      totalViews: 48000000,
      totalVideos: 730,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111105',
      name: 'Omni Cine',
      slug: 'cine',
      description: 'Kênh điện ảnh chất lượng 4K - Công chiếu phim ngắn độc quyền, liên hoan phim indie, phân tích điện ảnh chuyên sâu và trailer bom tấn.',
      tagline: 'Điện Ảnh 4K & Trải Nghiệm Màn Ảnh Lớn',
      logoUrl: '/Channel_Logos/05-omni-cine-icon.svg',
      badgeUrl: '/Channel_Logos/05-omni-cine-badge.svg',
      bannerColor: '#3b82f6',
      category: LiveCategory.CINE,
      language: 'vi',
      followerCount: 290000,
      totalViews: 36000000,
      totalVideos: 350,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111106',
      name: 'Omni Drama',
      slug: 'drama',
      description: 'Kênh phim bộ dài tập & web-drama - Tuyển tập những series phim tâm lý xã hội, tình cảm, hình sự kịch tính được sản xuất độc quyền cho OmniCast.',
      tagline: 'Những Câu Chuyện Chạm Đến Cảm Xúc',
      logoUrl: '/Channel_Logos/06-omni-drama-icon.svg',
      badgeUrl: '/Channel_Logos/06-omni-drama-badge.svg',
      bannerColor: '#ec4899',
      category: LiveCategory.DRAMA,
      language: 'vi',
      followerCount: 310000,
      totalViews: 42000000,
      totalVideos: 490,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111107',
      name: 'Omni News',
      slug: 'news',
      description: 'Tin tức chuyển động số 24/7 - Cập nhật dòng chảy sự kiện thời sự, kinh tế tài chính, phân tích thị trường và xu hướng công nghệ toàn cầu liên tục.',
      tagline: 'Thông Tin Nhanh Chóng, Chính Xác 24/7',
      logoUrl: '/Channel_Logos/07-omni-news-icon.svg',
      badgeUrl: '/Channel_Logos/07-omni-news-badge.svg',
      bannerColor: '#dc2626',
      category: LiveCategory.NEWS,
      language: 'vi',
      followerCount: 460000,
      totalViews: 65000000,
      totalVideos: 1200,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111108',
      name: 'Omni Music',
      slug: 'music',
      description: 'Không gian âm nhạc trực tiếp - Trực tiếp live concert, acoustic lounge, bảng xếp hạng Top Hits V-Pop & Quốc tế, phát hành MV độc quyền.',
      tagline: 'Giai Điệu Kết Nối Triệu Trái Tim',
      logoUrl: '/Channel_Logos/08-omni-music-icon.svg',
      badgeUrl: '/Channel_Logos/08-omni-music-badge.svg',
      bannerColor: '#a855f7',
      category: LiveCategory.MUSIC,
      language: 'vi',
      followerCount: 520000,
      totalViews: 78000000,
      totalVideos: 850,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111109',
      name: 'Omni Kids',
      slug: 'kids',
      description: 'Thế giới tuổi thơ diệu kỳ - Phim hoạt hình 3D, chương trình khoa học vui, ca nhạc thiếu nhi và bài học tiếng Anh tương tác bổ ích.',
      tagline: 'Khám Phá, Vui Chơi Và Học Hỏi Cùng Bé',
      logoUrl: '/Channel_Logos/09-omni-kids-icon.svg',
      badgeUrl: '/Channel_Logos/09-omni-kids-badge.svg',
      bannerColor: '#06b6d4',
      category: LiveCategory.KIDS,
      language: 'vi',
      followerCount: 180000,
      totalViews: 21000000,
      totalVideos: 390,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111110',
      name: 'Omni Tech',
      slug: 'tech',
      description: 'Kênh công nghệ & trí tuệ nhân tạo - Livestream unbox sản phẩm mới, sự kiện công nghệ Apple/Google/Meta, lập trình viên và workshop AI 2026.',
      tagline: 'Khám Phá Kỷ Nguyên Công Nghệ Tương Lai',
      logoUrl: '/Channel_Logos/10-omni-tech-icon.svg',
      badgeUrl: '/Channel_Logos/10-omni-tech-badge.svg',
      bannerColor: '#10b981',
      category: LiveCategory.TECH,
      language: 'vi',
      followerCount: 340000,
      totalViews: 39000000,
      totalVideos: 510,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Omni Food',
      slug: 'food',
      description: 'Hương vị ẩm thực & phong cách sống - Livestream nấu ăn cùng MasterChef, food tour ẩm thực đường phố 3 miền và bí quyết pha chế đồ uống.',
      tagline: 'Hành Trình Đánh Thức Vị Giác',
      logoUrl: '/Channel_Logos/11-omni-food-icon.svg',
      badgeUrl: '/Channel_Logos/11-omni-food-badge.svg',
      bannerColor: '#ea580c',
      category: LiveCategory.FOOD,
      language: 'vi',
      followerCount: 210000,
      totalViews: 25000000,
      totalVideos: 360,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111112',
      name: 'Omni Discovery',
      slug: 'discovery',
      description: 'Kênh khám phá thế giới & du lịch trải nghiệm - Phim tài liệu thiên nhiên hoang dã, thám hiểm văn hóa bản địa và các kỳ quan hùng vĩ của hành tinh.',
      tagline: 'Mở Rộng Tầm Nhìn Đến Mọi Miền Đất Nước',
      logoUrl: '/Channel_Logos/12-omni-discovery-icon.svg',
      badgeUrl: '/Channel_Logos/12-omni-discovery-badge.svg',
      bannerColor: '#14b8a6',
      category: LiveCategory.DOCUMENTARY,
      language: 'vi',
      followerCount: 195000,
      totalViews: 23000000,
      totalVideos: 320,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
  ];

  const channels = await Promise.all(
    channelsData.map((channel) =>
      prisma.liveChannel.upsert({
        where: { id: channel.id },
        update: {},
        create: channel,
      }),
    ),
  );
  console.log('✅ Channels created:', channels.length);

  // ============================================================
  // 3. LIVE EVENTS (15 Events across Channels)
  // ============================================================

  const liveEventsData = [
    // Sport 1 Events
    {
      id: 'eeee0000-0000-0000-0000-000000000001',
      title: 'Trực Tiếp: Trận Siêu Kinh Điển Champions League 2026',
      description: 'Trận đại chiến nảy lửa giữa hai ông lớn bóng đá châu Âu.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.LIVE,
      scheduledAt: new Date('2026-09-23T10:00:00Z'),
      startedAt: new Date('2026-09-23T10:00:00Z'),
      duration: 7200,
      viewerCount: 18450,
      peakViewers: 24000,
      channelId: '11111111-1111-1111-1111-111111111101',
      tags: ['Football', 'Champions League', 'Bóng Đá', 'Sport1', 'Live'],
      autoRecord: true,
    },
    {
      id: 'eeee0000-0000-0000-0000-000000000006',
      title: 'Trực Tiếp: Wimbledon Final - Djokovic vs Alcaraz',
      description: 'Trận chung kết tennis Wimbledon hấp dẫn nhất năm.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-27T14:00:00Z'),
      duration: 14400,
      channelId: '11111111-1111-1111-1111-111111111101',
      tags: ['Tennis', 'Wimbledon', 'Sport1'],
      autoRecord: true,
    },
    // Show Events
    {
      id: 'eeee0000-0000-0000-0000-000000000002',
      title: 'Omni Star Talk: Gặp Gỡ Dàn Diễn Viên Bom Tấn 2026',
      description: 'Talkshow độc quyền trò chuyện cùng đạo diễn và các diễn viên chính.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.LIVE,
      scheduledAt: new Date('2026-09-23T10:30:00Z'),
      startedAt: new Date('2026-09-23T10:30:00Z'),
      duration: 5400,
      viewerCount: 8200,
      peakViewers: 11500,
      channelId: '11111111-1111-1111-1111-111111111103',
      tags: ['Show', 'Talkshow', 'Celeb', 'OmniShow', 'Live'],
      autoRecord: true,
    },
    {
      id: 'eeee0000-0000-0000-0000-000000000007',
      title: 'Omni Awards 2026: Đêm Trao Giải Âm Nhạc Lớn Nhất Năm',
      description: 'Lễ trao giải thưởng âm nhạc lớn nhất Việt Nam năm 2026.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-28T20:00:00Z'),
      duration: 10800,
      channelId: '11111111-1111-1111-1111-111111111103',
      tags: ['Show', 'Awards', 'Music', 'OmniShow'],
      autoRecord: true,
    },
    // Sport 2 Events
    {
      id: 'eeee0000-0000-0000-0000-000000000003',
      title: 'F1 Singapore Grand Prix: Vòng Phân Hạng Q3 Tối Nay',
      description: 'Vòng phân hạng đua đêm F1 trên đường đua Marina Bay.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-25T19:00:00Z'),
      duration: 7200,
      channelId: '11111111-1111-1111-1111-111111111102',
      tags: ['F1', 'Racing', 'Sport2', 'GrandPrix'],
      autoRecord: true,
    },
    {
      id: 'eeee0000-0000-0000-0000-000000000008',
      title: 'UFC 310: Trận Đấu Đỉnh Cao Võ Thuật Thế Giới',
      description: 'Sự kiện MMA lớn nhất năm với những trận đấu quyết liệt.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-29T22:00:00Z'),
      duration: 14400,
      channelId: '11111111-1111-1111-1111-111111111102',
      tags: ['UFC', 'MMA', 'Sport2', 'Combat'],
      autoRecord: true,
    },
    // Music Events
    {
      id: 'eeee0000-0000-0000-0000-000000000004',
      title: 'Omni Acoustic Sunset: Đêm Nhạc Mùa Thu 2026',
      description: 'Live concert acoustic phát sóng trực tiếp từ ban công hoàng hôn.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-26T17:30:00Z'),
      duration: 7200,
      channelId: '11111111-1111-1111-1111-111111111108',
      tags: ['Music', 'Acoustic', 'LiveConcert', 'OmniMusic'],
      autoRecord: true,
    },
    {
      id: 'eeee0000-0000-0000-0000-000000000009',
      title: 'Omni Live Stage: Mở Màn Tour Diễn Summer Vibe 2026',
      description: 'Khởi đầu tour diễn hè sôi động với các ngôi sao hàng đầu.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-30T19:00:00Z'),
      duration: 10800,
      channelId: '11111111-1111-1111-1111-111111111108',
      tags: ['Music', 'Concert', 'LiveStage', 'OmniMusic'],
      autoRecord: true,
    },
    // Tech Events
    {
      id: 'eeee0000-0000-0000-0000-000000000005',
      title: 'Keynote AI Revolution 2026: Ra Mắt Các Siêu Trợ Lý AI',
      description: 'Toàn cảnh sự kiện ra mắt thế hệ AI mới.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.ENDED,
      scheduledAt: new Date('2026-09-22T14:00:00Z'),
      startedAt: new Date('2026-09-22T14:00:00Z'),
      endedAt: new Date('2026-09-22T16:30:00Z'),
      duration: 9000,
      peakViewers: 32000,
      channelId: '11111111-1111-1111-1111-111111111110',
      tags: ['Tech', 'AI', 'Keynote', 'OmniTech'],
      autoRecord: true,
    },
    {
      id: 'eeee0000-0000-0000-0000-000000000010',
      title: 'Omni Dev Conference 2026: Tương Lai Của Lập Trình',
      description: 'Hội nghị dành cho các nhà phát triển với các workshop thực hành.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-10-01T09:00:00Z'),
      duration: 28800,
      channelId: '11111111-1111-1111-1111-111111111110',
      tags: ['Tech', 'Dev', 'Conference', 'OmniTech'],
      autoRecord: true,
    },
    // News Events
    {
      id: 'eeee0000-0000-0000-0000-000000000011',
      title: 'Tin Tức 24H: Cập Nhật Tình Hình Thế Giới',
      description: 'Bản tin tổng hợp 24h qua với các sự kiện nổi bật.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.LIVE,
      scheduledAt: new Date('2026-09-23T06:00:00Z'),
      startedAt: new Date('2026-09-23T06:00:00Z'),
      duration: 3600,
      viewerCount: 15000,
      peakViewers: 25000,
      channelId: '11111111-1111-1111-1111-111111111107',
      tags: ['News', '24H', 'OmniNews', 'Live'],
      autoRecord: true,
    },
    // Drama Events
    {
      id: 'eeee0000-0000-0000-0000-000000000012',
      title: 'Omni Series Premiere: Bí Ẩn Tầng 13 - Tập 1',
      description: 'Khởi đầu series phim trinh thám hồi hộp.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-27T21:00:00Z'),
      duration: 3600,
      channelId: '11111111-1111-1111-1111-111111111106',
      tags: ['Drama', 'Series', 'Premiere', 'OmniDrama'],
      autoRecord: true,
    },
    // Cine Events
    {
      id: 'eeee0000-0000-0000-0000-000000000013',
      title: 'Omni Film Festival 2026: Đêm Trao Giải Điện Ảnh',
      description: 'Lễ trao giải thưởng điện ảnh danh giá nhất năm.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-10-02T19:30:00Z'),
      duration: 10800,
      channelId: '11111111-1111-1111-1111-111111111105',
      tags: ['Cine', 'Festival', 'Awards', 'OmniCine'],
      autoRecord: true,
    },
    // Kids Events
    {
      id: 'eeee0000-0000-0000-0000-000000000014',
      title: 'Omni Kids Fun Time: Adventures in Learning',
      description: 'Chương trình giáo dục giải trí cho trẻ em mỗi sáng.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-26T08:00:00Z'),
      duration: 5400,
      channelId: '11111111-1111-1111-1111-111111111109',
      tags: ['Kids', 'Education', 'Fun', 'OmniKids'],
      autoRecord: true,
    },
    // Food Events
    {
      id: 'eeee0000-0000-0000-0000-000000000015',
      title: 'MasterChef Omni: Cuộc Thi Nấu Ăn Trực Tiếp',
      description: 'Cuộc thi nấu ăn gay cấn với sự tham gia của các đầu bếp hàng đầu.',
      streamSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-28T18:00:00Z'),
      duration: 7200,
      channelId: '11111111-1111-1111-1111-111111111111',
      tags: ['Food', 'Cooking', 'Competition', 'OmniFood'],
      autoRecord: true,
    },
  ];

  const liveEvents = await Promise.all(
    liveEventsData.map((event) =>
      prisma.liveEvent.upsert({
        where: { id: event.id },
        update: {},
        create: event,
      }),
    ),
  );
  console.log('✅ Live Events created:', liveEvents.length);

  // ============================================================
  // 4. RECORDINGS (VOD Content - 15 Recordings across Channels)
  // ============================================================

  const recordingsData = [
    {
      id: 'dddd0000-0000-0000-0000-000000000001',
      title: 'Top 10 Pha Cứu Thua Ngoạn Mục Nhất Ngoại Hạng Anh',
      description: 'Tuyển tập những pha phản xạ không tưởng từ các thủ môn.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 720,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 125000,
      likeCount: 8900,
      commentCount: 512,
      channelId: '11111111-1111-1111-1111-111111111101',
      tags: ['Sport', 'Highlights', 'Goalkeeper', 'Football'],
      category: LiveCategory.SPORTS,
      isFeatured: true,
      publishedAt: new Date('2026-09-22T08:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000002',
      title: 'Phim Ngắn: "Ánh Sáng Nơi Cuối Hẻm" (4K HDR)',
      description: 'Bộ phim ngắn đoạt giải thưởng điện ảnh trẻ Omni Cine 2026.',
      contentSource: ContentSource.UPLOADED,
      duration: 1800,
      quality: StreamQuality.UHD_4K,
      contentType: ContentType.VIDEO,
      viewCount: 89000,
      likeCount: 7200,
      commentCount: 410,
      channelId: '11111111-1111-1111-1111-111111111105',
      tags: ['Cine', 'ShortFilm', '4K', 'Drama'],
      category: LiveCategory.CINE,
      isFeatured: true,
      publishedAt: new Date('2026-09-21T14:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000003',
      title: 'Series "Bí Ẩn Tầng 13" - Tập 1: Cuộc Hẹn Nửa Đêm',
      description: 'Mở màn chuỗi phim tâm lý trinh thám hồi hộp.',
      contentSource: ContentSource.UPLOADED,
      duration: 2700,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 156000,
      likeCount: 14200,
      commentCount: 980,
      channelId: '11111111-1111-1111-1111-111111111106',
      tags: ['Drama', 'Series', 'Thriller', 'Mystery'],
      category: LiveCategory.DRAMA,
      isFeatured: true,
      publishedAt: new Date('2026-09-20T19:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000004',
      title: 'Bản Tin Kinh Tế Số: Dự Báo Thị Trường Tài Chính Cuối Năm 2026',
      description: 'Báo cáo và nhận định chuyên sâu về dòng vốn đầu tư.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 1500,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 64000,
      likeCount: 4300,
      commentCount: 230,
      channelId: '11111111-1111-1111-1111-111111111107',
      tags: ['News', 'Economy', 'Finance', 'OmniNews'],
      category: LiveCategory.NEWS,
      isFeatured: false,
      publishedAt: new Date('2026-09-22T06:30:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000005',
      title: 'Bí Quyết Nấu Nước Dùng Phở Bò Thơm Lừng Chuẩn Vị Gia Truyền',
      description: 'Công thức ninh xương bò đúng điệu cùng các loại thảo mộc.',
      contentSource: ContentSource.UPLOADED,
      duration: 1200,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 110000,
      likeCount: 9800,
      commentCount: 645,
      channelId: '11111111-1111-1111-1111-111111111111',
      tags: ['Food', 'Cooking', 'PhoBo', 'VietnameseFood'],
      category: LiveCategory.FOOD,
      isFeatured: false,
      publishedAt: new Date('2026-09-19T11:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000006',
      title: 'Kỳ Quan Hang Én & Sơn Đoòng: Hành Trình Vào Lòng Đất Mẹ',
      description: 'Thước phim tài liệu 4K mãn nhãn khám phá hệ thống hang động.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 2400,
      quality: StreamQuality.UHD_4K,
      contentType: ContentType.VIDEO,
      viewCount: 95000,
      likeCount: 8600,
      commentCount: 520,
      channelId: '11111111-1111-1111-1111-111111111112',
      tags: ['Discovery', 'Travel', 'SonDoong', 'Vietnam', '4K'],
      category: LiveCategory.DOCUMENTARY,
      isFeatured: true,
      publishedAt: new Date('2026-09-18T16:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000007',
      title: 'Live Concert: Đêm Nhạc Trịnh Công Sơn Tại Omni Music',
      description: 'Tái hiện những bản tình ca bất hủ của nhạc sĩ Trịnh Công Sơn.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 5400,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 145000,
      likeCount: 12800,
      commentCount: 890,
      channelId: '11111111-1111-1111-1111-111111111108',
      tags: ['Music', 'Concert', 'TrinhCongSon', 'Classic'],
      category: LiveCategory.MUSIC,
      isFeatured: true,
      publishedAt: new Date('2026-09-17T20:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000008',
      title: 'Omni Tech Review: iPhone 18 Pro Max - Có Đáng Nâng Cấp?',
      description: 'Đánh giá chi tiết iPhone 18 Pro Max sau 1 tháng sử dụng.',
      contentSource: ContentSource.UPLOADED,
      duration: 1800,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 220000,
      likeCount: 15600,
      commentCount: 1200,
      channelId: '11111111-1111-1111-1111-111111111110',
      tags: ['Tech', 'Review', 'iPhone', 'Apple'],
      category: LiveCategory.TECH,
      isFeatured: true,
      publishedAt: new Date('2026-09-16T10:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000009',
      title: 'Omni Show: Hậu Trường Backstage - Sao Nhí Diện Đồ Hiệu',
      description: 'Khám phá backstage các sao nhí trong show thời trang.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 2400,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 88000,
      likeCount: 6200,
      commentCount: 450,
      channelId: '11111111-1111-1111-1111-111111111103',
      tags: ['Show', 'BehindTheScenes', 'Fashion', 'Celeb'],
      category: LiveCategory.SHOW,
      isFeatured: false,
      publishedAt: new Date('2026-09-15T14:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000010',
      title: 'Omni Kids: Bé Học Tiếng Anh Qua Bài Hát - Animals',
      description: 'Học tiếng Anh vui nhộn qua các bài hát về động vật.',
      contentSource: ContentSource.UPLOADED,
      duration: 1200,
      quality: StreamQuality.HD_720P,
      contentType: ContentType.VIDEO,
      viewCount: 180000,
      likeCount: 14200,
      commentCount: 320,
      channelId: '11111111-1111-1111-1111-111111111109',
      tags: ['Kids', 'English', 'Learning', 'Songs'],
      category: LiveCategory.KIDS,
      isFeatured: false,
      publishedAt: new Date('2026-09-14T08:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000011',
      title: 'Top 10 Bàn Thắng Đẹp Nhất Premier League Mùa Giải 2025-26',
      description: 'Những pha ghi bàn đẹp mê hồn từ các ngôi sao bóng đá.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 900,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 320000,
      likeCount: 28500,
      commentCount: 1800,
      channelId: '11111111-1111-1111-1111-111111111101',
      tags: ['Sport', 'Football', 'Goals', 'PremierLeague'],
      category: LiveCategory.SPORTS,
      isFeatured: true,
      publishedAt: new Date('2026-09-13T12:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000012',
      title: 'Omni Entertain: Tổng Hợp Clip Hài Hước Viral Tuần Qua',
      description: 'Những khoảnh khắc hài hước nhất gây sốt mạng xã hội.',
      contentSource: ContentSource.UPLOADED,
      duration: 1500,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 450000,
      likeCount: 38200,
      commentCount: 2100,
      channelId: '11111111-1111-1111-1111-111111111104',
      tags: ['Entertainment', 'Comedy', 'Viral', 'Funny'],
      category: LiveCategory.ENTERTAINMENT,
      isFeatured: true,
      publishedAt: new Date('2026-09-12T16:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000013',
      title: 'Series "Yêu Em Từ Kiếp Trước" - Tập 15: Sự Thật Bất Ngờ',
      description: 'Tập 15 với nhiều bất ngờ về thân phận nhân vật chính.',
      contentSource: ContentSource.UPLOADED,
      duration: 3000,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 280000,
      likeCount: 22400,
      commentCount: 1500,
      channelId: '11111111-1111-1111-1111-111111111106',
      tags: ['Drama', 'Series', 'Romance', 'OmniDrama'],
      category: LiveCategory.DRAMA,
      isFeatured: true,
      publishedAt: new Date('2026-09-11T21:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000014',
      title: 'Omni News Special: Phân Tích Kết Quả Bầu Cử Tổng Thống Mỹ',
      description: 'Chuyên gia phân tích chi tiết kết quả bầu cử và tác động toàn cầu.',
      contentSource: ContentSource.EXTERNAL,
      externalPlatform: 'YOUTUBE',
      externalId: 'dQw4w9WgXcQ',
      duration: 3600,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 185000,
      likeCount: 12800,
      commentCount: 890,
      channelId: '11111111-1111-1111-1111-111111111107',
      tags: ['News', 'Politics', 'Analysis', 'USA'],
      category: LiveCategory.NEWS,
      isFeatured: false,
      publishedAt: new Date('2026-09-10T22:00:00Z'),
    },
    {
      id: 'dddd0000-0000-0000-0000-000000000015',
      title: 'Omni Food: Street Food Tour - Đặc Sản Đường Phố Sài Gòn',
      description: 'Khám phá 10 món ăn đường phố ngon nhất Sài Gòn.',
      contentSource: ContentSource.UPLOADED,
      duration: 2100,
      quality: StreamQuality.FULL_HD_1080P,
      contentType: ContentType.VIDEO,
      viewCount: 195000,
      likeCount: 16800,
      commentCount: 720,
      channelId: '11111111-1111-1111-1111-111111111111',
      tags: ['Food', 'StreetFood', 'Saigon', 'Travel'],
      category: LiveCategory.FOOD,
      isFeatured: false,
      publishedAt: new Date('2026-09-09T18:00:00Z'),
    },
  ];

  const recordings = await Promise.all(
    recordingsData.map((recording) =>
      prisma.recording.upsert({
        where: { id: recording.id },
        update: {},
        create: recording,
      }),
    ),
  );
  console.log('✅ Recordings (VOD) created:', recordings.length);

  // ============================================================
  // 5. SAMPLE COMMENTS
  // ============================================================

  const commentsData = [
    { id: 'cccc0000-0000-0000-0000-000000000001', content: 'Kênh Sport 1 phát sóng chất lượng mượt mà quá, bình luận viên rất chuyên nghiệp!', userId: viewers[0].id, recordingId: 'dddd0000-0000-0000-0000-000000000001' },
    { id: 'cccc0000-0000-0000-0000-000000000002', content: 'Phim ngắn trên Omni Cine hình ảnh 4K màu sắc quá nghệ thuật, nhạc phim cũng xuất sắc!', userId: viewers[1].id, recordingId: 'dddd0000-0000-0000-0000-000000000002' },
    { id: 'cccc0000-0000-0000-0000-000000000003', content: 'Tập 1 Drama cuốn thật sự, mong chờ tập 2 quá Omni Drama ơi!', userId: viewers[2].id, recordingId: 'dddd0000-0000-0000-0000-000000000003' },
    { id: 'cccc0000-0000-0000-0000-000000000004', content: 'Xem Discovery ngắm Sơn Đoòng mà tự hào đất nước mình ghê.', userId: viewers[0].id, recordingId: 'dddd0000-0000-0000-0000-000000000006' },
    { id: 'cccc0000-0000-0000-0000-000000000005', content: 'Review iPhone này quá chi tiết, giờ tôi biết có nên lên đời không rồi!', userId: viewers[1].id, recordingId: 'dddd0000-0000-0000-0000-000000000008' },
    { id: 'cccc0000-0000-0000-0000-000000000006', content: 'Clip hài quá xứng đáng với view khủng, mình xem đi xem lại vẫn cười!', userId: viewers[2].id, recordingId: 'dddd0000-0000-0000-0000-000000000012' },
  ];

  const comments = await Promise.all(
    commentsData.map((comment) =>
      prisma.comment.upsert({
        where: { id: comment.id },
        update: {},
        create: comment,
      }),
    ),
  );
  console.log('✅ Comments created:', comments.length);

  // ============================================================
  // 6. SAMPLE REACTIONS
  // ============================================================

  const reactionsData = [
    { id: 'fa000000-0000-0000-0000-000000000001', userId: viewers[0].id, type: 'HEART' as const, recordingId: 'dddd0000-0000-0000-0000-000000000001' },
    { id: 'fa000000-0000-0000-0000-000000000002', userId: viewers[1].id, type: 'FIRE' as const, recordingId: 'dddd0000-0000-0000-0000-000000000002' },
    { id: 'fa000000-0000-0000-0000-000000000003', userId: viewers[2].id, type: 'CLAP' as const, recordingId: 'dddd0000-0000-0000-0000-000000000003' },
    { id: 'fa000000-0000-0000-0000-000000000004', userId: viewers[0].id, type: 'WOW' as const, recordingId: 'dddd0000-0000-0000-0000-000000000006' },
    { id: 'fa000000-0000-0000-0000-000000000005', userId: viewers[1].id, type: 'HEART' as const, recordingId: 'dddd0000-0000-0000-0000-000000000011' },
    { id: 'fa000000-0000-0000-0000-000000000006', userId: viewers[2].id, type: 'FIRE' as const, recordingId: 'dddd0000-0000-0000-0000-000000000012' },
  ];

  const reactions = await Promise.all(
    reactionsData.map((reaction) =>
      prisma.reaction.upsert({
        where: { id: reaction.id },
        update: {},
        create: reaction,
      }),
    ),
  );
  console.log('✅ Reactions created:', reactions.length);

  // ============================================================
  // 7. SAMPLE FOLLOWS
  // ============================================================

  const followsData = [
    { followerId: viewers[0].id, channelId: '11111111-1111-1111-1111-111111111101' },
    { followerId: viewers[0].id, channelId: '11111111-1111-1111-1111-111111111103' },
    { followerId: viewers[0].id, channelId: '11111111-1111-1111-1111-111111111105' },
    { followerId: viewers[1].id, channelId: '11111111-1111-1111-1111-111111111102' },
    { followerId: viewers[1].id, channelId: '11111111-1111-1111-1111-111111111107' },
    { followerId: viewers[2].id, channelId: '11111111-1111-1111-1111-111111111106' },
    { followerId: viewers[2].id, channelId: '11111111-1111-1111-1111-111111111108' },
  ];

  for (const follow of followsData) {
    await prisma.follow.upsert({
      where: {
        followerId_channelId: {
          followerId: follow.followerId,
          channelId: follow.channelId,
        },
      },
      update: {},
      create: follow,
    });
  }
  console.log('✅ Follows created:', followsData.length);

  // ============================================================
  // 8. PRODUCTION TAGS (12 Tags)
  // ============================================================

  const tagsData = [
    { name: 'Việt Nam', slug: 'viet-nam', color: '#ef4444', type: TagType.COUNTRY },
    { name: 'Quốc Tế', slug: 'quoc-te', color: '#3b82f6', type: TagType.COUNTRY },
    { name: 'Châu Á', slug: 'chau-a', color: '#22c55e', type: TagType.COUNTRY },
    { name: 'Thể Thao', slug: 'the-thao', color: '#f97316', type: TagType.GENRE },
    { name: 'Hành Động', slug: 'hanh-dong', color: '#dc2626', type: TagType.GENRE },
    { name: 'Hài Hước', slug: 'hai-huoc', color: '#eab308', type: TagType.GENRE },
    { name: 'Tình Cảm', slug: 'tinh-cam', color: '#ec4899', type: TagType.GENRE },
    { name: 'Kịch Tính', slug: 'kich-tinh', color: '#8b5cf6', type: TagType.GENRE },
    { name: 'HD 1080p', slug: 'hd-1080p', color: '#10b981', type: TagType.FEATURE },
    { name: '4K Ultra HD', slug: '4k-uhd', color: '#06b6d4', type: TagType.FEATURE },
    { name: 'Mọi Độ Tuổi (G)', slug: 'rating-g', color: '#6366f1', type: TagType.RATING },
    { name: '16+ (PG-16)', slug: 'rating-pg16', color: '#f59e0b', type: TagType.RATING },
  ];

  const tags = await Promise.all(
    tagsData.map((tag) =>
      prisma.productionTag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
      }),
    ),
  );
  console.log('✅ Production Tags created:', tags.length);

  // ============================================================
  // COMPLETE & VERIFY
  // ============================================================

  const stats = await Promise.all([
    prisma.user.count(),
    prisma.liveChannel.count(),
    prisma.liveEvent.count(),
    prisma.recording.count(),
    prisma.comment.count(),
    prisma.reaction.count(),
    prisma.follow.count(),
    prisma.productionTag.count(),
  ]);

  console.log('\n📊 Seed Summary:');
  console.log('   Users:', stats[0]);
  console.log('   OmniCast Channels:', stats[1]);
  console.log('   Live Events:', stats[2]);
  console.log('   Recordings (VOD):', stats[3]);
  console.log('   Comments:', stats[4]);
  console.log('   Reactions:', stats[5]);
  console.log('   Follows:', stats[6]);
  console.log('   Production Tags:', stats[7]);
  console.log('\n✨ Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('   Admin: admin@omnicast.tv / Admin123!');
  console.log('   Staff: staff@omnicast.tv / Admin123!');
  console.log('   Viewer: viewer1@omnicast.tv / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
