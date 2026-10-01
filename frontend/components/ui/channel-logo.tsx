'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ChannelLogoProps {
  slug?: string;
  logoUrl?: string;
  name: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCategoryColor?: boolean;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 128,
};

// Màu theo category (chuẩn theo Brand Guidelines 25 Kênh)
const categoryColors: Record<string, string> = {
  SPORTS: '#EF4444',        // Đỏ / Cam - Thể thao (Sport 1, Sport 2)
  SHOW: '#8B5CF6',          // Tím / Hồng - Showbiz & Talkshow
  ENTERTAINMENT: '#EC4899', // Hồng / Magenta - Giải trí tổng hợp
  CINE: '#F59E0B',          // Hổ phách / Cam - Điện ảnh 4K
  DRAMA: '#F43F5E',         // Hồng đỏ / Rose - Phim truyện
  NEWS: '#3B82F6',          // Xanh dương / Cyan - Tin tức 24/7
  MUSIC: '#A855F7',         // Tím dạ quang - Âm nhạc
  KIDS: '#84CC16',          // Xanh cốm / Lime - Thiếu nhi
  TECH: '#06B6D4',          // Cyan / Ngọc bích - Công nghệ AI
  FOOD: '#EA580C',          // Cam ấm - Ẩm thực MasterChef
  DOCUMENTARY: '#14B8A6',   // Teal / Aqua - Khám phá Discovery
  EDUCATION: '#8B5CF6',     // Tím nhạt - Giáo dục
  // ---- 8 category mở rộng (13-25) ----
  GAMING: '#DC2626',        // Đỏ rực - Esports & Indie Games
  PODCAST: '#F59E0B',       // Vàng cam - Audio & Sách nói
  LIFESTYLE: '#F43F5E',     // Hồng rose - Wellness & Fashion
  TRAVEL: '#14B8A6',        // Teal - Du lịch trong nước & quốc tế
  ART: '#E11D48',           // Đỏ hồng - Nghệ thuật & Thiết kế
  BUSINESS: '#1E40AF',      // Xanh navy - Tài chính & Khởi nghiệp
  HEALTH: '#10B981',        // Xanh lá - Sức khỏe & Y khoa
};

export function getCategoryColor(category: string | undefined): string {
  if (!category) return '#0EA5E9'; // Default primary color
  return categoryColors[category.toUpperCase()] || '#0EA5E9';
}

const OFFICIAL_CHANNEL_LOGOS: Record<string, string> = {
  'sport-1': '/Channel_Logos/01-omni-sport-1-icon.svg',
  'omni-sport-1': '/Channel_Logos/01-omni-sport-1-icon.svg',
  'sport-2': '/Channel_Logos/02-omni-sport-2-icon.svg',
  'omni-sport-2': '/Channel_Logos/02-omni-sport-2-icon.svg',
  'show': '/Channel_Logos/03-omni-show-icon.svg',
  'omni-show': '/Channel_Logos/03-omni-show-icon.svg',
  'entertain': '/Channel_Logos/04-omni-entertain-icon.svg',
  'omni-entertain': '/Channel_Logos/04-omni-entertain-icon.svg',
  'cine': '/Channel_Logos/05-omni-cine-icon.svg',
  'omni-cine': '/Channel_Logos/05-omni-cine-icon.svg',
  'drama': '/Channel_Logos/06-omni-drama-icon.svg',
  'omni-drama': '/Channel_Logos/06-omni-drama-icon.svg',
  'news': '/Channel_Logos/07-omni-news-icon.svg',
  'omni-news': '/Channel_Logos/07-omni-news-icon.svg',
  'music': '/Channel_Logos/08-omni-music-icon.svg',
  'omni-music': '/Channel_Logos/08-omni-music-icon.svg',
  'kids': '/Channel_Logos/09-omni-kids-icon.svg',
  'omni-kids': '/Channel_Logos/09-omni-kids-icon.svg',
  'tech': '/Channel_Logos/10-omni-tech-icon.svg',
  'omni-tech': '/Channel_Logos/10-omni-tech-icon.svg',
  'food': '/Channel_Logos/11-omni-food-icon.svg',
  'omni-food': '/Channel_Logos/11-omni-food-icon.svg',
  'discovery': '/Channel_Logos/12-omni-discovery-icon.svg',
  'omni-discovery': '/Channel_Logos/12-omni-discovery-icon.svg',
  'esports': '/Channel_Logos/13-omni-esports-icon.svg',
  'omni-esports': '/Channel_Logos/13-omni-esports-icon.svg',
  'indie-games': '/Channel_Logos/14-omni-indie-games-icon.svg',
  'omni-indie-games': '/Channel_Logos/14-omni-indie-games-icon.svg',
  'podcast': '/Channel_Logos/15-omni-podcast-icon.svg',
  'omni-podcast': '/Channel_Logos/15-omni-podcast-icon.svg',
  'audiobook': '/Channel_Logos/16-omni-audiobook-icon.svg',
  'omni-audiobook': '/Channel_Logos/16-omni-audiobook-icon.svg',
  'academy': '/Channel_Logos/17-omni-academy-icon.svg',
  'omni-academy': '/Channel_Logos/17-omni-academy-icon.svg',
  'skill-lab': '/Channel_Logos/18-omni-skill-lab-icon.svg',
  'omni-skill-lab': '/Channel_Logos/18-omni-skill-lab-icon.svg',
  'wellness': '/Channel_Logos/19-omni-wellness-icon.svg',
  'omni-wellness': '/Channel_Logos/19-omni-wellness-icon.svg',
  'fashion': '/Channel_Logos/20-omni-fashion-icon.svg',
  'omni-fashion': '/Channel_Logos/20-omni-fashion-icon.svg',
  'travel-vn': '/Channel_Logos/21-omni-travel-vn-icon.svg',
  'omni-travel-vn': '/Channel_Logos/21-omni-travel-vn-icon.svg',
  'travel-world': '/Channel_Logos/22-omni-travel-world-icon.svg',
  'omni-travel-world': '/Channel_Logos/22-omni-travel-world-icon.svg',
  'art-design': '/Channel_Logos/23-omni-art-design-icon.svg',
  'omni-art-design': '/Channel_Logos/23-omni-art-design-icon.svg',
  'business': '/Channel_Logos/24-omni-business-icon.svg',
  'omni-business': '/Channel_Logos/24-omni-business-icon.svg',
  'health': '/Channel_Logos/25-omni-health-icon.svg',
  'omni-health': '/Channel_Logos/25-omni-health-icon.svg',
};

function resolveLogoSrc(slug?: string, logoUrl?: string): string {
  if (logoUrl && logoUrl.trim().length > 0 && !logoUrl.startsWith('/channels/')) {
    return logoUrl;
  }
  if (!slug) return '/Channel_Logos/01-omni-sport-1-icon.svg';
  const cleanSlug = slug.toLowerCase().trim();
  if (OFFICIAL_CHANNEL_LOGOS[cleanSlug]) {
    return OFFICIAL_CHANNEL_LOGOS[cleanSlug];
  }
  // Try matching without omni- prefix or with omni- prefix
  const withOmni = cleanSlug.startsWith('omni-') ? cleanSlug : `omni-${cleanSlug}`;
  if (OFFICIAL_CHANNEL_LOGOS[withOmni]) {
    return OFFICIAL_CHANNEL_LOGOS[withOmni];
  }
  return '/Channel_Logos/01-omni-sport-1-icon.svg';
}

// Lấy 2 chữ cái đầu của tên kênh
function getInitials(name?: string): string {
  if (!name) return 'OC';
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return 'OC';
  if (words.length === 1) {
    return words[0].substring(0, Math.min(2, words[0].length)).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function ChannelLogo({ 
  slug, 
  logoUrl,
  name, 
  category,
  size = 'md', 
  className = '',
  showCategoryColor = true 
}: ChannelLogoProps) {
  const [hasError, setHasError] = useState(false);
  const dimension = sizeMap[size];
  const iconSize = Math.round(dimension * 0.4);
  const categoryColor = getCategoryColor(category);
  const src = resolveLogoSrc(slug, logoUrl);

  return (
    <div
      className={`relative flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center transition-transform ${className}`}
      style={{
        width: dimension,
        height: dimension,
      }}
    >
      {!hasError ? (
        <Image
          src={src}
          alt={name || 'Channel Logo'}
          width={dimension}
          height={dimension}
          unoptimized
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold select-none rounded-xl"
          style={{
            fontSize: `${iconSize}px`,
            color: showCategoryColor ? categoryColor : '#ffffff',
            background: showCategoryColor ? `${categoryColor}20` : 'linear-gradient(135deg, #0f1422, #070a10)',
            border: `1px solid ${showCategoryColor ? `${categoryColor}50` : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

// Compact version cho list items
export function ChannelLogoCompact({ 
  slug, 
  logoUrl,
  name, 
  category,
  size = 32, 
  className = '',
}: { 
  slug?: string; 
  logoUrl?: string;
  name: string; 
  category?: string;
  size?: number; 
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const categoryColor = getCategoryColor(category);
  const src = resolveLogoSrc(slug, logoUrl);

  return (
    <div
      className={`relative flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {!hasError ? (
        <Image
          src={src}
          alt={name || 'Channel'}
          width={size}
          height={size}
          unoptimized
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-xs rounded-lg select-none"
          style={{
            color: categoryColor,
            background: `${categoryColor}20`,
            border: `1px solid ${categoryColor}40`,
          }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

export default ChannelLogo;
