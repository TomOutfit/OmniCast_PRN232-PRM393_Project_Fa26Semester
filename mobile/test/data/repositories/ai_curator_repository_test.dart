// OmniCast - AiCuratorRepository unit tests
// ============================================================
//
// Covers the 5 public flows (curate, analyzeExisting, analyze,
// apply, history) plus the JSON parsing layer (AiCuratorReport,
// AiSentiment, AiCompliance) and the DioException → AiCuratorException
// mapping surface. Mirrors the backend `AiCuratorController` 1:1.
//
// We avoid mocktail here because `DioClient` exposes generic
// `get<T> / post<T>` methods that get messy with `when(...).thenAnswer`
// when T is inferred as `dynamic`. A hand-rolled `FakeDioClient` is
// clearer and reads better in failure output.
// ============================================================

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:omnicast/core/network/dio_client.dart';
import 'package:omnicast/data/repositories/ai_curator_repository.dart';

// ── Test double ────────────────────────────────────────────────

class FakeDioClient implements DioClient {
  /// What the next call should return as `Response.data`. If null and
  /// [nextError] is also null, returns a 200 Response with `null` body.
  Object? nextResponse;

  /// When set, the next HTTP call throws this DioException instead
  /// of returning a Response.
  DioException? nextError;

  // Capture every call for verification.
  String? lastPath;
  dynamic lastData;
  Map<String, dynamic>? lastQueryParameters;
  Options? lastOptions;

  int postCallCount = 0;
  int getCallCount = 0;

  void reset() {
    nextResponse = null;
    nextError = null;
    lastPath = null;
    lastData = null;
    lastQueryParameters = null;
    lastOptions = null;
    postCallCount = 0;
    getCallCount = 0;
  }

  void _throwOrRespond<T>(String path) {
    if (nextError != null) throw nextError!;
  }

  @override
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    getCallCount++;
    lastPath = path;
    lastQueryParameters = queryParameters;
    lastOptions = options;
    _throwOrRespond<T>(path);
    return Response<T>(
      requestOptions: RequestOptions(path: path),
      data: nextResponse as T?,
    );
  }

  @override
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    postCallCount++;
    lastPath = path;
    lastData = data;
    lastQueryParameters = queryParameters;
    lastOptions = options;
    _throwOrRespond<T>(path);
    return Response<T>(
      requestOptions: RequestOptions(path: path),
      data: nextResponse as T?,
    );
  }

  @override
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    lastPath = path;
    lastData = data;
    if (nextError != null) throw nextError!;
    return Response<T>(
      requestOptions: RequestOptions(path: path),
      data: nextResponse as T?,
    );
  }

  @override
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    lastPath = path;
    lastData = data;
    if (nextError != null) throw nextError!;
    return Response<T>(
      requestOptions: RequestOptions(path: path),
      data: nextResponse as T?,
    );
  }

  @override
  Dio get dio => throw UnimplementedError('Dio not exposed via fake');

  @override
  void setTokenRefresher(TokenRefresher refresher) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ── Helpers ────────────────────────────────────────────────────

Map<String, dynamic> _fullReportJson() => {
      'broadcastSuitability': 'PRIME_TIME',
      'suggestedTimeSlot': '20:00 - 22:30',
      'targetAudienceVibe': 'Football fans',
      'riskWarnings': 'High intensity scenes',
      'sentimentAnalysis': {
        'overallSentiment': 'positive',
        'hypeLevel': 'high',
        'audienceEngagement': 87,
      },
      'complianceAssessment': {
        'isAgeRestricted': true,
        'ageRating': 'T16',
        'flaggedContent': ['violence', 'loud_audio'],
        'recommendedBroadcastWindow': 'EVENING',
      },
      'aiModelVersion': 'gpt-4o-mini-v2',
      'processingTimeMs': 1234,
      'tokenUsed': 512,
      'cached': false,
      'id': 'rep-001',
      'programId': 'prog-001',
      'createdBy': 'staff-1',
      'createdAt': '2026-10-15T08:30:00.000Z',
    };

DioException _dioBadResponse({
  required int status,
  Map<String, dynamic>? body,
}) {
  return DioException(
    requestOptions: RequestOptions(path: '/x'),
    type: DioExceptionType.badResponse,
    response: Response<dynamic>(
      requestOptions: RequestOptions(path: '/x'),
      statusCode: status,
      data: body,
    ),
  );
}

// ── Tests ──────────────────────────────────────────────────────

void main() {
  late FakeDioClient dio;
  late AiCuratorRepository repo;

  setUp(() {
    dio = FakeDioClient();
    repo = AiCuratorRepository(dioClient: dio);
  });

  // ============================================================
  // Group 1 — JSON parsing
  // ============================================================

  group('AiCuratorReport.fromJson', () {
    test('parses a fully-populated report', () {
      final r = AiCuratorReport.fromJson(_fullReportJson());
      expect(r.broadcastSuitability, 'PRIME_TIME');
      expect(r.suggestedTimeSlot, '20:00 - 22:30');
      expect(r.targetAudienceVibe, 'Football fans');
      expect(r.riskWarnings, 'High intensity scenes');
      expect(r.aiModelVersion, 'gpt-4o-mini-v2');
      expect(r.processingTimeMs, 1234);
      expect(r.tokenUsed, 512);
      expect(r.cached, false);
      expect(r.id, 'rep-001');
      expect(r.programId, 'prog-001');
      expect(r.createdBy, 'staff-1');
      expect(r.createdAt, isNotNull);
      expect(r.createdAt!.toUtc().hour, 8);

      expect(r.isPrimeTime, true);
      expect(r.isRestricted, false);

      expect(r.sentiment.overallSentiment, 'positive');
      expect(r.sentiment.hypeLevel, 'high');
      expect(r.sentiment.audienceEngagement, 87);

      expect(r.compliance.isAgeRestricted, true);
      expect(r.compliance.ageRating, 'T16');
      expect(r.compliance.flaggedContent, ['violence', 'loud_audio']);
      expect(r.compliance.recommendedBroadcastWindow, 'EVENING');
    });

    test('uses defaults for missing fields', () {
      final r = AiCuratorReport.fromJson(const {});
      expect(r.broadcastSuitability, 'STANDARD');
      expect(r.suggestedTimeSlot, '20:00 - 22:00');
      expect(r.targetAudienceVibe, 'Khán giả phổ thông');
      expect(r.riskWarnings, '');
      expect(r.aiModelVersion, 'heuristic-v1');
      expect(r.processingTimeMs, 0);
      expect(r.tokenUsed, isNull);
      expect(r.cached, isNull);
      expect(r.id, isNull);
      expect(r.programId, isNull);
      expect(r.createdBy, isNull);
      expect(r.createdAt, isNull);

      // Defaults nested in sentiment / compliance.
      expect(r.sentiment.overallSentiment, 'neutral');
      expect(r.sentiment.hypeLevel, 'medium');
      expect(r.sentiment.audienceEngagement, 50);

      expect(r.compliance.isAgeRestricted, false);
      expect(r.compliance.ageRating, 'PG');
      expect(r.compliance.flaggedContent, isEmpty);
      expect(r.compliance.recommendedBroadcastWindow, 'EVENING');
    });
  });

  group('AiSentiment & AiCompliance.fromJson', () {
    test('AiSentiment tolerates empty / missing input', () {
      final s = AiSentiment.fromJson(const {});
      expect(s.overallSentiment, 'neutral');
      expect(s.hypeLevel, 'medium');
      expect(s.audienceEngagement, 50);
    });

    test('AiCompliance converts flaggedContent list defensively', () {
      final c = AiCompliance.fromJson({
        'flaggedContent': [1, 'two', true, null],
      });
      expect(c.flaggedContent, ['1', 'two', 'true', 'null']);
      expect(c.isAgeRestricted, false);
      expect(c.ageRating, 'PG');
      expect(c.recommendedBroadcastWindow, 'EVENING');
    });

    test('AiCompliance defaults missing fields', () {
      final c = AiCompliance.fromJson(const {});
      expect(c.isAgeRestricted, false);
      expect(c.ageRating, 'PG');
      expect(c.flaggedContent, isEmpty);
      expect(c.recommendedBroadcastWindow, 'EVENING');
    });
  });

  // ============================================================
  // Group 2 — curate()
  // ============================================================

  group('curate()', () {
    test('POSTs to /v1/ai-curator/curate with the right body', () async {
      dio.nextResponse = _fullReportJson();

      final report = await repo.curate(programId: 'prog-001');

      expect(dio.lastPath, '/v1/ai-curator/curate');
      expect(dio.lastData, {
        'programId': 'prog-001',
        'forceRefresh': false,
      });
      expect(dio.postCallCount, 1);
      expect(report.broadcastSuitability, 'PRIME_TIME');
      expect(report.id, 'rep-001');
    });

    test('passes through forceRefresh=true', () async {
      dio.nextResponse = _fullReportJson();

      await repo.curate(programId: 'prog-001', forceRefresh: true);

      expect(dio.lastData, {
        'programId': 'prog-001',
        'forceRefresh': true,
      });
    });

    test('unwraps response wrapped in { data: { ... } }', () async {
      dio.nextResponse = {
        'data': _fullReportJson(),
        'meta': {'page': 1},
      };

      final report = await repo.curate(programId: 'prog-001');

      expect(report.broadcastSuitability, 'PRIME_TIME');
      expect(report.id, 'rep-001');
      expect(report.sentiment.hypeLevel, 'high');
    });
  });

  // ============================================================
  // Group 3 — analyze() / analyzeExisting()
  // ============================================================

  group('analyze()', () {
    test('POSTs to /v1/ai-curator/analyze with only non-empty fields', () async {
      dio.nextResponse = _fullReportJson();

      await repo.analyze(
        title: 'World Cup Final',
        description: 'Live sports',
        category: 'SPORTS',
        language: 'en',
        scheduledAt: '2026-12-31T20:00:00.000Z',
        tags: ['sports', 'live'],
        channelName: 'Sports HD',
      );

      expect(dio.lastPath, '/v1/ai-curator/analyze');
      expect(dio.lastData, {
        'title': 'World Cup Final',
        'description': 'Live sports',
        'category': 'SPORTS',
        'language': 'en',
        'scheduledAt': '2026-12-31T20:00:00.000Z',
        'tags': ['sports', 'live'],
        'channelName': 'Sports HD',
      });
    });

    test('drops null / empty optional fields from the body', () async {
      dio.nextResponse = _fullReportJson();

      await repo.analyze(
        title: 'Title only',
        description: '',   // empty -> dropped
        category: null,    // null  -> dropped
        channelName: '   ', // not empty but we only drop empty/null/empty-trimmed? verify behaviour
      );

      // Repository uses `description.isNotEmpty` so whitespace-only
      // strings still survive the trim. We assert the contract: empty
      // strings are removed.
      expect(dio.lastData['title'], 'Title only');
      expect(dio.lastData.containsKey('description'), false);
      expect(dio.lastData.containsKey('category'), false);
    });
  });

  group('analyzeExisting()', () {
    test('POSTs to /v1/ai-curator/analyze/:programId with no body', () async {
      dio.nextResponse = _fullReportJson();

      final report = await repo.analyzeExisting('prog-007');

      expect(dio.lastPath, '/v1/ai-curator/analyze/prog-007');
      expect(dio.lastData, isNull);
      expect(report.programId, 'prog-001'); // from the wrapped report body
    });
  });

  // ============================================================
  // Group 4 — apply() / history()
  // ============================================================

  group('apply()', () {
    test('unwraps nested response and returns ApplyCurationResult', () async {
      dio.nextResponse = {
        'data': {
          'programId': 'prog-001',
          'appliedFields': ['scheduledAt', 'description'],
          'updatedAt': '2026-10-15T09:00:00.000Z',
          'channel': {
            'id': 'channel-1',
            'name': 'Sports HD',
          },
        },
      };

      final result = await repo.apply(
        programId: 'prog-001',
        scheduledAt: '2026-10-20T20:00:00.000Z',
        description: 'AI-picked description',
        status: 'SCHEDULED',
      );

      expect(dio.lastPath, '/v1/ai-curator/apply/prog-001');
      expect(dio.lastData, {
        'scheduledAt': '2026-10-20T20:00:00.000Z',
        'description': 'AI-picked description',
        'status': 'SCHEDULED',
        'markApplied': true,
      });

      expect(result.programId, 'prog-001');
      expect(result.appliedFields, ['scheduledAt', 'description']);
      expect(result.channelId, 'channel-1');
      expect(result.channelName, 'Sports HD');
      expect(result.updatedAt, isNotNull);
    });

    test('accepts a flat (non-{data}) response body', () async {
      dio.nextResponse = {
        'programId': 'prog-002',
        'appliedFields': ['description'],
        'channel': {'id': 'c-2', 'name': 'C2'},
      };

      final result = await repo.apply(programId: 'prog-002');
      expect(result.programId, 'prog-002');
      expect(result.appliedFields, ['description']);
      expect(result.channelName, 'C2');
    });

    test('markApplied defaults to true when not overridden', () async {
      dio.nextResponse = {
        'programId': 'prog-001',
        'appliedFields': const [],
        'channel': const {'id': 'c-1', 'name': 'C1'},
      };

      await repo.apply(programId: 'prog-001');
      expect(dio.lastData['markApplied'], true);
    });
  });

  group('history()', () {
    test('handles array-direct response', () async {
      dio.nextResponse = [
        _fullReportJson(),
        _fullReportJson(),
      ];

      final list = await repo.history('prog-001');
      expect(dio.lastPath, '/v1/ai-curator/history/prog-001');
      expect(list, hasLength(2));
      expect(list.first.broadcastSuitability, 'PRIME_TIME');
    });

    test('handles { data: [...] } envelope', () async {
      dio.nextResponse = {
        'data': [_fullReportJson()],
        'meta': {'total': 1},
      };

      final list = await repo.history('prog-001');
      expect(list, hasLength(1));
      expect(list.first.id, 'rep-001');
    });

    test('returns empty list for unknown / non-list body', () async {
      dio.nextResponse = {'unexpected': 'shape'};
      final list = await repo.history('prog-001');
      expect(list, isEmpty);
    });
  });

  // ============================================================
  // Group 5 — Error mapping
  // ============================================================

  group('Error mapping', () {
    test('DioExceptionType.connectionError → AiCuratorErrorCode.network', () async {
      dio.nextError = DioException(
        requestOptions: RequestOptions(path: '/x'),
        type: DioExceptionType.connectionError,
      );

      expect(
        () => repo.curate(programId: 'p'),
        throwsA(
          isA<AiCuratorException>()
              .having((e) => e.code, 'code', AiCuratorErrorCode.network)
              .having(
                (e) => e.message,
                'message',
                'Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra mạng.',
              ),
        ),
      );
    });

    test('badResponse 429 → AiCuratorErrorCode.rateLimited', () async {
      dio.nextError = _dioBadResponse(status: 429);

      expect(
        () => repo.curate(programId: 'p'),
        throwsA(
          isA<AiCuratorException>()
              .having((e) => e.code, 'code', AiCuratorErrorCode.rateLimited)
              .having((e) => e.status, 'status', 429),
        ),
      );
    });

    test('badResponse 401 → AiCuratorErrorCode.unauthorized', () async {
      dio.nextError = _dioBadResponse(status: 401);

      expect(
        () => repo.curate(programId: 'p'),
        throwsA(
          isA<AiCuratorException>()
              .having((e) => e.code, 'code', AiCuratorErrorCode.unauthorized)
              .having((e) => e.status, 'status', 401),
        ),
      );
    });

    test('surfaces backend message field instead of generic fallback', () async {
      dio.nextError = _dioBadResponse(
        status: 401,
        body: {'message': 'Token expired, please sign in again'},
      );

      await expectLater(
        () => repo.curate(programId: 'p'),
        throwsA(
          isA<AiCuratorException>()
              .having((e) => e.code, 'code', AiCuratorErrorCode.unauthorized)
              .having(
                (e) => e.message,
                'message',
                'Token expired, please sign in again',
              ),
        ),
      );
    });

    test('timeout errors map to AiCuratorErrorCode.timeout', () async {
      dio.nextError = DioException(
        requestOptions: RequestOptions(path: '/x'),
        type: DioExceptionType.receiveTimeout,
      );

      await expectLater(
        () => repo.curate(programId: 'p'),
        throwsA(
          isA<AiCuratorException>()
              .having((e) => e.code, 'code', AiCuratorErrorCode.timeout),
        ),
      );
    });

    test('list-shape `message` field is joined into a string', () async {
      dio.nextError = _dioBadResponse(
        status: 422,
        body: {'message': ['title is required', 'slug already taken']},
      );

      await expectLater(
        () => repo.curate(programId: 'p'),
        throwsA(
          isA<AiCuratorException>()
              .having((e) => e.code, 'code', AiCuratorErrorCode.validation)
              .having(
                (e) => e.message,
                'message',
                'title is required, slug already taken',
              ),
        ),
      );
    });
  });
}