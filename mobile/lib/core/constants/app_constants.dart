// OmniCast - App Constants

class AppConstants {
  // API Configuration
  static const String _defaultBaseUrl = 'https://omnicast-api.vercel.app/api';
  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _envSocketUrl = String.fromEnvironment('SOCKET_BASE_URL');
  static String _customBaseUrl = '';

  static void setCustomBaseUrl(String url) {
    _customBaseUrl = url;
  }

  static String get baseUrl {
    if (_customBaseUrl.isNotEmpty) return _customBaseUrl;
    if (_envBaseUrl.isNotEmpty) return _envBaseUrl;
    return _defaultBaseUrl;
  }

  static const String cdnBaseUrl = 'https://omnicast.tv';
  static const Duration apiTimeout = Duration(seconds: 12);

  /**
   * Resolve an asset path (like `/Channel_Logos/01-omni-sport-1-icon.svg`)
   * to a fully-qualified URL the CachedNetworkImage can load.
   * If the path is already absolute (http(s)://) we use it verbatim.
   */
  static String resolveAssetUrl(String? maybeRelativePath) {
    if (maybeRelativePath == null || maybeRelativePath.isEmpty) return '';
    if (maybeRelativePath.startsWith('http://') ||
        maybeRelativePath.startsWith('https://')) {
      return maybeRelativePath;
    }
    final normalized = maybeRelativePath.startsWith('/')
        ? maybeRelativePath
        : '/$maybeRelativePath';
    return '$cdnBaseUrl$normalized';
  }

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String fcmDeviceTokenKey = 'fcm_device_token';
  static const String userKey = 'user_data';
  static const String onboardingKey = 'onboarding_complete';
  static const String themeModeKey = 'app_theme_mode';
  static const String localeKey = 'app_locale';
  static const String notificationPrefsKey = 'app_notification_prefs';
  static const String dataSaverKey = 'app_data_saver';

  /// Derive WebSocket base URL from baseUrl (e.g. https://... -> wss://...)
  static String get socketUrl {
    if (_envSocketUrl.isNotEmpty) return _envSocketUrl;
    final uri = Uri.parse(baseUrl);
    final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
    final portPart = uri.hasPort ? ':${uri.port}' : '';
    return '$wsScheme://${uri.host}$portPart';
  }

  // Database
  static const String databaseName = 'omnicast_local.db';
  // v4: invalidate EPG cache to ensure real 25-channel data from backend is loaded
  static const int databaseVersion = 4;

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Cache
  static const Duration cacheExpiry = Duration(minutes: 5);
  static const Duration longCacheExpiry = Duration(hours: 1);

  // Animation Durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 350);
  static const Duration longAnimation = Duration(milliseconds: 500);

  // Notification
  static const int reminderMinutesBefore = 15;

  // EPG
  static const int epgHoursToShow = 24;
  static const double epgHourWidth = 100.0;
}

class AppEndpoints {
  // Auth
  static const String login = '/v1/auth/login';
  static const String googleLogin = '/v1/auth/google';
  static const String register = '/v1/auth/register';
  static const String refresh = '/v1/auth/refresh';
  static const String logout = '/v1/auth/logout';
  static const String me = '/v1/auth/me';

  // Channels
  static const String channels = '/v1/channels';
  static String channel(String id) => '/v1/channels/$id';
  static String channelBySlug(String slug) => '/v1/channels/slug/$slug';

  // Programs / Events
  static const String liveEvents = '/v1/programs/live-events';
  static const String liveNow = '/v1/programs/live-events/live-now';
  static String liveEvent(String id) => '/v1/programs/live-events/$id';

  // Recordings
  static const String recordings = '/v1/programs/recordings';
  static String recording(String id) => '/v1/programs/recordings/$id';

  // Search
  static const String search = '/v1/search';
  static const String searchSuggestions = '/v1/search/suggestions';

  // AI Curator (Staff/Admin)
  // The backend exposes 4 routes under /v1/ai-curator/. We don't
  // use `curate` (the old name on this list was a placeholder) —
  // the canonical routes are below.
  static const String aiCuratorCurate = '/v1/ai-curator/curate';
  static const String aiCuratorAnalyzePreview = '/v1/ai-curator/analyze';
  static String aiCuratorAnalyze(String programId) =>
      '/v1/ai-curator/analyze/$programId';
  static String aiCuratorApply(String programId) =>
      '/v1/ai-curator/apply/$programId';
  static String aiCuratorHistory(String programId) =>
      '/v1/ai-curator/history/$programId';

  // Audit Logs
  static const String auditLogs = '/v1/audit-logs';

  // Continue Watching
  static const String continueWatching = '/v1/programs/continue-watching';

  // Notifications
  // Backend exposes these under `/v1/me/notifications/*` (JWT required).
  static const String notifications = '/v1/me/notifications';
  static const String notificationsUnreadCount =
      '/v1/me/notifications/unread-count';
  static const String notificationsReadAll =
      '/v1/me/notifications/read-all';
  static String notificationById(String id) => '/v1/me/notifications/$id';
  static String notificationMarkRead(String id) =>
      '/v1/me/notifications/$id/read';
  static const String deviceTokens = '/v1/me/device-tokens';

  // Newsletter (public, rate-limited to 5 req/min/IP server-side)
  static const String newsletterSubscribe = '/v1/newsletter/subscribe';
  static const String newsletterUnsubscribe = '/v1/newsletter/unsubscribe';

  // Public user profile
  static String publicProfile(String userId) => '/v1/users/$userId/public-profile';

  // Reviews
  static String recordingReviews(String recId) =>
      '/v1/programs/recordings/$recId/reviews';

  // Comments
  static String recordingComments(String recId) =>
      '/v1/programs/recordings/$recId/comments';
  static String liveEventComments(String eventId) =>
      '/v1/programs/live-events/$eventId/comments';
  static String commentLike(String commentId) =>
      '/v1/comments/$commentId/like';

  // Similar
  static String similarRecordings(String recId) =>
      '/v1/programs/recordings/$recId/similar';

  // Subscribe (premium)
  static String channelSubscribe(String channelId) =>
      '/v1/channels/$channelId/subscribe';

  // Billing
  static const String billingVerifyReceipt = '/v1/billing/verify-android-receipt';
  static const String billingPlans = '/v1/billing/me/plans';
  static const String billingInvoices = '/v1/billing/me/invoices';
  static const String billingCheckoutMock = '/v1/billing/checkout-mock';

  // Admin analytics & operations
  static const String adminAnalytics = '/v1/admin/analytics/overview';
  static const String adminAnnouncement = '/v1/admin/system/announcement';
  static const String adminChannels = '/v1/channels';
  static const String adminScheduleBulk = '/v1/programs/schedule/bulk';
  static const String auditLogsExport = '/v1/audit-logs/export';

  // Admin User Management
  static const String users = '/v1/users';
  static String user(String id) => '/v1/users/$id';
  static String userActivate(String id) => '/v1/users/$id/activate';
  static String userDeactivate(String id) => '/v1/users/$id/deactivate';
  static String userRole(String id) => '/v1/users/$id/role';

  // Watchlist (Cloud Primary)
  static const String watchlist = '/v1/me/watchlist';
  static const String watchlistGrouped = '/v1/me/watchlist/grouped';
  static const String watchlistSync = '/v1/me/watchlist/sync';

  // EPG
  static const String epgDay = '/v1/programs/epg/day';
  static const String epgSnapshot = '/v1/programs/epg/snapshot';
  static String epgNow({String channelSlug = ''}) =>
      '/v1/programs/epg/now${channelSlug.isNotEmpty ? '?channelId=$channelSlug' : ''}';
  static String epgTimeline({
    String channelSlug = '',
    int limit = 6,
  }) =>
      '/v1/programs/epg/timeline?limit=$limit${channelSlug.isNotEmpty ? '&channelId=$channelSlug' : ''}';

  // Preflight
  static const String epgPreflight = '/v1/programs/live-events/preflight';

  // ─────────────────────────────────────────────────────────────────
  // Live Studio (Staff/Admin)
  //   * Chọn nội dung phát lên màn hình — Curated Live
  //   * Tự ghi hình nội dung Livestream — Self-Record
  // ─────────────────────────────────────────────────────────────────
  static String studioRecordings(String channelId, {String? search, int? limit}) {
    final qs = <String, dynamic>{};
    if (search != null && search.isNotEmpty) qs['search'] = search;
    if (limit != null) qs['limit'] = limit;
    final raw = qs.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value.toString())}')
        .join('&');
    return '/v1/programs/studio/channels/$channelId/recordings${raw.isNotEmpty ? '?$raw' : ''}';
  }

  static const String studioCurateLive = '/v1/programs/studio/curate-live';
  static const String studioRecordingsUpload = '/v1/programs/studio/recordings/upload';
  static String studioStopLive(String eventId) =>
      '/v1/programs/studio/live-events/$eventId/stop';

  // ============================================================
  // Cloudinary Direct Upload (bypass Vercel 4.5 MB body limit)
  //   * sign      — POST → returns signed payload for the mobile
  //                 app to PUT/POST the file straight to
  //                 Cloudinary's `auto/upload` endpoint.
  //   * server    — Multipart fallback for very small files
  //                 (capped at 4.5 MB by Vercel).
  // After Cloudinary replies with `secure_url`, mobile calls
  // `addToLibrary` (`studioRecordingsUpload` is for the metadata
  // step, not the file bytes).
  // ============================================================
  static const String cloudinarySign = '/v1/uploads/cloudinary/sign';
  static const String cloudinaryServer = '/v1/uploads/cloudinary/server';

  // ============================================================
  // Studio Catalog (Mode 3 — Danh Mục Nguồn Video Công Khai)
  //   * List verified public-domain / royalty-free video
  //     sources that the Studio can add to a channel.
  //   * "Add to channel" — persists a catalog entry as a
  //     Recording row scoped to the chosen channel.
  // ============================================================
  static const String studioCatalogStreams =
      '/v1/programs/studio/catalog/streams';
  static String studioCatalogStreamsWithQuery({
    String? channel,
    bool? verified,
    String? search,
  }) {
    final qs = <String, String>{};
    if (channel != null && channel.isNotEmpty) qs['channel'] = channel;
    if (verified != null) qs['verified'] = verified ? 'true' : 'false';
    if (search != null && search.isNotEmpty) qs['search'] = search;
    final raw = qs.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    return raw.isEmpty
        ? studioCatalogStreams
        : '$studioCatalogStreams?$raw';
  }

  static const String studioAddFromCatalog =
      '/v1/programs/studio/recordings/library/from-catalog';
  static const String studioAddToLibrary =
      '/v1/programs/studio/recordings/library';

  // Active live events on a channel. Backed by the existing
  // `/live-events/live-now` endpoint (declared at line 77). We
  // expose the same `liveNow` name as a const so callers can use
  // it for `GET /live-events/live-now` without re-importing.
  static const String liveNowWithChannel = '?channelId=';
}
