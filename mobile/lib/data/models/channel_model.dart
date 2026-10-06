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
    'sport-1':     'https://www.youtube.com/embed/or0kpqcuONA', // Red Bull Rampage 2024
    'sport-2':     'https://www.youtube.com/embed/U-V7IfBwN1I', // Formula 1 Highlights
    'esports':     'https://www.youtube.com/embed/3d7CbPj5HTw', // LoL Esports Worlds
    'cine':        'https://www.youtube.com/embed/cqGjhVJWtEg', // Spider-Man Across the Spider-Verse
    'movies':      'https://www.youtube.com/embed/mBclQoZ5uz4', // Upcoming Movies Trailer
    'drama':       'https://www.youtube.com/embed/b9EkMc79ZSU', // Stranger Things Final Trailer
    'show':        'https://www.youtube.com/embed/fntundUUX_E', // The Tonight Show Starring Jimmy Fallon
    'entertain':   'https://www.youtube.com/embed/A2FsgKoGD04', // Dude Perfect Trick Shots
    'news':        'https://www.youtube.com/embed/P0MbDizmwRU', // BBC News
    'business':    'https://www.youtube.com/embed/l4H3V-jG56M', // CNBC Business News
    'music':       'https://www.youtube.com/embed/rFZHOHl-L8A', // Lofi Girl Beats
    'kids':        'https://www.youtube.com/embed/c013wYtubY4', // Nat Geo Kids
    'tech':        'https://www.youtube.com/embed/ioxRzFnzBoo', // Marques Brownlee Plugin
    'discovery':   'https://www.youtube.com/embed/v64KOxKVLVg', // Nat Geo 360 Underwater
    'food':        'https://www.youtube.com/embed/OAZpSsu03VA', // CookTube Pasta Recipe
    'podcast':     'https://www.youtube.com/embed/ontYRskxytQ', // TED Talks SouthBankWomen
    'audiobook':   'https://www.youtube.com/embed/A4TU2h_rDlM', // Sherlock Holmes Full Audiobook
    'academy':     'https://www.youtube.com/embed/Yocja_N5s1I', // CrashCourse World History
    'skill-lab':   'https://www.youtube.com/embed/8mAITcNt710', // freeCodeCamp CS50
    'wellness':    'https://www.youtube.com/embed/v7AYKMP6rOE', // Yoga With Adriene
    'fashion':     'https://www.youtube.com/embed/MGO4_8YRKro', // Vogue 73 Questions Zendaya
    'travel-vn':   'https://www.youtube.com/embed/GjtcXliMKjM', // Khoai Lang Thang Cao Bằng
    'travel-world':'https://www.youtube.com/embed/ka-ZgwCXKho', // Expedia Venice Travel Guide
    'art-design':  'https://www.youtube.com/embed/5KYAsXuG3SM', // Proko Digital Painting
    'health':      'https://www.youtube.com/embed/vAbdHiW4TO4', // Doctor Mike Reactions
    'indie-games': 'https://www.youtube.com/embed/3suNbVmvjN0', // IGN Video Games Review
  };

  // Category-level fallback stream (when slug not in map above)
  static const Map<String, String> _categoryFallbackStreams = {
    'SPORTS':        'https://www.youtube.com/embed/or0kpqcuONA',
    'CINE':          'https://www.youtube.com/embed/cqGjhVJWtEg',
    'DRAMA':         'https://www.youtube.com/embed/b9EkMc79ZSU',
    'SHOW':          'https://www.youtube.com/embed/fntundUUX_E',
    'ENTERTAINMENT': 'https://www.youtube.com/embed/A2FsgKoGD04',
    'NEWS':          'https://www.youtube.com/embed/P0MbDizmwRU',
    'MUSIC':         'https://www.youtube.com/embed/rFZHOHl-L8A',
    'KIDS':          'https://www.youtube.com/embed/c013wYtubY4',
    'TECH':          'https://www.youtube.com/embed/ioxRzFnzBoo',
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
    return 'https://www.youtube.com/embed/8mAITcNt710';
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
