// ============================================================
// OmniCast · Comment & Reaction Models (Realtime payload shape)
// ============================================================

class CommentModel {
  final String id;
  final String recordingId;
  final String? userId;
  final String content;
  final String? parentId;
  final int likeCount;
  final bool isPinned;
  final bool isEdited;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? authorDisplayName;
  final String? authorAvatarUrl;

  const CommentModel({
    required this.id,
    required this.recordingId,
    this.userId,
    required this.content,
    this.parentId,
    this.likeCount = 0,
    this.isPinned = false,
    this.isEdited = false,
    required this.createdAt,
    required this.updatedAt,
    this.authorDisplayName,
    this.authorAvatarUrl,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    return CommentModel(
      id: (json['id'] ?? '').toString(),
      recordingId: (json['recordingId'] ?? '').toString(),
      userId: json['userId']?.toString(),
      content: (json['content'] ?? '').toString(),
      parentId: json['parentId']?.toString(),
      likeCount: (json['likeCount'] is int)
          ? json['likeCount'] as int
          : int.tryParse(json['likeCount']?.toString() ?? '0') ?? 0,
      isPinned: json['isPinned'] == true,
      isEdited: json['isEdited'] == true,
      createdAt: _asDate(json['createdAt']),
      updatedAt: _asDate(json['updatedAt']),
      authorDisplayName: json['authorDisplayName']?.toString(),
      authorAvatarUrl: json['authorAvatarUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'recordingId': recordingId,
    'userId': userId,
    'content': content,
    'parentId': parentId,
    'likeCount': likeCount,
    'isPinned': isPinned,
    'isEdited': isEdited,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'authorDisplayName': authorDisplayName,
    'authorAvatarUrl': authorAvatarUrl,
  };

  static DateTime _asDate(dynamic v) {
    if (v is DateTime) return v;
    if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
    return DateTime.now();
  }
}

class ReactionModel {
  final String? id;
  final String? userId;
  final String recordingId;
  final String type; // HEART | FIRE | CLAP | WOW | SAD | ANGRY
  final DateTime createdAt;

  const ReactionModel({
    this.id,
    this.userId,
    required this.recordingId,
    required this.type,
    required this.createdAt,
  });

  factory ReactionModel.fromJson(Map<String, dynamic> json) {
    return ReactionModel(
      id: json['id']?.toString(),
      userId: json['userId']?.toString(),
      recordingId: (json['recordingId'] ?? '').toString(),
      type: (json['type'] ?? 'HEART').toString(),
      createdAt: _asDate(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'recordingId': recordingId,
    'type': type,
    'createdAt': createdAt.toIso8601String(),
  };

  String get compositeKey => '${userId ?? ''}_$type';

  static DateTime _asDate(dynamic v) {
    if (v is DateTime) return v;
    if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
    return DateTime.now();
  }
}
