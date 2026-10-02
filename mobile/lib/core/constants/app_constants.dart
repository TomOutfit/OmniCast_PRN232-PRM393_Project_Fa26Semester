// OmniCast - App Constants

class AppConstants {
  // API Configuration
  static const String baseUrl = 'https://omnicast-api.vercel.app/api';
  static const String cdnBaseUrl = 'https://omnicast.tv';
  static const Duration apiTimeout = Duration(seconds: 30);

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
  static const String userKey = 'user_data';
  static const String onboardingKey = 'onboarding_complete';
  static const String themeModeKey = 'app_theme_mode';
  static const String localeKey = 'app_locale';
  static const String notificationPrefsKey = 'app_notification_prefs';
  static const String dataSaverKey = 'app_data_saver';

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

  // AI Curator
  static const String curate = '/v1/ai-curator/curate';

  // Audit Logs
  static const String auditLogs = '/v1/audit-logs';

  // Continue Watching
  static const String continueWatching = '/v1/programs/continue-watching';

  // Notifications
  static const String notifications = '/v1/users/me/notifications';
  static String notificationById(String id) =>
      '/v1/users/me/notifications/$id';
  static const String notificationsReadAll = '/v1/users/me/notifications/read-all';

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

  // Billing mock
  static const String billingPlans = '/v1/billing/me/plans';
  static const String billingInvoices = '/v1/billing/me/invoices';
  static const String billingCheckoutMock = '/v1/billing/checkout-mock';

  // Admin analytics
  static const String adminAnalytics = '/v1/admin/analytics/overview';
  static const String adminChannels = '/v1/channels';
  static const String adminScheduleBulk = '/v1/programs/schedule/bulk';
  static const String auditLogsExport = '/v1/audit-logs/export';

  // Watchlist (Cloud Primary)
  static const String watchlist = '/v1/me/watchlist';
  static const String watchlistGrouped = '/v1/me/watchlist/grouped';
  static const String watchlistSync = '/v1/me/watchlist/sync';

  // EPG
  static const String epgDay = '/v1/programs/epg/day';
  static const String epgSnapshot = '/v1/programs/epg/snapshot';

  // Preflight
  static const String epgPreflight = '/v1/programs/live-events/preflight';
}
