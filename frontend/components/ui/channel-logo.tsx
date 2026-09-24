'use client';

import Image from 'next/image';

interface ChannelLogoProps {
  slug: string;
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

// Màu theo category (chuẩn theo Brand Guidelines 12 Kênh)
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
};

export function getCategoryColor(category: string | undefined): string {
  if (!category) return '#0EA5E9'; // Default primary color
  return categoryColors[category.toUpperCase()] || '#0EA5E9';
}

export function ChannelLogo({ 
  slug, 
  name, 
  category,
  size = 'md', 
  className = '',
  showCategoryColor = true 
}: ChannelLogoProps) {
  const logoUrl = `/channels/${slug}.svg`;
  const dimension = sizeMap[size];
  const iconSize = dimension * 0.4;
  const categoryColor = getCategoryColor(category);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{
        width: dimension,
        height: dimension,
      }}
    >
      <Image
        src={logoUrl}
        alt={name}
        width={dimension}
        height={dimension}
        className="w-full h-full"
        style={{
          width: dimension,
          height: dimension,
        }}
        onError={(e) => {
          // Fallback to initials with category color if image fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.fallback-letter')) {
            const initials = getInitials(name);
            const fallback = document.createElement('div');
            fallback.className = 'fallback-letter';
            fallback.textContent = initials;
            fallback.style.cssText = `
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${iconSize}px;
              font-weight: bold;
              color: ${showCategoryColor ? categoryColor : 'white'};
              background: ${showCategoryColor ? `${categoryColor}20` : 'linear-gradient(135deg, #0f1422, #070a10)'};
              border-radius: inherit;
              border: 1px solid ${showCategoryColor ? `${categoryColor}50` : 'transparent'};
            `;
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
}

// Lấy 2 chữ cái đầu của tên kênh
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    return words[0].substring(0, Math.min(2, words[0].length)).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

// Compact version cho list items
export function ChannelLogoCompact({ 
  slug, 
  name, 
  category,
  size = 32,
  className = '',
}: { 
  slug: string; 
  name: string; 
  category?: string;
  size?: number;
  className?: string;
}) {
  const logoUrl = `/channels/${slug}.svg`;
  const categoryColor = getCategoryColor(category);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="w-full h-full"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.fallback-letter')) {
            const initials = getInitials(name);
            const fallback = document.createElement('div');
            fallback.className = 'fallback-letter';
            fallback.textContent = initials;
            fallback.style.cssText = `
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${size * 0.35}px;
              font-weight: bold;
              color: ${categoryColor};
              background: ${categoryColor}20;
              border-radius: inherit;
            `;
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
}

export default ChannelLogo;
