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
      'omni-sport-1',
      'omni-sport-2',
      'omni-show',
      'omni-entertain',
      'omni-cine',
      'omni-drama',
      'omni-news',
      'omni-kids',
      'omni-music',
      'omni-tech',
      'omni-food',
      'omni-discovery',
    ];
    return supportedChannels.contains(slug);
  }

  // Get fallback color for channel based on category
  static int getFallbackColor(String category) {
    switch (category) {
      case 'SPORTS':
        return 0xFFFF3B30; // Red
      case 'SHOW':
        return 0xFFFF2A6D; // Pink
      case 'ENTERTAINMENT':
        return 0xFFFF2A85; // Magenta
      case 'CINE':
        return 0xFFFF8C00; // Orange
      case 'DRAMA':
        return 0xFFFF2A55; // Red-pink
      case 'NEWS':
        return 0xFF0099FF; // Blue
      case 'MUSIC':
        return 0xFF9B59B6; // Purple
      case 'KIDS':
        return 0xFF10B981; // Green
      case 'TECH':
        return 0xFF00E5FF; // Cyan
      case 'FOOD':
        return 0xFFFFD600; // Yellow
      case 'DISCOVERY':
        return 0xFF00C9A7; // Teal
      default:
        return 0xFF6366F1; // Indigo
    }
  }

  // Get initial letter for fallback display
  static String getInitial(String name) {
    if (name.isEmpty) return '?';
    return name.charAt(0).toUpperCase();
  }
}
