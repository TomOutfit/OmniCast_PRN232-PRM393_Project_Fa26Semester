// OmniCast - App Constants

class AppConstants {
  // API Configuration
  static const String baseUrl = 'https://omnicast-api.vercel.app/api';
  static const Duration apiTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String onboardingKey = 'onboarding_complete';

  // Database
  static const String databaseName = 'omnicast_local.db';
  static const int databaseVersion = 1;

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
}
