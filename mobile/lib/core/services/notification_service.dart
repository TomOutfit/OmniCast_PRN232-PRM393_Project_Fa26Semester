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

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  // Callback for notification tap
  static Function(String?)? onNotificationTap;

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
    onNotificationTap?.call(response.payload);
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
    final androidDetails = AndroidNotificationDetails(
      'omnicast_reminders',
      'Program Reminders',
      channelDescription: 'Notifications for upcoming programs',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      styleInformation: BigTextStyleInformation(
        'Sắp bắt đầu lúc ${_formatTime(item.scheduledAt)} trên ${item.channelName ?? 'kênh của bạn'}',
        contentTitle: '📺 ${item.programTitle}',
        summaryText: 'Nhắc nhở chương trình',
      ),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
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
