// OmniCast - Notification Model
// ------------------------------------------------------------
// Mirrors the server's `NotificationItemDto`. We keep all
// fields nullable on the wire — the backend sometimes returns
// `null` for unused fields (e.g. `actorId` on system messages).
// ============================================================

import 'package:equatable/equatable.dart';

/// Mirrors the `NotificationType` enum on the backend.
enum NotificationType {
  newFollower,
  newVideo,
  liveStart,
  liveEnded,
  commentReply,
  commentMention,
  reaction,
  systemAnnouncement,
  unknown;

  /// Parse a raw string from the API into a typed enum.
  /// Anything we don't recognise falls back to [unknown] so the
  /// UI can still render the notification (icon fallback chain).
  static NotificationType fromWire(String? raw) {
    switch (raw) {
      case 'NEW_FOLLOWER':
        return NotificationType.newFollower;
      case 'NEW_VIDEO':
        return NotificationType.newVideo;
      case 'LIVE_START':
        return NotificationType.liveStart;
      case 'LIVE_ENDED':
        return NotificationType.liveEnded;
      case 'COMMENT_REPLY':
        return NotificationType.commentReply;
      case 'COMMENT_MENTION':
        return NotificationType.commentMention;
      case 'REACTION':
        return NotificationType.reaction;
      case 'SYSTEM_ANNOUNCEMENT':
        return NotificationType.systemAnnouncement;
      default:
        return NotificationType.unknown;
    }
  }

  String get wireName {
    switch (this) {
      case NotificationType.newFollower:
        return 'NEW_FOLLOWER';
      case NotificationType.newVideo:
        return 'NEW_VIDEO';
      case NotificationType.liveStart:
        return 'LIVE_START';
      case NotificationType.liveEnded:
        return 'LIVE_ENDED';
      case NotificationType.commentReply:
        return 'COMMENT_REPLY';
      case NotificationType.commentMention:
        return 'COMMENT_MENTION';
      case NotificationType.reaction:
        return 'REACTION';
      case NotificationType.systemAnnouncement:
        return 'SYSTEM_ANNOUNCEMENT';
      case NotificationType.unknown:
        return 'UNKNOWN';
    }
  }
}

class NotificationModel extends Equatable {
  final String id;
  final NotificationType type;
  final String title;
  final String? message;
  final String? actionUrl;
  final String? actorId;
  final String? actorName;
  final String? actorAvatarUrl;
  final String? eventId;
  final String? recordingId;
  final String? channelId;
  final bool isRead;
  final DateTime? readAt;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    this.message,
    this.actionUrl,
    this.actorId,
    this.actorName,
    this.actorAvatarUrl,
    this.eventId,
    this.recordingId,
    this.channelId,
    required this.isRead,
    this.readAt,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String,
      type: NotificationType.fromWire(json['type'] as String?),
      title: json['title'] as String,
      message: json['message'] as String?,
      actionUrl: json['actionUrl'] as String?,
      actorId: json['actorId'] as String?,
      actorName: json['actorName'] as String?,
      actorAvatarUrl: json['actorAvatarUrl'] as String?,
      eventId: json['eventId'] as String?,
      recordingId: json['recordingId'] as String?,
      channelId: json['channelId'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      readAt: json['readAt'] != null
          ? DateTime.parse(json['readAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// Returns a new instance with the supplied fields replaced.
  /// Used by the BLoC's optimistic update path.
  NotificationModel copyWith({
    bool? isRead,
    DateTime? readAt,
  }) {
    return NotificationModel(
      id: id,
      type: type,
      title: title,
      message: message,
      actionUrl: actionUrl,
      actorId: actorId,
      actorName: actorName,
      actorAvatarUrl: actorAvatarUrl,
      eventId: eventId,
      recordingId: recordingId,
      channelId: channelId,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt,
    );
  }

  /// "5m", "2h", "3d" — best-effort relative time. Falls back to
  /// an ISO date string for ancient or invalid timestamps.
  String get timeAgo {
    final ms = DateTime.now().difference(createdAt).inMilliseconds;
    if (ms < 0) return createdAt.toIso8601String();
    final s = ms ~/ 1000;
    if (s < 60) return '${s}s';
    final m = s ~/ 60;
    if (m < 60) return '${m}m';
    final h = m ~/ 60;
    if (h < 24) return '${h}h';
    final d = h ~/ 24;
    if (d < 30) return '${d}d';
    return createdAt.toIso8601String().split('T').first;
  }

  @override
  List<Object?> get props => [
        id,
        type,
        title,
        message,
        actionUrl,
        actorId,
        actorName,
        actorAvatarUrl,
        eventId,
        recordingId,
        channelId,
        isRead,
        readAt,
        createdAt,
      ];
}

/// Server response shape for `GET /me/notifications`.
class NotificationListResponse {
  final int total;
  final int unreadCount;
  final List<NotificationModel> items;

  const NotificationListResponse({
    required this.total,
    required this.unreadCount,
    required this.items,
  });

  factory NotificationListResponse.fromJson(Map<String, dynamic> json) {
    return NotificationListResponse(
      total: (json['total'] as num?)?.toInt() ?? 0,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      items: (json['items'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .map(NotificationModel.fromJson)
          .toList(),
    );
  }
}
