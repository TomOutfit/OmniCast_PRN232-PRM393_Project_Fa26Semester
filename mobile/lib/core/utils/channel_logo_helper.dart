// OmniCast - Channel Logo Helper
// Provides local asset paths for channel logos

class ChannelLogoHelper {
  // Base path for channel assets (relative to assets folder)
  static const String _basePath = 'assets/channels/';

  // Get local logo path for a channel slug
  static String getLogoPath(String slug) {
    return '$_basePath$slug.svg';
  }

  // Get local badge path for a channel slug
  static String getBadgePath(String slug) {
    return '$_basePath$slug-badge.svg';
  }

  // Check if channel has a local logo
  static bool hasLocalLogo(String slug) {
    const supportedChannels = [
      // 12 kênh ban đầu
      'omni-sport-1', 'omni-sport-2',
      'omni-show', 'omni-entertain',
      'omni-cine', 'omni-drama',
      'omni-news', 'omni-kids',
      'omni-music', 'omni-tech',
      'omni-food', 'omni-discovery',
      // 13 kênh mở rộng (13-25)
      'omni-esports', 'omni-indie-games',
      'omni-podcast', 'omni-audiobook',
      'omni-academy', 'omni-skill-lab',
      'omni-wellness', 'omni-fashion',
      'omni-travel-vn', 'omni-travel-world',
      'omni-art-design', 'omni-business',
      'omni-health',
    ];
    return supportedChannels.contains(slug);
  }

  // Get fallback color for channel based on category — Brand Guidelines 19 Category
  static int getFallbackColor(String category) {
    switch (category) {
      // === 12 category ban đầu ===
      case 'SPORTS':
        return 0xFFEF4444; // Đỏ - Thể thao
      case 'SHOW':
        return 0xFF8B5CF6; // Tím - Show / Talkshow
      case 'ENTERTAINMENT':
        return 0xFFEC4899; // Hồng - Giải trí
      case 'CINE':
        return 0xFFF59E0B; // Cam - Điện ảnh
      case 'DRAMA':
        return 0xFFF43F5E; // Hồng đỏ - Phim truyện
      case 'NEWS':
        return 0xFF3B82F6; // Xanh dương - Tin tức
      case 'MUSIC':
        return 0xFFA855F7; // Tím - Âm nhạc
      case 'KIDS':
        return 0xFF84CC16; // Xanh cốm - Thiếu nhi
      case 'TECH':
        return 0xFF06B6D4; // Cyan - Công nghệ
      case 'FOOD':
        return 0xFFEA580C; // Cam ấm - Ẩm thực
      case 'DOCUMENTARY':
        return 0xFF14B8A6; // Teal - Discovery
      case 'EDUCATION':
        return 0xFF8B5CF6; // Tím nhạt - Giáo dục
      // === 8 category mở rộng ===
      case 'GAMING':
        return 0xFFDC2626; // Đỏ rực - Esports & Indie
      case 'PODCAST':
        return 0xFFF59E0B; // Vàng cam - Audio / Sách nói
      case 'LIFESTYLE':
        return 0xFFF43F5E; // Hồng rose - Wellness / Fashion
      case 'TRAVEL':
        return 0xFF14B8A6; // Teal - Du lịch
      case 'ART':
        return 0xFFE11D48; // Đỏ hồng - Nghệ thuật
      case 'BUSINESS':
        return 0xFF1E40AF; // Navy - Tài chính / Khởi nghiệp
      case 'HEALTH':
        return 0xFF10B981; // Xanh lá - Sức khỏe / Y khoa
      default:
        return 0xFF6366F1; // Indigo - Default
    }
  }

  // Get initial letter for fallback display
  static String getInitial(String name) {
    if (name.isEmpty) return '?';
    return name[0].toUpperCase();
  }
}
