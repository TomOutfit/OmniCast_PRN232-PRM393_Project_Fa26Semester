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

export interface CatalogueShow {
  title: string;
  desc: string;
  duration: number; // Realistic natural duration in minutes (e.g. 15, 20, 25, 35, 45, 50, 75, 105, 125, 140, 165)
  badge?: string;
  category?: string;
  subtitle?: string;
  quality?: string;
  audio?: string;
  features?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GENRE CATALOGUE WITH REALISTIC, VARIABLE, DYNAMIC DURATIONS
// Khung thời lượng tự do, không cố định 90 phút — sắp xếp giờ dựa theo độ dài thực tế
// ─────────────────────────────────────────────────────────────────────────────
export const SHOW_CATALOGUE: Record<string, CatalogueShow[]> = {
  sports: [
    { title: 'Bản Tin Thể Thao Sáng: Điểm Tin Toàn Cầu', desc: 'Cập nhật diễn biến bóng đá và quần vợt thế giới 24 giờ qua.', duration: 25, category: 'Tin Nhanh', quality: '1080p60', audio: 'Stereo' },
    { title: 'Tạp Chí Ngoại Hạng Anh: Bàn Thắng Vòng Đấu', desc: 'Bình luận chi tiết và chiêm ngưỡng top 10 siêu phẩm sút xa đẹp mắt.', duration: 35, badge: 'HIGHLIGHT', category: 'Tạp Chí', quality: '4K UHD', audio: 'Dolby 5.1' },
    { title: 'UEFA Champions League: Real Madrid vs Bayern (Bán Kết)', desc: 'Màn tái đấu kinh điển cúp C1 với cú đúp phút bù giờ khó tin của Joselu.', duration: 125, badge: 'CATCH-UP 4K', category: 'Trận Cầu Đinh', quality: '4K 60FPS', audio: 'Dolby Atmos', features: ['Dolby Atmos', 'Multi-Cam'] },
    { title: 'Bản Tin Chuyển Nhượng: Tin Nóng Sân Cỏ', desc: 'Cập nhật thị trường chuyển nhượng mùa hè châu Âu và các bản hợp đồng bom tấn.', duration: 20, category: 'Tin Nhanh', quality: '1080p', audio: 'Stereo' },
    { title: 'Quần Vợt ATP Masters 1000: Bán Kết Đỉnh Cao', desc: 'Cuộc so tài đỉnh cao giữa Carlos Alcaraz và Jannik Sinner trên mặt sân cứng.', duration: 145, badge: 'ĐỈNH CAO 4K', category: 'Quần Vợt', quality: '4K HDR', audio: 'Dolby 5.1' },
    { title: 'Thể Thao Trưa & Phỏng Vấn Chuyên Sâu', desc: 'Gặp gỡ và trò chuyện cùng các chuyên gia bóng đá về cơ hội vô địch Premier League.', duration: 40, category: 'Talkshow', quality: '1080p', audio: 'Stereo' },
    { title: 'Đua Xe F1: Monaco GP - Vòng Phân Hạng Q3', desc: 'Những góc cua tử thần tại Monte Carlo cùng màn tranh giành pole position nghẹt thở.', duration: 115, badge: 'REPLAY 4K', category: 'F1 Motorsport', quality: '4K 60FPS', audio: 'Dolby 5.1', features: ['Cockpit Cam', 'Speed Telemetry'] },
    { title: 'Bóng Chuyền Nữ VNL: Việt Nam vs Thái Lan', desc: 'Trận thư hùng kinh điển khu vực Đông Nam Á tại đấu trường FIVB Nations League.', duration: 105, category: 'Bóng Chuyền', quality: '1080p60', audio: 'Dolby Audio' },
    { title: 'Toàn Cảnh Champions League: Kỷ Niệm 70 Năm', desc: 'Hành trình 7 thập kỷ hình thành và phát triển của giải bóng đá danh giá nhất hành tinh.', duration: 50, category: 'Tài Liệu', quality: '4K UHD', audio: 'Dolby Atmos' },
    { title: 'Ngoại Hạng Anh Trực Tiếp: Man City vs Arsenal', desc: 'Đại chiến quyết định ngôi vương Premier League. Trực tiếp 16 góc máy cùng bình luận viên hàng đầu.', duration: 135, badge: 'TRỰC TIẾP 4K', category: 'Siêu Kinh Điển', quality: '4K 60FPS HEVC', audio: 'Dolby Atmos 5.1', features: ['16 Multi-Cam', 'Dolby Atmos 5.1', 'Tactical AI'] },
    { title: 'Omni Extra Time: Họp Báo & Phỏng Vấn HLV Sau Trận', desc: 'Phỏng vấn độc quyền HLV Pep Guardiola và Mikel Arteta ngay tại phòng họp báo Etihad.', duration: 30, category: 'Hậu Trận', quality: '1080p', audio: 'Stereo' },
    { title: 'Siêu Kinh Điển: Real Madrid vs FC Barcelona', desc: 'El Clásico rực lửa giữa hai gã khổng lồ của bóng đá thế giới. Vinicius chạm trán Yamal.', duration: 140, badge: 'TRỰC TIẾP 4K', category: 'El Clásico', quality: '4K UHD HDR', audio: 'Dolby Atmos', features: ['Spider-Cam', 'Player-Cam'] },
    { title: 'Tổng Hợp Vòng Đấu & Bàn Thắng Vàng Đêm Nay', desc: 'Phân tích chiến thuật, tình huống VAR gây tranh cãi và bảng xếp hạng vòng đấu.', duration: 45, category: 'Tổng Hợp', quality: '1080p', audio: 'Stereo' },
    { title: 'Võ Thuật Tổng Hợp UFC: Tranh Đai Vô Địch Thế Giới', desc: 'Trận so găng hấp dẫn giữa hai võ sĩ bất bại hạng trung tại Las Vegas.', duration: 75, badge: 'VÕ THUẬT', category: 'UFC Fight', quality: '1080p60', audio: 'Dolby 5.1' },
    { title: 'Đêm Thể Thao: Tuyển Tập Bàn Thắng Đẹp V-League', desc: 'Những pha phối hợp mãn nhãn và bàn thắng để đời của bóng đá Việt Nam.', duration: 35, category: 'V-League', quality: '1080p', audio: 'Stereo' },
  ],

  movies: [
    { title: 'Behind The Scenes: Hậu Trường Kỹ Xảo Điện Ảnh Hollywood', desc: 'Bí mật đằng sau những cảnh quay CGI triệu đô và hóa trang quái vật điện ảnh.', duration: 30, category: 'Hậu Trường', quality: '1080p60', audio: 'Stereo' },
    { title: 'Phim Hoạt Hình Ngắn Đoạt Giải Oscar: Giấc Mơ Bay', desc: 'Tác phẩm hoạt hình ngắn xúc động về tình cha con và nghị lực vươn lên.', duration: 25, badge: 'OSCAR', category: 'Phim Ngắn', quality: '4K HDR', audio: 'Dolby 5.1' },
    { title: 'Spider-Man: Across the Spider-Verse', desc: 'Siêu phẩm hoạt hình đoạt giải Oscar hành trình đa vũ trụ cùng Miles Morales.', duration: 140, badge: 'BOM TẤN 4K', category: 'Điện Ảnh', quality: '4K UHD', audio: 'Dolby Atmos', features: ['Dolby Atmos', 'HDR10+'] },
    { title: 'Hồ Sơ Đạo Diễn: Cuộc Đời & Tác Phẩm Christopher Nolan', desc: 'Phân tích phong cách làm phim phi tuyến tính và sự ám ảnh với khái niệm thời gian.', duration: 35, category: 'Tài Liệu', quality: '1080p', audio: 'Stereo' },
    { title: 'Oppenheimer: Huyền Thoại Bom Nguyên Tử', desc: 'Kiệt tác điện ảnh với 7 tượng vàng Oscar, tái hiện dự án Manhattan làm thay đổi lịch sử.', duration: 165, badge: '4K HDR', category: 'Điện Ảnh', quality: '4K 60FPS', audio: 'Dolby Atmos 5.1' },
    { title: 'Phim Ngắn Độc Lập Cannes Spotlight', desc: 'Tuyển tập những thước phim độc lập giàu cảm xúc đạt giải thưởng quốc tế.', duration: 40, category: 'Indie Film', quality: '1080p', audio: 'Stereo' },
    { title: 'Dune: Hành Tinh Cát - Phần 2', desc: 'Paul Atreides trỗi dậy lãnh đạo người Fremen giải phóng hành tinh sa mạc Arrakis.', duration: 155, badge: 'CHIẾU RẠP 4K', category: 'Sci-Fi', quality: '4K UHD', audio: 'Dolby Atmos' },
    { title: 'Series Trinh Thám Á Châu: Tội Phạm Không Dấu Vết (Tập 1)', desc: 'Vụ án bí ẩn trong đêm tuyết tại vùng cao nguyên biên giới.', duration: 50, category: 'Series Phim', quality: '1080p60', audio: 'Stereo' },
    { title: 'Series Trinh Thám Á Châu: Tội Phạm Không Dấu Vết (Tập 2)', desc: 'Thám tử Min-woo lần theo manh mối cuối cùng dẫn tới đường hầm bỏ hoang.', duration: 50, category: 'Series Phim', quality: '1080p60', audio: 'Stereo' },
    { title: 'Ký Sinh Trùng (Parasite) - Bản Đặc Biệt', desc: 'Bộ phim kinh điển điện ảnh Hàn Quốc tạo nên kỳ tích lịch sử tại Oscar và Cannes.', duration: 130, badge: 'CINEMA', category: 'Tâm Lý', quality: '4K HDR', audio: 'Dolby 5.1' },
    { title: 'Top Gun: Maverick - Phi Công Siêu Đẳng', desc: 'Tom Cruise trở lại buồng lái tiêm kích F-18 trong màn bay siêu âm nghẹt thở.', duration: 130, badge: 'BOM TẤN', category: 'Hành Động', quality: '4K 60FPS', audio: 'Dolby Atmos' },
    { title: 'Bóng Tối Đêm Muộn: Phim Tâm Lý Ly Kỳ', desc: 'Tuyển tập phim tâm lý ly kỳ đạt điểm phê bình xuất sắc dành cho khung giờ khuya.', duration: 95, category: 'Kinh Dị', quality: '1080p', audio: 'Dolby 5.1' },
    { title: 'Điện Ảnh Kinh Điển: Bố Già (The Godfather)', desc: 'Bản phục chế 4K tác phẩm bất hủ của đạo diễn Francis Ford Coppola.', duration: 175, badge: 'KINH ĐIỂN', category: 'Classic 4K', quality: '4K UHD', audio: 'Dolby Atmos' },
  ],

  news: [
    { title: 'Chào Ngày Mới & Điểm Báo Toàn Cầu', desc: 'Điểm tin sáng, dự báo thời tiết và phân tích kinh tế đầu ngày.', duration: 30, category: 'Thời Sự', quality: '1080p', audio: 'Stereo' },
    { title: 'Bản Tin Thị Trường & Giá Vàng Đầu Ngày', desc: 'Cập nhật giá vàng, tỷ giá ngoại tệ và biến động chứng khoán châu Á.', duration: 20, category: 'Tài Chính', quality: '1080p', audio: 'Stereo' },
    { title: 'Thời Sự Sáng: Điểm Nóng Quốc Tế', desc: 'Diễn biến quan hệ ngoại giao và các sự kiện quốc tế trong 24 giờ qua.', duration: 25, category: 'Tin Tức', quality: '1080p', audio: 'Stereo' },
    { title: 'Tọa Đàm Kinh Tế: Xu Hướng Thị Trường Số & Bất Động Sản', desc: 'Chuyên gia tài chính nhận định về lãi suất, lạm phát và dòng tiền đầu tư.', duration: 40, category: 'Tọa Đàm', quality: '1080p', audio: 'Stereo' },
    { title: 'Bản Tin Công Nghệ & Khởi Nghiệp Đổi Mới', desc: 'Ứng dụng trí tuệ nhân tạo và các công ty khởi nghiệp nổi bật của năm.', duration: 25, category: 'Công Nghệ', quality: '1080p', audio: 'Stereo' },
    { title: 'Thời Sự Trưa 11H30: Toàn Cảnh Tin Tức', desc: 'Tổng hợp sự kiện thời sự nổi bật trong nửa đầu ngày trên toàn quốc.', duration: 30, badge: 'TRỰC TIẾP', category: 'Thời Sự', quality: '1080p60', audio: 'Stereo' },
    { title: 'Tiêu Điểm Quốc Tế: Bàn Cờ Địa Chính Trị Toàn Cầu', desc: 'Phân tích các sự kiện đối ngoại và hợp tác kinh tế đa phương.', duration: 45, category: 'Quốc Tế', quality: '1080p', audio: 'Stereo' },
    { title: 'Tạp Chí Doanh Nhân & Câu Chuyện Khởi Nghiệp', desc: 'Bài học thương trường và kinh nghiệm xây dựng thương hiệu Việt.', duration: 35, category: 'Kinh Doanh', quality: '1080p', audio: 'Stereo' },
    { title: 'Chính Sách & Cuộc Sống: Diễn Đàn Pháp Luật', desc: 'Giải đáp thắc mắc người dân và cập nhật quy định pháp lý mới nhất.', duration: 30, category: 'Pháp Luật', quality: '1080p', audio: 'Stereo' },
    { title: 'Thời Sự 19H: Bản Tin Quốc Gia & Quốc Tế (Trực Tiếp)', desc: 'Bản tin chính luận quan trọng nhất trong ngày, phát sóng trực tiếp.', duration: 45, badge: 'TRỰC TIẾP', category: 'Thời Sự', quality: '1080p60', audio: 'Stereo' },
    { title: 'Tạp Chí Đời Sống & Nhịp Sống Đô Thị Hiện Đại', desc: 'Chuyện phố thị, nhịp sống xanh và văn hóa giao thông văn minh.', duration: 25, category: 'Đời Sống', quality: '1080p', audio: 'Stereo' },
    { title: 'Bản Tin Thể Thao & Dự Báo Thời Tiết Chuyên Sâu', desc: 'Dự báo xu thế thời tiết và điểm tin thể thao trước giờ thi đấu.', duration: 20, category: 'Tin Nhanh', quality: '1080p', audio: 'Stereo' },
    { title: 'Tọa Đàm Đêm: Đối Thoại Chính Sách Kinh Tế', desc: 'Bàn tròn chuyên gia về các kịch bản tăng trưởng kinh tế vĩ mô.', duration: 40, category: 'Chuyên Đề', quality: '1080p', audio: 'Stereo' },
    { title: 'Bản Tin Đêm: Toàn Cảnh Thế Giới 23H', desc: 'Tổng kết ngày làm việc và tin vắn châu Âu, châu Mỹ.', duration: 30, category: 'Thời Sự Đêm', quality: '1080p', audio: 'Stereo' },
    { title: 'Ký Sự Quốc Tế: Đất Nước & Con Người Vùng Vịnh', desc: 'Hành trình khám phá văn hóa và kiến trúc độc đáo vùng Trung Đông.', duration: 35, category: 'Ký Sự', quality: '1080p', audio: 'Stereo' },
  ],

  esports: [
    { title: 'Điểm Tin Esports Sáng: Chuyển Nhượng Tuyển Thủ', desc: 'Thị trường chuyển nhượng LMHT, Valorant và CS2 quốc tế.', duration: 20, category: 'Tin Game', quality: '1080p', audio: 'Stereo' },
    { title: 'Top 10 Pha Outplay Highlight Xuất Thần Tuần', desc: 'Pha xử lý Outplay 1 cân 4 ngoạn mục nhất tại các giải đấu chuyên nghiệp.', duration: 25, badge: 'TOP 10', category: 'Highlight', quality: '1080p60', audio: 'Stereo' },
    { title: 'Phân Tích Chiến Thuật & Cấm Chọn Ban/Pick Vòng Bảng', desc: 'Bình luận viên phân tích meta tướng và chiến thuật kiểm soát bản đồ.', duration: 35, category: 'Phân Tích', quality: '1080p', audio: 'Stereo' },
    { title: 'VCS Mùa Hè: Vòng Bảng Trận 1 (Bo3)', desc: 'Các đội tuyển LMHT hàng đầu Việt Nam tranh vé đến CKTG.', duration: 130, badge: 'TRỰC TIẾP', category: 'VCS LMHT', quality: '1080p60', audio: 'Dolby Audio' },
    { title: 'Họp Báo Tuyển Thủ & Phỏng Vấn Sau Trận Đấu', desc: 'Phỏng vấn nóng MVP trận đấu cùng ban huấn luyện.', duration: 25, category: 'Phỏng Vấn', quality: '1080p', audio: 'Stereo' },
    { title: 'Giải Đấu CS2 Major: Vòng Tứ Kết Đỉnh Cao (Bo3)', desc: 'Màn đọ súng chiến thuật nghẹt thở trên bản đồ Mirage và Inferno.', duration: 135, badge: 'CS2 MAJOR', category: 'CS2 Esports', quality: '4K 60FPS', audio: 'Dolby 5.1' },
    { title: 'Valorant Champions Tour: Vòng Tranh Vé Thế Giới', desc: 'Chiến thuật phối hợp đặc vụ nghẹt thở giữa các tuyển thủ quốc tế.', duration: 120, category: 'Valorant VCT', quality: '1080p60', audio: 'Dolby 5.1' },
    { title: 'Chung Kết Thế Giới LOL: T1 vs Gen.G (Bo5 Siêu Kinh Điển)', desc: 'Đại chiến viễn thông Hàn Quốc tìm chủ nhân chiếc cúp Summoner thế giới.', duration: 175, badge: 'CHUNG KẾT 4K', category: 'Worlds 4K', quality: '4K 60FPS', audio: 'Dolby Atmos', features: ['Pro View Cam', 'Live Damage Stats'] },
    { title: 'Esports Review: Chiến Thuật Xoay Chuyển Cục Diện', desc: 'Mổ xẻ pha giao tranh quyết định rồng ngàn tuổi và Baron.', duration: 45, category: 'Chuyên Mục', quality: '1080p', audio: 'Stereo' },
    { title: 'Đêm Đấu Trường Game: Livestream Giao Hữu Tuyển Thủ', desc: 'Giao lưu thi đấu cờ nhân phẩm ĐTCL và custom game cùng người hâm mộ.', duration: 85, category: 'Livestream', quality: '1080p', audio: 'Stereo' },
  ],

  discovery: [
    { title: 'Khởi Động Sáng: Khám Phá Thế Giới Tự Nhiên Diệu Kỳ', desc: 'Hình ảnh tuyệt đẹp về cuộc sống hoang dã lúc bình minh.', duration: 25, category: 'Tự Nhiên', quality: '1080p', audio: 'Stereo' },
    { title: 'Hành Tinh Trái Đất: Kỷ Nguyên Đại Dương Xanh (BBC)', desc: 'Thám hiểm đáy vực Mariana và các loài sinh vật kỳ bí phát sáng dưới đáy biển.', duration: 55, badge: '4K BBC', category: 'Khám Phá', quality: '4K UHD', audio: 'Dolby Atmos' },
    { title: 'Kỳ Quan Rừng Nhiệt Đới Amazon: Thảm Thực Vật Đa Dạng', desc: 'Hành trình vượt dòng sông hùng vĩ nhất Nam Mỹ bảo vệ lá phổi xanh.', duration: 45, category: 'Môi Trường', quality: '4K HDR', audio: 'Dolby 5.1' },
    { title: 'Vũ Trụ Vô Tận: Lỗ Đen & Kính Viễn Vọng James Webb', desc: 'Những bức ảnh vũ trụ xa xôi giải mã nguồn gốc sơ khai của dải ngân hà.', duration: 65, badge: 'VŨ TRỤ 4K', category: 'Khoa Học', quality: '4K UHD', audio: 'Dolby Atmos' },
    { title: 'Bí Mật Lăng Mộ Cổ Ai Cập: Giải Mã Kim Tự Tháp', desc: 'Giải mã những câu đố ngàn năm dưới chân đại Kim Tự Tháp Giza và thung lũng các vị vua.', duration: 50, category: 'Lịch Sử', quality: '1080p60', audio: 'Dolby 5.1' },
    { title: 'Ẩm Thực Vùng Miền: Hương Vị Ba Miền Việt Nam', desc: 'Hành trình nếm thử đặc sản từ Tây Bắc hùng vĩ đến sông nước miền Tây Nam Bộ.', duration: 35, category: 'Ẩm Thực', quality: '1080p', audio: 'Stereo' },
    { title: 'Khoa Học & Tương Lai AI Toàn Cầu: Y Học Số', desc: 'Trí tuệ nhân tạo đang thay đổi chẩn đoán y khoa và xe tự hành như thế nào?', duration: 40, category: 'Công Nghệ', quality: '1080p', audio: 'Stereo' },
    { title: 'Thám Hiểm Rãnh Nứt Bắc Cực: Sinh Vật Dưới Lớp Băng', desc: 'Đoàn nghiên cứu quốc tế khảo sát sự biến đổi khí hậu tại vùng cực Bắc.', duration: 70, badge: 'THÁM HIỂM', category: 'Địa Lý', quality: '4K UHD', audio: 'Dolby 5.1' },
    { title: 'Bí Ẩn Lịch Sử: Con Đường Tơ Lụa Huyền Thoại', desc: 'Những đoàn thương nhân cổ đại vượt qua sa mạc kết nối giao thương Đông - Tây.', duration: 55, category: 'Lịch Sử', quality: '1080p', audio: 'Stereo' },
    { title: 'Hồ Sơ Y Khoa: Bí Quyết Trường Thọ Của Con Người', desc: 'Nghiên cứu chế độ ăn uống và lối sống tại các vùng đất Blue Zones trên thế giới.', duration: 40, category: 'Sức Khỏe', quality: '1080p', audio: 'Stereo' },
  ],

  kids: [
    { title: 'Khởi Động Ngày Mới: Bài Thể Dục Vui Nhộn Cùng Bé', desc: 'Động tác vận động nhẹ nhàng vui tươi giúp bé khởi đầu ngày mới tràn đầy năng lượng.', duration: 15, category: 'Vận Động', quality: '1080p', audio: 'Stereo' },
    { title: 'Gia Đình Siêu Nhân: Giải Cứu Thành Phố Đồ Chơi (Tập 1)', desc: 'Tình bạn và lòng dũng cảm giúp các bạn nhỏ vượt qua thử thách bảo vệ thị trấn.', duration: 25, badge: 'HOẠT HÌNH', category: 'Hoạt Hình', quality: '1080p', audio: 'Stereo' },
    { title: 'Khu Vườn Cổ Tích: Cậu Bé Thông Minh & Con Rùa Vàng', desc: 'Kể chuyện ngụ ngôn giàu tính nhân văn rèn luyện sự trung thực cho trẻ thơ.', duration: 20, category: 'Cổ Tích', quality: '1080p', audio: 'Stereo' },
    { title: 'Thế Giới Hoạt Hình: Phiêu Lưu Cùng Thám Tử Nhí', desc: 'Hành trình phá án thông minh và giáo dục tư duy logic cho bé.', duration: 30, category: 'Thiếu Nhi', quality: '1080p', audio: 'Stereo' },
    { title: 'Lớp Học Vui Nhộn: Khám Phá Khoa Học Sắc Màu', desc: 'Thí nghiệm bong bóng và màu sắc dễ thương kích thích trí tưởng tượng sáng tạo.', duration: 25, category: 'Giáo Dục', quality: '1080p', audio: 'Stereo' },
    { title: 'Gia Đình Siêu Nhân: Bí Mật Đảo Khủng Long (Tập 2)', desc: 'Chuyến thám hiểm hòn đảo kỳ bí và gặp gỡ những người bạn khủng long hiền lành.', duration: 25, category: 'Hoạt Hình', quality: '1080p', audio: 'Stereo' },
    { title: 'Âm Nhạc Tuổi Thơ: Bài Hát Vui Vẻ Dành Cho Bé', desc: 'Tuyển tập bài hát thiếu nhi sôi động dễ thương giúp bé học hát cùng cha mẹ.', duration: 20, category: 'Âm Nhạc', quality: '1080p', audio: 'Stereo' },
    { title: 'Phim Hoạt Hình Chiếu Rạp: Vương Quốc Muông Thú', desc: 'Tác phẩm hoạt hình 3D rực rỡ sắc màu về tình đoàn kết của muôn loài.', duration: 85, badge: 'CHIẾU RẠP', category: 'Phim 3D', quality: '4K UHD', audio: 'Dolby 5.1' },
    { title: 'Bé Học Kỹ Năng Sống: Tự Lập & Giúp Đỡ Bạn Bè', desc: 'Bài học lễ phép, tự dọn đồ chơi và tinh thần sẻ chia trong cuộc sống.', duration: 20, category: 'Kỹ Năng', quality: '1080p', audio: 'Stereo' },
    { title: 'Kể Chuyện Đêm Khuya: Giấc Mơ Bay Vào Không Gian', desc: 'Giọng đọc truyền cảm ấm áp đưa các bé vào giấc ngủ ngon và mơ đẹp.', duration: 25, category: 'Ru Ngủ', quality: '1080p', audio: 'Stereo' },
  ],

  entertainment: [
    { title: 'Cà Phê Sáng: Giai Điệu Acoustic Thư Giãn', desc: 'Những bản guitar mộc mạc khởi đầu ngày mới an nhiên thư thái.', duration: 35, category: 'Acoustic', quality: '1080p', audio: 'Stereo' },
    { title: 'Omni Top Hits 50: Bảng Xếp Hạng V-Pop & K-Pop', desc: 'Cập nhật các ca khúc thịnh hành nhất trên mạng xã hội và bảng xếp hạng âm nhạc.', duration: 40, badge: 'HOT HITS', category: 'Bảng Xếp Hạng', quality: '1080p60', audio: 'Dolby Audio' },
    { title: 'Talkshow Người Nổi Tiếng: Góc Khuất Sau Ánh Hào Quang', desc: 'Lắng nghe những tâm sự chân thành và bài học đời của các nghệ sĩ gạo cội.', duration: 50, category: 'Talkshow', quality: '1080p', audio: 'Stereo' },
    { title: 'Game Show Thực Tế: Thử Thách Cực Hạn Tập 5', desc: 'Các đội chơi vượt qua chướng ngại vật mạo hiểm tại vùng biển Nam Trung Bộ.', duration: 75, category: 'Game Show', quality: '1080p60', audio: 'Stereo' },
    { title: 'Ca Sĩ Mặt Nạ: Vòng Bán Kết Bùng Nổ Vocal Khủng', desc: 'Những màn lộ diện gây sốc và phần trình diễn thăng hoa chạm tới trái tim khán giả.', duration: 95, badge: 'HIT SHOW', category: 'Show Thực Tế', quality: '4K UHD', audio: 'Dolby Atmos' },
    { title: 'Gương Mặt Thân Quen: Màn Hóa Thân Huyền Thoại', desc: 'Màn hóa thân xuất thần tái hiện các tượng đài âm nhạc Việt Nam và thế giới.', duration: 80, category: 'Truyền Hình', quality: '1080p', audio: 'Dolby 5.1' },
    { title: 'Hài Kịch Cuối Tuần: Nụ Cười Xuyên Màn Đêm', desc: 'Tiểu phẩm hài duyên dáng mang lại tiếng cười sảng khoái cho cả gia đình.', duration: 65, category: 'Hài Kịch', quality: '1080p', audio: 'Stereo' },
    { title: 'Live Concert Đỉnh Cao: Tour Diễn Âm Nhạc 4K', desc: 'Sân khấu âm nhạc quy mô hàng chục nghìn khán giả với hiệu ứng ánh sáng laser đỉnh cao.', duration: 125, badge: 'CONCERT 4K', category: 'Live Concert', quality: '4K 60FPS', audio: 'Dolby Atmos 5.1' },
    { title: 'Acoustic Chillout: Âm Nhạc Thư Giãn Đêm Muộn', desc: 'Giai điệu piano và violin mộc mạc lắng đọng tâm hồn trước giờ đi ngủ.', duration: 45, category: 'Chillout', quality: '1080p', audio: 'Stereo' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILD 25-CHANNEL DYNAMIC, FLEXIBLE SCHEDULE (KHÔNG CỐ ĐỊNH, THỜI LƯỢNG TỰ DO)
// Sắp xếp khung giờ hoàn toàn linh hoạt theo đúng thời lượng thực tế của chương trình
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
    const shift = (((dayOffset * 5 + chIdx * 3) % catalog.length) + catalog.length) % catalog.length;
    const rotated = [...catalog.slice(shift), ...catalog.slice(0, shift), ...catalog, ...catalog];

    const programs: RealEpgProgram[] = [];
    let currentMinute = 360; // 06:00 AM (360 mins from 00:00)
    const dayEndMinute = 360 + 1440; // 06:00 AM next day (1800 mins)

    let pIdx = 0;
    while (currentMinute < dayEndMinute && pIdx < 35) {
      const show = rotated[pIdx % rotated.length];
      let dur = show.duration;

      // Ensure that if we approach 06:00 next day, we clamp cleanly
      if (currentMinute + dur > dayEndMinute) {
        dur = dayEndMinute - currentMinute;
        if (dur < 15 && programs.length > 0) {
          // Merge tiny tail into last program
          const last = programs[programs.length - 1];
          last.durationMinutes += dur;
          last.endTime = '06:00';
          break;
        }
      }

      const startH = Math.floor((currentMinute % 1440) / 60);
      const startM = currentMinute % 60;
      const startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

      const nextMinute = currentMinute + dur;
      const endH = Math.floor((nextMinute % 1440) / 60);
      const endM = nextMinute % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const progId = `epg-${slug}-d${dayOffset}-${pIdx}`;

      programs.push({
        id: progId,
        title: show.title,
        subtitle: show.subtitle || `${name} • Khung giờ ${startTime}`,
        category: show.category || meta.label.split(' ')[0] || 'Chương Trình',
        startTime,
        endTime,
        startMinutes: currentMinute,
        durationMinutes: dur,
        badge: show.badge,
        quality: show.quality || (pIdx % 2 === 0 ? '4K UHD' : '1080p60'),
        audio: show.audio || (pIdx % 3 === 0 ? 'Dolby Atmos' : 'Dolby 5.1'),
        description: show.desc,
        thumbnailUrl: getCategoryThumbnail(cat, chIdx * 7 + pIdx + dayOffset),
        channelId: meta.id,
        channelSlug: slug,
        channelName: name,
        sourceRecordingId: null,
      });

      currentMinute = nextMinute;
      pIdx++;
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
