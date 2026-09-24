// OmniCast - Notification Service

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:rxdart/rxdart.dart';

import '../constants/app_constants.dart';
import '../../data/models/watchlist_item_model.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  final _notificationTappedController = BehaviorSubject<String?>();
  Stream<String?> get notificationTappedStream => _notificationTappedController.stream;

  bool _isInitialized = false;

  /// Initialize the notification service
  Future<void> init() async {
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

    // Initialize
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels (Android)
    await _createNotificationChannels();

    _isInitialized = true;
  }

  /// Create notification channels for Android
  Future<void> _createNotificationChannels() async {
    if (!Platform.isAndroid) return;

    const reminderChannel = AndroidNotificationChannel(
      'omnicast_reminders',
      'Program Reminders',
      description: 'Reminders for upcoming programs',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
      enableLights: true,
    );

    const liveChannel = AndroidNotificationChannel(
      'omnicast_live',
      'Live Notifications',
      description: 'Notifications for live programs',
      importance: Importance.high,
      playSound: true,
    );

    const systemChannel = AndroidNotificationChannel(
      'omnicast_system',
      'System Notifications',
      description: 'General system notifications',
      importance: Importance.defaultImportance,
    );

    final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    await androidPlugin?.createNotificationChannel(reminderChannel);
    await androidPlugin?.createNotificationChannel(liveChannel);
    await androidPlugin?.createNotificationChannel(systemChannel);
  }

  /// Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null) {
      _notificationTappedController.add(payload);
    }
  }

  /// Request notification permissions
  Future<bool> requestPermissions() async {
    if (Platform.isAndroid) {
      final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      
      final granted = await androidPlugin?.requestNotificationsPermission();
      return granted ?? false;
    } else if (Platform.isIOS) {
      final iosPlugin = _notifications.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      
      final granted = await iosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }
    return false;
  }

  /// Schedule a program reminder
  Future<void> scheduleProgramReminder({
    required WatchlistItemModel item,
    int minutesBefore = AppConstants.reminderMinutesBefore,
  }) async {
    final scheduledTime = item.scheduledAt.subtract(
      Duration(minutes: minutesBefore),
    );

    // Don't schedule if time has passed
    if (scheduledTime.isBefore(DateTime.now())) {
      debugPrint('Cannot schedule reminder for past time');
      return;
    }

    final notificationId = item.programId.hashCode;

    await _notifications.zonedSchedule(
      notificationId,
      '⏰ Sắp phát sóng!',
      '${item.programTitle} sẽ bắt đầu trong $minutesBefore phút',
      tz.TZDateTime.from(scheduledTime, tz.local),
      NotificationDetails(
        android: AndroidNotificationDetails(
          'omnicast_reminders',
          'Program Reminders',
          channelDescription: 'Reminders for upcoming programs',
          importance: Importance.high,
          priority: Priority.high,
          playSound: true,
          enableVibration: true,
          icon: '@mipmap/ic_launcher',
          styleInformation: BigTextStyleInformation(
            '${item.programTitle} sẽ bắt đầu trong $minutesBefore phút${item.channelName != null ? ' trên ${item.channelName}' : ''}',
            contentTitle: '⏰ Sắp phát sóng!',
            summaryText: item.channelName,
          ),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: 'program:${item.programId}',
    );

    debugPrint('Scheduled reminder for ${item.programTitle} at $scheduledTime');
  }

  /// Cancel a scheduled reminder
  Future<void> cancelProgramReminder(String programId) async {
    final notificationId = programId.hashCode;
    await _notifications.cancel(notificationId);
    debugPrint('Cancelled reminder for program: $programId');
  }

  /// Cancel all reminders
  Future<void> cancelAllReminders() async {
    await _notifications.cancelAll();
    debugPrint('Cancelled all reminders');
  }

  /// Show an immediate notification
  Future<void> showNotification({
    required String title,
    required String body,
    String? payload,
    String channel = 'omnicast_system',
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'omnicast_system',
      'System Notifications',
      channelDescription: 'General system notifications',
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

    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    await _notifications.show(
      notificationId,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Show live program notification
  Future<void> showLiveNotification({
    required String programId,
    required String title,
    required String channelName,
    String? thumbnailUrl,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'omnicast_live',
      'Live Notifications',
      channelDescription: 'Notifications for live programs',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      icon: '@mipmap/ic_launcher',
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

    final notificationId = programId.hashCode;

    await _notifications.show(
      notificationId,
      '🔴 ĐANG PHÁT SÓNG',
      title,
      details,
      payload: 'live:$programId',
    );
  }

  /// Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return await _notifications.pendingNotificationRequests();
  }

  /// Dispose resources
  void dispose() {
    _notificationTappedController.close();
  }
}
