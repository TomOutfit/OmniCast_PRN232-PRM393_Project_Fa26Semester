// OmniCast - User Model

class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String? avatarUrl;
  final String? bio;
  final String role;
  final bool isActive;
  final bool emailVerified;
  final int walletBalance;
  final DateTime? lastLoginAt;
  final DateTime createdAt;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.avatarUrl,
    this.bio,
    required this.role,
    required this.isActive,
    required this.emailVerified,
    this.walletBalance = 0,
    this.lastLoginAt,
    required this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['fullName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      bio: json['bio'] as String?,
      role: _normalizeRole(json['role']),
      isActive: json['isActive'] as bool? ?? true,
      emailVerified: json['emailVerified'] as bool? ?? false,
      walletBalance: (json['walletBalance'] as num?)?.toInt() ?? 0,
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.parse(json['lastLoginAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static String _normalizeRole(dynamic rawRole) {
    if (rawRole == null) return 'VIEWER';
    final str = rawRole.toString().toUpperCase().trim();
    if (str == '1' || str == 'STAFF') return 'STAFF';
    if (str == '2' || str == 'VIEWER') return 'VIEWER';
    if (str == '3' || str == 'ADMIN') return 'ADMIN';
    if (str == '0' || str == 'GUEST') return 'GUEST';
    return str;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'avatarUrl': avatarUrl,
      'bio': bio,
      'role': role,
      'isActive': isActive,
      'emailVerified': emailVerified,
      'walletBalance': walletBalance,
      'lastLoginAt': lastLoginAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? fullName,
    String? avatarUrl,
    String? bio,
    String? role,
    bool? isActive,
    bool? emailVerified,
    int? walletBalance,
    DateTime? lastLoginAt,
    DateTime? createdAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
      emailVerified: emailVerified ?? this.emailVerified,
      walletBalance: walletBalance ?? this.walletBalance,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  bool get isAdmin => role == 'ADMIN';
  bool get isStaff => role == 'STAFF';
  bool get isViewer => role == 'VIEWER';
  bool get isStaffOrAdmin => role == 'STAFF' || role == 'ADMIN';

  int get roleNumber {
    switch (role) {
      case 'ADMIN':
        return 3;
      case 'VIEWER':
        return 2;
      case 'STAFF':
        return 1;
      default:
        return 0;
    }
  }

  String get roleDisplayName {
    switch (role) {
      case 'ADMIN':
        return 'Quản Trị Viên';
      case 'STAFF':
        return 'Biên Tập Viên';
      case 'VIEWER':
        return 'Khán Giả';
      default:
        return 'Khách';
    }
  }
}
