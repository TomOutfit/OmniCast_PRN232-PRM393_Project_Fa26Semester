// ============================================================
// OmniCast - EPG 25-Channel Schedule & API Data Adapter
// ============================================================

import type { EpgDayResponse } from '@/lib/api/programs';

export interface RealEpgProgram {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  startTime: string; // e.g. "19:15"
  endTime: string;   // e.g. "21:45"
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
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
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

// Reusable daily slot templates from 06:00 to 24:00+
const TIME_SLOTS = [
  { start: '06:00', end: '06:45', mins: 360, dur: 45 },
  { start: '06:45', end: '07:30', mins: 405, dur: 45 },
  { start: '07:30', end: '08:30', mins: 450, dur: 60 },
  { start: '08:30', end: '10:00', mins: 510, dur: 90 },
  { start: '10:00', end: '11:30', mins: 600, dur: 90 },
  { start: '11:30', end: '12:30', mins: 690, dur: 60 },
  { start: '12:30', end: '14:00', mins: 750, dur: 90 },
  { start: '14:00', end: '15:30', mins: 840, dur: 90 },
  { start: '15:30', end: '17:00', mins: 930, dur: 90 },
  { start: '17:00', end: '18:15', mins: 1020, dur: 75 },
  { start: '18:15', end: '19:30', mins: 1095, dur: 75 },
  { start: '19:30', end: '21:00', mins: 1170, dur: 90 },
  { start: '21:00', end: '22:45', mins: 1260, dur: 105 },
  { start: '22:45', end: '00:30', mins: 1365, dur: 105 },
  { start: '00:30', end: '06:00', mins: 30, dur: 330 },
];

// Show bank per category to rotate across different days
const SHOW_CATALOGUE: Record<string, Array<{ title: string; desc: string; badge?: string }>> = {
  sports: [
    { title: 'Ngoại Hạng Anh: Siêu Kinh Điển Man City vs Liverpool', desc: 'Trận cầu tâm điểm vòng đấu đỉnh cao tại Etihad.', badge: 'TRẬN CẦU VÀNG' },
    { title: 'Bản Tin Thể Thao Sáng: Điểm Tin Toàn Cầu', desc: 'Cập nhật diễn biến bóng đá và quần vợt thế giới 24 giờ qua.' },
    { title: 'UEFA Champions League: Real Madrid vs Bayern', desc: 'Màn tái đấu kinh điển tại bán kết cúp C1 châu Âu.', badge: 'HIGHLIGHT' },
    { title: 'Quần Vợt ATP Masters 1000: Bán Kết Nam', desc: 'Cuộc so tài đỉnh cao giữa Alcaraz và Sinner trên sân cứng.' },
    { title: 'Đường Tới World Cup: Tiêu Điểm Vòng Loại', desc: 'Phân tích chiến thuật và hành trình các đội tuyển hàng đầu.' },
    { title: 'Tạp Chí Bóng Đá: 10 Bàn Thắng Đẹp Nhất Tuần', desc: 'Bình chọn siêu phẩm sút xa và đánh đầu đẹp mắt.', badge: 'TOP 10' },
    { title: 'Đua Xe F1: Chặng Đua Monaco Grand Prix', desc: 'Màn so tài tốc độ nghẹt thở qua từng khúc cua góc phố cổ kính.' },
    { title: 'Võ Thuật Tổng Hợp UFC: Tranh Đai Vô Địch', desc: 'Trận so găng hấp dẫn giữa hai võ sĩ bất bại hạng trung.' },
  ],
  movies: [
    { title: 'Spider-Man: Across the Spider-Verse', desc: 'Siêu phẩm hoạt hình đoạt giải Oscar hành trình qua đa vũ trụ.', badge: 'BOM TẤN 4K' },
    { title: 'Oppenheimer: Huyền Thoại Bom Nguyên Tử', desc: 'Kiệt tác điện ảnh của Christopher Nolan với 7 tượng vàng Oscar.', badge: '4K HDR' },
    { title: 'Dune: Hành Tinh Cát - Phần 2', desc: 'Paul Atreides trỗi dậy lãnh đạo người Fremen giải phóng Arrakis.' },
    { title: 'Ký Sinh Trùng (Parasite)', desc: 'Bộ phim kinh điển điện ảnh Hàn Quốc tạo nên kỳ tích Cannes.', badge: 'CINEMA' },
    { title: 'Interstellar: Hố Đen Tử Thần', desc: 'Hành trình vượt không gian tìm kiếm miền đất hứa cho nhân loại.' },
    { title: 'Top Gun: Maverick', desc: 'Tom Cruise trở lại buồng lái tiêm kích trong màn bay siêu âm nghẹt thở.' },
    { title: 'Bóng Tối Đêm Muộn: Phim Kinh Dị Điện Ảnh', desc: 'Tuyển tập phim tâm lý ly kỳ đạt điểm phê bình xuất sắc.' },
  ],
  news: [
    { title: 'Thời Sự 19H: Tin Tức Quốc Gia & Quốc Tế', desc: 'Bản tin chính luận quan trọng nhất trong ngày.', badge: 'TRỰC TIẾP' },
    { title: 'Chào Ngày Mới & Điểm Báo Toàn Cầu', desc: 'Điểm tin sáng, dự báo thời tiết và phân tích kinh tế đầu ngày.' },
    { title: 'Tọa Đàm Kinh Tế: Xu Hướng Thị Trường Số', desc: 'Chuyên gia tài chính nhận định về lạm phát, vàng và chứng khoán.' },
    { title: 'Thế Giới 24H: Tiêu Điểm Địa Chính Trị', desc: 'Phân tích các sự kiện đối ngoại và hợp tác kinh tế đa phương.' },
    { title: 'Tạp Chí Đời Sống & Đô Thị Hiện Đại', desc: 'Chuyện phố thị, nhịp sống xanh và văn hóa đô thị văn minh.' },
    { title: 'Bản Tin Đêm: Toàn Cảnh Thế Giới 23H', desc: 'Tổng kết ngày làm việc và tin vắn châu Âu, châu Mỹ.' },
  ],
  esports: [
    { title: 'Chung Kết Thế Giới LOL: T1 vs Gen.G', desc: 'Đại chiến viễn thông Hàn Quốc tìm chủ nhân chiếc cúp Summoner.', badge: 'CHUNG KẾT' },
    { title: 'VCS Mùa Hè: Vòng Playoffs Trực Tiếp', desc: 'Các đội tuyển LMHT hàng đầu Việt Nam tranh vé đến CKTG.' },
    { title: 'Giải Đấu CS2 Major: Vòng Tứ Kết Đỉnh Cao', desc: 'Màn đọ súng chiến thuật trên bản đồ Mirage và Inferno.' },
    { title: 'Valorant Champions Tour: Vòng Tranh Vé', desc: 'Chiến thuật phối hợp đặc vụ nghẹt thở giữa các tuyển thủ quốc tế.' },
    { title: 'Esports Review: Top Pha Highlight Xuất Thần', desc: 'Pha xử lý Outplay 1 cân 4 ngoạn mục nhất tuần.', badge: 'TOP 5 HIGHLIGHT' },
    { title: 'Đêm Đấu Trường Game: Đấu Sĩ & Chiến Thuật', desc: 'Livestream thi đấu giao hữu cùng dàn tuyển thủ danh tiếng.' },
  ],
  discovery: [
    { title: 'Hành Tinh Trái Đất: Kỷ Nguyên Đại Dương Xanh', desc: 'Thám hiểm đáy vực Mariana và các loài sinh vật kỳ bí.', badge: '4K BBC' },
    { title: 'Vũ Trụ Vô Tận: Lỗ Đen & Kính Viễn Vọng James Webb', desc: 'Những bức ảnh vũ trụ xa xôi giải mã nguồn gốc sơ khai của dải ngân hà.' },
    { title: 'Kỳ Quan Rừng Nhiệt Đới Amazon', desc: 'Khám phá thảm thực vật đa dạng sinh học lớn nhất hành tinh.' },
    { title: 'Khoa Học & Tương Lai AI Toàn Cầu', desc: 'Trí tuệ nhân tạo đang thay đổi y học và giao thông tự hành như thế nào?' },
    { title: 'Bí Mật Lăng Mộ Cổ Ai Cập', desc: 'Giải mã những câu đố ngàn năm dưới chân đại Kim Tự Tháp Giza.' },
    { title: 'Ẩm Thực Vùng Miền: Hương Vị Ba Miền Việt Nam', desc: 'Hành trình nếm thử đặc sản từ Tây Bắc đến sông nước miền Tây.' },
  ],
  entertainment: [
    { title: 'Ca Sĩ Mặt Nạ: Vòng Bán Kết Thăng Hoa', desc: 'Những màn lộ diện gây sốc và giọng ca vocal khủng bùng nổ.', badge: 'HIT SHOW' },
    { title: 'Gala Âm Nhạc Trẻ: Omni Top Hits 50', desc: 'Bảng xếp hạng ca khúc V-Pop và K-Pop thịnh hành nhất.', badge: 'HOT V-POP' },
    { title: 'Gương Mặt Thân Quen: Tập Đặc Biệt', desc: 'Màn hóa thân xuất thần tái hiện các huyền thoại âm nhạc thế giới.' },
    { title: 'Hài Kịch Cuối Tuần: Nụ Cười Xuyên Màn Đêm', desc: 'Tiểu phẩm hài duyên dáng quy tụ các danh hài gạo cội.' },
    { title: 'Talkshow Cà Phê Cùng Người Nổi Tiếng', desc: 'Lắng nghe những góc khuất chưa từng kể của các nghệ sĩ tài hoa.' },
    { title: 'Acoustic Chillout: Âm Nhạc Đêm Muộn', desc: 'Những giai điệu guitar mộc mạc thư giãn trước giờ đi ngủ.' },
  ],
  kids: [
    { title: 'Thế Giới Hoạt Hình: Phiêu Lưu Cùng Thám Tử Nhí', desc: 'Hành trình phá án thông minh và giáo dục kỹ năng cho bé.', badge: 'HOẠT HÌNH' },
    { title: 'Khu Vườn Cổ Tích: Bài Học Kỳ Diệu', desc: 'Kể chuyện ngụ ngôn rèn luyện lòng nhân ái và sự trung thực.' },
    { title: 'Lớp Học Vui Nhộn: Khám Phá Khoa Học Cho Trẻ', desc: 'Thí nghiệm bong bóng và sắc màu dễ thương kích thích sáng tạo.' },
    { title: 'Gia Đình Siêu Nhân: Giải Cứu Thành Phố Đồ Chơi', desc: 'Tình bạn và lòng dũng cảm chiến thắng mọi khó khăn.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILD 25-CHANNEL ROTATED SCHEDULE (FALLBACK & OFFLINE PREVIEW)
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
    const catalog = SHOW_CATALOGUE[cat] || SHOW_CATALOGUE.entertainment;

    // Shift shows deterministically per dayOffset and channel index
    const shift = (((dayOffset * 3 + chIdx * 2) % catalog.length) + catalog.length) % catalog.length;
    const rotated = [...catalog.slice(shift), ...catalog.slice(0, shift), ...catalog];

    const programs: RealEpgProgram[] = TIME_SLOTS.map((slot, sIdx) => {
      const show = rotated[sIdx % rotated.length];
      const progId = `fb-${slug}-d${dayOffset}-${sIdx}`;
      return {
        id: progId,
        title: show.title,
        subtitle: `${name} • Khung Giờ ${slot.start}`,
        category: meta.label.split(' ')[0] || 'Chương Trình',
        startTime: slot.start,
        endTime: slot.end,
        startMinutes: slot.mins,
        durationMinutes: slot.dur,
        badge: show.badge,
        quality: sIdx % 2 === 0 ? '4K UHD' : '1080p60',
        audio: sIdx % 3 === 0 ? 'Dolby Atmos' : 'Dolby 5.1',
        description: show.desc,
        thumbnailUrl: getCategoryThumbnail(cat, chIdx * 5 + sIdx + dayOffset),
        channelId: meta.id,
        channelSlug: slug,
        channelName: name,
        sourceRecordingId: null,
      };
    });

    return {
      id: meta.id,
      slug,
      chNumber: `CH #${meta.num}`,
      name,
      category: cat,
      categoryLabel: meta.label,
      logo,
      color: meta.color,
      programs,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP REAL BACKEND API EPG RESPONSE TO FRONTEND 24H GRID FORMAT
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
      const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      return {
        id: p.id || `epg-${ch.channelId}-${pIdx}`,
        title: p.title,
        category: p.category || categoryLabel,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startMinutes,
        durationMinutes,
        quality: '1080p60',
        audio: 'Dolby 5.1',
        badge: p.status === 'LIVE' ? 'LIVE NOW' : p.isFiller ? undefined : 'ĐẶC SẮC',
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
