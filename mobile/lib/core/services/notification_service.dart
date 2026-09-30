// OmniCast - Notification Service
// Handles scheduled notifications for program reminders (15 min before air)

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:flutter/material.dart';

import '../../data/models/watchlist_item_model.dart';
import '../../data/datasources/local/database_helper.dart';

// ============================================================
// Notification Action IDs (3 quick actions per reminder)
// ============================================================

class NotificationActionIds {
  static const String snooze5min = 'SNOOZE_5_MIN';
  static const String watchNow = 'WATCH_NOW';
  static const String dismiss = 'DISMISS';
}

// Callback for snooze requests (handled by app-level notifier)
typedef SnoozeRequestCallback = void Function(
    String programId, String programTitle);
typedef WatchNowCallback = void Function(String programId);
typedef DismissCallback = void Function(String programId);

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  // Callback for notification tap
  static Function(String?)? onNotificationTap;
  static SnoozeRequestCallback? onSnoozeRequest;
  static WatchNowCallback? onWatchNow;
  static DismissCallback? onDismiss;


  Future<void> initialize() async {
    if (_isInitialized) return;

    // Initialize timezone
    tz_data.initializeTimeZones();

    // Android settings
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS settings
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    // Combined settings
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    // Initialize
    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
      onDidReceiveBackgroundNotificationResponse: _onBackgroundNotificationTap,
    );

    // Create notification channel for Android
    await _createNotificationChannel();

    _isInitialized = true;
  }

  Future<void> _createNotificationChannel() async {
    const channel = AndroidNotificationChannel(
      'omnicast_reminders',
      'Program Reminders',
      description: 'Notifications for upcoming programs',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  static void _onNotificationTap(NotificationResponse response) {
    final payload = response.payload;
    final actionId = response.actionId;

    if (actionId == NotificationActionIds.dismiss) {
      if (payload != null && payload.startsWith('program:')) {
        onDismiss?.call(payload.substring(8));
      }
      return;
    }
    if (actionId == NotificationActionIds.watchNow) {
      if (payload != null && payload.startsWith('program:')) {
        onWatchNow?.call(payload.substring(8));
      }
      return;
    }
    if (actionId == NotificationActionIds.snooze5min) {
      if (payload != null && payload.startsWith('program:')) {
        final programId = payload.substring(8);
        onSnoozeRequest?.call(programId, '');
      }
      return;
    }

    onNotificationTap?.call(payload);
  }

  @pragma('vm:entry-point')
  static void _onBackgroundNotificationTap(NotificationResponse response) {
    // Handle background notification tap
    onNotificationTap?.call(response.payload);
  }

  // Request permissions
  Future<bool> requestPermissions() async {
    if (Platform.isIOS) {
      final result = await _notifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
      return result ?? false;
    } else if (Platform.isAndroid) {
      final result = await _notifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      return result ?? false;
    }
    return false;
  }

  // Schedule a reminder for 15 minutes before program starts
  Future<void> scheduleReminder({
    required WatchlistItemModel item,
    int minutesBefore = 15,
  }) async {
    if (!_isInitialized) await initialize();

    final scheduledTime = item.scheduledAt.subtract(
      Duration(minutes: minutesBefore),
    );

    // Don't schedule if time has passed
    if (scheduledTime.isBefore(DateTime.now())) {
      debugPrint('Cannot schedule reminder: time has passed');
      return;
    }

    final notificationId = item.programId.hashCode;

    // Cancel existing notification for this program
    await cancelReminder(item.programId);

    // Create notification details
    final androidActions = <AndroidNotificationAction>[
      const AndroidNotificationAction(
        NotificationActionIds.watchNow,
        'Xem ngay',
        showsUserInterface: true,
        cancelNotification: true,
      ),
      const AndroidNotificationAction(
        NotificationActionIds.snooze5min,
        'Hoãn 5 phút',
        showsUserInterface: false,
        cancelNotification: true,
      ),
      const AndroidNotificationAction(
        NotificationActionIds.dismiss,
        'Bỏ nhắc',
        showsUserInterface: false,
        cancelNotification: true,
      ),
    ];

    final androidDetails = AndroidNotificationDetails(
      'omnicast_reminders',
      'Program Reminders',
      channelDescription: 'Notifications for upcoming programs',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      actions: androidActions,
      styleInformation: BigTextStyleInformation(
        'Sắp bắt đầu lúc ${_formatTime(item.scheduledAt)} trên ${item.channelName ?? 'kênh của bạn'}',
        contentTitle: '📺 ${item.programTitle}',
        summaryText: 'Nhắc nhở chương trình',
      ),
    );

    final iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      categoryIdentifier: 'program_reminder',
    );

    final notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // Schedule the notification
    await _notifications.zonedSchedule(
      notificationId,
      item.programTitle,
      'Bắt đầu trong $minutesBefore phút nữa!',
      tz.TZDateTime.from(scheduledTime, tz.local),
      notificationDetails,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: 'program:${item.programId}',
    );

    debugPrint('Scheduled reminder for ${item.programTitle} at $scheduledTime');
  }

  // Cancel a specific reminder
  Future<void> cancelReminder(String programId) async {
    final notificationId = programId.hashCode;
    await _notifications.cancel(notificationId);
  }

  // Cancel all reminders
  Future<void> cancelAllReminders() async {
    await _notifications.cancelAll();
  }

  /// Generic single-shot cancel by integer id.
  Future<void> cancel(int id) async {
    await _notifications.cancel(id);
  }

  /// Schedule a **daily repeating** notification at the supplied local
  /// hour:minute. The id is used as both the schedule id and the
  /// channel id for the OS notification channel.
  Future<void> zonedScheduleDaily({
    required int id,
    required int hour,
    required int minute,
    required String title,
    required String body,
    String? timezone,
  }) async {
    if (!_isInitialized) await initialize();

    final tzName = timezone ?? DateTime.now().timeZoneName;
    final location = tz.getLocation(_mapTimezoneName(tzName));
    final now = tz.TZDateTime.now(location);
    var scheduled = tz.TZDateTime(
      location,
      now.year,
      now.month,
      now.day,
      hour,
      minute,
    );
    if (!scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }

    const androidDetails = AndroidNotificationDetails(
      'channel_reminder',
      'Nhắc nhở kênh',
      channelDescription: 'Nhắc nhở hằng ngày cho kênh bạn theo dõi',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.zonedSchedule(
      id,
      title,
      body,
      scheduled,
      details,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  static String _mapTimezoneName(String name) {
    // The OS may return a localised name (e.g. "SE Asia Standard Time"
    // on Windows or "Asia/Ho_Chi_Minh" on Linux). Normalise to IANA.
    final lower = name.toLowerCase();
    if (lower.contains('hanoi') ||
        lower.contains('ho_chi_minh') ||
        lower.contains('indochina') ||
        lower.contains('asia/')) {
      return 'Asia/Ho_Chi_Minh';
    }
    return name;
  }

  // Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return await _notifications.pendingNotificationRequests();
  }

  // Schedule reminders from database
  Future<void> scheduleAllReminders(DatabaseHelper databaseHelper) async {
    try {
      // Get all watchlist items with reminders enabled
      final items = await databaseHelper.getUpcomingWithReminders();

      for (final item in items) {
        if (item.reminderEnabled && item.reminderTime != null) {
          await scheduleReminder(item: item);
        }
      }

      debugPrint('Scheduled ${items.length} reminders');
    } catch (e) {
      debugPrint('Error scheduling reminders: $e');
    }
  }

  /// Reschedule the same reminder `minutesLater` minutes from now.
  /// Used by the "Hoãn 5 phút" notification quick action.
  Future<void> snoozeReminder({
    required WatchlistItemModel item,
    int minutesLater = 5,
  }) async {
    await cancelReminder(item.programId);
    final next = DateTime.now().add(Duration(minutes: minutesLater));
    await _notifications.show(
      item.programId.hashCode,
      item.programTitle,
      'Sẽ nhắc lại lúc ${_formatTime(next)}',
      NotificationDetails(
        android: AndroidNotificationDetails(
          'omnicast_reminders',
          'Program Reminders',
          channelDescription: 'Notifications for upcoming programs',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: 'program:${item.programId}',
    );
    debugPrint('Snoozed reminder for ${item.programTitle} -> $next');
  }

  // Show immediate notification (for testing)
  Future<void> showTestNotification() async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'omnicast_reminders',
      'Program Reminders',
      channelDescription: 'Notifications for upcoming programs',
      importance: Importance.high,
      priority: Priority.high,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(),
    );

    await _notifications.show(
      0,
      'Test Notification',
      'OmniCast notifications are working!',
      notificationDetails,
    );
  }

  // Format time for display
  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

// Helper extension for watchlist item
extension WatchlistItemNotificationExt on WatchlistItemModel {
  Future<void> scheduleReminder() async {
    await NotificationService().scheduleReminder(item: this);
  }

  Future<void> cancelReminder() async {
    await NotificationService().cancelReminder(programId);
  }
}
