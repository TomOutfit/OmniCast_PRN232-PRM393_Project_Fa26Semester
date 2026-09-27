// ============================================================
// OmniCast - Prisma Seed Script
// Diversified Format Live Channels: 25 Channels across 19 categories
// ============================================================

import { PrismaClient, LiveCategory, UserRole, EventStatus, ContentSource, StreamQuality, ContentType, TagType } from '@prisma/client';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Sinh UUID deterministic từ chuỗi bất kỳ — đảm bảo re-run seed
 * sẽ upsert cùng một record thay vì tạo trùng lặp.
 */
function deterministicUUID(seed: string): string {
  const hash = createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

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
    // ============================================================
    // 13 KÊNH MỚI — Mở rộng 19/19 LiveCategory
    // ============================================================
    {
      id: '11111111-1111-1111-1111-111111111113',
      name: 'Omni Esports',
      slug: 'esports',
      description: 'Kênh thể thao điện tử chuyên nghiệp - Trực tiếp giải đấu Liên Minh Huyền Thoại, Valorant, Dota 2 quốc tế với bình luận viên Việt Nam hàng đầu.',
      tagline: 'Đấu Trường Esports Đỉnh Cao Châu Á',
      logoUrl: '/Channel_Logos/13-omni-esports-icon.svg',
      badgeUrl: '/Channel_Logos/13-omni-esports-badge.svg',
      bannerColor: '#dc2626',
      category: LiveCategory.GAMING,
      language: 'vi',
      followerCount: 280000,
      totalViews: 32000000,
      totalVideos: 540,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111114',
      name: 'Omni Indie Games',
      slug: 'indie-games',
      description: 'Kênh game indie sáng tạo - Trực tiếp khám phá các tựa game độc lập đột phá, pixel art đầy mê hoặc và những câu chuyện game indie đầy cảm hứng.',
      tagline: 'Nghệ Thuật Game Độc Lập & Sáng Tạo',
      logoUrl: '/Channel_Logos/14-omni-indie-games-icon.svg',
      badgeUrl: '/Channel_Logos/14-omni-indie-games-badge.svg',
      bannerColor: '#06b6d4',
      category: LiveCategory.GAMING,
      language: 'vi',
      followerCount: 145000,
      totalViews: 18000000,
      totalVideos: 380,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111115',
      name: 'Omni Podcast',
      slug: 'podcast',
      description: 'Kênh talkshow & podcast đa chủ đề - Những cuộc trò chuyện chân thực, chuyên sâu từ công nghệ, đời sống đến kinh doanh và tâm lý con người.',
      tagline: 'Câu Chuyện Kể Mỗi Ngày Từ OmniCast',
      logoUrl: '/Channel_Logos/15-omni-podcast-icon.svg',
      badgeUrl: '/Channel_Logos/15-omni-podcast-badge.svg',
      bannerColor: '#f59e0b',
      category: LiveCategory.PODCAST,
      language: 'vi',
      followerCount: 175000,
      totalViews: 21000000,
      totalVideos: 290,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111116',
      name: 'Omni Audiobook',
      slug: 'audiobook',
      description: 'Thư viện sách nói khổng lồ - Từ tiểu thuyết kinh điển đến sách self-help hiện đại, được đọc bởi các MC chuyên nghiệp với chất lượng studio.',
      tagline: 'Tri Thức Trong Tầm Tai Bạn',
      logoUrl: '/Channel_Logos/16-omni-audiobook-icon.svg',
      badgeUrl: '/Channel_Logos/16-omni-audiobook-badge.svg',
      bannerColor: '#d97706',
      category: LiveCategory.PODCAST,
      language: 'vi',
      followerCount: 132000,
      totalViews: 15000000,
      totalVideos: 410,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111117',
      name: 'Omni Academy',
      slug: 'academy',
      description: 'Kênh giáo dục trực tuyến - Khóa học chất lượng cao từ toán, lý, hóa đến lập trình, ngoại ngữ với giáo viên top đầu Việt Nam và quốc tế.',
      tagline: 'Nền Tảng Học Tập Mở Cho Mọi Người',
      logoUrl: '/Channel_Logos/17-omni-academy-icon.svg',
      badgeUrl: '/Channel_Logos/17-omni-academy-badge.svg',
      bannerColor: '#6366f1',
      category: LiveCategory.EDUCATION,
      language: 'vi',
      followerCount: 320000,
      totalViews: 41000000,
      totalVideos: 680,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111118',
      name: 'Omni Skill Lab',
      slug: 'skill-lab',
      description: 'Phòng thí nghiệm kỹ năng thực hành - Workshop hands-on về lập trình, thiết kế, marketing, nhiếp ảnh dành cho người đi làm muốn nâng cao năng lực.',
      tagline: 'Rèn Kỹ Năng Qua Thực Hành Thực Tế',
      logoUrl: '/Channel_Logos/18-omni-skill-lab-icon.svg',
      badgeUrl: '/Channel_Logos/18-omni-skill-lab-badge.svg',
      bannerColor: '#10b981',
      category: LiveCategory.EDUCATION,
      language: 'vi',
      followerCount: 168000,
      totalViews: 19000000,
      totalVideos: 420,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111119',
      name: 'Omni Wellness',
      slug: 'wellness',
      description: 'Kênh sống khỏe & chăm sóc bản thân - Yoga buổi sáng, thiền định, dinh dưỡng cân bằng và hành trình cải thiện sức khỏe tinh thần mỗi ngày.',
      tagline: 'Sống Khỏe, Sống Đẹp, Sống Có Ý Nghĩa',
      logoUrl: '/Channel_Logos/19-omni-wellness-icon.svg',
      badgeUrl: '/Channel_Logos/19-omni-wellness-badge.svg',
      bannerColor: '#f43f5e',
      category: LiveCategory.LIFESTYLE,
      language: 'vi',
      followerCount: 215000,
      totalViews: 24000000,
      totalVideos: 450,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111120',
      name: 'Omni Fashion',
      slug: 'fashion',
      description: 'Kênh thời trang & phong cách sống - Trực tiếp runway show quốc tế, lookbook mùa mới và bí quyết phối đồ từ các stylist hàng đầu.',
      tagline: 'Định Hình Phong Cách Cá Nhân',
      logoUrl: '/Channel_Logos/20-omni-fashion-icon.svg',
      badgeUrl: '/Channel_Logos/20-omni-fashion-badge.svg',
      bannerColor: '#d946ef',
      category: LiveCategory.LIFESTYLE,
      language: 'vi',
      followerCount: 198000,
      totalViews: 22000000,
      totalVideos: 380,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111121',
      name: 'Omni Travel VN',
      slug: 'travel-vn',
      description: 'Kênh du lịch Việt Nam chuyên sâu - Khám phá 63 tỉnh thành từ hang động Sơn Đoòng đến ruộng bậc thang Sapa, food tour đường phố và homestay độc đáo.',
      tagline: 'Việt Nam Đẹp Từ Trên Xuống Dưới',
      logoUrl: '/Channel_Logos/21-omni-travel-vn-icon.svg',
      badgeUrl: '/Channel_Logos/21-omni-travel-vn-badge.svg',
      bannerColor: '#14b8a6',
      category: LiveCategory.TRAVEL,
      language: 'vi',
      followerCount: 245000,
      totalViews: 28000000,
      totalVideos: 510,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111122',
      name: 'Omni Travel World',
      slug: 'travel-world',
      description: 'Kênh du lịch thế giới - Vlog hành trình tại Tokyo, Bali, Iceland, Thổ Nhĩ Kỳ cùng hướng dẫn visa, lịch trình chi tiết và tips tiết kiệm.',
      tagline: 'Vòng Quanh Thế Giới Trong Tầm Tay',
      logoUrl: '/Channel_Logos/22-omni-travel-world-icon.svg',
      badgeUrl: '/Channel_Logos/22-omni-travel-world-badge.svg',
      bannerColor: '#0ea5e9',
      category: LiveCategory.TRAVEL,
      language: 'vi',
      followerCount: 188000,
      totalViews: 21000000,
      totalVideos: 460,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111123',
      name: 'Omni Art & Design',
      slug: 'art-design',
      description: 'Kênh nghệ thuật & thiết kế sáng tạo - Behance review, Figma tutorial, ngôn ngữ thị giác và quy trình làm việc của các designer hàng đầu Việt Nam.',
      tagline: 'Cảm Hứng & Quy Trình Thiết Kế Chuyên Nghiệp',
      logoUrl: '/Channel_Logos/23-omni-art-design-icon.svg',
      badgeUrl: '/Channel_Logos/23-omni-art-design-badge.svg',
      bannerColor: '#e11d48',
      category: LiveCategory.ART,
      language: 'vi',
      followerCount: 142000,
      totalViews: 17000000,
      totalVideos: 340,
      isFeatured: false,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111124',
      name: 'Omni Business',
      slug: 'business',
      description: 'Kênh tài chính & khởi nghiệp - Phân tích thị trường chứng khoán, founder story, chiến lược tăng trưởng startup và bài học từ các tỷ phú thế giới.',
      tagline: 'Kinh Doanh Thông Minh & Bền Vững',
      logoUrl: '/Channel_Logos/24-omni-business-icon.svg',
      badgeUrl: '/Channel_Logos/24-omni-business-badge.svg',
      bannerColor: '#1e40af',
      category: LiveCategory.BUSINESS,
      language: 'vi',
      followerCount: 205000,
      totalViews: 25000000,
      totalVideos: 470,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
    {
      id: '11111111-1111-1111-1111-111111111125',
      name: 'Omni Health',
      slug: 'health',
      description: 'Kênh y khoa & sức khỏe cộng đồng - Tư vấn từ bác sĩ chuyên khoa, cập nhật y học mới nhất, phòng bệnh thông minh và hành trình điều trị thực tế.',
      tagline: 'Sức Khỏe Là Vốn Quý Của Bạn',
      logoUrl: '/Channel_Logos/25-omni-health-icon.svg',
      badgeUrl: '/Channel_Logos/25-omni-health-badge.svg',
      bannerColor: '#10b981',
      category: LiveCategory.HEALTH,
      language: 'vi',
      followerCount: 232000,
      totalViews: 27000000,
      totalVideos: 520,
      isFeatured: true,
      isVerified: true,
      ownerId: staffUser.id,
    },
  ];

  const channels = [];
  for (const channel of channelsData) {
    const item = await prisma.liveChannel.upsert({
      where: { id: channel.id },
      update: {},
      create: channel,
    });
    channels.push(item);
  }
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
      externalId: 'live_sport1_001',
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
      externalId: 'live_sport1_002',
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
      externalId: 'live_show_001',
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
      externalId: 'live_show_002',
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
      externalId: 'live_sport2_001',
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
      externalId: 'live_sport2_002',
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
      externalId: 'live_music_001',
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
      externalId: 'live_music_002',
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
      externalId: 'live_tech_001',
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
      externalId: 'live_tech_002',
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
      externalId: 'live_news_001',
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
      externalId: 'live_drama_001',
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
      externalId: 'live_cine_001',
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
      externalId: 'live_kids_001',
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
      externalId: 'live_food_001',
      status: EventStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-28T18:00:00Z'),
      duration: 7200,
      channelId: '11111111-1111-1111-1111-111111111111',
      tags: ['Food', 'Cooking', 'Competition', 'OmniFood'],
      autoRecord: true,
    },
  ];

  const liveEvents = [];
  for (const event of liveEventsData) {
    const item = await prisma.liveEvent.upsert({
      where: { id: event.id },
      update: {},
      create: event as any,
    });
    liveEvents.push(item);
  }
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
      externalId: 'rec_sport1_001',
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
      externalId: 'rec_news_001',
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
      externalId: 'rec_doc_001',
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
      externalId: 'rec_music_001',
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
      externalId: 'rec_show_001',
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
      externalId: 'rec_sport1_002',
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
      externalId: 'rec_news_002',
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

  const recordings = [];
  for (const recording of recordingsData) {
    const item = await prisma.recording.upsert({
      where: { id: recording.id },
      update: {},
      create: recording as any,
    });
    recordings.push(item);
  }
  console.log('✅ Recordings (VOD) created:', recordings.length);

  // ============================================================
  // 4b. EXTENDED PROGRAMS — 520 programs cho 13 kênh mới
  //    20 LiveEvents + 20 Recordings / kênh × 13 = 520
  //    ID deterministic từ hash để upsert idempotent.
  // ============================================================

  const newChannels = channels.filter(c =>
    !['sport-1','sport-2','show','entertain','cine','drama','news','music','kids','tech','food','discovery'].includes(c.slug),
  );

  // Tiêu đề & tags theo category để sinh chương trình đa dạng
  const titlesByCategory: Record<string, string[]> = {
    GAMING: [
      'Vòng Bảng Giải Đấu Esports Khu Vực Đông Nam Á',
      'Trận Chung Kết Liên Minh Huyền Thoại Mùa Xuân',
      'Tournament Valorant Champions Tour 2026',
      'Showmatch Game Thủ Nổi Tiếng vs Đội Tuyển Quốc Gia',
      'Phân Tích Meta Mới Của Dota 2 Patch 7.40',
      'Speedrun Hollow Knight: Silksong Dưới 30 Phút',
      'Top 10 Game Indie Hay Nhất 2026 Bạn Nên Thử',
      'Live Stream Khám Phá Thế Giới Mở Elden Ring DLC',
      'Thử Thách 24h Chơi Game Không Lặp Lại',
      'Game Dev Nhật Ký: Xây Dựng Game Pixel Art Đầu Tiên',
      'Hướng Dẫn Leo Rank Valorant Lên Radiant',
      'Bình Luận Trực Tiếp Chung Kết PUBG Global Series',
      'Retro Game Night: Chơi Lại Game Huyền Thoại PS1',
      'Cosplay & Lore: Lịch Sử Thế Giới Game Final Fantasy',
      'Phỏng Vấn Nhà Phát Triển Game Indie Việt Nam',
      'Workshop Thiết Kế Nhân Vật Game 2D Bằng Procreate',
      'Phân Tích Kịch Bản Trong Game AAA 2026',
      'Live Thi Đấu Mobile Legends Bang Bang Quốc Tế',
      'Khám Phá Game Roguelike Đang Được Yêu Thích Nhất',
      'Đêm Gala Game Thủ Việt Nam 2026',
    ],
    PODCAST: [
      'Talk Show: Chuyện Chưa Kể Của Founder Startup Kỳ Lân',
      'Phỏng Vấn Độc Quyền CEO Công Ty Công Nghệ Hàng Đầu',
      'Khám Phá Khoa Học Não Bộ Và Tâm Lý Con Người',
      'Hành Trình 10 Năm Của Một Nhà Báo Chiến Trường',
      'Tọa Đàm: Tương Lai Trí Tuệ Nhân Tạo Tại Việt Nam',
      'Podcast Đêm Khuya: Những Câu Chuyện Truyền Cảm Hứng',
      'Review Sách Kinh Điển "Nhà Giả Kim" Phiên Bản 2026',
      'Sách Nói: Đắc Nhân Tâm - Nghệ Thuật Thu Phục Lòng Người',
      'Đọc Sách: Sapiens - Lược Sử Loài Người',
      'Tâm Sự Nghề Nghiệp: Từ Lập Trình Viên Đến Giám Đốc',
      'Phỏng Vấn Hot Tiktoker: Hành Trình 5 Triệu Followers',
      'Chuyện Nghề Phi Công: 10 Năm Bay Trên Bầu Trời',
      'Podcast Kỹ Năng: 7 Thói Quen Của Người Thành Đạt',
      'Sách Nói Tiếng Anh: Atomic Habits Song Ngữ',
      'Chuyện Lạ Việt Nam: Những Ngôi Đền Bí Ẩn',
      'Phỏng Vấn Bác Sĩ: Sức Khỏe Tinh Thần Thời Hiện Đại',
      'Tọa Đàm Giáo Dục: Con Đường Du Học Hay Ở Lại',
      'Podcast Kinh Doanh: 5 Sai Lầm Chết Người Khi Khởi Nghiệp',
      'Khám Phá Văn Hóa Trà Đạo Và Thiền Định',
      'Sách Nói: Tư Duy Nhanh Và Chậm - Daniel Kahneman',
    ],
    EDUCATION: [
      'Ôn Thi THPT Quốc Gia 2026 - Môn Toán Chuyên Đề Hàm Số',
      'Lớp Học Lập Trình Python Từ Zero Tới Hero',
      'Workshop Toán Tư Dy Cho Trẻ Em 8-12 Tuổi',
      'Khóa Học Tiếng Anh Giao Tiếp Cơ Bản Trong 30 Ngày',
      'Hướng Dẫn Làm Bài Thi IELTS Speaking Đạt 7.5+',
      'Luyện Thi Đại Học - Môn Vật Lý Chuyên Đề Điện Xoay Chiều',
      'Khóa Học Thiết Kế Đồ Họa Canva Trong 7 Ngày',
      'Bài Giảng Lịch Sử Việt Nam: Các Triều Đại Phong Kiến',
      'Ôn Thi Học Kỳ 2 - Môn Ngữ Văn Lớp 12',
      'Học Excel Từ Cơ Bản Đến Nâng Cao Cho Dân Văn Phòng',
      'Khóa Học Photoshop Từ A-Z: Biến Ảnh Thường Thành Tác Phẩm',
      'Workshop Luyện Viết Chữ Đẹp Theo Phong Cách Hiện Đại',
      'Lớp Học Hóa Học Vui: Thí Nghiệm Tại Nhà An Toàn',
      'Khóa Học Tiếng Trung Giao Tiếp Cho Người Mới Bắt Đầu',
      'Hướng Dẫn Làm Đồ Án Tốt Nghiệp Ngành Marketing',
      'Bài Giảng Triết Học Mác - Lênin Dễ Hiểu',
      'Ôn Thi SAT/ACT Cho Học Sinh Muốn Du Học Mỹ',
      'Workshop Kỹ Năng Thuyết Trình Trước Đám Đông',
      'Khóa Học Digital Marketing Tổng Thể Cho Người Mới',
      'Lớp Học Nấu Ăn Quốc Tế: Ẩm Thực Ý Và Pháp',
    ],
    LIFESTYLE: [
      'Yoga Buổi Sáng 30 Phút Cho Người Mới Bắt Đầu',
      'Hướng Dẫn Thiền Định Mindfulness Trong 21 Ngày',
      'Thực Đơn Eat Clean 7 Ngày Cho Dân Văn Phòng',
      'Workout Tại Nhà Không Cần Dụng Cụ Trong 4 Tuần',
      'Trực Tiếp Lễ Hội Âm Nhạc Ultra Việt Nam 2026',
      'Runway Show Bộ Sưu Tập Thu Đông Từ NTK Việt',
      'Hướng Dẫn Chăm Sóc Da Mụn Đúng Cách Từ Bác Sĩ',
      'Lookbook Mùa Xuân 2026: Phong Cách Tối Giản Hàn Quốc',
      'Phỏng Vấn Stylist Nổi Tiếng: Cách Xây Dựng Tủ Đồ Capsule',
      'Workshop Trang Điểm Tự Nhiên Đi Làm Mỗi Ngày',
      'Hành Trình Giảm 20kg An Toàn Trong 6 Tháng',
      'Hướng Dẫn Detox Cơ Thể Sau Tết Trong 14 Ngày',
      'Live Concert Nhạc Acoustic Cuối Tuần Tại Đà Lạt',
      'Phong Cách Thời Trang Công Sở Cho Quý Cô U40',
      'Sống Tối Giản: Bỏ Đi 80% Đồ Đạc Trong Nhà',
      'Workshop Pha Chế Mocktail Healthy Tại Nhà',
      'Live Show Thời Trang Bền Vững & Thân Thiện Môi Trường',
      'Hướng Dẫn Self-Care Mỗi Tối Trước Khi Ngủ',
      'Podcast Cùng Chuyên Gia Tâm Lý: Vượt Qua Trầm Cảm',
      'Workshop Làm Nến Thơm Handmade Tặng Người Thương',
    ],
    TRAVEL: [
      'Tour Ẩm Thực Đường Phố Hà Nội Một Ngày Ăn Gì',
      'Khám Phá Hang Sơn Đoòng - Hang Động Lớn Nhất Thế Giới',
      'Vlog Du Lịch Bali 5 Ngày 4 Đêm Dưới 15 Triệu',
      'Hướng Dẫn Xin Visa Nhật Bản Tự Túc Thành Công 100%',
      'Review Khách Sạn 5 Sao Phú Quốc Mùa Hè 2026',
      'Phượt Tây Bắc 7 Ngày: Sapa - Fansipan - Mù Cang Chải',
      'Khám Phá Iceland Mùa Cực Quang Tháng 12',
      'Du Lịch Thổ Nhĩ Kỳ 10 Ngày: Istanbul - Cappadocia - Antalya',
      'Tour Trekking Fansipan 2 Ngày 1 Đêm Cùng Local Guide',
      'Review Resort Biển Đảo Lý Sơn - Việt Nam',
      'Hướng Dẫn Đi Thái Lan Tự Túc 5 Ngày Siêu Tiết Kiệm',
      'Food Tour Tokyo: 10 Món Ăn Phải Thử ở Shibuya',
      'Du Lịch Singapore 4 Ngày Cho Gia Đình Có Trẻ Nhỏ',
      'Khám Phá Phú Yên - Hoa Vàng Trên Cỏ Xanh',
      'Vlog Đi Bộ Xuyên Rừng Cúc Phương 3 Ngày 2 Đêm',
      'Hướng Dẫn Đặt Vé Máy Bay Giá Rẻ Trong Mùa Cao Điểm',
      'Khám Phá Côn Đảo - Địa Ngục Trần Gian Thành Thiên Đường',
      'Tour Châu Âu 14 Ngày: Pháp - Ý - Thụy Sĩ',
      'Du Lịch Đà Nẵng - Hội An - Huế Trong 5 Ngày',
      'Review Tour Du Thuyền Hạ Long 2 Ngày 1 Đêm Sang Trọng',
    ],
    ART: [
      'Workshop Vẽ Màu Nước Cơ Bản Cho Người Mới',
      'Hướng Dẫn Sử Dụng Figma Từ A-Z Cho Designer',
      'Behance Review: 10 Portfolio Thiết Kế Ấn Tượng Tuần Qua',
      'Phỏng Vấn Nghệ Sĩ Đường Phố Nổi Tiếng Hà Nội',
      'Hướng Dẫn Thiết Kế Logo Chuyên Nghiệp Trong 60 Phút',
      'Workshop Chụp Ảnh Sản Phẩm Bằng Điện Thoại',
      'Phân Tích Typography Trong Các Thương Hiệu Lớn',
      'Triển Lãm Tranh Nghệ Thuật Đương Đại Tại TP.HCM',
      'Hướng Dẫn Làm Phim Hoạt Hình 2D Bằng Adobe Animate',
      'Workshop Vẽ Chân Dung Bằng Chì Than Cơ Bản',
      'Lịch Sử Nghệ Thuật Baroque Và Những Tác Phẩm Vĩ Đại',
      'Hướng Dẫn Thiết Kế UI/UX Cho Ứng Dụng Mobile',
      'Workshop Sculpture Đất Sét Tạo Hình Nghệ Thuật',
      'Phỏng Vấn Illustrator Việt Nam Được Quốc Tế Công Nhận',
      'Hướng Dẫn Dựng Video Motion Graphics Bằng After Effects',
      'Phân Tích Màu Sắc Trong Các Bộ Phim Đoạt Giải Oscar',
      'Workshop Nhiếp Ảnh Phong Cảnh Với Thiết Bị Giá Rẻ',
      'Hướng Dẫn Làm Short Film Quay Bằng Điện Thoại',
      'Phỏng Vấn Nhà Thiết Kế Thời Trang Trẻ Tuổi Triển Vọng',
      'Workshop Điêu Khắc Đá Cơ Bản Cho Người Mới Bắt Đầu',
    ],
    BUSINESS: [
      'Phân Tích Thị Trường Chứng Khoán Tuần 27/09/2026',
      'Founder Story: Từ 2 Triệu Vốn Đến Startup 100 Triệu USD',
      'Workshop Lập Kế Hoạch Kinh Doanh 5 Năm',
      'Phỏng Vấn CEO Tập Đoàn Bất Động Sản Hàng Đầu',
      'Chiến Lược Marketing 0 Đồng Cho Startup Giai Đoạn Đầu',
      'Hướng Dẫn Đàm Phán Lương Thành Công Tăng 50%',
      'Phân Tích Báo Cáo Tài Chính Doanh Nghiệp Niêm Yết',
      'Bài Học Khởi Nghiệp Từ Các Tỷ Phú Jack Ma, Elon Musk',
      'Workshop Xây Dựng Đội Ngũ High-Performance Cho SME',
      'Hướng Dẫn Gọi Vốn Series A Thành Công Từ Quỹ Nước Ngoài',
      'Phỏng Vấn CFO: Chiến Lược Tài Chính Trong Khủng Hoảng',
      'Workshop E-Commerce: Bán Hàng Trên Shopee Hiệu Quả',
      'Phân Tích Xu Hướng Đầu Tư Bất Động Sản 2026',
      'Hướng Dẫn Xây Dựng Thương Hiệu Cá Nhân Trên LinkedIn',
      'Workshop Quản Lý Dòng Tiền Cho Doanh Nghiệp Nhỏ',
      'Phỏng Vấn Shark Tank: Đánh Giá Cơ Hội Đầu Tư 2026',
      'Hướng Dẫn Áp Dụng AI Trong Vận Hành Doanh Nghiệp',
      'Chiến Lược IPO Của Các Startup Kỳ Lân Đông Nam Á',
      'Workshop Thu Hút Khách Hàng Trung Thành Qua CRM',
      'Phân Tích Tăng Trưởng Kinh Tế Việt Nam Quý 3/2026',
    ],
    HEALTH: [
      'Tư Vấn Sức Khỏe: Phòng Ngừa Ung Thư Vú Ở Phụ Nữ',
      'Hướng Dẫn Cai Thuốc Lá Trong 30 Ngày Hiệu Quả',
      'Tư Vấn Dinh Dưỡng Cho Trẻ Biếng Ăn Từ Chuyên Gia',
      'Bài Tập Phục Hồi Chức Năng Sau Tai Biến Tại Nhà',
      'Phòng Ngừa Bệnh Tim Mạch Qua Chế Độ Ăn Mediterranean',
      'Tư Vấn Sức Khỏe Tinh Thần: Vượt Qua Rối Loạn Lo Âu',
      'Khám Phá Công Nghệ Phẫu Thuật Robot 2026',
      'Hướng Dẫn Sơ Cứu Khi Gặp Tai Nạn Giao Thông',
      'Tư Vấn Mang Thai An Toàn Cho Mẹ Bầu Lần Đầu',
      'Phân Tích Tác Dụng Phụ Của Vaccine HPV',
      'Workshop Hô Hấp Đúng Cách Cho Người Hen Suyễn',
      'Cập Nhật Phác Đồ Điều Trị Ung Thư Mới Nhất 2026',
      'Hướng Dẫn Chăm Sóc Người Già Tại Nhà',
      'Tư Vấn Sức Khỏe Sinh Sản: Vô Sinh Hiếm Muộn',
      'Workshop Sơ Cứu Trẻ Em: Sốt Cao Co Giật',
      'Phỏng Vấn Bác Sĩ: Thực Phẩm Chức Năng Có Thật Sự Cần Thiết',
      'Hướng Dẫn Phục Hồi Sau Phẫu Thuật Nội Soi',
      'Tư Vấn Dinh Dưỡng Cho Vận Động Viên Chuyên Nghiệp',
      'Phòng Ngừa Đột Quỵ Vào Mùa Lạnh Cho Người Cao Tuổi',
      'Hướng Dẫn Kiểm Soát Đường Huyết Cho Người Tiểu Đường',
    ],
  };

  const tagsPoolByCategory: Record<string, string[]> = {
    GAMING: ['Gaming', 'Esports', 'Indie', 'Multiplayer', 'Speedrun', 'PC', 'Console', 'Mobile'],
    PODCAST: ['Podcast', 'Audio', 'Talkshow', 'Sách Nói', 'Phỏng Vấn', 'Review', 'Tâm Sự'],
    EDUCATION: ['Education', 'Lập Trình', 'Tiếng Anh', 'Ôn Thi', 'THPT', 'IELTS', 'Excel', 'Marketing'],
    LIFESTYLE: ['Lifestyle', 'Yoga', 'Wellness', 'Fashion', 'Nấu Ăn', 'Self-Care', 'Trang Điểm'],
    TRAVEL: ['Travel', 'Việt Nam', 'World', 'Food Tour', 'Visa', 'Review', 'Phượt', 'Khách Sạn'],
    ART: ['Art', 'Design', 'Figma', 'Photoshop', 'Nhiếp Ảnh', 'Vẽ', 'Triển Lãm', 'UI/UX'],
    BUSINESS: ['Business', 'Startup', 'Khởi Nghiệp', 'Marketing', 'Tài Chính', 'Chứng Khoán', 'IPO', 'CEO'],
    HEALTH: ['Health', 'Y Khoa', 'Dinh Dưỡng', 'Phòng Bệnh', 'Sức Khỏe', 'Bác Sĩ', 'Tâm Lý'],
  };

  const qualities = [StreamQuality.SD_480P, StreamQuality.HD_720P, StreamQuality.FULL_HD_1080P, StreamQuality.QHD_1440P, StreamQuality.UHD_4K];

  let totalNewLiveEvents = 0;
  let totalNewRecordings = 0;

  for (const ch of newChannels) {
    const titles = titlesByCategory[ch.category] || [];
    const tagPool = tagsPoolByCategory[ch.category] || [];
    const tagSlug = ch.slug.replace(/-/g, '_');

    // 20 LiveEvents / kênh
    for (let i = 0; i < 20; i++) {
      const idx = i + 1;
      const title = `${titles[i % titles.length]} #${idx}`;
      const externalId = `live_${tagSlug}_${String(idx).padStart(3, '0')}`;
      const id = deterministicUUID(`${ch.id}-event-${idx}`);
      // Trộn status: 3 LIVE, 12 SCHEDULED, 5 ENDED
      let status: EventStatus;
      let scheduledAt: Date;
      let startedAt: Date | undefined;
      let endedAt: Date | undefined;
      let duration: number;
      let viewerCount = 0;
      let peakViewers = 0;

      const baseDate = new Date('2026-09-27T08:00:00Z');
      if (i < 3) {
        // LIVE hiện tại
        status = EventStatus.LIVE;
        scheduledAt = new Date(baseDate.getTime() - (i + 1) * 3600 * 1000);
        startedAt = new Date(scheduledAt.getTime());
        duration = 7200 + i * 1800;
        viewerCount = 5000 + Math.floor(Math.random() * 15000);
        peakViewers = viewerCount + Math.floor(Math.random() * 8000);
      } else if (i < 15) {
        // SCHEDULED trong 14 ngày tới
        status = EventStatus.SCHEDULED;
        scheduledAt = new Date(baseDate.getTime() + (i - 2) * 86400 * 1000);
        duration = 5400 + Math.floor(Math.random() * 9000);
      } else {
        // ENDED trong quá khứ
        status = EventStatus.ENDED;
        scheduledAt = new Date(baseDate.getTime() - (i - 14) * 86400 * 1000);
        startedAt = new Date(scheduledAt.getTime());
        endedAt = new Date(startedAt.getTime() + 7200 * 1000);
        duration = 7200;
        peakViewers = 8000 + Math.floor(Math.random() * 22000);
      }

      const pickedTags = tagPool.slice(0, 3 + (i % 3)).map(t => `${t}#${idx}`);

      const eventData = {
        id,
        title,
        description: `${title} - phát sóng trực tiếp trên ${ch.name}. Đừng bỏ lỡ chương trình hấp dẫn này!`,
        streamSource: ContentSource.EXTERNAL,
        externalPlatform: 'YOUTUBE' as const,
        externalId,
        status,
        scheduledAt,
        startedAt,
        endedAt,
        duration,
        viewerCount,
        peakViewers,
        channelId: ch.id,
        tags: pickedTags,
        autoRecord: true,
      };

      await prisma.liveEvent.upsert({
        where: { id },
        update: eventData as any,
        create: eventData as any,
      });
      totalNewLiveEvents += 1;
    }

    // 20 Recordings / kênh
    for (let i = 0; i < 20; i++) {
      const idx = i + 1;
      const title = `${titles[i % titles.length]} (Recording #${idx})`;
      const externalId = `rec_${tagSlug}_${String(idx).padStart(3, '0')}`;
      const id = deterministicUUID(`${ch.id}-rec-${idx}`);
      const isUploaded = i % 5 !== 0; // 80% UPLOADED, 20% EXTERNAL
      const isAudio = ch.category === LiveCategory.PODCAST && i % 2 === 0;
      const contentType = isAudio ? ContentType.AUDIO : ContentType.VIDEO;
      const quality = qualities[i % qualities.length];
      const duration = 600 + Math.floor(Math.random() * 6600); // 10min - 2h
      const viewCount = 10000 + Math.floor(Math.random() * 490000);
      const likeCount = Math.floor(viewCount * (0.03 + Math.random() * 0.05));
      const commentCount = Math.floor(likeCount * (0.05 + Math.random() * 0.1));
      const publishedAt = new Date('2026-09-27T00:00:00Z').getTime() - (20 - i) * 86400 * 1000;
      const pickedTags = tagPool.slice(0, 3 + (i % 3));

      const recData = {
        id,
        title,
        description: `${title} - tổng hợp trọn vẹn trên ${ch.name}.`,
        contentSource: isUploaded ? ContentSource.UPLOADED : ContentSource.EXTERNAL,
        externalPlatform: isUploaded ? null : 'YOUTUBE',
        externalId,
        duration,
        quality,
        contentType,
        viewCount,
        likeCount,
        commentCount,
        channelId: ch.id,
        tags: pickedTags,
        category: ch.category,
        isFeatured: i % 7 === 0,
        publishedAt: new Date(publishedAt),
      };

      await prisma.recording.upsert({
        where: { id },
        update: recData as any,
        create: recData as any,
      });
      totalNewRecordings += 1;
    }
  }

  console.log(`✅ Extended Live Events added: ${totalNewLiveEvents}`);
  console.log(`✅ Extended Recordings added: ${totalNewRecordings}`);

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

  const comments = [];
  for (const comment of commentsData) {
    const item = await prisma.comment.upsert({
      where: { id: comment.id },
      update: {},
      create: comment,
    });
    comments.push(item);
  }
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

  const reactions = [];
  for (const reaction of reactionsData) {
    const item = await prisma.reaction.upsert({
      where: { id: reaction.id },
      update: {},
      create: reaction,
    });
    reactions.push(item);
  }
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

  const tags = [];
  for (const tag of tagsData) {
    const item = await prisma.productionTag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    tags.push(item);
  }
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
