// OmniCast - Channel & Brand Logo Helper
// Provides asset paths and resolvers for all 25 channels and OmniCast brand logo

class ChannelLogoHelper {
  // Base paths
  static const String channelAssetsPath = 'assets/channels/';
  static const String brandLogoSvg = 'assets/icons/omnicast_logo.svg';
  static const String brandLogoPng = 'assets/images/omnicast_logo.png';

  // Slug aliases & mappings for all 25 channels
  static const Map<String, String> _channelSlugMap = {
    // 1-12
    'sport-1': '01-omni-sport-1',
    'omni-sport-1': '01-omni-sport-1',
    'sport-2': '02-omni-sport-2',
    'omni-sport-2': '02-omni-sport-2',
    'show': '03-omni-show',
    'omni-show': '03-omni-show',
    'entertain': '04-omni-entertain',
    'omni-entertain': '04-omni-entertain',
    'cine': '05-omni-cine',
    'omni-cine': '05-omni-cine',
    'drama': '06-omni-drama',
    'omni-drama': '06-omni-drama',
    'news': '07-omni-news',
    'omni-news': '07-omni-news',
    'music': '08-omni-music',
    'omni-music': '08-omni-music',
    'kids': '09-omni-kids',
    'omni-kids': '09-omni-kids',
    'tech': '10-omni-tech',
    'omni-tech': '10-omni-tech',
    'food': '11-omni-food',
    'omni-food': '11-omni-food',
    'discovery': '12-omni-discovery',
    'omni-discovery': '12-omni-discovery',
    // 13-25
    'esports': '13-omni-esports',
    'omni-esports': '13-omni-esports',
    'indie-games': '14-omni-indie-games',
    'omni-indie-games': '14-omni-indie-games',
    'podcast': '15-omni-podcast',
    'omni-podcast': '15-omni-podcast',
    'audiobook': '16-omni-audiobook',
    'omni-audiobook': '16-omni-audiobook',
    'academy': '17-omni-academy',
    'omni-academy': '17-omni-academy',
    'skill-lab': '18-omni-skill-lab',
    'omni-skill-lab': '18-omni-skill-lab',
    'wellness': '19-omni-wellness',
    'omni-wellness': '19-omni-wellness',
    'fashion': '20-omni-fashion',
    'omni-fashion': '20-omni-fashion',
    'travel-vn': '21-omni-travel-vn',
    'omni-travel-vn': '21-omni-travel-vn',
    'travel-world': '22-omni-travel-world',
    'omni-travel-world': '22-omni-travel-world',
    'art-design': '23-omni-art-design',
    'omni-art-design': '23-omni-art-design',
    'business': '24-omni-business',
    'omni-business': '24-omni-business',
    'health': '25-omni-health',
    'omni-health': '25-omni-health',
  };

  /// Returns canonical channel prefix (e.g., '01-omni-sport-1') or normalized slug
  static String? normalizeSlug(String? rawSlug) {
    if (rawSlug == null || rawSlug.trim().isEmpty) return null;
    final cleaned = rawSlug.trim().toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
    if (_channelSlugMap.containsKey(cleaned)) {
      return _channelSlugMap[cleaned];
    }
    // Remove leading 'omni-' or trailing suffixes
    final noOmni = cleaned.startsWith('omni-') ? cleaned.substring(5) : cleaned;
    if (_channelSlugMap.containsKey(noOmni)) {
      return _channelSlugMap[noOmni];
    }
    return null;
  }

  /// Get local icon asset path for a channel slug or name
  static String getLogoPath(String slug) {
    final norm = normalizeSlug(slug);
    if (norm != null) {
      return '$channelAssetsPath$norm-icon.svg';
    }
    return '$channelAssetsPath$slug.svg';
  }

  /// Get local badge asset path for a channel slug
  static String getBadgePath(String slug) {
    final norm = normalizeSlug(slug);
    if (norm != null) {
      return '$channelAssetsPath$norm-badge.svg';
    }
    return '$channelAssetsPath$slug-badge.svg';
  }

  /// Resolve a local asset from either logoUrl, badgeUrl, or channel slug
  static String? resolveLocalAsset({String? logoUrl, String? slug, bool preferBadge = false}) {
    // 1. Check slug first (most reliable identifier across models)
    if (slug != null && slug.isNotEmpty) {
      final norm = normalizeSlug(slug);
      if (norm != null) {
        return preferBadge
            ? '$channelAssetsPath$norm-badge.svg'
            : '$channelAssetsPath$norm-icon.svg';
      }
    }

    // 2. Check logoUrl
    if (logoUrl != null && logoUrl.isNotEmpty) {
      final cleanUrl = logoUrl.trim();
      if (cleanUrl.startsWith('assets/channels/')) {
        return cleanUrl;
      }
      // Check if filename/URL matches any known channel in _channelSlugMap
      for (final entry in _channelSlugMap.entries) {
        if (cleanUrl.contains(entry.key) || cleanUrl.contains(entry.value)) {
          return preferBadge
              ? '$channelAssetsPath${entry.value}-badge.svg'
              : '$channelAssetsPath${entry.value}-icon.svg';
        }
      }
      if (cleanUrl.contains('Channel_Logos/')) {
        final filename = cleanUrl.split('Channel_Logos/').last.replaceAll('/', '');
        final candidate = filename
            .replaceAll('-badge.svg', '')
            .replaceAll('-icon.svg', '')
            .replaceAll('.svg', '');
        final norm = normalizeSlug(candidate);
        if (norm != null) {
          return preferBadge
              ? '$channelAssetsPath$norm-badge.svg'
              : '$channelAssetsPath$norm-icon.svg';
        }
        return '$channelAssetsPath$filename';
      }
    }

    return null;
  }

  /// Check if channel has a local logo
  static bool hasLocalLogo(String? slug) {
    if (slug == null) return false;
    return normalizeSlug(slug) != null;
  }

  /// Fallback background gradient colors for 19 Live Categories
  static int getFallbackColor(String? category) {
    switch (category?.toUpperCase()) {
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

  /// Get initial letter for fallback display
  static String getInitial(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final trimmed = name.trim();
    if (trimmed.startsWith('Omni ')) {
      final after = trimmed.substring(5).trim();
      if (after.isNotEmpty) return after[0].toUpperCase();
    }
    return trimmed[0].toUpperCase();
  }
}
