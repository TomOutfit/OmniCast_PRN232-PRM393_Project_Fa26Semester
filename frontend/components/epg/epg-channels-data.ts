// ============================================================
// OmniCast - EPG 25-Channel Schedule & API Data Adapter
// Realtime Electronic Programme Guide with Dynamic Daypart Engine
// Sắp xếp lịch phát sóng đa dạng, không cố định số khung, không hardcode
// ============================================================

import type { EpgDayResponse } from '@/lib/api/programs';

export interface RealEpgProgram {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  startTime: string; // "19:15"
  endTime: string;   // "21:45"
  startMinutes: number; // minutes from 00:00 (e.g. 19*60 + 15 = 1155)
  durationMinutes: number; // e.g. 150
  badge?: string;
  quality?: string;
  audio?: string;
  description: string;
  thumbnailUrl: string;
  directorOrHost?: string;
  rating?: number;
  features?: string[];
  channelId?: string;
  channelSlug?: string;
  channelName?: string;
  sourceRecordingId?: string | null;
}

export interface RealEpgChannel {
  id: string;
  slug: string;
  chNumber: string;
  name: string;
  category: 'sports' | 'movies' | 'news' | 'esports' | 'discovery' | 'entertainment' | 'kids';
  categoryLabel: string;
  logo: string;
  color: string;
  programs: RealEpgProgram[];
}

export const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'Tất Cả Kênh (25 Kênh)' },
  { id: 'sports', label: 'Thể Thao' },
  { id: 'movies', label: 'Điện Ảnh' },
  { id: 'news', label: 'Thời Sự' },
  { id: 'entertainment', label: 'Giải Trí' },
  { id: 'esports', label: 'Esports' },
  { id: 'discovery', label: 'Khám Phá' },
  { id: 'kids', label: 'Thiếu Nhi' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  SPORTS: 'Thể Thao Đỉnh Cao',
  SHOW: 'Show Giải Trí',
  ENTERTAINMENT: 'Giải Trí Tổng Hợp',
  CINE: 'Điện Ảnh 4K',
  DRAMA: 'Phim Truyền Hình',
  NEWS: 'Tin Tức Thời Sự',
  MUSIC: 'Âm Nhạc Đỉnh Cao',
  KIDS: 'Thiếu Nhi & Hoạt Hình',
  TECH: 'Công Nghệ & AI',
  FOOD: 'Ẩm Thực Thế Giới',
  DOCUMENTARY: 'Khám Phá Tự Nhiên',
  GAMING: 'Esports & Gaming',
  PODCAST: 'Podcast & Talkshow',
  EDUCATION: 'Học Viện & Kỹ Năng',
  LIFESTYLE: 'Thời Trang & Lối Sống',
  TRAVEL: 'Du Lịch Khám Phá',
  ART: 'Nghệ Thuật & Thiết Kế',
  BUSINESS: 'Kinh Doanh & Đầu Tư',
  HEALTH: 'Sức Khỏe & Y Khoa',
};

export function mapCategory(catStr: string): RealEpgChannel['category'] {
  const c = (catStr || '').toLowerCase();
  if (c.includes('sport')) return 'sports';
  if (c.includes('cine') || c.includes('drama') || c.includes('phim') || c.includes('movie')) return 'movies';
  if (c.includes('news') || c.includes('thời sự') || c.includes('tin tức') || c.includes('business') || c.includes('kinh doanh')) return 'news';
  if (c.includes('esport') || c.includes('game') || c.includes('gaming')) return 'esports';
  if (c.includes('discovery') || c.includes('doc') || c.includes('khám phá') || c.includes('travel') || c.includes('du lịch') || c.includes('tech') || c.includes('food') || c.includes('health') || c.includes('wellness') || c.includes('academy') || c.includes('skill')) return 'discovery';
  if (c.includes('kid') || c.includes('thiếu nhi') || c.includes('hoạt hình')) return 'kids';
  return 'entertainment';
}

export function getCategoryThumbnail(category: string, seed: number = 0): string {
  const thumbnails: Record<string, string[]> = {
    SPORTS: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80',
    ],
    CINE: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
    ],
    NEWS: [
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80',
    ],
    GAMING: [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    ],
    DOCUMENTARY: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
    ],
    ENTERTAINMENT: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    ],
    KIDS: [
      'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?auto=format&fit=crop&w=600&q=80',
    ],
  };
  const list = thumbnails[category.toUpperCase()] || thumbnails.ENTERTAINMENT;
  return list[Math.abs(seed) % list.length];
}

export function getChannelColor(catKey: string, idx: number): string {
  const colors: Record<string, string> = {
    SPORTS: '#EF4444',
    CINE: '#8B5CF6',
    DRAMA: '#EC4899',
    SHOW: '#F59E0B',
    ENTERTAINMENT: '#EAB308',
    NEWS: '#3B82F6',
    MUSIC: '#10B981',
    KIDS: '#F97316',
    TECH: '#06B6D4',
    FOOD: '#84CC16',
    DOCUMENTARY: '#14B8A6',
    GAMING: '#DC2626',
    PODCAST: '#A855F7',
    EDUCATION: '#6366F1',
    LIFESTYLE: '#F43F5E',
    TRAVEL: '#0EA5E9',
    ART: '#D946EF',
    BUSINESS: '#0284C7',
    HEALTH: '#22C55E',
  };
  return colors[catKey.toUpperCase()] || ['#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][idx % 5];
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE 25 CHANNELS METADATA
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_25_CHANNELS_META = [
  { id: 'ch-01', slug: 'sport-1', num: '001', name: 'Omni Sport 1', category: 'sports' as const, label: 'Thể Thao Đỉnh Cao', logo: '/Channel_Logos/01-omni-sport-1-icon.svg', color: '#EF4444' },
  { id: 'ch-02', slug: 'sport-2', num: '002', name: 'Omni Sport 2', category: 'sports' as const, label: 'Thể Thao Tốc Độ & Ngoại Hạng', logo: '/Channel_Logos/02-omni-sport-2-icon.svg', color: '#DC2626' },
  { id: 'ch-03', slug: 'show', num: '003', name: 'Omni Show', category: 'entertainment' as const, label: 'Show Truyền Hình & Reality', logo: '/Channel_Logos/03-omni-show-icon.svg', color: '#F59E0B' },
  { id: 'ch-04', slug: 'entertain', num: '004', name: 'Omni Entertain', category: 'entertainment' as const, label: 'Giải Trí & Hài Kịch', logo: '/Channel_Logos/04-omni-entertain-icon.svg', color: '#EAB308' },
  { id: 'ch-05', slug: 'cine', num: '005', name: 'Omni Cine 4K', category: 'movies' as const, label: 'Điện Ảnh Bom Tấn 4K', logo: '/Channel_Logos/05-omni-cine-icon.svg', color: '#8B5CF6' },
  { id: 'ch-06', slug: 'drama', num: '006', name: 'Omni Drama', category: 'movies' as const, label: 'Phim Truyện Á Châu & Series', logo: '/Channel_Logos/06-omni-drama-icon.svg', color: '#EC4899' },
  { id: 'ch-07', slug: 'news', num: '007', name: 'Omni News 24/7', category: 'news' as const, label: 'Tin Tức Thời Sự Quốc Tế', logo: '/Channel_Logos/07-omni-news-icon.svg', color: '#3B82F6' },
  { id: 'ch-08', slug: 'music', num: '008', name: 'Omni Music', category: 'entertainment' as const, label: 'Âm Nhạc & Bảng Xếp Hạng', logo: '/Channel_Logos/08-omni-music-icon.svg', color: '#10B981' },
  { id: 'ch-09', slug: 'kids', num: '009', name: 'Omni Kids', category: 'kids' as const, label: 'Thiếu Nhi & Hoạt Hình', logo: '/Channel_Logos/09-omni-kids-icon.svg', color: '#F97316' },
  { id: 'ch-10', slug: 'tech', num: '010', name: 'Omni Tech', category: 'discovery' as const, label: 'Công Nghệ, AI & Tương Lai', logo: '/Channel_Logos/10-omni-tech-icon.svg', color: '#06B6D4' },
  { id: 'ch-11', slug: 'food', num: '011', name: 'Omni Food', category: 'discovery' as const, label: 'Ẩm Thực & Đầu Bếp 5 Sao', logo: '/Channel_Logos/11-omni-food-icon.svg', color: '#84CC16' },
  { id: 'ch-12', slug: 'discovery', num: '012', name: 'Omni Discovery', category: 'discovery' as const, label: 'Khám Phá Thế Giới Tự Nhiên', logo: '/Channel_Logos/12-omni-discovery-icon.svg', color: '#14B8A6' },
  { id: 'ch-13', slug: 'esports', num: '013', name: 'Omni Esports', category: 'esports' as const, label: 'Đấu Trường Thể Thao Điện Tử', logo: '/Channel_Logos/13-omni-esports-icon.svg', color: '#DC2626' },
  { id: 'ch-14', slug: 'indie-games', num: '014', name: 'Omni Indie Games', category: 'esports' as const, label: 'Thế Giới Game Độc Lập', logo: '/Channel_Logos/14-omni-indie-games-icon.svg', color: '#9333EA' },
  { id: 'ch-15', slug: 'podcast', num: '015', name: 'Omni Podcast', category: 'entertainment' as const, label: 'Podcast & Trò Chuyện Chuyên Sâu', logo: '/Channel_Logos/15-omni-podcast-icon.svg', color: '#A855F7' },
  { id: 'ch-16', slug: 'audiobook', num: '016', name: 'Omni Audiobook', category: 'entertainment' as const, label: 'Sách Nói & Kịch Truyền Thanh', logo: '/Channel_Logos/16-omni-audiobook-icon.svg', color: '#7C3AED' },
  { id: 'ch-17', slug: 'academy', num: '017', name: 'Omni Academy', category: 'discovery' as const, label: 'Học Viện Kỹ Năng & Lập Trình', logo: '/Channel_Logos/17-omni-academy-icon.svg', color: '#6366F1' },
  { id: 'ch-18', slug: 'skill-lab', num: '018', name: 'Omni Skill Lab', category: 'discovery' as const, label: 'Phòng Thí Nghiệm Sáng Tạo', logo: '/Channel_Logos/18-omni-skill-lab-icon.svg', color: '#3B82F6' },
  { id: 'ch-19', slug: 'wellness', num: '019', name: 'Omni Wellness', category: 'discovery' as const, label: 'Yoga, Thiền & Sống Cân Bằng', logo: '/Channel_Logos/19-omni-wellness-icon.svg', color: '#10B981' },
  { id: 'ch-20', slug: 'fashion', num: '020', name: 'Omni Fashion', category: 'entertainment' as const, label: 'Sàn Diễn Thời Trang Quốc Tế', logo: '/Channel_Logos/20-omni-fashion-icon.svg', color: '#F43F5E' },
  { id: 'ch-21', slug: 'travel-vn', num: '021', name: 'Omni Travel VN', category: 'discovery' as const, label: 'Vẻ Đẹp Việt Nam Bất Tận', logo: '/Channel_Logos/21-omni-travel-vn-icon.svg', color: '#0EA5E9' },
  { id: 'ch-22', slug: 'travel-world', num: '022', name: 'Omni Travel World', category: 'discovery' as const, label: 'Hành Trình Vòng Quanh Trái Đất', logo: '/Channel_Logos/22-omni-travel-world-icon.svg', color: '#0284C7' },
  { id: 'ch-23', slug: 'art-design', num: '023', name: 'Omni Art & Design', category: 'entertainment' as const, label: 'Mỹ Thuật & Không Gian Sống', logo: '/Channel_Logos/23-omni-art-design-icon.svg', color: '#D946EF' },
  { id: 'ch-24', slug: 'business', num: '024', name: 'Omni Business', category: 'news' as const, label: 'Thị Trường Tài Chính & Kinh Doanh', logo: '/Channel_Logos/24-omni-business-icon.svg', color: '#0284C7' },
  { id: 'ch-25', slug: 'health', num: '025', name: 'Omni Health', category: 'discovery' as const, label: 'Y Khoa & Sức Khỏe Gia Đình', logo: '/Channel_Logos/25-omni-health-icon.svg', color: '#22C55E' },
];

export interface CatalogueShow {
  title: string;
  desc: string;
  duration: number;
  badge?: string;
  category?: string;
  subtitle?: string;
  quality?: string;
  audio?: string;
  features?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL TV BROADCAST ENGINE (KHÔNG CỐ ĐỊNH SỐ KHUNG, KHÔNG HARDCODE)
// Mỗi kênh sở hữu số lượng slot khác nhau (Tin tức 25-30 slots, Phim 10-12 slots,
// Thể thao 14-18 slots, Thiếu nhi 22-26 slots).
// Nội dung thay đổi từng ngày, khớp các khung giờ sinh hoạt thực tế của người xem:
//   - Sáng (06h - 09h30): Điểm tin sáng, Chào ngày mới, Thể dục sáng, Giá vàng
//   - Trưa (11h30 - 13h30): Thời sự trưa 11h30 (Trực tiếp), Thể thao trưa
//   - Chiều (13h30 - 18h): Trực tiếp Tennis/Esports/Bóng chuyền, Series phim Á Châu
//   - Tối (19h - 19h45): Thời sự 19h Quốc Gia (Trực tiếp)
//   - Giờ Vàng (20h - 22h30): Bom tấn 4K, Siêu kinh điển Ngoại Hạng Anh, Mega Show
//   - Đêm (22h30 - 24h): Bản tin đêm 23h (Trực tiếp), Extra Time, Acoustic đêm
//   - Rạng sáng (00h - 06h): Replay trận cầu đinh 4K, Phim kinh điển, Khám phá vũ trụ
// ─────────────────────────────────────────────────────────────────────────────

interface DaypartWindow {
  key: string;
  startMinute: number;
  endMinute: number;
  name: string;
}

const DAYPART_WINDOWS: DaypartWindow[] = [
  { key: 'OVERNIGHT', startMinute: 0, endMinute: 360, name: 'Đêm Muộn & Rạng Sáng' },        // 00:00 - 06:00 (360m)
  { key: 'MORNING', startMinute: 360, endMinute: 570, name: 'Buổi Sáng Khởi Động' },          // 06:00 - 09:30 (210m)
  { key: 'MIDDAY', startMinute: 570, endMinute: 810, name: 'Buổi Trưa & Thời Sự 11H30' },     // 09:30 - 13:30 (240m)
  { key: 'AFTERNOON', startMinute: 810, endMinute: 1080, name: 'Buổi Chiều & Thể Thao' },     // 13:30 - 18:00 (270m)
  { key: 'EARLY_EVENING', startMinute: 1080, endMinute: 1200, name: 'Thời Sự 19H & Tiền Giờ Vàng' }, // 18:00 - 20:00 (120m)
  { key: 'PRIME_TIME', startMinute: 1200, endMinute: 1350, name: 'Khung Giờ Vàng Đỉnh Cao' }, // 20:00 - 22:30 (150m)
  { key: 'LATE_NIGHT', startMinute: 1350, endMinute: 1440, name: 'Bản Tin Đêm 23H & Thư Giãn' }, // 22:30 - 24:00 (90m)
];

interface ProgramItemSpec {
  title: string;
  desc: string;
  category: string;
  duration: number;
  badge?: string;
  quality?: string;
  audio?: string;
  features?: string[];
}

// Procedural Content Synthesizer per Channel and Daypart
function generateWindowPrograms(
  channelSlug: string,
  category: string,
  channelName: string,
  window: DaypartWindow,
  dayOffset: number
): ProgramItemSpec[] {
  const dayCycle = Math.abs(dayOffset);
  const isWeekend = (dayOffset % 7 === 0 || dayOffset % 7 === 6 || dayOffset % 7 === -1);
  const out: ProgramItemSpec[] = [];

  // ============================================================
  // 1. SPORTS CHANNELS (Omni Sport 1, Omni Sport 2)
  // ============================================================
  if (category === 'sports') {
    const isSport1 = channelSlug === 'sport-1';
    const fixtures = [
      { home: 'Man City', away: 'Arsenal', league: 'Ngoại Hạng Anh', venue: 'Etihad Stadium' },
      { home: 'Real Madrid', away: 'FC Barcelona', league: 'Siêu Kinh Điển El Clásico', venue: 'Santiago Bernabéu' },
      { home: 'Liverpool', away: 'Chelsea', league: 'Ngoại Hạng Anh', venue: 'Anfield' },
      { home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga Der Klassiker', venue: 'Allianz Arena' },
      { home: 'Inter Milan', away: 'Juventus', league: 'Serie A Derby d\'Italia', venue: 'San Siro' },
      { home: 'PSG', away: 'Marseille', league: 'Ligue 1 Le Classique', venue: 'Parc des Princes' },
      { home: 'Tottenham', away: 'Man United', league: 'Ngoại Hạng Anh', venue: 'Tottenham Hotspur Stadium' },
    ];
    const fix = fixtures[(dayCycle + (isSport1 ? 0 : 2)) % fixtures.length];

    if (window.key === 'OVERNIGHT') {
      out.push(
        {
          title: `UEFA Champions League Replay: ${fix.home} vs ${fix.away} (4K Atmos)`,
          desc: `Xem lại trọn vẹn màn thư hùng cúp C1 châu Âu tại ${fix.venue} với bình luận viên độc quyền.`,
          category: 'Cúp C1 4K',
          badge: 'REPLAY 4K',
          quality: '4K UHD',
          audio: 'Dolby Atmos',
          features: ['Dolby Atmos', 'Multi-Cam'],
          duration: 135,
        },
        {
          title: 'Đua Xe F1: Góc Nhìn Buồng Lái Cockpit & Telemetry Tốc Độ',
          desc: 'Chiêm ngưỡng những góc cua tử thần qua camera góc nhìn thứ nhất của tay đua.',
          category: 'F1 Motorsport',
          badge: 'F1 SPEED',
          duration: 110,
        },
        {
          title: 'Huyền Thoại Sân Cỏ: Những Khoảnh Khắc Đi Vào Lịch Sử Bóng Đá',
          desc: 'Ký sự tài liệu đặc biệt về các tượng đài bóng đá thế giới.',
          category: 'Tài Liệu',
          duration: 75,
        },
        {
          title: 'Khởi Động Ngày Mới: Bài Tập Thể Lực & Dinh Dưỡng Thể Thao',
          desc: 'Chuỗi bài tập cardio khoa học và chế độ ăn uống chuẩn vận động viên.',
          category: 'Thể Lực',
          duration: 40,
        }
      );
    } else if (window.key === 'MORNING') {
      out.push(
        {
          title: 'Bản Tin Thể Thao Sáng: Điểm Tin Sân Cỏ 24 Giờ Toàn Cầu',
          desc: 'Kết quả bóng đá châu Âu đêm qua, bảng xếp hạng và các bàn thắng siêu phẩm.',
          category: 'Tin Nhanh',
          badge: 'TIN SÁNG',
          duration: 35,
        },
        {
          title: 'Tạp Chí Ngoại Hạng Anh: Bàn Thắng Vàng & Tình Huống VAR Vòng Đấu',
          desc: 'Phân tích chi tiết chiến thuật và chiêm ngưỡng top siêu phẩm sút xa đẹp mắt.',
          category: 'Tạp Chí',
          badge: 'HIGHLIGHT',
          duration: 45,
        },
        {
          title: 'Quần Vợt ATP Masters 1000: Highlights Bán Kết Đỉnh Cao',
          desc: 'Màn so tài kịch tính giữa các tay vợt hàng đầu thế giới trên mặt sân cứng.',
          category: 'Quần Vợt',
          duration: 65,
        },
        {
          title: 'Võ Thuật Tổng Hợp UFC: Màn So Găng Đỉnh Cao Las Vegas',
          desc: 'Trận tranh đai vô địch hạng trung với những pha ra đòn knock-out ngoạn mục.',
          category: 'UFC Fight',
          duration: 65,
        }
      );
    } else if (window.key === 'MIDDAY') {
      out.push(
        {
          title: 'Tạp Chí Đua Xe Tốc Độ: Phân Tích Khí Động Học & Lốp Xe F1',
          desc: 'Mổ xẻ chiến thuật pit-stop và nâng cấp cánh gió của các đội đua hàng đầu.',
          category: 'F1 Motorsport',
          duration: 60,
        },
        {
          title: 'Thể Thao Trưa & Phỏng Vấn Chuyên Sâu Cùng Huấn Luyện Viên',
          desc: `Nhận định cơ hội vô địch và đội hình dự kiến của ${fix.home} trước giờ ra trận.`,
          category: 'Talkshow',
          badge: 'TRỰC TIẾP',
          duration: 55,
        },
        {
          title: 'Bóng Chuyền Nữ Châu Á VNL: Tuyển Tập Pha Chắn Bóng Ngoạn Mục',
          desc: 'Những pha phối hợp nhanh và đập bóng uy lực của các nữ vận động viên.',
          category: 'Bóng Chuyền',
          duration: 60,
        },
        {
          title: 'Toàn Cảnh Champions League: Kỷ Niệm 70 Năm Giải Đấu Danh Giá',
          desc: 'Hành trình 7 thập kỷ hình thành và phát triển của giải bóng đá số 1 hành tinh.',
          category: 'Tài Liệu',
          duration: 65,
        }
      );
    } else if (window.key === 'AFTERNOON') {
      out.push(
        {
          title: 'Quần Vợt ATP Masters 1000: Trực Tiếp Vòng Bán Kết Sân Cứng',
          desc: 'Cuộc so tài đỉnh cao giữa hai hạt giống hàng đầu thế giới trực tiếp chuẩn 4K HDR.',
          category: 'Quần Vợt',
          badge: 'TRỰC TIẾP 4K',
          quality: '4K HDR',
          features: ['Multi-Cam', 'Live Stats'],
          duration: 135,
        },
        {
          title: 'Bóng Chuyền Nữ VNL: Trận Thư Hùng Kinh Điển Việt Nam vs Thái Lan',
          desc: 'Màn tái đấu nảy lửa giữa hai đại diện xuất sắc nhất Đông Nam Á tại đấu trường FIVB.',
          category: 'Bóng Chuyền',
          badge: 'KINH ĐIỂN',
          duration: 95,
        },
        {
          title: 'Bản Tin Thể Thao Chiều: Đội Hình Ra Sân Dự Kiến Đêm Nay',
          desc: 'Cập nhật tình hình chấn thương và thông tin trước giờ bóng lăn các trận cầu đinh.',
          category: 'Tin Nhanh',
          duration: 40,
        }
      );
    } else if (window.key === 'EARLY_EVENING') {
      out.push(
        {
          title: `Omni Studio Tiền Trận: Toàn Cảnh Đại Chiến ${fix.home} vs ${fix.away}`,
          desc: 'Bình luận viên kỳ cựu phân tích chiến thuật, sơ đồ ra sân và các điểm nóng sân cỏ.',
          category: 'Studio Tiền Trận',
          badge: 'STUDIO LIVE',
          duration: 60,
        },
        {
          title: 'Điểm Tin Thể Thao 19H: Đếm Ngược Giờ Bóng Lăn',
          desc: 'Hình ảnh khởi động trực tiếp từ đường hầm sân vận động trước giờ thi đấu.',
          category: 'Tin Nhanh',
          badge: 'TRỰC TIẾP',
          duration: 45,
        },
        {
          title: 'Dự Báo Thời Tiết Sân Cỏ & Tình Hình Khán Giả',
          desc: 'Không khí sôi sục và điều kiện thời tiết tại sân vận động trước giờ giao tranh.',
          category: 'Thời Tiết',
          duration: 15,
        }
      );
    } else if (window.key === 'PRIME_TIME') {
      out.push({
        title: `Trực Tiếp ${fix.league}: ${fix.home} vs ${fix.away} (4K 60FPS HEVC)`,
        desc: `Đại chiến rực lửa tại ${fix.venue}. Trực tiếp 16 góc máy, âm thanh Dolby Atmos 5.1 cùng bình luận viên hàng đầu.`,
        category: 'Siêu Kinh Điển',
        badge: 'TRỰC TIẾP 4K',
        quality: '4K 60FPS HEVC',
        audio: 'Dolby Atmos 5.1',
        features: ['16 Multi-Cam', 'Dolby Atmos 5.1', 'Tactical AI'],
        duration: 150,
      });
    } else {
      // LATE_NIGHT
      out.push(
        {
          title: 'Omni Extra Time: Họp Báo & Phỏng Vấn HLV Sau Trận Đấu',
          desc: 'Phỏng vấn nóng các huấn luyện viên trưởng và ngôi sao xuất sắc nhất trận đấu.',
          category: 'Hậu Trận',
          badge: 'HẬU TRẬN',
          duration: 40,
        },
        {
          title: 'Tổng Hợp Vòng Đấu & Bàn Thắng Vàng Đêm Nay',
          desc: 'Bảng xếp hạng cập nhật, phân tích tình huống VAR gây tranh cãi và điểm số vòng đấu.',
          category: 'Tổng Hợp',
          badge: 'TỔNG HỢP',
          duration: 50,
        }
      );
    }
    return out;
  }

  // ============================================================
  // 2. MOVIES & DRAMA CHANNELS (Omni Cine 4K, Omni Drama)
  // ============================================================
  if (category === 'movies') {
    const isCine = channelSlug === 'cine';
    const films = [
      { title: 'Dune: Hành Tinh Cát - Phần 2', desc: 'Paul Atreides trỗi dậy lãnh đạo người Fremen giải phóng Arrakis.', badge: 'CHIẾU RẠP 4K', duration: 150 },
      { title: 'Oppenheimer: Huyền Thoại Bom Nguyên Tử', desc: 'Kiệt tác 7 giải Oscar của Christopher Nolan tái hiện dự án Manhattan.', badge: 'BOM TẤN 4K', duration: 150 },
      { title: 'Spider-Man: Across the Spider-Verse', desc: 'Hành trình đa vũ trụ ngoạn mục đoạt giải Oscar cùng Miles Morales.', badge: 'CHIẾU RẠP 4K', duration: 140 },
      { title: 'Top Gun: Maverick - Phi Công Siêu Đẳng', desc: 'Tom Cruise trở lại buồng lái tiêm kích trong màn bay siêu âm nghẹt thở.', badge: 'BOM TẤN', duration: 130 },
      { title: 'Ký Sinh Trùng (Parasite) - Bản Đặc Biệt', desc: 'Tác phẩm lịch sử của điện ảnh Hàn Quốc thắng giải Oscar và Cành Cọ Vàng.', badge: 'CINEMA', duration: 130 },
      { title: 'Interstellar: Hố Tử Thần (Bản 4K Phục Chế)', desc: 'Hành trình xuyên không gian tìm kiếm miền đất hứa cho nhân loại.', badge: 'KINH ĐIỂN 4K', duration: 150 },
    ];
    const film = films[(dayCycle + (isCine ? 0 : 3)) % films.length];
    const epNum = dayCycle * 2 + 1;

    if (window.key === 'OVERNIGHT') {
      out.push(
        {
          title: 'Điện Ảnh Kinh Điển: Bố Già (The Godfather 4K Phục Chế)',
          desc: 'Bản phục chế 4K tác phẩm bất hủ của đạo diễn Francis Ford Coppola.',
          category: 'Phim 4K',
          badge: 'KINH ĐIỂN 4K',
          quality: '4K UHD',
          audio: 'Dolby Atmos',
          duration: 175,
        },
        {
          title: 'Bóng Tối Đêm Muộn: Phim Tâm Lý Ly Kỳ Đạt Điểm Phê Bình Xuất Sắc',
          desc: 'Tuyển tập phim giật gân cuốn hút dành cho khung giờ khuya.',
          category: 'Kinh Dị',
          duration: 110,
        },
        {
          title: 'Hậu Trường Kỹ Xảo Điện Ảnh: Bí Mật CGI Triệu Đô Hollywood',
          desc: 'Khám phá trường quay phông xanh và kỹ thuật hóa trang kỹ xảo Hollywood.',
          category: 'Hậu Trường',
          duration: 75,
        }
      );
    } else if (window.key === 'MORNING') {
      out.push(
        {
          title: 'Phim Hoạt Hình Ngắn Đoạt Giải Oscar: Giấc Mơ Bay',
          desc: 'Tác phẩm hoạt hình ngắn xúc động về tình cha con và nghị lực vươn lên.',
          category: 'Phim Ngắn',
          badge: 'OSCAR',
          duration: 35,
        },
        {
          title: 'Hồ Sơ Đạo Diễn: Cuộc Đời & Phong Cách Christopher Nolan',
          desc: 'Phân tích nghệ thuật thị giác và sự ám ảnh với khái niệm thời gian trong điện ảnh.',
          category: 'Tài Liệu',
          duration: 55,
        },
        {
          title: `Series Phim Á Châu: Giọt Nước Mắt Pha Lê (Tập Sáng ${epNum})`,
          desc: 'Bí mật gia tộc và mối ân oán dần được hé lộ qua những tình tiết éo le.',
          category: 'Series Phim',
          duration: 120,
        }
      );
    } else if (window.key === 'MIDDAY') {
      out.push(
        {
          title: 'Phim Truyền Hình Giờ Trưa: Tình Yêu & Tham Vọng',
          desc: 'Cuộc đấu trí kịch tính giữa các tập đoàn tài chính gia đình.',
          category: 'Phim Truyện',
          duration: 60,
        },
        {
          title: 'Phim Điện Ảnh Chiếu Rạp Nghỉ Trưa: Trái Tim Quả Cảm',
          desc: 'Bản anh hùng ca bất diệt về lòng yêu nước và ý chí tự do kiên cường.',
          category: 'Điện Ảnh',
          duration: 120,
        },
        {
          title: 'Phim Ngắn Độc Lập: Cannes Spotlight Tuyển Tập Xuất Sắc',
          desc: 'Những thước phim nghệ thuật sâu lắng đoạt giải quốc tế.',
          category: 'Indie Film',
          duration: 60,
        }
      );
    } else if (window.key === 'AFTERNOON') {
      out.push(
        {
          title: `Series Trinh Thám Á Châu: Tội Phạm Không Dấu Vết (Tập Chiều ${epNum + 1})`,
          desc: 'Thám tử lần theo manh mối cuối cùng dẫn tới đường hầm bỏ hoang đầy bí ẩn.',
          category: 'Series Phim',
          badge: 'TẬP MỚI',
          duration: 65,
        },
        {
          title: 'Phim Hành Động Chiếu Rạp: Đội Đặc Nhiệm Bão Sa Mạc (4K)',
          desc: 'Những pha rượt đuổi nghẹt thở và đấu súng kịch tính trên sa mạc.',
          category: 'Hành Động',
          duration: 135,
        },
        {
          title: 'Hậu Trường Điện Ảnh: Kỹ Xảo Cháy Nổ & cascadeur Hollywood',
          desc: 'Những pha đóng thế nghẹt thở và sự mạo hiểm của các diễn viên đóng thế.',
          category: 'Hậu Trường',
          duration: 70,
        }
      );
    } else if (window.key === 'EARLY_EVENING') {
      out.push(
        {
          title: 'Omni Cinema Spotlight: Giới Thiệu Bom Tấn Chuẩn Bị Lên Sóng',
          desc: 'Trailer độc quyền, phỏng vấn dàn sao Hollywood và hậu trường cảnh quay hành động.',
          category: 'Tiêu Điểm',
          badge: 'SPOTLIGHT',
          duration: 60,
        },
        {
          title: 'Phim Hoạt Hình Ngắn: Giấc Mơ Dưới Ánh Trăng Vàng',
          desc: 'Tác phẩm hoạt hình 3D giàu tính thẩm mỹ và thông điệp gia đình ấm áp.',
          category: 'Phim Ngắn',
          duration: 45,
        },
        {
          title: 'Điểm Tin Điện Ảnh & Bảng Xếp Hạng Phòng Vé Box Office',
          desc: 'Doanh thu phòng vé toàn cầu và các dự án phim sắp bấm máy.',
          category: 'Tin Nhanh',
          duration: 15,
        }
      );
    } else if (window.key === 'PRIME_TIME') {
      out.push({
        title: `${film.title} (Bản 4K Dolby Atmos)`,
        desc: film.desc,
        category: 'Điện Ảnh 4K',
        badge: film.badge,
        quality: '4K UHD HDR',
        audio: 'Dolby Atmos 5.1',
        features: ['Dolby Atmos', 'HDR10+', 'Cinematic 4K'],
        duration: 150,
      });
    } else {
      // LATE_NIGHT
      out.push(
        {
          title: 'Bình Luận Sau Phim: Mổ Xẻ Thông Điệp Ẩn Giấu Cùng Nhà Phê Bình',
          desc: 'Diễn đàn phân tích cái kết mở và ý đồ triết học của đạo diễn.',
          category: 'Bình Luận',
          duration: 40,
        },
        {
          title: 'Phim Ngắn Điện Ảnh Đêm Khuya: Khoảng Lặng Tâm Hồn',
          desc: 'Những thước phim nghệ thuật sâu lắng dành riêng cho khán giả yêu điện ảnh đêm.',
          category: 'Phim Ngắn',
          duration: 50,
        }
      );
    }
    return out;
  }

  // ============================================================
  // 3. NEWS & BUSINESS CHANNELS (Omni News 24/7, Omni Business)
  // Số lượng slot dồi dào (26 - 32 slot / ngày, 15m - 45m mỗi bản tin)
  // ============================================================
  if (category === 'news') {
    const isBiz = channelSlug === 'business';
    const topics = [
      'Chứng Khoán Phố Wall & Biến Động Lãi Suất Cục Dự Trữ Liên Bang',
      'Thị Trường Vàng SJC & Xu Hướng Dòng Vốn Ngoại Tệ',
      'Bất Động Sản & Bàn Cờ Dòng Tiền Đầu Tư 2026',
      'Đột Phá Bán Dẫn & Cơn Sốt Cổ Phiếu Trí Tuệ Nhân Tạo AI',
      'Kinh Tế Xanh & Cam Kết Giảm Phát Thải Net Zero Của Doanh Nghiệp',
    ];
    const topic = topics[dayCycle % topics.length];

    if (window.key === 'OVERNIGHT') {
      out.push(
        {
          title: 'Bản Tin Thế Giới Rạng Sáng: Tổng Kết 24 Giờ Châu Mỹ & Châu Âu',
          desc: 'Cập nhật nhanh diễn biến chính trị quốc tế và các quyết sách ngoại giao qua đêm.',
          category: 'Tin Nhanh',
          duration: 45,
        },
        {
          title: `Tọa Đàm Kinh Tế Đêm Muộn: ${topic}`,
          desc: 'Bàn tròn chuyên gia tài chính nhận định về kịch bản dòng tiền quốc tế.',
          category: 'Chuyên Đề',
          duration: 60,
        },
        {
          title: 'Ký Sự Quốc Tế: Đất Nước & Con Người Vùng Vịnh',
          desc: 'Hành trình khám phá sự chuyển mình kinh tế của các quốc gia Trung Đông.',
          category: 'Ký Sự',
          duration: 60,
        },
        {
          title: 'Thời Sự Rạng Sáng: Điểm Nóng Địa Chính Trị Toàn Cầu',
          desc: 'Tổng hợp thông cáo báo chí từ các tổ chức đa phương Liên Hợp Quốc.',
          category: 'Tin Nhanh',
          duration: 45,
        },
        {
          title: 'Bản Tin Tài Chính Phố Wall: Phiên Đóng Cửa New York',
          desc: 'Chỉ số Dow Jones, Nasdaq và biến động các quỹ tương hỗ quốc tế.',
          category: 'Tài Chính',
          duration: 60,
        },
        {
          title: 'Khởi Động Ngày Mới: Điểm Tin Nông Sản & Năng Lượng',
          desc: 'Giá dầu thô, khí đốt và thị trường hàng hóa nông sản thế giới.',
          category: 'Thị Trường',
          duration: 90,
        }
      );
    } else if (window.key === 'MORNING') {
      out.push(
        {
          title: 'Chào Ngày Mới & Điểm Báo Toàn Cầu (Phát Sóng Trực Tiếp)',
          desc: 'Điểm tin trang nhất các nhật báo uy tín, dự báo thời tiết và nhịp đập kinh tế sáng.',
          category: 'Thời Sự Sáng',
          badge: 'TRỰC TIẾP',
          duration: 45,
        },
        {
          title: isBiz ? 'Bản Tin Thị Trường & Giá Vàng Mở Phiên: Tỷ Giá Ngoại Tệ' : 'Thời Sự Sáng: Điểm Nóng & Bình Luận Quốc Tế',
          desc: 'Cập nhật giá vàng, tỷ giá và phân tích diễn biến phiên mở cửa chứng khoán châu Á.',
          category: 'Tài Chính',
          badge: 'TIN SÁNG',
          duration: 35,
        },
        {
          title: 'Tọa Đàm Đổi Mới: Khởi Nghiệp Công Nghệ & Thương Mại Điện Tử',
          desc: 'Câu chuyện xây dựng doanh nghiệp đổi mới sáng tạo vươn ra biển lớn.',
          category: 'Kinh Doanh',
          duration: 50,
        },
        {
          title: 'Bản Tin Công Nghệ & Trí Tuệ Nhân Tạo Toàn Cầu',
          desc: 'Ứng dụng AI mới nhất trong quản trị chuỗi cung ứng và chăm sóc y tế.',
          category: 'Công Nghệ',
          duration: 50,
        },
        {
          title: 'Điểm Tin Tiêu Dùng Sáng: An Toàn Thực Phẩm & Tiêu Chuẩn Xanh',
          desc: 'Khuyến cáo của cơ quan quản lý về thực phẩm sạch và tiêu dùng bền vững.',
          category: 'Tiêu Dùng',
          duration: 30,
        }
      );
    } else if (window.key === 'MIDDAY') {
      out.push(
        {
          title: isBiz ? 'Tạp Chí Doanh Nhân: Chiến Lược Quản Trị Khủng Hoảng' : 'Tạp Chí Xã Hội: Nhịp Cầu Cuộc Sống Đô Thị',
          desc: 'Phản ánh những câu chuyện nhân văn và nhịp sống nghĩa tình nơi phố thị.',
          category: 'Tạp Chí',
          duration: 60,
        },
        {
          title: 'Toàn Cảnh Báo Chí Trưa: Nhận Định Bàn Tròn Chuyên Gia',
          desc: 'Góc nhìn đa chiều về các sự kiện thời sự trong nước nửa đầu ngày.',
          category: 'Bình Luận',
          duration: 60,
        },
        {
          title: 'Thời Sự Trưa 11H30: Toàn Cảnh Tin Tức Trong Nước & Quốc Tế',
          desc: 'Bản tin chính luận trực tiếp tổng kết diễn biến xã hội và kinh tế nửa đầu ngày.',
          category: 'Thời Sự Trưa',
          badge: 'TRỰC TIẾP',
          duration: 45,
        },
        {
          title: 'Tiêu Điểm Quốc Tế: Bàn Cờ Địa Chính Trị Đa Phương',
          desc: 'Phân tích các hiệp định thương mại tự do và sự chuyển dịch chuỗi cung ứng.',
          category: 'Phân Tích',
          duration: 45,
        },
        {
          title: 'Bản Tin Tài Chính Trưa: Diễn Biến Giữa Phiên Khớp Lệnh',
          desc: 'Dòng tiền cá mập, khớp lệnh liên tục và thanh khoản sàn giao dịch.',
          category: 'Tài Chính',
          duration: 30,
        }
      );
    } else if (window.key === 'AFTERNOON') {
      out.push(
        {
          title: 'Chính Sách & Cuộc Sống: Diễn Đàn Pháp Luật & Quyền Lợi Người Dân',
          desc: 'Giải đáp vướng mắc pháp lý và các quy định hành chính mới nhất.',
          category: 'Pháp Luật',
          duration: 60,
        },
        {
          title: 'Ký Sự Phóng Sự: Nhịp Cầu Y Khoa & Sức Khỏe Gia Đình',
          desc: 'Gặp gỡ các bác sĩ đầu ngành tư vấn phòng bệnh mùa dịch và chăm sóc sức khỏe.',
          category: 'Y Khoa',
          duration: 60,
        },
        {
          title: isBiz ? 'Bản Tin Thị Trường Chiều: Đóng Cửa Sàn Chứng Khoán VN-Index' : 'Toàn Cảnh Kinh Tế Chiều: Xuất Nhập Khẩu & Đầu Tư',
          desc: 'Phân tích thanh khoản, dòng tiền khối ngoại và các mã cổ phiếu nổi bật trong phiên.',
          category: 'Tài Chính',
          badge: 'TRỰC TIẾP',
          duration: 45,
        },
        {
          title: 'Diễn Đàn Người Tiêu Dùng: Tiêu Dùng Thông Minh & Chống Gian Lận',
          desc: 'Cảnh báo thủ đoạn lừa đảo trực tuyến và bảo vệ quyền lợi người mua sắm.',
          category: 'Đời Sống',
          duration: 60,
        },
        {
          title: 'Bản Tin Giao Thông & Đô Thị Thông Minh Chiều Tan Tầm',
          desc: 'Tình hình lưu thông các trục đường chính và dự báo giao thông thành phố.',
          category: 'Giao Thông',
          duration: 45,
        }
      );
    } else if (window.key === 'EARLY_EVENING') {
      out.push(
        {
          title: 'Bản Tin Kinh Tế 18H: Điểm Tin Nóng Trước Giờ Vàng',
          desc: 'Tổng hợp thị trường năng lượng, giá dầu thế giới và dự báo kinh tế tối nay.',
          category: 'Tin Nhanh',
          duration: 45,
        },
        {
          title: 'Điểm Tin Nóng 18H45: Sự Kiện Nổi Bật Trong Ngày',
          desc: 'Tóm lược nhanh 5 tin tức đáng chú ý nhất trước thềm bản tin thời sự quốc gia.',
          category: 'Tin Nhanh',
          duration: 15,
        },
        {
          title: 'Thời Sự 19H: Bản Tin Quốc Gia & Quốc Tế (Phát Sóng Trực Tiếp)',
          desc: 'Bản tin chính luận quan trọng nhất trong ngày, phát sóng trực tiếp trên toàn hệ thống.',
          category: 'Thời Sự 19H',
          badge: 'TRỰC TIẾP',
          quality: '1080p60',
          duration: 45,
        },
        {
          title: 'Dự Báo Thời Tiết & Điểm Tin Kinh Tế Nóng Sau 19H',
          desc: 'Cập nhật bản đồ khí tượng thủy văn toàn quốc và cảnh báo thiên tai.',
          category: 'Thời Tiết',
          duration: 15,
        }
      );
    } else if (window.key === 'PRIME_TIME') {
      out.push(
        {
          title: 'Bàn Tròn Kinh Tế Toàn Cầu: Kịch Bản Tăng Trưởng & Đối Thoại Chính Sách',
          desc: 'Diễn đàn đối thoại chuyên sâu giữa các chuyên gia kinh tế vĩ mô và lãnh đạo doanh nghiệp.',
          category: 'Chính Luận',
          badge: 'ĐỐI THOẠI',
          quality: '1080p60',
          duration: 90,
        },
        {
          title: 'Toàn Cảnh Tiêu Điểm: Góc Nhìn Chuyên Gia Về Xu Hướng Đầu Tư 2026',
          desc: 'Phân tích cơ hội đầu tư hạ tầng số, năng lượng tái tạo và bất động sản công nghiệp.',
          category: 'Tiêu Điểm',
          duration: 60,
        }
      );
    } else {
      // LATE_NIGHT
      out.push(
        {
          title: 'Bản Tin Đêm: Toàn Cảnh Thế Giới 23H (Phát Sóng Trực Tiếp)',
          desc: 'Tổng kết sự kiện nổi bật trong ngày và cập nhật tin vắn châu Âu, châu Mỹ.',
          category: 'Thời Sự Đêm',
          badge: 'TRỰC TIẾP',
          duration: 40,
        },
        {
          title: 'Ký Sự Đêm: Những Góc Nhìn Cuộc Sống Về Đêm Nơi Đô Thị',
          desc: 'Phóng sự mộc mạc về những người lao động thầm lặng cống hiến khi thành phố lên đèn.',
          category: 'Phóng Sự',
          duration: 50,
        }
      );
    }
    return out;
  }

  // ============================================================
  // 4. KIDS CHANNELS (Omni Kids)
  // Khung giờ sinh hoạt của trẻ (Thể dục sáng, Hoạt hình trưa, Giờ vàng bé, Ru ngủ)
  // ============================================================
  if (category === 'kids') {
    const epNum = dayCycle * 3 + 1;
    if (window.key === 'OVERNIGHT') {
      out.push(
        {
          title: 'Kể Chuyện Cổ Tích Ru Ngủ: Giấc Mơ Bay Vào Không Gian Cùng Bé',
          desc: 'Giọng đọc ấm áp truyền cảm đưa bé vào giấc ngủ ngon và những giấc mơ ngọt ngào.',
          category: 'Ru Ngủ Bé',
          duration: 60,
        },
        {
          title: 'Âm Nhạc Ru Ngủ: Giai Điệu Hộp Nhạc Êm Đềm Ru Bé Say Giấc',
          desc: 'Những nốt nhạc du dương nhẹ nhàng xoa dịu tâm trí trẻ thơ.',
          category: 'Nhạc Ru Ngủ',
          duration: 90,
        },
        {
          title: 'Thế Giới Giấc Mơ Của Bé: Chuyến Bay Trên Đám Mây Kẹo Ngọt',
          desc: 'Chuyến phiêu lưu thần tiên trong thế giới tưởng tượng của các bạn nhỏ.',
          category: 'Cổ Tích',
          duration: 90,
        },
        {
          title: 'Bình Minh Bé Yêu: Khúc Ca Đón Chào Ngày Mới Tươi Vui',
          desc: 'Những bài hát đánh thức buổi sớm nhẹ nhàng, vui tươi.',
          category: 'Âm Nhạc',
          duration: 120,
        }
      );
    } else if (window.key === 'MORNING') {
      out.push(
        {
          title: 'Khởi Động Sáng: Bài Thể Dục Vui Nhộn Cùng Bé Yêu Khỏe Khoắn',
          desc: 'Động tác vận động nhẹ nhàng giúp bé tràn đầy năng lượng khởi đầu ngày mới.',
          category: 'Vận Động',
          duration: 25,
        },
        {
          title: `Gia Đình Siêu Nhân: Giải Cứu Thành Phố Đồ Chơi (Tập ${epNum})`,
          desc: 'Tình bạn và lòng dũng cảm giúp các bạn nhỏ vượt qua thử thách bảo vệ thị trấn.',
          category: 'Hoạt Hình',
          badge: 'HOẠT HÌNH',
          duration: 35,
        },
        {
          title: 'Lớp Học Vui Nhộn: Khám Phá Khoa Học Sắc Màu & Thí Nghiệm Vui',
          desc: 'Thí nghiệm bong bóng và màu sắc kích thích trí tưởng tượng sáng tạo của bé.',
          category: 'Giáo Dục',
          duration: 45,
        },
        {
          title: 'Thế Giới Muông Thú 3D: Chuyến Thám Hiểm Rừng Xanh Diệu Kỳ',
          desc: 'Làm quen với các loài động vật hoang dã hiền lành và hệ sinh thái thiên nhiên.',
          category: 'Thiên Nhiên',
          duration: 60,
        },
        {
          title: 'Âm Nhạc Tuổi Thơ: Bài Hát Tiếng Anh Vui Nhộn Dành Cho Thiếu Nhi',
          desc: 'Bé vừa học hát vừa làm quen với từ vựng tiếng Anh qua hình ảnh sinh động.',
          category: 'Âm Nhạc',
          duration: 45,
        }
      );
    } else if (window.key === 'MIDDAY') {
      out.push(
        {
          title: `Gia Đình Siêu Nhân: Bí Mật Đảo Khủng Long (Tập ${epNum + 1})`,
          desc: 'Chuyến thám hiểm kỳ bí và gặp gỡ những người bạn khủng long ăn cỏ hiền lành.',
          category: 'Hoạt Hình',
          duration: 45,
        },
        {
          title: 'Khu Vườn Cổ Tích: Cậu Bé Thông Minh & Con Rùa Vàng Kỳ Diệu',
          desc: 'Truyện ngụ ngôn giàu tính giáo dục rèn luyện tính trung thực và lòng nhân ái.',
          category: 'Cổ Tích',
          duration: 45,
        },
        {
          title: 'Giờ Hoạt Hình Trưa Của Bé: Cuộc Phiêu Lưu Dưới Đáy Biển Sâu',
          desc: 'Chuyến hải trình kỳ thú của chú cá heo dũng cảm khám phá cung điện san hô lung linh.',
          category: 'Thiếu Nhi',
          duration: 45,
        },
        {
          title: 'Bé Học Vẽ Tranh: Sáng Tạo Thế Giới Động Vật Cùng Bút Chì Màu',
          desc: 'Hướng dẫn vẽ các con vật cưng gần gũi đơn giản và ngộ nghĩnh.',
          category: 'Mỹ Thuật',
          duration: 45,
        },
        {
          title: 'Ca Nhạc Thiếu Nhi Nghỉ Trưa: Giai Điệu Dịu Êm Cho Bé Yêu',
          desc: 'Những bài hát thiếu nhi êm đềm giúp bé thư thái trong giấc ngủ trưa.',
          category: 'Âm Nhạc',
          duration: 60,
        }
      );
    } else if (window.key === 'AFTERNOON') {
      out.push(
        {
          title: 'Thế Giới Hoạt Hình: Phiêu Lưu Cùng Biệt Đội Thám Tử Nhí 3D',
          desc: 'Hành trình giải mã những câu đố thông minh rèn luyện tư duy logic cho trẻ thơ.',
          category: 'Hoạt Hình 3D',
          duration: 60,
        },
        {
          title: 'Bé Học Kỹ Năng Sống: Tự Lập, Lễ Phép & Giúp Đỡ Mẹ Việc Nhà',
          desc: 'Bài học thực hành dễ thương giúp bé rèn luyện tính tự giác mỗi ngày.',
          category: 'Kỹ Năng Sống',
          duration: 60,
        },
        {
          title: 'Âm Nhạc Tuổi Thơ: Bé Tập Múa & Nhảy Đồng Diễn Cùng Chú Thỏ Trắng',
          desc: 'Vũ điệu đáng yêu sôi động giúp bé vận động dẻo dai sau giờ học tập.',
          category: 'Múa Hát',
          duration: 60,
        },
        {
          title: `Gia Đình Siêu Nhân: Giải Cứu Ngôi Làng Bánh Ngọt (Tập ${epNum + 2})`,
          desc: 'Các siêu nhân nhí phối hợp vượt qua thử thách của phù thủy ngọt ngào.',
          category: 'Hoạt Hình',
          duration: 45,
        },
        {
          title: 'Bé Yêu Thiên Nhiên: Khám Phá Thế Giới Côn Trùng Nhỏ Bé',
          desc: 'Những sự thật thú vị về loài ong cần cù và chú kiến chăm chỉ.',
          category: 'Khám Phá',
          duration: 45,
        }
      );
    } else if (window.key === 'EARLY_EVENING') {
      out.push(
        {
          title: 'Giờ Hoạt Hình Vàng: Phim Hoạt Hình Chiếu Rạp Vương Quốc Muông Thú 3D',
          desc: 'Tác phẩm hoạt hình 3D rực rỡ sắc màu về tình đoàn kết của muôn loài.',
          category: 'Phim 3D',
          badge: 'CHIẾU RẠP',
          quality: '4K UHD',
          duration: 75,
        },
        {
          title: 'Kể Chuyện Cổ Tích Đầu Tối: Sự Tích Cây Vú Sữa & Tình Mẫu Tử',
          desc: 'Bài học cảm động về tình mẹ con thiêng liêng và lòng biết ơn công lao cha mẹ.',
          category: 'Cổ Tích',
          duration: 45,
        }
      );
    } else if (window.key === 'PRIME_TIME') {
      out.push(
        {
          title: 'Rạp Phim Gia Đình: Chuyến Du Hành Của Chú Gấu Bắc Cực (Bản 4K)',
          desc: 'Siêu phẩm hoạt hình đoạt giải quốc tế mang thông điệp yêu thương bảo vệ thiên nhiên.',
          category: 'Chiếu Rạp 4K',
          badge: 'RẠP PHIM BÉ',
          quality: '4K UHD',
          duration: 105,
        },
        {
          title: 'Gia Đình Siêu Nhân: Đại Chiến Cỗ Máy Thời Gian (Tập Đặc Biệt)',
          desc: 'Tập phim hoạt hình đặc biệt với kỹ xảo hoành tráng và bài học tình bạn cao quý.',
          category: 'Hoạt Hình',
          duration: 45,
        }
      );
    } else {
      // LATE_NIGHT
      out.push(
        {
          title: 'Bé Chuẩn Bị Đi Ngủ: Bài Học Gấp Gọn Đồ Chơi & Đánh Răng Sạch Sẽ',
          desc: 'Hình thành thói quen tốt trước giờ đi ngủ cho bé một cách tự nhiên, vui vẻ.',
          category: 'Kỹ Năng',
          duration: 30,
        },
        {
          title: 'Kể Chuyện Đêm Khuya: Ngôi Sao Nhỏ Tìm Mẹ Trên Bầu Trời Xanh',
          desc: 'Truyện cổ tích nhẹ nhàng đưa các bé vào giấc ngủ ngon và giấc mơ an lành.',
          category: 'Ru Ngủ Bé',
          duration: 60,
        }
      );
    }
    return out;
  }

  // ============================================================
  // 5. ESPORTS & GAMING (Omni Esports, Omni Indie Games)
  // ============================================================
  if (category === 'esports') {
    const isIndie = channelSlug === 'indie-games';
    const teams = [
      ['T1', 'Gen.G', 'Đại Chiến Viễn Thông Chung Kết Thế Giới LOL 4K'],
      ['GAM Esports', 'Team Flash', 'Siêu Kinh Điển VCS Mùa Hè Đỉnh Cao'],
      ['FaZe Clan', 'Natus Vincere', 'Chung Kết CS2 Major Trên Bản Đồ Mirage'],
      ['Sentinels', 'Fnatic', 'Valorant Champions Tour Vòng Tranh Vé'],
      ['Team Secret', 'Vikings Esports', 'Bán Kết VCS Đấu Trường Danh Vọng'],
    ];
    const match = teams[dayCycle % teams.length];

    if (window.key === 'PRIME_TIME') {
      out.push({
        title: isIndie ? 'Indie Game Awards: Tuyển Tập Game Độc Lập Xuất Sắc Của Năm' : `${match[2]}: ${match[0]} vs ${match[1]} (Bo5 4K)`,
        desc: 'Màn so tài đỉnh cao của các tuyển thủ hàng đầu thế giới với camera riêng Pro View và thống kê sát thương.',
        category: isIndie ? 'Indie Awards' : 'Chung Kết 4K',
        badge: 'CHUNG KẾT 4K',
        quality: '4K 60FPS',
        audio: 'Dolby Atmos',
        features: ['Pro View Cam', 'Live Damage Stats'],
        duration: 150,
      });
    } else if (window.key === 'AFTERNOON') {
      out.push(
        {
          title: 'Trực Tiếp VCS Mùa Hè: Vòng Bảng Trận 1 (Bo3 Căng Thẳng)',
          desc: 'Các đội tuyển thể thao điện tử hàng đầu tranh vé tham dự giải vô địch thế giới.',
          category: 'VCS LMHT',
          badge: 'TRỰC TIẾP',
          duration: 135,
        },
        {
          title: 'Trực Tiếp VCS Mùa Hè: Vòng Bảng Trận 2 (Bo3 Kịch Tính)',
          desc: 'Chiến thuật phối hợp giao tranh tổng nghẹt thở quanh hang rồng ngàn tuổi.',
          category: 'VCS LMHT',
          badge: 'TRỰC TIẾP',
          duration: 105,
        },
        {
          title: 'Top 10 Pha Xử Lý Highlight Outplay Xuất Thần Tuần Này',
          desc: 'Những pha xử lý kỹ năng 1 cân 4 ngoạn mục làm nổ tung khán đài giải đấu.',
          category: 'Highlight',
          badge: 'TOP 10',
          duration: 30,
        }
      );
    } else if (window.key === 'OVERNIGHT') {
      out.push(
        {
          title: 'Đêm Đấu Trường Game: Replay Chung Kết Thế Giới LOL 4K',
          desc: 'Chiêm ngưỡng lại những pha wombo-combo huyền thoại định đoạt cúp vô địch thế giới.',
          category: 'Esports 4K',
          badge: 'WORLDS 4K',
          quality: '4K 60FPS',
          duration: 160,
        },
        {
          title: 'Livestream Giao Hữu Tuyển Thủ: Đấu Trường Chân Lý & Custom Game',
          desc: 'Giao lưu thi đấu cờ nhân phẩm ĐTCL cùng cộng đồng người hâm mộ.',
          category: 'Livestream',
          duration: 110,
        },
        {
          title: 'Phân Tích Chiến Thuật & Cấm Chọn Ban/Pick Cùng Chuyên Gia',
          desc: 'Bình luận viên mổ xẻ meta bản đồ và xu hướng cấm chọn tại các giải đấu quốc tế.',
          category: 'Phân Tích',
          duration: 90,
        }
      );
    } else {
      out.push(
        {
          title: 'Điểm Tin Esports Sáng: Thị Trường Chuyển Nhượng Tuyển Thủ',
          desc: 'Tin tức hợp đồng bom tấn và sự chuẩn bị của các đội tuyển trước mùa giải.',
          category: 'Tin Game',
          duration: Math.floor((window.endMinute - window.startMinute) / 2),
        },
        {
          title: 'Họp Báo Tuyển Thủ & Phỏng Vấn Sau Trận Đấu Nảy Lửa',
          desc: 'Phỏng vấn nóng MVP trận đấu cùng ban huấn luyện chiến thuật.',
          category: 'Phỏng Vấn',
          duration: Math.ceil((window.endMinute - window.startMinute) / 2),
        }
      );
    }
    return out;
  }

  // ============================================================
  // 6. DISCOVERY, TECH, FOOD, HEALTH CHANNELS
  // ============================================================
  if (category === 'discovery') {
    const docs = [
      { title: 'Hành Tinh Trái Đất: Kỷ Nguyên Đại Dương Xanh Thẳm (BBC 4K)', desc: 'Thám hiểm rãnh nứt Mariana và những sinh vật kỳ bí phát sáng dưới đáy biển.', badge: '4K BBC', cat: 'Khám Phá 4K' },
      { title: 'Kỷ Nguyên Trí Tuệ Nhân Tạo & Siêu Máy Tính Lượng Tử', desc: 'Trí tuệ nhân tạo đang thay đổi chẩn đoán y học và xe tự hành ra sao.', badge: 'CÔNG NGHỆ', cat: 'Công Nghệ AI' },
      { title: 'Ẩm Thực 3 Miền: Hương Vị Tinh Hoa Đầu Bếp 5 Sao', desc: 'Hành trình nếm thử những món ăn đặc sản từ vùng núi Tây Bắc tới miền Tây Nam Bộ.', badge: 'ẨM THỰC', cat: 'Ẩm Thực' },
      { title: 'Bí Mật Kim Tự Tháp Cổ Ai Cập: Giải Mã Lăng Mộ Ngàn Năm', desc: 'Giải mã những câu đố ngàn năm dưới chân đại Kim Tự Tháp Giza.', badge: 'LỊCH SỬ', cat: 'Lịch Sử' },
      { title: 'Vũ Trụ Vô Tận: Kính Viễn Vọng James Webb & Lỗ Đen Không Gian', desc: 'Những bức ảnh vũ trụ xa xôi giải mã nguồn gốc sơ khai của dải ngân hà.', badge: 'VŨ TRỤ 4K', cat: 'Khoa Học' },
    ];
    const doc = docs[dayCycle % docs.length];

    if (window.key === 'PRIME_TIME') {
      out.push({
        title: doc.title,
        desc: doc.desc,
        category: doc.cat,
        badge: doc.badge,
        quality: '4K UHD',
        audio: 'Dolby Atmos',
        duration: 150,
      });
    } else if (window.key === 'OVERNIGHT') {
      out.push(
        { title: 'Bí Ẩn Dưới Lòng Đại Dương: Thế Giới Sinh Vật Phát Sáng', desc: 'Thám hiểm đáy vực Mariana sâu thẳm cùng tàu ngầm nghiên cứu quốc tế.', category: 'Khám Phá', duration: 120 },
        { title: 'Thiên Nhiên Kỳ Thú: Vòng Đời Của Muôn Loài Hoang Dã Châu Phi', desc: 'Thước phim tư liệu sinh động về cuộc di cư vĩ đại trên thảo nguyên Serengeti.', category: 'Động Vật', duration: 120 },
        { title: 'Kỳ Quan Kiến Trúc Thế Giới: Những Công Trình Thế Kỷ', desc: 'Khám phá sự kỳ vĩ của Vạn Lý Trường Thành, Đền Taj Mahal và Đấu Trường La Mã.', category: 'Kiến Trúc', duration: 120 }
      );
    } else if (window.key === 'MORNING') {
      out.push(
        { title: 'Khởi Động Sáng: Khám Phá Thế Giới Tự Nhiên Diệu Kỳ', desc: 'Hình ảnh tuyệt đẹp về cuộc sống hoang dã lúc bình minh trên thảo nguyên xanh.', category: 'Tự Nhiên', duration: 60 },
        { title: 'Hồ Sơ Y Khoa: Bí Quyết Trường Thọ Của Con Người Vùng Blue Zones', desc: 'Nghiên cứu chế độ ăn uống khoa học và lối sống cân bằng giúp kéo dài tuổi thọ.', category: 'Sức Khỏe', duration: 75 },
        { title: 'Hành Trình Vòng Quanh Trái Đất: Vẻ Đẹp Kỳ Vĩ Của Thiên Nhiên', desc: 'Chuyến thám hiểm những kỳ quan thiên nhiên độc nhất vô nhị trên hành tinh.', category: 'Du Lịch', duration: 75 }
      );
    } else if (window.key === 'MIDDAY') {
      out.push(
        { title: 'Bí Quyết Ẩm Thực: Món Ngon Truyền Thống Ba Miền', desc: 'Đầu bếp tài hoa chia sẻ bí quyết chế biến món ăn đậm đà hương vị quê hương.', category: 'Ẩm Thực', duration: 60 },
        { title: 'Thời Sự Trưa 11H30: Nhịp Sống Khám Phá & Đổi Mới Sáng Tạo', desc: 'Cập nhật tin tức khoa học và sáng chế công nghệ nổi bật trong ngày.', category: 'Thời Sự', duration: 60 },
        { title: 'Khoa Học & Đời Sống: Năng Lượng Tái Tạo & Tương Lai Bền Vững', desc: 'Tiềm năng phát triển điện gió ngoài khơi và công nghệ pin quang điện thế hệ mới.', category: 'Khoa Học', duration: 60 },
        { title: 'Ký Sự Vùng Cao: Cuộc Sống Bình Yên Nơi Bản Làng Mây Phủ', desc: 'Nét văn hóa độc đáo của đồng bào các dân tộc thiểu số vùng Tây Bắc.', category: 'Ký Sự', duration: 60 }
      );
    } else if (window.key === 'AFTERNOON') {
      out.push(
        { title: 'Kỳ Quan Rừng Nhiệt Đới Amazon: Thảm Thực Vật Đa Dạng (4K)', desc: 'Hành trình thám hiểm bảo vệ lá phổi xanh của hành tinh chúng ta.', category: 'Môi Trường', duration: 90 },
        { title: 'Bí Mật Ai Cập Cổ Đại: Giải Mã Những Lời Nguyền Pharaon', desc: 'Nhà khảo cổ học khai quật các di vật quý giá trong thung lũng các vị vua.', category: 'Lịch Sử', duration: 90 },
        { title: 'Công Nghệ Tương Lai: Siêu Trí Tuệ Nhân Tạo & Y Học Số', desc: 'Trí tuệ nhân tạo đang hỗ trợ chẩn đoán ung thư sớm như thế nào.', category: 'Công Nghệ', duration: 90 }
      );
    } else if (window.key === 'EARLY_EVENING') {
      out.push(
        { title: 'Tiêu Điểm Khám Phá 18H: Những Hiện Tượng Tự Nhiên Kỳ Lạ', desc: 'Giải thích hiện tượng cực quang, hố tử thần và sấm sét núi lửa.', category: 'Khoa Học', duration: 60 },
        { title: 'Thời Sự 19H: Bản Tin Quốc Gia & Quốc Tế (Trực Tiếp)', desc: 'Bản tin chính luận thời sự quan trọng nhất trong ngày.', category: 'Thời Sự 19H', badge: 'TRỰC TIẾP', duration: 45 },
        { title: 'Dự Báo Khí Tượng Thủy Văn Toàn Quốc', desc: 'Bản tin dự báo xu thế thời tiết và cảnh báo khí hậu.', category: 'Thời Tiết', duration: 15 }
      );
    } else {
      // LATE_NIGHT
      out.push(
        { title: 'Bản Tin Đêm: Toàn Cảnh Khoa Học & Môi Trường Thế Giới 23H', desc: 'Tổng kết những đột phá khoa học và phát hiện thiên văn học trong ngày.', category: 'Khoa Học Đêm', badge: 'TIN ĐÊM', duration: 40 },
        { title: 'Acoustic Chillout: Âm Nhạc Rừng Xanh Thư Giãn Đêm Muộn', desc: 'Âm thanh tự nhiên kết hợp cùng tiếng suối róc rách đưa tâm hồn vào giấc ngủ an lành.', category: 'Chillout', duration: 50 }
      );
    }
    return out;
  }

  // ============================================================
  // 7. ENTERTAINMENT, SHOW, MUSIC, PODCAST
  // ============================================================
  const shows = [
    { title: 'Ca Sĩ Mặt Nạ: Vòng Bán Kết Bùng Nổ Vocal Khủng & Lộ Diện Gây Sốc', desc: 'Những màn trình diễn thăng hoa chạm tới trái tim và khoảnh khắc cởi mặt nạ xúc động.', badge: 'MEGA SHOW 4K', cat: 'Show Thực Tế' },
    { title: 'Live Concert Đỉnh Cao: Tour Diễn Âm Nhạc 4K Sân Khấu Laser Hoành Tráng', desc: 'Đại nhạc hội quy mô 50.000 khán giả với hiệu ứng âm thanh vòm sống động như tại khán đài.', badge: 'CONCERT 4K', cat: 'Live Concert' },
    { title: 'Gương Mặt Thân Quen: Màn Hóa Thân Xuất Thần Thành Tượng Đài Âm Nhạc', desc: 'Tái hiện các giọng ca huyền thoại với phong thái và thần thái đỉnh cao.', badge: 'HIT SHOW', cat: 'Truyền Hình' },
    { title: 'Hài Kịch Cuối Tuần: Nụ Cười Xuyên Màn Đêm Cùng Danh Hài', desc: 'Tiểu phẩm hài duyên dáng mang lại những tràng cười sảng khoái cho cả gia đình.', badge: 'HÀI KỊCH', cat: 'Hài Kịch' },
  ];
  const s = shows[dayCycle % shows.length];

  if (window.key === 'PRIME_TIME') {
    out.push({
      title: s.title,
      desc: s.desc,
      category: s.cat,
      badge: s.badge,
      quality: '4K UHD',
      audio: 'Dolby Atmos',
      features: ['Dolby Atmos', 'Live Vote'],
      duration: 150,
    });
  } else if (window.key === 'OVERNIGHT') {
    out.push(
      { title: 'Acoustic Chillout Đêm Muộn: Giai Điệu Piano & Cello Thư Giãn', desc: 'Không gian âm nhạc mộc mạc lắng đọng tâm hồn xua tan căng thẳng mệt mỏi.', category: 'Acoustic', duration: 120 },
      { title: 'Sách Nói & Kịch Truyền Thanh: Tác Phẩm Văn Học Bất Hủ Đêm Khuya', desc: 'Diễn đọc truyền cảm những áng văn kinh điển lay động lòng người.', category: 'Sách Nói', duration: 120 },
      { title: 'Live Concert Replay: Những Bản Tình Ca Mùa Thu Đi Cùng Năm Tháng', desc: 'Giai điệu hoài niệm cùng các danh ca nổi tiếng của nền tân nhạc Việt Nam.', category: 'Live Music', duration: 120 }
    );
  } else if (window.key === 'MORNING') {
    out.push(
      { title: 'Cà Phê Sáng: Giai Điệu Acoustic Thư Giãn Khởi Đầu Ngày Mới', desc: 'Những bản guitar mộc mạc mang lại sự an nhiên thư thái đầu ngày.', category: 'Acoustic Sáng', duration: 60 },
      { title: 'Omni Morning Top Hits: Bảng Xếp Hạng Bài Hát Sáng Thịnh Hành', desc: 'Nạp đầy hứng khởi cùng top ca khúc pop sôi động đứng đầu xu hướng tuần này.', category: 'Bảng Xếp Hạng', duration: 75 },
      { title: 'Talkshow Podcast: Góc Khuất Sau Ánh Hào Quang Của Người Nổi Tiếng', desc: 'Lắng nghe những tâm sự chân thành và bài học đời của các nghệ sĩ gạo cội.', category: 'Talkshow', duration: 75 }
    );
  } else if (window.key === 'MIDDAY') {
    out.push(
      { title: 'Game Show Trưa: Đố Vui Vui Nhộn & Tiếng Cười Sảng Khoái', desc: 'Những câu đố dí dỏm cùng các nghệ sĩ mang lại giây phút thư giãn cho bữa trưa gia đình.', category: 'Game Show', duration: 60 },
      { title: 'Thời Sự Trưa 11H30: Điểm Tin Văn Hóa Nghệ Thuật & Giải Trí', desc: 'Toàn cảnh các sự kiện âm nhạc, triển lãm hội họa và lễ hội văn hóa trong ngày.', category: 'Văn Hóa Trưa', duration: 60 },
      { title: 'Nhịp Sống Đô Thị: Không Gian Sống Xanh & Thiết Kế Đương Đại', desc: 'Xu hướng kiến trúc nhà phố xanh và phong cách bài trí nội thất tối giản hiện đại.', category: 'Kiến Trúc', duration: 60 },
      { title: 'Âm Nhạc Quốc Tế: Tuyển Tập Ca Khúc Billboard Hot 100', desc: 'Chiêm ngưỡng MV ca nhạc đình đám của các ngôi sao âm nhạc thế giới.', category: 'Âm Nhạc', duration: 60 }
    );
  } else if (window.key === 'AFTERNOON') {
    out.push(
      { title: 'Game Show Thực Tế: Thử Thách Cực Hạn - Chặng Đua Sinh Tồn', desc: 'Các thí sinh vượt chướng ngại vật mạo hiểm tại vùng biển hoang sơ Nam Trung Bộ.', category: 'Thực Tế', badge: 'GAME SHOW', duration: 90 },
      { title: 'Sàn Diễn Thời Trang Quốc Tế: Paris Fashion Week Haute Couture', desc: 'Bộ sưu tập thời trang cao cấp của những nhà thiết kế lừng danh thế giới.', category: 'Thời Trang', duration: 90 },
      { title: 'Omni Top Hits: 10 Ca Khúc V-Pop & K-Pop Hot Nhất Tuần Này', desc: 'Cập nhật những bản hit triệu view đang làm mưa làm gió trên các nền tảng mạng xã hội.', category: 'Top Hits', duration: 90 }
    );
  } else if (window.key === 'EARLY_EVENING') {
    out.push(
      { title: 'Gương Mặt Thân Quen: Hậu Trường Hóa Thân Thành Thần Tượng', desc: 'Những khoảnh khắc luyện tập miệt mài và thử thách giọng hát của các nghệ sĩ tham gia.', category: 'Showbiz', duration: 60 },
      { title: 'Thời Sự 19H: Bản Tin Quốc Gia & Quốc Tế (Phát Sóng Trực Tiếp)', desc: 'Bản tin chính luận thời sự quan trọng cập nhật sự kiện thời sự, kinh tế và quốc tế.', category: 'Thời Sự 19H', badge: 'TRỰC TIẾP', duration: 45 },
      { title: 'Dự Báo Thời Tiết & Điểm Tin Văn Hóa Buổi Tối', desc: 'Cập nhật bản đồ thời tiết khí tượng thủy văn toàn quốc.', category: 'Thời Tiết', duration: 15 }
    );
  } else {
    // LATE_NIGHT
    out.push(
      { title: 'Bản Tin Đêm: Toàn Cảnh Sự Kiện Giải Trí Thế Giới 23H', desc: 'Cập nhật tin tức nhanh đêm muộn và các lễ hội âm nhạc quốc tế.', category: 'Tin Đêm', badge: 'TIN ĐÊM', duration: 40 },
      { title: 'Acoustic Chillout: Giai Điệu Piano & Cello Thư Giãn Đêm Muộn', desc: 'Âm thanh êm dịu dẫn dắt tâm hồn vào giấc ngủ bình yên trọn vẹn.', category: 'Chillout', duration: 50 }
    );
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD 25-CHANNEL DYNAMIC, DIVERSE SCHEDULE (KHÔNG CỐ ĐỊNH, KHÔNG HARDCODE)
// Mỗi kênh sở hữu lịch trình với số lượng khung giờ và nội dung hoàn toàn khác biệt
// ─────────────────────────────────────────────────────────────────────────────
export function buildFallbackChannels(
  dayOffset: number = 0,
  channelMetaMap: Map<string, any> = new Map()
): RealEpgChannel[] {
  return ALL_25_CHANNELS_META.map((meta, chIdx) => {
    const override = channelMetaMap.get(meta.id) || channelMetaMap.get(meta.slug);
    const slug = override?.slug || meta.slug;
    const name = override?.name || meta.name;
    const logo = override?.logoUrl || meta.logo;
    const cat = meta.category;

    const allChannelPrograms: RealEpgProgram[] = [];
    const usedTitles = new Set<string>();

    // Generate programs across the 7 Daypart Windows for the 24-hour day (00:00 - 24:00)
    for (const win of DAYPART_WINDOWS) {
      const specs = generateWindowPrograms(slug, cat, name, win, dayOffset);
      let winMinute = win.startMinute;

      for (let sIdx = 0; sIdx < specs.length; sIdx++) {
        const spec = specs[sIdx];
        const isLastInWindow = (sIdx === specs.length - 1);

        // Calculate natural duration, ensuring exact window boundary fit
        let dur = spec.duration;
        if (isLastInWindow) {
          dur = win.endMinute - winMinute;
        } else if (winMinute + dur > win.endMinute) {
          dur = win.endMinute - winMinute;
        }

        if (dur <= 0) continue;

        const startH = Math.floor(winMinute / 60);
        const startM = winMinute % 60;
        const startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

        const endMinute = winMinute + dur;
        const endH = Math.floor(endMinute / 60);
        const endM = endMinute % 60;
        const endTime = endMinute >= 1440 ? '24:00' : `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        // Ensure title uniqueness within the day
        let finalTitle = spec.title;
        if (usedTitles.has(finalTitle)) {
          finalTitle = `${finalTitle} (Kỳ ${sIdx + 1})`;
        }
        usedTitles.add(finalTitle);

        const progId = `epg-${slug}-d${dayOffset}-m${winMinute}`;

        allChannelPrograms.push({
          id: progId,
          title: finalTitle,
          subtitle: `${name} • Khung giờ ${startTime}`,
          category: spec.category || meta.label.split(' ')[0] || 'Chương Trình',
          startTime,
          endTime,
          startMinutes: winMinute,
          durationMinutes: dur,
          badge: spec.badge,
          quality: spec.quality || (dur >= 90 ? '4K UHD' : '1080p60'),
          audio: spec.audio || (dur >= 90 ? 'Dolby Atmos' : 'Dolby 5.1'),
          description: spec.desc,
          thumbnailUrl: getCategoryThumbnail(cat, winMinute + dayOffset * 23 + chIdx * 7),
          features: spec.features,
          channelId: meta.id,
          channelSlug: slug,
          channelName: name,
          sourceRecordingId: null,
        });

        winMinute = endMinute;
      }
    }

    return {
      id: meta.id,
      slug,
      chNumber: `CH #${meta.num}`,
      name,
      category: cat,
      categoryLabel: meta.label,
      logo,
      color: meta.color,
      programs: allChannelPrograms,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP REAL BACKEND API EPG RESPONSE TO FRONTEND 24H GRID FORMAT
// Giữ nguyên các LiveEvent thực tế và chuẩn hóa khung giờ phát sóng
// ─────────────────────────────────────────────────────────────────────────────
export function mapApiEpgToRealChannels(
  epgResponse: EpgDayResponse,
  rawChannels: any[] = []
): RealEpgChannel[] {
  const channelMetaMap = new Map<string, any>();
  rawChannels.forEach((ch: any) => {
    if (ch.id) channelMetaMap.set(ch.id, ch);
    if (ch.slug) channelMetaMap.set(ch.slug, ch);
  });

  return epgResponse.channels.map((ch, idx) => {
    const meta = channelMetaMap.get(ch.channelId) || (ch.channelSlug ? channelMetaMap.get(ch.channelSlug) : null);
    const slug = ch.channelSlug || meta?.slug || ch.channelName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const catKey = (meta?.category || ch.channelCategory || 'ENTERTAINMENT').toUpperCase();
    const category = mapCategory(catKey);
    const categoryLabel = CATEGORY_LABELS[catKey] || ch.channelCategory || 'Tổng Hợp';

    const programs: RealEpgProgram[] = ch.programs.map((p, pIdx) => {
      const start = new Date(p.startTime);
      const end = new Date(p.endTime);
      const startHours = isNaN(start.getTime()) ? 0 : start.getHours();
      const startMins = isNaN(start.getTime()) ? 0 : start.getMinutes();
      const startMinutes = startHours * 60 + startMins;

      const endHours = isNaN(end.getTime()) ? 0 : end.getHours();
      const endMins = isNaN(end.getTime()) ? 0 : end.getMinutes();

      const durationMinutes = p.durationMinutes > 0
        ? p.durationMinutes
        : !isNaN(start.getTime()) && !isNaN(end.getTime())
        ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))
        : 30;

      const startTimeStr = `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`;
      const endTimeStr = (endHours === 0 && endMins === 0 && startMinutes > 0)
        ? '24:00'
        : `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      // Enhance badge for real live events or special features
      const isLiveNow = p.status === 'LIVE';
      const badge = isLiveNow
        ? 'TRỰC TIẾP'
        : p.isFiller
        ? undefined
        : 'ĐẶC SẮC 4K';

      return {
        id: p.id || `epg-${ch.channelId}-${pIdx}`,
        title: p.title,
        subtitle: `${ch.channelName} • Khung giờ ${startTimeStr}`,
        category: p.category || categoryLabel,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startMinutes,
        durationMinutes,
        quality: isLiveNow ? '4K 60FPS HEVC' : '1080p60',
        audio: isLiveNow ? 'Dolby Atmos 5.1' : 'Dolby 5.1',
        badge,
        description: p.tags?.length ? p.tags.join(' • ') : `${p.title} phát sóng trên ${ch.channelName}`,
        thumbnailUrl: p.thumbnailUrl || getCategoryThumbnail(catKey, idx + pIdx),
        channelId: ch.channelId,
        channelSlug: slug,
        channelName: ch.channelName,
        sourceRecordingId: p.sourceRecordingId,
      };
    });

    return {
      id: ch.channelId,
      slug,
      chNumber: `CH #${String(idx + 1).padStart(3, '0')}`,
      name: ch.channelName,
      category,
      categoryLabel,
      logo: ch.channelLogoUrl || meta?.logoUrl || `/Channel_Logos/${slug}-icon.svg`,
      color: getChannelColor(catKey, idx),
      programs,
    };
  });
}
