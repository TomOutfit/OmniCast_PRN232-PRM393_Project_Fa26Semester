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
  });

  factory ChannelModel.fromJson(Map<String, dynamic> json) {
    final liveEvents = json['liveEvents'] as List?;
    final isCurrentlyLive = liveEvents != null && liveEvents.isNotEmpty;

    return ChannelModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
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
      isLive: isCurrentlyLive,
      currentProgram: isCurrentlyLive ? liveEvents.first['title'] as String? : null,
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
      default:
        return category;
    }
  }
}
