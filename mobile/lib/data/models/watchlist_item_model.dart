// OmniCast - Watchlist Item Model (SQLite)

class WatchlistItemModel {
  final int? id;
  final String programId;
  final String programTitle;
  final String? thumbnailUrl;
  final String? channelId;
  final String? channelName;
  final DateTime scheduledAt;
  final int? duration;
  final DateTime? reminderTime;
  final bool reminderEnabled;
  final DateTime addedAt;

  WatchlistItemModel({
    this.id,
    required this.programId,
    required this.programTitle,
    this.thumbnailUrl,
    this.channelId,
    this.channelName,
    required this.scheduledAt,
    this.duration,
    this.reminderTime,
    required this.reminderEnabled,
    required this.addedAt,
  });

  factory WatchlistItemModel.fromJson(Map<String, dynamic> json) {
    return WatchlistItemModel(
      id: json['id'] as int?,
      programId: json['programId'] as String,
      programTitle: json['programTitle'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      channelId: json['channelId'] as String?,
      channelName: json['channelName'] as String?,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      duration: json['duration'] as int?,
      reminderTime: json['reminderTime'] != null
          ? DateTime.parse(json['reminderTime'] as String)
          : null,
      reminderEnabled: (json['reminderEnabled'] as int?) == 1,
      addedAt: DateTime.parse(json['addedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'programId': programId,
      'programTitle': programTitle,
      'thumbnailUrl': thumbnailUrl,
      'channelId': channelId,
      'channelName': channelName,
      'scheduledAt': scheduledAt.toIso8601String(),
      'duration': duration,
      'reminderTime': reminderTime?.toIso8601String(),
      'reminderEnabled': reminderEnabled ? 1 : 0,
      'addedAt': addedAt.toIso8601String(),
    };
  }

  WatchlistItemModel copyWith({
    int? id,
    String? programId,
    String? programTitle,
    String? thumbnailUrl,
    String? channelId,
    String? channelName,
    DateTime? scheduledAt,
    int? duration,
    DateTime? reminderTime,
    bool? reminderEnabled,
    DateTime? addedAt,
  }) {
    return WatchlistItemModel(
      id: id ?? this.id,
      programId: programId ?? this.programId,
      programTitle: programTitle ?? this.programTitle,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      channelId: channelId ?? this.channelId,
      channelName: channelName ?? this.channelName,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      duration: duration ?? this.duration,
      reminderTime: reminderTime ?? this.reminderTime,
      reminderEnabled: reminderEnabled ?? this.reminderEnabled,
      addedAt: addedAt ?? this.addedAt,
    );
  }

  bool get isUpcoming => scheduledAt.isAfter(DateTime.now());
  bool get isPast => scheduledAt.isBefore(DateTime.now());
}
