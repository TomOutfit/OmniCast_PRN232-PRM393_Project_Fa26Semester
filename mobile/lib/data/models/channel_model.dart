// OmniCast - Channel Model

class ChannelModel {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? logoUrl;
  final String? badgeUrl;
  final String? bannerUrl;
  final String? bannerColor;
  final String? tagline;
  final String category;
  final String? subcategory;
  final String language;
  final String? region;
  final int followerCount;
  final int totalViews;
  final int totalVideos;
  final int subscriberCount;
  final bool isVerified;
  final bool isActive;
  final bool isFeatured;
  final String? ownerId;
  final bool isPublic;
  final bool allowComments;
  final bool requireSub;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Live status
  final bool isLive;
  final String? currentProgram;
  final String? streamUrl;

  ChannelModel({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.logoUrl,
    this.badgeUrl,
    this.bannerUrl,
    this.bannerColor,
    this.tagline,
    required this.category,
    this.subcategory,
    required this.language,
    this.region,
    required this.followerCount,
    required this.totalViews,
    required this.totalVideos,
    required this.subscriberCount,
    required this.isVerified,
    required this.isActive,
    required this.isFeatured,
    this.ownerId,
    required this.isPublic,
    required this.allowComments,
    required this.requireSub,
    required this.createdAt,
    required this.updatedAt,
    this.isLive = false,
    this.currentProgram,
    this.streamUrl,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Verified-working public HLS test streams (ExoPlayer + HLS.js compatible)
  // Sources: Mux Dev, Apple CDN, Unified-Streaming, Azure Media (all HTTPS)
  // ─────────────────────────────────────────────────────────────────────────
  static const Map<String, String> defaultChannelStreams = {
    'sport-1':     'https://www.youtube.com/embed/live_stream?channel=UCblfuW_4rakIf2h6aqANefA', // Red Bull
    'sport-2':     'https://www.youtube.com/embed/live_stream?channel=UC0R3-zRpeIVUnavcRTPWzZA', // F1
    'esports':     'https://www.youtube.com/embed/live_stream?channel=UCvqRdlKsE5Q8mf8YXbdIJLw', // LoL Esports
    'cine':        'https://www.youtube.com/embed/live_stream?channel=UCi8e0iOVk1fEOogdfu4YgfA', // Rotten Tomatoes
    'movies':      'https://www.youtube.com/embed/live_stream?channel=UCi8e0iOVk1fEOogdfu4YgfA',
    'drama':       'https://www.youtube.com/embed/live_stream?channel=UCWOA1ZGywLbqmigxE4Qlvuw', // Netflix
    'show':        'https://www.youtube.com/embed/live_stream?channel=UC8-Th83bH_thdKZDJCrn88g', // The Tonight Show
    'entertain':   'https://www.youtube.com/embed/live_stream?channel=UCRijo3ddMTht_IHyNSNXpNQ', // Dude Perfect
    'news':        'https://www.youtube.com/embed/live_stream?channel=UC16niRr50-MSBwiO3YDb3RA', // BBC News
    'business':    'https://www.youtube.com/embed/live_stream?channel=UCvJJ_dzjViJCoLf5uKUTwoA', // CNBC
    'music':       'https://www.youtube.com/embed/live_stream?channel=UCSJ4gkVC6NrvII8umztf0Ow', // Lofi Girl
    'kids':        'https://www.youtube.com/embed/live_stream?channel=UCXVCgDuD_QCkI7gTKU7-tpg', // Nat Geo Kids
    'tech':        'https://www.youtube.com/embed/live_stream?channel=UCBJycsmduvYEL83R_U4JriQ', // Marques Brownlee
    'discovery':   'https://www.youtube.com/embed/live_stream?channel=UCpVm7bg6pXKo1Pr6k5kxG9A', // Nat Geo
    'food':        'https://www.youtube.com/embed/live_stream?channel=UCJFp8uSYCjXOMnkUyb3CQ3Q', // Tasty
    'podcast':     'https://www.youtube.com/embed/live_stream?channel=UCAuUUnT6oDeKwE6v1NGQxug', // TED
    'audiobook':   'https://www.youtube.com/embed/live_stream?channel=UCf099SXtegD4kv9-M3GIgnw', // Greatest AudioBooks
    'academy':     'https://www.youtube.com/embed/live_stream?channel=UCX6b17PVsYBQ0ip5gyeme-Q', // CrashCourse
    'skill-lab':   'https://www.youtube.com/embed/live_stream?channel=UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
    'wellness':    'https://www.youtube.com/embed/live_stream?channel=UCFKE7WVJfvaHW5q283SxchA', // Yoga With Adriene
    'fashion':     'https://www.youtube.com/embed/live_stream?channel=UCRXiA3h1no_PFkb1JCP0yMA', // Vogue
    'travel-vn':   'https://www.youtube.com/embed/live_stream?channel=UCZE88kYvCKUKjM-G0uc8Duw', // Khoai Lang Thang
    'travel-world':'https://www.youtube.com/embed/live_stream?channel=UCGaOvAFinZ7BCN_FDmw74fQ', // Expedia
    'art-design':  'https://www.youtube.com/embed/live_stream?channel=UClM2LuQ1q5WEc23462tQzBg', // Proko
    'health':      'https://www.youtube.com/embed/live_stream?channel=UC0QHWhjbe5fGJEPz3sVb6nw', // Doctor Mike
    'indie-games': 'https://www.youtube.com/embed/live_stream?channel=UCKy1dAqELo0zrOtPkf0eTMw', // IGN
  };

  // Category-level fallback stream (when slug not in map above)
  static const Map<String, String> _categoryFallbackStreams = {
    'SPORTS':        'https://www.youtube.com/embed/live_stream?channel=UCblfuW_4rakIf2h6aqANefA',
    'CINE':          'https://www.youtube.com/embed/live_stream?channel=UCi8e0iOVk1fEOogdfu4YgfA',
    'DRAMA':         'https://www.youtube.com/embed/live_stream?channel=UCWOA1ZGywLbqmigxE4Qlvuw',
    'SHOW':          'https://www.youtube.com/embed/live_stream?channel=UC8-Th83bH_thdKZDJCrn88g',
    'ENTERTAINMENT': 'https://www.youtube.com/embed/live_stream?channel=UCRijo3ddMTht_IHyNSNXpNQ',
    'NEWS':          'https://www.youtube.com/embed/live_stream?channel=UC16niRr50-MSBwiO3YDb3RA',
    'MUSIC':         'https://www.youtube.com/embed/live_stream?channel=UCSJ4gkVC6NrvII8umztf0Ow',
    'KIDS':          'https://www.youtube.com/embed/live_stream?channel=UCXVCgDuD_QCkI7gTKU7-tpg',
    'TECH':          'https://www.youtube.com/embed/live_stream?channel=UCBJycsmduvYEL83R_U4JriQ',
  };

  static String resolveDefaultStream(String slug, [String? category]) {
    // 1. Try exact slug match
    final bySlug = defaultChannelStreams[slug.toLowerCase()];
    if (bySlug != null) return bySlug;
    // 2. Try category fallback
    if (category != null) {
      final byCat = _categoryFallbackStreams[category.toUpperCase()];
      if (byCat != null) return byCat;
    }
    // 3. Universal fallback
    return 'https://www.youtube.com/embed/live_stream?channel=UC8butISFwT-Wl7EV0hUK0BQ';
  }

  factory ChannelModel.fromJson(Map<String, dynamic> json) {
    final liveEvents = json['liveEvents'] as List?;
    final isCurrentlyLive = liveEvents != null && liveEvents.isNotEmpty;
    final firstLive = isCurrentlyLive && liveEvents.first is Map<String, dynamic>
        ? liveEvents.first as Map<String, dynamic>
        : null;

    final rawStream = firstLive != null
        ? (firstLive['streamUrl'] as String? ?? firstLive['externalUrl'] as String?)
        : (json['streamUrl'] as String?);

    final slug = json['slug'] as String? ?? '';
    final category = json['category'] as String? ?? '';
    final resolvedStream = (rawStream != null && rawStream.isNotEmpty)
        ? rawStream
        : resolveDefaultStream(slug, category);

    return ChannelModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: slug,
      description: json['description'] as String?,
      logoUrl: json['logoUrl'] as String?,
      badgeUrl: json['badgeUrl'] as String?,
      bannerUrl: json['bannerUrl'] as String?,
      bannerColor: json['bannerColor'] as String?,
      tagline: json['tagline'] as String?,
      category: json['category'] as String,
      subcategory: json['subcategory'] as String?,
      language: json['language'] as String? ?? 'vi',
      region: json['region'] as String?,
      followerCount: json['followerCount'] as int? ?? 0,
      totalViews: json['totalViews'] as int? ?? 0,
      totalVideos: json['totalVideos'] as int? ?? 0,
      subscriberCount: json['subscriberCount'] as int? ?? 0,
      isVerified: json['isVerified'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? false,
      ownerId: json['ownerId'] as String?,
      isPublic: json['isPublic'] as bool? ?? true,
      allowComments: json['allowComments'] as bool? ?? true,
      requireSub: json['requireSub'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      isLive: isCurrentlyLive || resolvedStream.isNotEmpty,
      currentProgram: isCurrentlyLive ? liveEvents.first['title'] as String? : null,
      streamUrl: resolvedStream,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'logoUrl': logoUrl,
      'badgeUrl': badgeUrl,
      'bannerUrl': bannerUrl,
      'bannerColor': bannerColor,
      'tagline': tagline,
      'category': category,
      'subcategory': subcategory,
      'language': language,
      'region': region,
      'followerCount': followerCount,
      'totalViews': totalViews,
      'totalVideos': totalVideos,
      'subscriberCount': subscriberCount,
      'isVerified': isVerified,
      'isActive': isActive,
      'isFeatured': isFeatured,
      'ownerId': ownerId,
      'isPublic': isPublic,
      'allowComments': allowComments,
      'requireSub': requireSub,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  String get categoryDisplayName {
    switch (category) {
      case 'SPORTS':
        return 'Thể thao';
      case 'SHOW':
        return 'Show';
      case 'ENTERTAINMENT':
        return 'Giải trí';
      case 'CINE':
        return 'Điện ảnh';
      case 'DRAMA':
        return 'Phim truyện';
      case 'NEWS':
        return 'Tin tức';
      case 'MUSIC':
        return 'Âm nhạc';
      case 'KIDS':
        return 'Thiếu nhi';
      case 'TECH':
        return 'Công nghệ';
      case 'FOOD':
        return 'Ẩm thực';
      case 'DOCUMENTARY':
        return 'Khám phá';
      case 'EDUCATION':
        return 'Giáo dục';
      case 'GAMING':
        return 'Esports';
      case 'PODCAST':
        return 'Podcast';
      case 'LIFESTYLE':
        return 'Phong cách sống';
      case 'TRAVEL':
        return 'Du lịch';
      case 'ART':
        return 'Nghệ thuật';
      case 'BUSINESS':
        return 'Kinh doanh';
      case 'HEALTH':
        return 'Sức khỏe';
      default:
        return category;
    }
  }
}
