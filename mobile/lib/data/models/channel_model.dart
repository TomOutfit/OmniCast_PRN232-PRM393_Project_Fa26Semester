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
    // Sports channels (Action / Sports Stream)
    'sport-1':   'https://test-streams.mux.dev/test_001/stream.m3u8',
    'sport-2':   'https://test-streams.mux.dev/test_001/stream.m3u8',
    'esports':   'https://test-streams.mux.dev/test_001/stream.m3u8',
    // Cinema / Movies (Tears of Steel)
    'cine':      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    'movies':    'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    // Drama / Series (Cosmos Laundromat)
    'drama':     'https://test-streams.mux.dev/pts_shift/master.m3u8',
    'show':      'https://test-streams.mux.dev/pts_shift/master.m3u8',
    'variety':   'https://test-streams.mux.dev/pts_shift/master.m3u8',
    // News channels (NASA Live / News Broadcast)
    'news':      'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    'news-2':    'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    'business':  'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    // Music (Concert / Variety)
    'music':     'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    'music-vn':  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    // Kids (3D Cartoon / Big Buck Bunny)
    'kids':      'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'entertain': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    // Tech / Discovery / Science / Education / Lifestyle
    'tech':      'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'discovery': 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'food':      'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'lifestyle': 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'travel':    'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'documentary': 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'education': 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'health':    'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    'art':       'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    'podcast':   'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  };

  // Category-level fallback stream (when slug not in map above)
  static const Map<String, String> _categoryFallbackStreams = {
    'SPORTS':        'https://test-streams.mux.dev/test_001/stream.m3u8',
    'CINE':          'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    'DRAMA':         'https://test-streams.mux.dev/pts_shift/master.m3u8',
    'SHOW':          'https://test-streams.mux.dev/pts_shift/master.m3u8',
    'ENTERTAINMENT': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'NEWS':          'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    'MUSIC':         'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    'KIDS':          'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'TECH':          'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
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
    // 3. Universal fallback (Mux dev stream – always works)
    return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
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
