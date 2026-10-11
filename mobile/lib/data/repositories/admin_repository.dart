// OmniCast - Admin Repository (Role = 3: System Administrator)

import '../../core/constants/app_constants.dart';
import '../../core/network/dio_client.dart';
import '../models/admin_model.dart';

class AdminRepository {
  final DioClient _dioClient;

  AdminRepository({required DioClient dioClient}) : _dioClient = dioClient;

  /// Fetch aggregated system analytics
  Future<AdminOverviewModel> getOverview() async {
    final response = await _dioClient.get(AppEndpoints.adminAnalytics);
    final data = response.data is Map ? response.data['data'] ?? response.data : response.data;
    return AdminOverviewModel.fromJson(data as Map<String, dynamic>);
  }

  /// Fetch users with search and role filters
  Future<List<AdminUserModel>> getUsers({
    int page = 1,
    int limit = 50,
    String? role,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (role != null && role.isNotEmpty && role != 'ALL') {
      queryParams['role'] = role;
    }
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }

    final response = await _dioClient.get(
      AppEndpoints.users,
      queryParameters: queryParams,
    );

    final raw = response.data;
    final list = (raw is Map && raw['data'] is List)
        ? raw['data'] as List
        : (raw is List ? raw : <dynamic>[]);

    return list
        .map((e) => AdminUserModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Toggle user active status (deactivate / activate)
  Future<void> toggleUserStatus(String userId, bool activate) async {
    final endpoint = activate
        ? AppEndpoints.userActivate(userId)
        : AppEndpoints.userDeactivate(userId);
    await _dioClient.patch(endpoint);
  }

  /// Update user role (STAFF or VIEWER)
  Future<void> updateUserRole(String userId, String role) async {
    await _dioClient.patch(
      AppEndpoints.userRole(userId),
      data: {'role': role},
    );
  }

  /// Fetch system audit logs
  Future<List<AdminAuditLogModel>> getAuditLogs({
    int page = 1,
    int limit = 50,
    String? action,
    String? entityType,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (action != null && action.isNotEmpty && action != 'ALL') {
      queryParams['action'] = action;
    }
    if (entityType != null && entityType.isNotEmpty) {
      queryParams['entityType'] = entityType;
    }

    final response = await _dioClient.get(
      AppEndpoints.auditLogs,
      queryParameters: queryParams,
    );

    final raw = response.data;
    final list = (raw is Map && raw['data'] is List)
        ? raw['data'] as List
        : (raw is List ? raw : <dynamic>[]);

    return list
        .map((e) => AdminAuditLogModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Broadcast system announcement to active users
  Future<void> broadcastAnnouncement({
    required String title,
    required String message,
    String? actionUrl,
  }) async {
    await _dioClient.post(
      AppEndpoints.adminAnnouncement,
      data: {
        'title': title,
        'message': message,
        if (actionUrl != null && actionUrl.isNotEmpty) 'actionUrl': actionUrl,
      },
    );
  }
}
