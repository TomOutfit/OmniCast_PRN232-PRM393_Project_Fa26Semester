// OmniCast - Newsletter Repository
// ------------------------------------------------------------
// Calls the public `POST /v1/newsletter/subscribe` endpoint.
// Idempotent on the server — calling twice with the same email
// returns `alreadySubscribed: true` instead of throwing.
// ============================================================

import 'package:dio/dio.dart';

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';

/// Topics the user can opt into. Matches the backend enum.
enum NewsletterTopic {
  weeklySchedule('weekly_schedule'),
  aiCuratorPicks('ai_curator_picks'),
  studioUpdates('studio_updates'),
  liveAlerts('live_alerts'),
  newReleases('new_releases');

  const NewsletterTopic(this.wire);
  final String wire;
}

class SubscribeNewsletterResponse {
  final bool alreadySubscribed;
  final String email;
  final String locale;
  final List<String> topics;

  const SubscribeNewsletterResponse({
    required this.alreadySubscribed,
    required this.email,
    required this.locale,
    required this.topics,
  });

  factory SubscribeNewsletterResponse.fromJson(Map<String, dynamic> json) {
    return SubscribeNewsletterResponse(
      alreadySubscribed: json['alreadySubscribed'] as bool? ?? false,
      email: json['email'] as String? ?? '',
      locale: json['locale'] as String? ?? 'vi',
      topics: (json['topics'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(),
    );
  }
}

class NewsletterRepository {
  final DioClient _dioClient;

  NewsletterRepository({required DioClient dioClient})
      : _dioClient = dioClient;

  /// Public signup. Does not require an auth token — the endpoint
  /// is open but rate-limited to 5 req/min/IP by the backend.
  Future<SubscribeNewsletterResponse> subscribe({
    required String email,
    List<NewsletterTopic> topics = const [
      NewsletterTopic.weeklySchedule,
      NewsletterTopic.aiCuratorPicks,
      NewsletterTopic.liveAlerts,
    ],
    String locale = 'vi',
    String source = 'mobile_app',
  }) async {
    final res = await _dioClient.post<Map<String, dynamic>>(
      AppEndpoints.newsletterSubscribe,
      data: {
        'email': email.trim().toLowerCase(),
        'topics': topics.map((t) => t.wire).toList(),
        'locale': locale,
        'source': source,
      },
      // The newsletter endpoint is rate-limited (5/min/IP). Don't
      // pre-empt that limit by piling retries on top.
      options: Options(
        receiveTimeout: const Duration(seconds: 12),
        sendTimeout: const Duration(seconds: 8),
      ),
    );
    final body = _unwrapMap(res.data);
    return SubscribeNewsletterResponse.fromJson(body);
  }

  Map<String, dynamic> _unwrapMap(dynamic body) {
    if (body is Map && body['data'] is Map) {
      return (body['data'] as Map).cast<String, dynamic>();
    }
    if (body is Map) return body.cast<String, dynamic>();
    return <String, dynamic>{};
  }
}
