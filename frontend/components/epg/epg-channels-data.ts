// ============================================================
// OmniCast - EPG Data Adapter
// Realtime Electronic Programme Guide with Dynamic API Data
// All data comes from backend API - no hardcoded data
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
  { id: 'ALL', label: 'Tất Cả (25 Kênh)' },
  { id: 'SPORTS', label: 'Thể Thao' },
  { id: 'CINE', label: 'Điện Ảnh' },
  { id: 'DRAMA', label: 'Phim Truyện' },
  { id: 'SHOW', label: 'Show & Reality' },
  { id: 'NEWS', label: 'Tin Tức 24/7' },
  { id: 'MUSIC', label: 'Âm Nhạc' },
  { id: 'KIDS', label: 'Thiếu Nhi' },
  { id: 'TECH', label: 'Công Nghệ' },
  { id: 'FOOD', label: 'Ẩm Thực' },
  { id: 'DOCUMENTARY', label: 'Khám Phá' },
  { id: 'GAMING', label: 'Esports' },
  { id: 'PODCAST', label: 'Podcast' },
  { id: 'EDUCATION', label: 'Giáo Dục' },
  { id: 'LIFESTYLE', label: 'Phong Cách Sống' },
  { id: 'TRAVEL', label: 'Du Lịch' },
  { id: 'ART', label: 'Nghệ Thuật' },
  { id: 'BUSINESS', label: 'Kinh Doanh' },
  { id: 'HEALTH', label: 'Sức Khỏe' },
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
// MAP REAL BACKEND API EPG RESPONSE TO FRONTEND 24H GRID FORMAT
// Converts backend API data to frontend display format
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
    const categoryLabel = CATEGORY_LABELS[catKey] || ch.channelCategory || 'Tổng Hợp';

    const programs: RealEpgProgram[] = ch.programs.map((p, pIdx) => {
      const start = new Date(p.startTime);
      const end = new Date(p.endTime);
      const startHours = isNaN(start.getTime()) ? 0 : start.getHours();
      const startMinutes = isNaN(start.getTime()) ? 0 : startHours * 60 + start.getMinutes();
      const durationMinutes = p.durationMinutes || (end.getTime() - start.getTime()) / 60000;

      return {
        id: p.id,
        title: p.title,
        subtitle: p.tags?.join(', '),
        category: p.category || catKey,
        startTime: `${String(startHours).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
        endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
        startMinutes,
        durationMinutes,
        badge: p.isFiller ? (p.fillerKind === 'recording-replay' ? 'REPLAY' : 'FILLER') : undefined,
        quality: undefined,
        audio: undefined,
        description: p.title,
        thumbnailUrl: p.thumbnailUrl || getCategoryThumbnail(p.category || catKey, pIdx),
        directorOrHost: undefined,
        rating: undefined,
        features: p.tags,
        channelId: ch.channelId,
        channelSlug: slug,
        channelName: ch.channelName,
        sourceRecordingId: p.sourceRecordingId,
      };
    });

    return {
      id: ch.channelId,
      slug,
      chNumber: `CH ${idx + 1}`,
      name: ch.channelName,
      category: catKey as any,
      categoryLabel,
      logo: ch.channelLogoUrl || meta?.logoUrl || '/Channel_Logos/default.svg',
      color: getChannelColor(catKey, idx),
      programs,
    };
  });
}
