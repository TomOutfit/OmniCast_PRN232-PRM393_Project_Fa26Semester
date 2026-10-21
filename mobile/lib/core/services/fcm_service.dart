// ============================================================
// OmniCast · Firebase Cloud Messaging Service
// ============================================================
//
// Mobile-side FCM service. Responsibilities:
//   1. Initialise Firebase at app startup
//   2. Request permission (iOS / Android 13+) and obtain device token
//   3. Handle foreground, background-opened, and launch messages
//   4. Deep-link the user to `ProgramDetailScreen` when the data
//      payload is `{ type: 'PROGRAM_REMINDER', programId: '...' }`
//   5. Persist the most recent device token so the backend can push
//
// All I/O is fault-tolerant — Firebase may not be configured in
// dev builds; in that case the service is a no-op and the app falls
// back to in-app toasts.
// ============================================================

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';

import '../utils/token_storage_helper.dart';

/// Top-level background handler — must be a top-level (or static)
/// function annotated with `@pragma('vm:entry-point')`.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  // No UI work here — background handlers are isolated. We just log
  // and let the OS surface a system notification (handled via the
  // Android channel registered in `initialise`).
  if (kDebugMode) {
    // ignore: avoid_print
    print('[FCM] background: ${message.messageId}');
  }
}

class FcmService {
  FcmService._internal();
  static final FcmService instance = FcmService._internal();

  String? _cachedToken;
  bool _initialised = false;

  Future<void> initialise({
    GlobalKey<NavigatorState>? navigatorKey,
    void Function(String token)? onTokenRefresh,
  }) async {
    if (navigatorKey != null) {
      _navigatorKey = navigatorKey;
    }
    if (_initialised) return;
    _initialised = true;
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      // Capture the device token once and persist it for backend push.
      final token = await messaging.getToken();
      _cachedToken = token;
      if (token != null) {
        await TokenStorageHelper().saveDeviceToken(token);
        onTokenRefresh?.call(token);
      }

      messaging.onTokenRefresh.listen((newToken) async {
        _cachedToken = newToken;
        await TokenStorageHelper().saveDeviceToken(newToken);
        onTokenRefresh?.call(newToken);
        if (kDebugMode) {
          // ignore: avoid_print
          print('[FCM] token refreshed: $newToken');
        }
      });

      // Subscribe to FCM streams (static getters on the SDK class).
      // ignore: invalid_use_of_protected_member
      FirebaseMessaging.onMessage.listen((msg) {
        _handleForegroundMessage(msg, _navigatorKey ?? navigatorKey);
      });
      // ignore: invalid_use_of_protected_member
      FirebaseMessaging.onMessageOpenedApp.listen((msg) {
        _handleOpenedMessage(msg);
      });
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        _handleOpenedMessage(initial);
      }
    } catch (e) {
      // No Firebase configured. Soft-fail — toasts still work in-app.
      if (kDebugMode) {
        // ignore: avoid_print
        print('[FCM] init failed (no Firebase configured?): $e');
      }
    }
  }

  /// Returns the most recent device token, or null if FCM failed.
  String? get deviceToken => _cachedToken;

  /// Foreground messages — show a SnackBar via navigator (when given).
  void _handleForegroundMessage(
    RemoteMessage msg,
    GlobalKey<NavigatorState>? navigatorKey,
  ) {
    final title = msg.notification?.title ?? msg.data['title']?.toString() ?? '';
    final body = msg.notification?.body ?? msg.data['body']?.toString() ?? '';
    if (kDebugMode) {
      // ignore: avoid_print
      print('[FCM] foreground: $title — $body');
    }
    final ctx = navigatorKey?.currentContext;
    if (ctx != null && title.isNotEmpty) {
      ScaffoldMessenger.maybeOf(ctx)?.showSnackBar(
        SnackBar(
          content: Text('$title — $body'),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  /// When a notification is tapped, deep-link to the relevant screen.
  void _handleOpenedMessage(RemoteMessage msg) {
    final type = msg.data['type']?.toString();
    final programId = msg.data['programId']?.toString();
    final eventId = msg.data['eventId']?.toString();
    final targetId = eventId ?? programId;
    final ctx = _navigatorContext;
    if (ctx == null) return;
    if (type == 'PROGRAM_REMINDER' && targetId != null) {
      GoRouter.of(ctx).go('/program/$targetId');
    } else if (type == 'LIVE_STARTED' && targetId != null) {
      GoRouter.of(ctx).go('/live/$targetId');
    } else {
      GoRouter.of(ctx).go('/notifications');
    }
  }

  GlobalKey<NavigatorState>? _navigatorKey;
  set navigatorKey(GlobalKey<NavigatorState>? k) => _navigatorKey = k;
  BuildContext? get _navigatorContext => _navigatorKey?.currentContext;
}
