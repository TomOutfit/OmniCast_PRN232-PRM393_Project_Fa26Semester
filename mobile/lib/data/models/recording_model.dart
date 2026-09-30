// OmniCast - Recording (VOD) Model
//
// Lightweight DTO shared across the `Recordings` BLoC, screens and
// any widget that needs to render a single VOD entry. Mirrors the
// Frontend `Recording` TypeScript type (`/types/index.ts`) so the
// two clients stay perfectly in sync.

import 'program_model.dart';

class RecordingModel {
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final String contentSource;
  final String? externalUrl;
  final String? externalPlatform;
  final String? externalId;
  final String? videoUrl;
  final String? embedCode;
  final int duration;
  final String? quality;
  final String? contentType;
  final String? language;
  final String? category;
  final int viewCount;
  final int likeCount;
  final int commentCount;
  final int shareCount;
  final bool isFeatured;
  final bool isPublished;
  final bool isAgeRestricted;
  final String channelId;
  final ChannelInfo? channel;
  final DateTime publishedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String> tags;

  RecordingModel({
    required this.id,
    required this.title,
    this.description,
    this.thumbnailUrl,
    required this.contentSource,
    this.externalUrl,
    this.externalPlatform,
    this.externalId,
    this.videoUrl,
    this.embedCode,
    required this.duration,
    this.quality,
    this.contentType,
    this.language,
    this.category,
    required this.viewCount,
    required this.likeCount,
    required this.commentCount,
    required this.shareCount,
    this.isFeatured = false,
    this.isPublished = true,
    this.isAgeRestricted = false,
    required this.channelId,
    this.channel,
    required this.publishedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.tags = const [],
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory RecordingModel.fromJson(Map<String, dynamic> json) {
    final channelJson = json['channel'] as Map<String, dynamic>?;
    final channelInfo = channelJson != null
        ? ChannelInfo.fromJson(channelJson)
        : null;

    return RecordingModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      contentSource: json['contentSource'] as String? ?? 'EXTERNAL',
      externalUrl: json['externalUrl'] as String?,
      externalPlatform: json['externalPlatform'] as String?,
      externalId: json['externalId'] as String?,
      videoUrl: json['videoUrl'] as String?,
      embedCode: json['embedCode'] as String?,
      duration: json['duration'] as int? ?? 0,
      quality: json['quality'] as String?,
      contentType: json['contentType'] as String?,
      language: json['language'] as String?,
      category: json['category'] as String?,
      // Backend may serialize counts as BigInt / String; coerce safely.
      viewCount: _coerceInt(json['viewCount']),
      likeCount: _coerceInt(json['likeCount']),
      commentCount: _coerceInt(json['commentCount']),
      shareCount: _coerceInt(json['shareCount']),
      isFeatured: json['isFeatured'] as bool? ?? false,
      isPublished: json['isPublished'] as bool? ?? true,
      isAgeRestricted: json['isAgeRestricted'] as bool? ?? false,
      channelId: (json['channelId'] as String?) ?? channelInfo?.id ?? '',
      channel: channelInfo,
      publishedAt: _parseDate(json['publishedAt']) ?? DateTime.now(),
      createdAt: _parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: _parseDate(json['updatedAt']) ?? DateTime.now(),
      tags: (json['tags'] as List?)?.cast<String>() ?? const [],
    );
  }

  String get formattedDuration {
    final hours = duration ~/ 3600;
    final minutes = (duration % 3600) ~/ 60;
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }

  /// Best candidate for playback (mirrors the Frontend selection order).
  String? get playableSrc {
    final candidates = <String?>[videoUrl, externalUrl, embedCode];
    for (final c in candidates) {
      if (c != null && c.isNotEmpty) return c;
    }
    return null;
  }

  /// True when the playable src is an HLS playlist.
  bool get isHls {
    final src = playableSrc;
    if (src == null) return false;
    return src.toLowerCase().contains('.m3u8');
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'thumbnailUrl': thumbnailUrl,
        'contentSource': contentSource,
        'externalUrl': externalUrl,
        'externalPlatform': externalPlatform,
        'externalId': externalId,
        'videoUrl': videoUrl,
        'embedCode': embedCode,
        'duration': duration,
        'quality': quality,
        'contentType': contentType,
        'language': language,
        'category': category,
        'viewCount': viewCount,
        'likeCount': likeCount,
        'commentCount': commentCount,
        'shareCount': shareCount,
        'isFeatured': isFeatured,
        'isPublished': isPublished,
        'isAgeRestricted': isAgeRestricted,
        'channelId': channelId,
        'channel': channel == null
            ? null
            : {
                'id': channel!.id,
                'name': channel!.name,
                'slug': channel!.slug,
                'logoUrl': channel!.logoUrl,
              },
        'publishedAt': publishedAt.toIso8601String(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'tags': tags,
      };

  static int _coerceInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    if (value is bool) return value ? 1 : 0;
    return 0;
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is String && value.isEmpty) return null;
    try {
      return DateTime.parse(value.toString());
    } catch (_) {
      return null;
    }
  }
}
