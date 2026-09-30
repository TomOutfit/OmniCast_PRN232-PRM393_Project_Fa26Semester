// ============================================================
// OmniCast - Live Category Constants
// Single source of truth for channel categories across the app.
// Mirrors the `LiveCategory` union in `types/index.ts`.
// ============================================================

import type { LiveCategory } from '@/types';

export interface CategoryMeta {
  value: LiveCategory;
  /** Vietnamese display label (UI) */
  label: string;
  /** English display label */
  labelEn: string;
  /** Short description for tooltips / empty states */
  description: string;
  /** Tailwind class pair (bg/text) for badges & chips */
  swatch: { bg: string; text: string; ring: string };
  /** Lucide icon name (resolved at call site to avoid SSR import cycles) */
  iconName:
    | 'Tv'
    | 'Trophy'
    | 'Music'
    | 'Film'
    | 'Drama'
    | 'Newspaper'
    | 'Baby'
    | 'BookOpen'
    | 'Gamepad2'
    | 'Cpu'
    | 'Mic'
    | 'GraduationCap'
    | 'Sparkles'
    | 'UtensilsCrossed'
    | 'Plane'
    | 'Palette'
    | 'Briefcase'
    | 'HeartPulse'
    | 'Radio';
}

export const CATEGORY_META: Record<LiveCategory, CategoryMeta> = {
  SPORTS: {
    value: 'SPORTS',
    label: 'Thể thao',
    labelEn: 'Sports',
    description: 'Bóng đá, bóng rổ, esports và các môn thể thao khác',
    swatch: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      ring: 'ring-emerald-500/30',
    },
    iconName: 'Trophy',
  },
  SHOW: {
    value: 'SHOW',
    label: 'Show',
    labelEn: 'Show',
    description: 'Game show, talkshow và chương trình giải trí tương tác',
    swatch: {
      bg: 'bg-pink-500/15',
      text: 'text-pink-300',
      ring: 'ring-pink-500/30',
    },
    iconName: 'Sparkles',
  },
  ENTERTAINMENT: {
    value: 'ENTERTAINMENT',
    label: 'Giải trí',
    labelEn: 'Entertainment',
    description: 'Variety, reality TV và các chương trình giải trí đa dạng',
    swatch: {
      bg: 'bg-fuchsia-500/15',
      text: 'text-fuchsia-300',
      ring: 'ring-fuchsia-500/30',
    },
    iconName: 'Sparkles',
  },
  CINE: {
    value: 'CINE',
    label: 'Điện ảnh',
    labelEn: 'Cinema',
    description: 'Phim điện ảnh và phim chiếu rạp',
    swatch: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      ring: 'ring-amber-500/30',
    },
    iconName: 'Film',
  },
  DRAMA: {
    value: 'DRAMA',
    label: 'Phim truyền hình',
    labelEn: 'Drama',
    description: 'Phim bộ, sitcom và series dài tập',
    swatch: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      ring: 'ring-rose-500/30',
    },
    iconName: 'Drama',
  },
  NEWS: {
    value: 'NEWS',
    label: 'Tin tức',
    labelEn: 'News',
    description: 'Thời sự, chính trị và cập nhật trong ngày',
    swatch: {
      bg: 'bg-sky-500/15',
      text: 'text-sky-300',
      ring: 'ring-sky-500/30',
    },
    iconName: 'Newspaper',
  },
  MUSIC: {
    value: 'MUSIC',
    label: 'Âm nhạc',
    labelEn: 'Music',
    description: 'MV, liveshow và chương trình âm nhạc',
    swatch: {
      bg: 'bg-violet-500/15',
      text: 'text-violet-300',
      ring: 'ring-violet-500/30',
    },
    iconName: 'Music',
  },
  KIDS: {
    value: 'KIDS',
    label: 'Thiếu nhi',
    labelEn: 'Kids',
    description: 'Nội dung an toàn cho trẻ em',
    swatch: {
      bg: 'bg-yellow-400/15',
      text: 'text-yellow-200',
      ring: 'ring-yellow-400/30',
    },
    iconName: 'Baby',
  },
  DOCUMENTARY: {
    value: 'DOCUMENTARY',
    label: 'Khám phá',
    labelEn: 'Documentary',
    description: 'Phim tài liệu và nội dung khám phá tri thức',
    swatch: {
      bg: 'bg-teal-500/15',
      text: 'text-teal-300',
      ring: 'ring-teal-500/30',
    },
    iconName: 'BookOpen',
  },
  GAMING: {
    value: 'GAMING',
    label: 'Trò chơi',
    labelEn: 'Gaming',
    description: 'Esports, livestream game và giải đấu',
    swatch: {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-300',
      ring: 'ring-indigo-500/30',
    },
    iconName: 'Gamepad2',
  },
  TECH: {
    value: 'TECH',
    label: 'Công nghệ',
    labelEn: 'Tech',
    description: 'Đánh giá, hướng dẫn và tin tức công nghệ',
    swatch: {
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-300',
      ring: 'ring-cyan-500/30',
    },
    iconName: 'Cpu',
  },
  PODCAST: {
    value: 'PODCAST',
    label: 'Podcast',
    labelEn: 'Podcast',
    description: 'Chương trình audio theo chủ đề',
    swatch: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-300',
      ring: 'ring-orange-500/30',
    },
    iconName: 'Mic',
  },
  EDUCATION: {
    value: 'EDUCATION',
    label: 'Giáo dục',
    labelEn: 'Education',
    description: 'Bài giảng, hướng dẫn và nội dung học thuật',
    swatch: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-300',
      ring: 'ring-blue-500/30',
    },
    iconName: 'GraduationCap',
  },
  LIFESTYLE: {
    value: 'LIFESTYLE',
    label: 'Phong cách sống',
    labelEn: 'Lifestyle',
    description: 'Thời trang, làm đẹp và đời sống thường ngày',
    swatch: {
      bg: 'bg-pink-400/15',
      text: 'text-pink-200',
      ring: 'ring-pink-400/30',
    },
    iconName: 'HeartPulse',
  },
  FOOD: {
    value: 'FOOD',
    label: 'Ẩm thực',
    labelEn: 'Food',
    description: 'Nấu ăn, ẩm thực và review nhà hàng',
    swatch: {
      bg: 'bg-red-500/15',
      text: 'text-red-300',
      ring: 'ring-red-500/30',
    },
    iconName: 'UtensilsCrossed',
  },
  TRAVEL: {
    value: 'TRAVEL',
    label: 'Du lịch',
    labelEn: 'Travel',
    description: 'Khám phá địa điểm và hành trình du lịch',
    swatch: {
      bg: 'bg-sky-400/15',
      text: 'text-sky-200',
      ring: 'ring-sky-400/30',
    },
    iconName: 'Plane',
  },
  ART: {
    value: 'ART',
    label: 'Nghệ thuật',
    labelEn: 'Art',
    description: 'Mỹ thuật, thủ công và sáng tạo nghệ thuật',
    swatch: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      ring: 'ring-purple-500/30',
    },
    iconName: 'Palette',
  },
  BUSINESS: {
    value: 'BUSINESS',
    label: 'Kinh doanh',
    labelEn: 'Business',
    description: 'Tài chính, khởi nghiệp và thị trường',
    swatch: {
      bg: 'bg-slate-500/15',
      text: 'text-slate-200',
      ring: 'ring-slate-500/30',
    },
    iconName: 'Briefcase',
  },
  HEALTH: {
    value: 'HEALTH',
    label: 'Sức khỏe',
    labelEn: 'Health',
    description: 'Y tế, thể dục và chăm sóc sức khỏe',
    swatch: {
      bg: 'bg-emerald-400/15',
      text: 'text-emerald-200',
      ring: 'ring-emerald-400/30',
    },
    iconName: 'HeartPulse',
  },
};

/** Ordered list of categories for dropdowns / chip lists */
export const CATEGORY_LIST: CategoryMeta[] = (
  Object.keys(CATEGORY_META) as LiveCategory[]
).map((key) => CATEGORY_META[key]);

/** Convenience: resolve a label for a category value with fallback */
export function getCategoryLabel(
  value: string | null | undefined,
  fallback = 'Khác',
): string {
  if (!value) return fallback;
  return CATEGORY_META[value as LiveCategory]?.label ?? fallback;
}

/** Convenience: resolve swatch classes */
export function getCategorySwatch(value: string | null | undefined) {
  const empty = { bg: 'bg-dark-700', text: 'text-dark-300', ring: 'ring-dark-600' };
  if (!value) return empty;
  return CATEGORY_META[value as LiveCategory]?.swatch ?? empty;
}
