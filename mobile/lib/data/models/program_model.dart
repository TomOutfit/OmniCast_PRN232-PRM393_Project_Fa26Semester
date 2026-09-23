// OmniCast - Program/Live Event Model

class LiveEventModel {
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final String contentSource;
  final String? externalPlatform;
  final String? externalId;
  final String? externalUrl;
  final String? embedCode;
  final String? streamUrl;
  final String? streamKey;
  final bool isPrivate;
  final String? streamPassword;
  final String quality;
  final String language;
  final String status;
  final DateTime scheduledAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final int? duration;
  final int viewerCount;
  final int peakViewers;
  final int likeCount;
  final int commentCount;
  final int shareCount;
  final String channelId;
  final List<String> tags;
  final bool autoRecord;
  final bool slowMode;
  final bool chatEnabled;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Channel info
  final ChannelInfo? channel;

  LiveEventModel({
    required this.id,
    required this.title,
    this.description,
    this.thumbnailUrl,
    required this.contentSource,
    this.externalPlatform,
    this.externalId,
    this.externalUrl,
    this.embedCode,
    this.streamUrl,
    this.streamKey,
    required this.isPrivate,
    this.streamPassword,
    required this.quality,
    required this.language,
    required this.status,
    required this.scheduledAt,
    this.startedAt,
    this.endedAt,
    this.duration,
    required this.viewerCount,
    required this.peakViewers,
    required this.likeCount,
    required this.commentCount,
    required this.shareCount,
    required this.channelId,
    required this.tags,
    required this.autoRecord,
    required this.slowMode,
    required this.chatEnabled,
    required this.createdAt,
    required this.updatedAt,
    this.channel,
  });

  factory LiveEventModel.fromJson(Map<String, dynamic> json) {
    return LiveEventModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      contentSource: json['contentSource'] as String? ?? 'EXTERNAL',
      externalPlatform: json['externalPlatform'] as String?,
      externalId: json['externalId'] as String?,
      externalUrl: json['externalUrl'] as String?,
      embedCode: json['embedCode'] as String?,
      streamUrl: json['streamUrl'] as String?,
      streamKey: json['streamKey'] as String?,
      isPrivate: json['isPrivate'] as bool? ?? false,
      streamPassword: json['streamPassword'] as String?,
      quality: json['quality'] as String? ?? 'AUTO',
      language: json['language'] as String? ?? 'vi',
      status: json['status'] as String,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      startedAt: json['startedAt'] != null
          ? DateTime.parse(json['startedAt'] as String)
          : null,
      endedAt: json['endedAt'] != null
          ? DateTime.parse(json['endedAt'] as String)
          : null,
      duration: json['duration'] as int?,
      viewerCount: json['viewerCount'] as int? ?? 0,
      peakViewers: json['peakViewers'] as int? ?? 0,
      likeCount: json['likeCount'] as int? ?? 0,
      commentCount: json['commentCount'] as int? ?? 0,
      shareCount: json['shareCount'] as int? ?? 0,
      channelId: json['channelId'] as String,
      tags: (json['tags'] as List?)?.cast<String>() ?? [],
      autoRecord: json['autoRecord'] as bool? ?? true,
      slowMode: json['slowMode'] as bool? ?? false,
      chatEnabled: json['chatEnabled'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      channel: json['channel'] != null
          ? ChannelInfo.fromJson(json['channel'] as Map<String, dynamic>)
          : null,
    );
  }

  bool get isLive => status == 'LIVE';
  bool get isScheduled => status == 'SCHEDULED';
  bool get hasEnded => status == 'ENDED';

  DateTime get endTime {
    if (endedAt != null) return endedAt!;
    if (duration != null) {
      return scheduledAt.add(Duration(minutes: duration!));
    }
    return scheduledAt.add(const Duration(hours: 2));
  }

  Duration get remainingTime {
    final now = DateTime.now();
    if (now.isAfter(endTime)) return Duration.zero;
    return endTime.difference(now);
  }
}

class ChannelInfo {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;

  ChannelInfo({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
  });

  factory ChannelInfo.fromJson(Map<String, dynamic> json) {
    return ChannelInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      logoUrl: json['logoUrl'] as String?,
    );
  }
}
