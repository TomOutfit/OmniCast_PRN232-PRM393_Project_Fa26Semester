// OmniCast - Admin Models (Analytics, Users, Audit Logs)

class AdminOverviewModel {
  final int totalUsers;
  final int activeUsers;
  final int deactivatedUsers;
  final int viewersCount;
  final int staffCount;
  final int adminCount;
  final int newUsers7d;

  final int totalChannels;
  final int activeChannels;
  final int featuredChannels;

  final int recordingsCount;
  final int liveEventsCount;
  final int activeLiveCount;

  final int totalAuditLogs;
  final int auditLogs24h;
  final List<AdminTopAction> topActions;

  final String systemStatus;
  final int uptimeSeconds;
  final int memoryUsageMb;
  final String nodeVersion;

  AdminOverviewModel({
    required this.totalUsers,
    required this.activeUsers,
    required this.deactivatedUsers,
    required this.viewersCount,
    required this.staffCount,
    required this.adminCount,
    required this.newUsers7d,
    required this.totalChannels,
    required this.activeChannels,
    required this.featuredChannels,
    required this.recordingsCount,
    required this.liveEventsCount,
    required this.activeLiveCount,
    required this.totalAuditLogs,
    required this.auditLogs24h,
    required this.topActions,
    required this.systemStatus,
    required this.uptimeSeconds,
    required this.memoryUsageMb,
    required this.nodeVersion,
  });

  factory AdminOverviewModel.fromJson(Map<String, dynamic> json) {
    final users = json['users'] as Map<String, dynamic>? ?? {};
    final roles = users['roles'] as Map<String, dynamic>? ?? {};
    final channels = json['channels'] as Map<String, dynamic>? ?? {};
    final broadcasts = json['broadcasts'] as Map<String, dynamic>? ?? {};
    final security = json['security'] as Map<String, dynamic>? ?? {};
    final system = json['system'] as Map<String, dynamic>? ?? {};

    final topActionsRaw = security['topActions'] as List<dynamic>? ?? [];
    final actionsList = topActionsRaw
        .map((a) => AdminTopAction.fromJson(a as Map<String, dynamic>))
        .toList();

    return AdminOverviewModel(
      totalUsers: users['total'] as int? ?? 0,
      activeUsers: users['active'] as int? ?? 0,
      deactivatedUsers: users['deactivated'] as int? ?? 0,
      viewersCount: roles['viewer'] as int? ?? 0,
      staffCount: roles['staff'] as int? ?? 0,
      adminCount: roles['admin'] as int? ?? 0,
      newUsers7d: users['newLast7Days'] as int? ?? 0,
      totalChannels: channels['total'] as int? ?? 0,
      activeChannels: channels['active'] as int? ?? 0,
      featuredChannels: channels['featured'] as int? ?? 0,
      recordingsCount: broadcasts['recordingsCount'] as int? ?? 0,
      liveEventsCount: broadcasts['liveEventsCount'] as int? ?? 0,
      activeLiveCount: broadcasts['activeLiveCount'] as int? ?? 0,
      totalAuditLogs: security['totalAuditLogs'] as int? ?? 0,
      auditLogs24h: security['auditLogsLast24h'] as int? ?? 0,
      topActions: actionsList,
      systemStatus: system['status'] as String? ?? 'OPERATIONAL',
      uptimeSeconds: system['uptimeSeconds'] as int? ?? 0,
      memoryUsageMb: system['memoryUsageMb'] as int? ?? 0,
      nodeVersion: system['nodeVersion'] as String? ?? '',
    );
  }
}

class AdminTopAction {
  final String action;
  final int count;

  AdminTopAction({required this.action, required this.count});

  factory AdminTopAction.fromJson(Map<String, dynamic> json) {
    return AdminTopAction(
      action: json['action'] as String? ?? '',
      count: json['count'] as int? ?? 0,
    );
  }
}

class AdminUserModel {
  final String id;
  final String email;
  final String fullName;
  final String? avatarUrl;
  final String role;
  final bool isActive;
  final String? bio;
  final DateTime? lastLoginAt;
  final DateTime? createdAt;

  AdminUserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.avatarUrl,
    required this.role,
    required this.isActive,
    this.bio,
    this.lastLoginAt,
    this.createdAt,
  });

  factory AdminUserModel.fromJson(Map<String, dynamic> json) {
    return AdminUserModel(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      role: (json['role'] as String? ?? 'VIEWER').toUpperCase(),
      isActive: json['isActive'] as bool? ?? true,
      bio: json['bio'] as String?,
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.tryParse(json['lastLoginAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }

  bool get isAdmin => role == 'ADMIN' || role == '3';
  bool get isStaff => role == 'STAFF' || role == '1';
  bool get isViewer => role == 'VIEWER' || role == '2';
}

class AdminAuditLogModel {
  final String id;
  final String? userId;
  final String? userEmail;
  final String action;
  final String? entityType;
  final String? entityId;
  final dynamic oldValues;
  final dynamic newValues;
  final String? ipAddress;
  final DateTime? createdAt;

  AdminAuditLogModel({
    required this.id,
    this.userId,
    this.userEmail,
    required this.action,
    this.entityType,
    this.entityId,
    this.oldValues,
    this.newValues,
    this.ipAddress,
    this.createdAt,
  });

  factory AdminAuditLogModel.fromJson(Map<String, dynamic> json) {
    return AdminAuditLogModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String?,
      userEmail: json['userEmail'] as String?,
      action: json['action'] as String? ?? '',
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      oldValues: json['oldValues'],
      newValues: json['newValues'],
      ipAddress: json['ipAddress'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
    );
  }
}
