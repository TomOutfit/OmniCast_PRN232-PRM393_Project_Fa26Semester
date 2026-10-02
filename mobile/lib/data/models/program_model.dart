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

  /// True when the program was synthesised by the backend EPG service to
  /// fill a 24-hour grid that would otherwise be empty. These slots replay
  /// a previously-published recording (or fall back to a branded placeholder
  /// when no recordings are available).
  final bool isFiller;

  /// 'recording-replay' or 'channel-branding' when [isFiller] is true.
  final String? fillerKind;

  /// When [fillerKind] is `recording-replay`, the ID of the underlying
  /// Recording so the client can navigate to its detail page.
  final String? sourceRecordingId;

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
    this.isFiller = false,
    this.fillerKind,
    this.sourceRecordingId,
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
      tags: json['tags'] is List
          ? (json['tags'] as List).map((e) => e.toString()).toList()
          : json['tags'] is String
              ? (json['tags'] as String)
                  .split(RegExp(r'[, ]+'))
                  .where((s) => s.isNotEmpty)
                  .toList()
              : [],
      autoRecord: json['autoRecord'] as bool? ?? true,
      slowMode: json['slowMode'] as bool? ?? false,
      chatEnabled: json['chatEnabled'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      channel: json['channel'] != null
          ? ChannelInfo.fromJson(json['channel'] as Map<String, dynamic>)
          : null,
      isFiller: json['isFiller'] as bool? ?? false,
      fillerKind: json['fillerKind'] as String?,
      sourceRecordingId: json['sourceRecordingId'] as String?,
    );
  }

  bool get isLive => status == 'LIVE';
  bool get isScheduled => status == 'SCHEDULED';
  bool get hasEnded => status == 'ENDED';

  /// The duration normalized to minutes.
  /// Backend stores duration in seconds when > 1440 (24h in minutes).
  int get durationMinutes {
    if (duration == null) return 120;
    if (duration! > 1440) {
      final m = (duration! / 60).round();
      return m < 1 ? 1 : m;
    }
    return duration!;
  }

  DateTime get endTime {
    if (endedAt != null) return endedAt!;
    return scheduledAt.add(Duration(minutes: durationMinutes));
  }

  Duration get remainingTime {
    final now = DateTime.now();
    if (now.isAfter(endTime)) return Duration.zero;
    return endTime.difference(now);
  }

  /// Human-friendly duration string (e.g. '45 p', '1h', '2h 30p')
  String get formattedDuration {
    final mins = durationMinutes;
    if (mins < 60) return '$mins p';
    final h = mins ~/ 60;
    final m = mins % 60;
    if (m == 0) return '${h}h';
    return '${h}h ${m}p';
  }
}

class ChannelInfo {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String? category;

  ChannelInfo({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.category,
  });

  factory ChannelInfo.fromJson(Map<String, dynamic> json) {
    return ChannelInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      logoUrl: json['logoUrl'] as String?,
      category: json['category'] as String?,
    );
  }
}
