// OmniCast - Notifications Repository
// ------------------------------------------------------------
// Talks to the real backend:
//   GET    /v1/me/notifications?limit=20&offset=0&filter=unread
//   GET    /v1/me/notifications/unread-count
//   POST   /v1/me/notifications/:id/read
//   POST   /v1/me/notifications/read-all
//   DELETE /v1/me/notifications/:id
//
// We keep this layer thin — the BLoC owns cache + optimistic
// state. The repository only knows how to make HTTP calls and
// unwrap the standard `{ data: ... }` envelope.
// ============================================================

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/notification_model.dart';

/// Filters supported by the backend's `filter` query param.
enum NotificationFilter {
  all('all'),
  unread('unread'),
  read('read');

  const NotificationFilter(this.wire);
  final String wire;
}

class NotificationsRepository {
  final DioClient _dioClient;

  NotificationsRepository({required DioClient dioClient})
      : _dioClient = dioClient;

  // ============================================================
  // READ
  // ============================================================

  /// List notifications paginated, optionally filtered.
  Future<NotificationListResponse> list({
    int limit = 20,
    int offset = 0,
    NotificationFilter filter = NotificationFilter.all,
  }) async {
    final res = await _dioClient.get<Map<String, dynamic>>(
      AppEndpoints.notifications,
      queryParameters: {
        'limit': limit,
        'offset': offset,
        'filter': filter.wire,
      },
    );
    return NotificationListResponse.fromJson(
      _unwrapMap(res.data),
    );
  }

  /// Cheap endpoint for the bell badge — returns just the count.
  Future<int> unreadCount() async {
    final res = await _dioClient.get<Map<String, dynamic>>(
      AppEndpoints.notificationsUnreadCount,
    );
    final body = _unwrapMap(res.data);
    return (body['unreadCount'] as num?)?.toInt() ?? 0;
  }

  // ============================================================
  // MUTATIONS
  // ============================================================

  /// Mark a single notification as read. Idempotent — calling on
  /// an already-read row returns `{ success: true, updated: 0 }`.
  Future<int> markOneRead(String id) async {
    final res = await _dioClient.post<Map<String, dynamic>>(
      AppEndpoints.notificationMarkRead(id),
    );
    final body = _unwrapMap(res.data);
    return (body['updated'] as num?)?.toInt() ?? 0;
  }

  /// Mark every unread notification as read.
  Future<int> markAllRead() async {
    final res = await _dioClient.post<Map<String, dynamic>>(
      AppEndpoints.notificationsReadAll,
    );
    final body = _unwrapMap(res.data);
    return (body['updated'] as num?)?.toInt() ?? 0;
  }

  /// Delete a single notification.
  Future<void> delete(String id) async {
    await _dioClient.delete<Map<String, dynamic>>(
      AppEndpoints.notificationById(id),
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /// Unwrap the standard NestJS `{ success, statusCode, data, ... }`
  /// envelope so callers can pass the body straight into the model.
  /// Falls back to the raw body if the envelope is missing.
  Map<String, dynamic> _unwrapMap(dynamic body) {
    if (body is Map && body['data'] is Map) {
      return (body['data'] as Map).cast<String, dynamic>();
    }
    if (body is Map) return body.cast<String, dynamic>();
    return <String, dynamic>{};
  }
}
