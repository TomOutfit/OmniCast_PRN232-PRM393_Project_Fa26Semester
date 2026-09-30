// OmniCast - Share helper
//
// Thin wrapper around `share_plus` + `flutter_local_notifications` so
// every share/CTA in the app goes through one place. Also exposes the
// URL builder so we never hard-code the production hostname.

import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/models/channel_model.dart';
import '../../data/models/program_model.dart';
import '../../data/models/recording_model.dart';
import '../constants/app_constants.dart';
import 'notification_service.dart';

class ShareHelper {
  /// Public web URL (where humans land when scanning a QR / pasting).
  /// Override at compile time if you need a custom domain.
  static const String _webHost = String.fromEnvironment(
    'OMNICAST_WEB_HOST',
    defaultValue: 'https://omnicast.tv',
  );

  static String channelUrl(ChannelModel channel) =>
      '$_webHost/channel/${channel.slug}';

  static String liveEventUrl(LiveEventModel event) =>
      '$_webHost/programs/${event.id}';

  static String recordingUrl(RecordingModel recording) =>
      '$_webHost/programs/recording/${recording.id}';

  // ============================================================
  // Generic helpers
  // ============================================================

  static Future<void> shareChannel(ChannelModel channel) async {
    await _share(
      title: 'Kênh ${channel.name}',
      text: channel.tagline ?? 'Xem kênh ${channel.name} trên OmniCast',
      url: channelUrl(channel),
    );
  }

  static Future<void> shareLiveEvent(LiveEventModel event) async {
    await _share(
      title: event.title,
      text: event.description ?? 'Đang phát trên OmniCast',
      url: liveEventUrl(event),
    );
  }

  static Future<void> shareRecording(RecordingModel recording) async {
    await _share(
      title: recording.title,
      text: recording.description ?? 'Xem lại trên OmniCast',
      url: recordingUrl(recording),
    );
  }

  /// Generic share fallback — used when we don't have a typed model.
  static Future<void> shareUrl({
    required String url,
    required String title,
    String? text,
  }) async {
    await _share(title: title, text: text, url: url);
  }

  /// Copy a URL to the system clipboard. Returns true on success.
  static Future<bool> copyToClipboard(String text) async {
    try {
      await Clipboard.setData(ClipboardData(text: text));
      return true;
    } catch (_) {
      return false;
    }
  }

  // ============================================================
  // Channel reminders (notification scheduling)
  // ============================================================

  /// Schedule a generic daily reminder at 19:00 (Asia/Ho_Chi_Minh) so the
  /// user gets a ping about new live content on this channel. The
  /// notification id is derived from the channel id so repeated calls
  /// replace the prior schedule.
  static Future<void> scheduleChannelReminder(ChannelModel channel) async {
    final svc = NotificationService();
    final id = _channelReminderId(channel.id);
    final tz = DateTime.now().timeZoneName;
    await svc.zonedScheduleDaily(
      id: id,
      hour: 19,
      minute: 0,
      title: '${channel.name} đang lên sóng',
      body: 'Bấm để xem lịch phát sóng hôm nay',
      timezone: tz,
    );
  }

  static Future<void> cancelChannelReminder(String channelId) async {
    final svc = NotificationService();
    await svc.cancel(_channelReminderId(channelId));
  }

  static int _channelReminderId(String channelId) {
    // Stable id derived from channelId — collisions acceptable since
    // we only ever have one reminder per channel.
    return channelId.hashCode & 0x7fffffff;
  }

  // ============================================================
  // Internals
  // ============================================================

  static Future<void> _share({
    required String title,
    String? text,
    required String url,
  }) async {
    try {
      final body = text == null || text.isEmpty ? url : '$text\n$url';
      await SharePlus.instance.share(
        ShareParams(
          subject: title,
          text: body,
        ),
      );
    } catch (_) {
      // share_plus throws if the platform can't show a sheet. Fall
      // back to the clipboard so the user still has the URL.
      await copyToClipboard(url);
    }
  }
}
