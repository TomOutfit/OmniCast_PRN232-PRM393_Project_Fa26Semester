// ============================================================
// OmniCast · Expand Supabase Database Users Seed Script
// ============================================================
// Populates 150+ realistic users with diverse roles (ADMIN, STAFF, VIEWER),
// rich Vietnamese profile names, avatars, bios, VIP subscriptions,
// and realistic channel follow engagements directly in Supabase DB.
// ============================================================

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_HASH = '$2b$12$Tpl6USWP.AE.xMW3Cp.iw.pu1P78aqLF669QM1yonvNk3aVk0pOtC'; // Demo@123456

interface UserSeedTemplate {
  fullName: string;
  email: string;
  role: UserRole;
  bio: string;
  avatarUrl: string;
  isActive: boolean;
  emailVerified: boolean;
  daysAgoCreated: number;
  lastLoginHoursAgo: number;
  isVip: boolean;
}

const FIRST_NAMES = [
  'Nguyễn Minh', 'Trần Hoàng', 'Lê Quốc', 'Phạm Gia', 'Đặng Anh',
  'Vũ Quang', 'Bùi Hữu', 'Đỗ Thành', 'Hồ Vĩnh', 'Ngô Tuấn',
  'Dương Hải', 'Lý Khắc', 'Phan Trọng', 'Võ Đình', 'Huỳnh Ngọc',
  'Trịnh Thế', 'Mai Đăng', 'Cao Bá', 'Đinh Tiến', 'Lương Phúc'
];

const LAST_NAMES_MALE = [
  'Tuấn', 'Huy', 'Bảo', 'Khoa', 'Dũng', 'Nam', 'Hiếu', 'Phong',
  'Thịnh', 'Khánh', 'Long', 'Đạt', 'Lâm', 'Sơn', 'Phát', 'Tùng'
];

const LAST_NAMES_FEMALE = [
  'Anh', 'Trang', 'Vy', 'Châu', 'Thảo', 'Ngân', 'Hương', 'Linh',
  'Yến', 'My', 'Phương', 'Mai', 'Quỳnh', 'Nhi', 'Hà', 'Lan'
];

const BIOS = [
  'Đam mê thể thao cuồng nhiệt, không bỏ lỡ trận bóng nào trên Omni Sport ⚽',
  'Kỹ sư phần mềm yêu thích công nghệ & livestream 4K tại FPT University 💻',
  'Mọt phim chính hiệu, xem hết kho điện ảnh trên Omni Cine 🎬',
  'Gamer nghiệp dư, thích theo dõi giải đấu Esport cuối tuần 🎮',
  'Người yêu thiên nhiên và các thước phim tài liệu kỳ vĩ trên Omni Discovery 🌍',
  'Thích nghe nhạc lofi thư giãn và podcast chia sẻ kỹ năng sống 🎧',
  'Reviewer đồ công nghệ và thiết bị gia dụng thông minh 📱',
  'Sinh viên PRM393 - PRN232 FA26, fan ruột nền tảng OmniCast 🌟',
  'Khán giả trung thành, luôn ủng hộ streamer và kênh phát sóng yêu thích ❤️',
  'Biên tập viên nội dung số, thích phân tích trải nghiệm người dùng ✍️',
  'Nhiếp ảnh gia đường phố & người làm nội dung du lịch khám phá 📸',
  'Thích học hỏi các khoá học lập trình và kỹ năng mềm trên Omni Academy 📚',
  'Nội trợ gia đình, theo dõi kênh ẩm thực Foodie mỗi ngày 🍲',
  'Nhà thiết kế đồ hoạ UI/UX, thích giao diện hiện đại của OmniCast 🎨',
  'Khán giả VIP nhiệt tình, ủng hộ Super Chat cho các phiên live đặc sắc 💎',
];

const AVATAR_SEEDS = [
  'an', 'binh', 'chau', 'duy', 'giang', 'hai', 'hoa', 'khoa',
  'linh', 'mai', 'nam', 'ngan', 'phong', 'quang', 'son', 'thao',
  'tuan', 'vy', 'yen', 'bach', 'kien', 'minh', 'tam', 'vu'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, '.');
}

function generateUsers(count: number): UserSeedTemplate[] {
  const users: UserSeedTemplate[] = [];

  // Dedicated core Staff & Admins to guarantee leadership depth
  const coreStaff: { name: string; email: string; role: UserRole; bio: string }[] = [
    { name: 'Nguyễn Bình An (Lead Admin)', email: 'an.nb@omnicast.tv', role: UserRole.ADMIN, bio: 'System Architecture & Security Director at OmniCast' },
    { name: 'Vũ Như Phù (Mobile Lead)', email: 'phu.vn@omnicast.tv', role: UserRole.STAFF, bio: 'Senior Flutter Mobile Engineering Lead' },
    { name: 'Trần Thanh Sơn (Audit & DevOps)', email: 'son.tt@omnicast.tv', role: UserRole.STAFF, bio: 'DevOps & Infrastructure Performance Specialist' },
    { name: 'Lê Thanh Thắng (Full-stack AI)', email: 'thang.lt@omnicast.tv', role: UserRole.STAFF, bio: 'Full-stack Web & Realtime Analytics Architect' },
    { name: 'Đặng Mai Phương (Stream Director)', email: 'phuong.dm@omnicast.tv', role: UserRole.STAFF, bio: 'Live Broadcast & Multichannel Ingestion Director' },
    { name: 'Hoàng Quốc Bảo (Quality Assurance)', email: 'bao.hq@omnicast.tv', role: UserRole.STAFF, bio: 'Head of Quality Assurance & Latency Optimization' },
    { name: 'Trịnh Khánh Linh (Community Lead)', email: 'linh.tk@omnicast.tv', role: UserRole.STAFF, bio: 'Community Engagement & Super Chat Operations' },
    { name: 'Bùi Anh Tuấn (Security Auditor)', email: 'tuan.ba@omnicast.tv', role: UserRole.ADMIN, bio: 'Cybersecurity & Compliance Officer' },
  ];

  for (let i = 0; i < coreStaff.length; i++) {
    const s = coreStaff[i];
    users.push({
      fullName: s.name,
      email: s.email,
      role: s.role,
      bio: s.bio,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.email.split('@')[0]}`,
      isActive: true,
      emailVerified: true,
      daysAgoCreated: 90 - i * 5,
      lastLoginHoursAgo: Math.floor(Math.random() * 8) + 1,
      isVip: true,
    });
  }

  // Generate diverse viewers
  const domains = ['gmail.com', 'fpt.edu.vn', 'yahoo.com', 'outlook.com', 'omnicast.vn'];
  const generatedEmails = new Set(users.map(u => u.email));

  let index = 1;
  while (users.length < count) {
    const isFemale = Math.random() > 0.5;
    const first = getRandomItem(FIRST_NAMES);
    const last = isFemale ? getRandomItem(LAST_NAMES_FEMALE) : getRandomItem(LAST_NAMES_MALE);
    const fullName = `${first} ${last}`;
    const cleanName = removeAccents(fullName);
    const domain = getRandomItem(domains);
    const email = `${cleanName}${index}@${domain}`;

    if (generatedEmails.has(email)) {
      index++;
      continue;
    }
    generatedEmails.add(email);

    const isVip = Math.random() < 0.42; // 42% VIP subscribers
    const isActive = Math.random() > 0.08; // 92% active
    const emailVerified = Math.random() > 0.12; // 88% verified
    const daysAgo = Math.floor(Math.random() * 85) + 1; // within last 85 days
    const hoursAgo = Math.floor(Math.random() * 120) + 1;

    users.push({
      fullName,
      email,
      role: UserRole.VIEWER,
      bio: getRandomItem(BIOS),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${getRandomItem(AVATAR_SEEDS)}${index}`,
      isActive,
      emailVerified,
      daysAgoCreated: daysAgo,
      lastLoginHoursAgo: hoursAgo,
      isVip,
    });
    index++;
  }

  return users;
}

async function main() {
  console.log('🚀 Connecting to Supabase PostgreSQL database...');
  const existingCount = await prisma.user.count();
  console.log(`📊 Current user count in Supabase: ${existingCount}`);

  const targetCount = 160;
  console.log(`🌱 Generating ${targetCount} rich user profiles...`);
  const userTemplates = generateUsers(targetCount);

  let createdCount = 0;
  let updatedCount = 0;

  const now = new Date();

  // Channels for follow relation
  const channels = await prisma.liveChannel.findMany({ select: { id: true } });
  console.log(`📺 Found ${channels.length} channels for seeding follow interactions.`);

  for (const t of userTemplates) {
    const createdAt = new Date(now.getTime() - t.daysAgoCreated * 24 * 60 * 60 * 1000);
    const lastLoginAt = new Date(now.getTime() - t.lastLoginHoursAgo * 60 * 60 * 1000);
    const premiumUntil = t.isVip
      ? new Date(now.getTime() + (Math.floor(Math.random() * 180) + 30) * 24 * 60 * 60 * 1000)
      : null;

    try {
      const user = await prisma.user.upsert({
        where: { email: t.email },
        update: {
          fullName: t.fullName,
          role: t.role,
          bio: t.bio,
          avatarUrl: t.avatarUrl,
          isActive: t.isActive,
          emailVerified: t.emailVerified,
          lastLoginAt,
          premiumUntil,
        },
        create: {
          email: t.email,
          fullName: t.fullName,
          passwordHash: DEFAULT_HASH,
          role: t.role,
          bio: t.bio,
          avatarUrl: t.avatarUrl,
          isActive: t.isActive,
          emailVerified: t.emailVerified,
          createdAt,
          lastLoginAt,
          premiumUntil,
        },
      });

      if (user.createdAt?.getTime() === createdAt.getTime()) {
        createdCount++;
      } else {
        updatedCount++;
      }

      // Add random 2-4 channel follows if channels exist
      if (channels.length > 0) {
        const followCount = Math.floor(Math.random() * 3) + 2;
        const shuffled = [...channels].sort(() => 0.5 - Math.random()).slice(0, followCount);
        for (const ch of shuffled) {
          try {
            await prisma.follow.upsert({
              where: {
                followerId_channelId: {
                  followerId: user.id,
                  channelId: ch.id,
                },
              },
              update: {},
              create: {
                followerId: user.id,
                channelId: ch.id,
                createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60),
              },
            });
          } catch (_) {
            // Ignore if follow duplicate
          }
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ Skipped ${t.email}:`, err.message);
    }
  }

  const finalCount = await prisma.user.count();
  const staffCount = await prisma.user.count({ where: { role: UserRole.STAFF } });
  const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
  const viewerCount = await prisma.user.count({ where: { role: UserRole.VIEWER } });
  const vipCount = await prisma.user.count({ where: { premiumUntil: { gt: now } } });
  const activeCount = await prisma.user.count({ where: { isActive: true } });
  const followCount = await prisma.follow.count();

  console.log('\n============================================================');
  console.log('🎉 SUPABASE USER DATA EXPANSION COMPLETE!');
  console.log('============================================================');
  console.log(`📈 Total Users in Supabase:    ${finalCount} (was ${existingCount})`);
  console.log(`👑 Admin Users:               ${adminCount}`);
  console.log(`🛠️ Staff Members:              ${staffCount}`);
  console.log(`👥 Viewer Community:          ${viewerCount}`);
  console.log(`💎 Active VIP Subscribers:     ${vipCount}`);
  console.log(`🟢 Active Status Users:       ${activeCount}`);
  console.log(`❤️ Channel Follow Records:     ${followCount}`);
  console.log('============================================================\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error executing Supabase expand seed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
