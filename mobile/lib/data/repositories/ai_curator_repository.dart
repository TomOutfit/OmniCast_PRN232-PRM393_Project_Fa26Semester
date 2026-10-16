// OmniCast - AI Curator Repository (Flutter)
// ============================================================
//
// Mirrors the backend `AiCuratorController` 1:1. Five flows:
//
//   1. curate()     — Mode 1: existing program, persist report.
//                     Returns the persisted `AiCuratorReport`.
//   2. analyze()    — Mode 2: preview / ad-hoc, NEVER persisted.
//   3. apply()      — Mode 3: push fields to an existing program.
//   4. history()    — last 10 reports for a program.
//   5. analyzeExisting() — Mode 1 alias with programId in path.
//
// Endpoints (under `/v1/ai-curator/`):
//   POST /curate                    — body: { programId, forceRefresh? }
//   POST /analyze                   — body: { title, description?, ... }
//   POST /analyze/:programId        — body: none (path variant)
//   POST /apply/:programId          — body: { scheduledAt?, status?, description?, markApplied? }
//   GET  /history/:programId        — returns array (or {data: []})
//
// Errors from the backend are surfaced as a typed `AiCuratorException`
// so the UI layer can render an inline message + a sonner-like toast
// without having to inspect the raw Dio error.
// ============================================================

import 'package:dio/dio.dart';

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/error_utils.dart';

/// Codes we surface to the UI. Mirrors the backend `ApiErrorCode`
/// surface in spirit; we don't re-export every status, only the ones
/// that change what the curator should see / do.
enum AiCuratorErrorCode {
  network,
  timeout,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  serverError,
  validation,
  unknown,
}

class AiCuratorException implements Exception {
  final AiCuratorErrorCode code;
  final String message;
  final int? status;
  final Map<String, List<String>> fieldErrors;

  const AiCuratorException({
    required this.code,
    required this.message,
    this.status,
    this.fieldErrors = const {},
  });

  @override
  String toString() => 'AiCuratorException($code, $message)';
}

// ============================================================
// Report model
// ============================================================

class AiCuratorReport {
  final String broadcastSuitability; // PRIME_TIME | STANDARD | RESTRICTED
  final String suggestedTimeSlot; // "21:00 - 23:00"
  final String targetAudienceVibe;
  final String riskWarnings;

  final AiSentiment sentiment;
  final AiCompliance compliance;
  final String aiModelVersion;
  final int processingTimeMs;
  final int? tokenUsed;
  final bool? cached;

  /// Backend confidence score for the latest report (0..100). Optional —
  /// older reports persisted before the field was added will surface
  /// `null` so the UI can render a fallback.
  final int? confidence;

  // History-only fields
  final String? id;
  final String? programId;
  final String? createdBy;
  final DateTime? createdAt;

  const AiCuratorReport({
    required this.broadcastSuitability,
    required this.suggestedTimeSlot,
    required this.targetAudienceVibe,
    required this.riskWarnings,
    required this.sentiment,
    required this.compliance,
    required this.aiModelVersion,
    required this.processingTimeMs,
    this.tokenUsed,
    this.cached,
    this.confidence,
    this.id,
    this.programId,
    this.createdBy,
    this.createdAt,
  });

  factory AiCuratorReport.fromJson(Map<String, dynamic> json) {
    return AiCuratorReport(
      broadcastSuitability:
          (json['broadcastSuitability'] as String?) ?? 'STANDARD',
      suggestedTimeSlot:
          (json['suggestedTimeSlot'] as String?) ?? '20:00 - 22:00',
      targetAudienceVibe:
          (json['targetAudienceVibe'] as String?) ?? 'Khán giả phổ thông',
      riskWarnings: (json['riskWarnings'] as String?) ?? '',
      sentiment: AiSentiment.fromJson(
        (json['sentimentAnalysis'] as Map?)?.cast<String, dynamic>() ??
            const {},
      ),
      compliance: AiCompliance.fromJson(
        (json['complianceAssessment'] as Map?)?.cast<String, dynamic>() ??
            const {},
      ),
      aiModelVersion: (json['aiModelVersion'] as String?) ?? 'heuristic-v1',
      processingTimeMs: (json['processingTimeMs'] as num?)?.toInt() ?? 0,
      tokenUsed: (json['tokenUsed'] as num?)?.toInt(),
      cached: json['cached'] as bool?,
      confidence: (json['confidence'] as num?)?.toInt(),
      id: json['id'] as String?,
      programId: json['programId'] as String?,
      createdBy: json['createdBy'] as String?,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  bool get isPrimeTime => broadcastSuitability == 'PRIME_TIME';
  bool get isRestricted => broadcastSuitability == 'RESTRICTED';

  static DateTime? _parseDate(dynamic v) {
    if (v is String && v.isNotEmpty) {
      return DateTime.tryParse(v);
    }
    return null;
  }
}

class AiSentiment {
  final String overallSentiment; // positive | neutral | negative
  final String hypeLevel; // low | medium | high
  final int audienceEngagement; // 0..100

  const AiSentiment({
    required this.overallSentiment,
    required this.hypeLevel,
    required this.audienceEngagement,
  });

  factory AiSentiment.fromJson(Map<String, dynamic> json) {
    return AiSentiment(
      overallSentiment: (json['overallSentiment'] as String?) ?? 'neutral',
      hypeLevel: (json['hypeLevel'] as String?) ?? 'medium',
      audienceEngagement: (json['audienceEngagement'] as num?)?.toInt() ?? 50,
    );
  }
}

class AiCompliance {
  final bool isAgeRestricted;
  final String ageRating; // PG | T13 | T16 | T18
  final List<String> flaggedContent;
  final String recommendedBroadcastWindow; // DAY | EVENING | LATE_NIGHT

  const AiCompliance({
    required this.isAgeRestricted,
    required this.ageRating,
    required this.flaggedContent,
    required this.recommendedBroadcastWindow,
  });

  factory AiCompliance.fromJson(Map<String, dynamic> json) {
    return AiCompliance(
      isAgeRestricted: json['isAgeRestricted'] as bool? ?? false,
      ageRating: (json['ageRating'] as String?) ?? 'PG',
      flaggedContent: ((json['flaggedContent'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      recommendedBroadcastWindow:
          (json['recommendedBroadcastWindow'] as String?) ?? 'EVENING',
    );
  }
}

// ============================================================
// Apply result
// ============================================================

class ApplyCurationResult {
  final String programId;
  final List<String> appliedFields;
  final DateTime? updatedAt;
  final String channelId;
  final String channelName;

  const ApplyCurationResult({
    required this.programId,
    required this.appliedFields,
    required this.channelId,
    required this.channelName,
    this.updatedAt,
  });

  factory ApplyCurationResult.fromJson(Map<String, dynamic> json) {
    final channel =
        (json['channel'] as Map?)?.cast<String, dynamic>() ?? const {};
    return ApplyCurationResult(
      programId: (json['programId'] as String?) ?? '',
      appliedFields: ((json['appliedFields'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? ''),
      channelId: (channel['id'] as String?) ?? '',
      channelName: (channel['name'] as String?) ?? '',
    );
  }
}

// ============================================================
// Repository
// ============================================================

class AiCuratorRepository {
  final DioClient _dioClient;

  AiCuratorRepository({required DioClient dioClient})
      : _dioClient = dioClient;

  // ── Mode 1: Curate existing program (persist) ──────────────
  Future<AiCuratorReport> curate({
    required String programId,
    bool forceRefresh = false,
  }) async {
    try {
      final res = await _dioClient.post(
        AppEndpoints.aiCuratorCurate,
        data: {
          'programId': programId,
          'forceRefresh': forceRefresh,
        },
      );
      return _unwrapReport(res.data);
    } on DioException catch (e) {
      throw _toAiCuratorException(e);
    }
  }

  // ── Mode 1 alias: path-param variant ───────────────────────
  Future<AiCuratorReport> analyzeExisting(String programId) async {
    try {
      final res = await _dioClient.post(
        AppEndpoints.aiCuratorAnalyze(programId),
      );
      return _unwrapReport(res.data);
    } on DioException catch (e) {
      throw _toAiCuratorException(e);
    }
  }

  // ── Mode 2: Preview / ad-hoc analysis ──────────────────────
  Future<AiCuratorReport> analyze({
    required String title,
    String? description,
    String? category,
    String? language,
    String? scheduledAt,
    List<String>? tags,
    String? channelName,
  }) async {
    try {
      final res = await _dioClient.post(
        AppEndpoints.aiCuratorAnalyzePreview,
        data: {
          'title': title,
          if (description != null && description.isNotEmpty)
            'description': description,
          if (category != null && category.isNotEmpty) 'category': category,
          if (language != null && language.isNotEmpty) 'language': language,
          if (scheduledAt != null && scheduledAt.isNotEmpty)
            'scheduledAt': scheduledAt,
          if (tags != null && tags.isNotEmpty) 'tags': tags,
          if (channelName != null && channelName.isNotEmpty)
            'channelName': channelName,
        },
      );
      return _unwrapReport(res.data);
    } on DioException catch (e) {
      throw _toAiCuratorException(e);
    }
  }

  // ── Mode 3: Apply curation ─────────────────────────────────
  Future<ApplyCurationResult> apply({
    required String programId,
    String? scheduledAt,
    String? status,
    String? description,
    bool markApplied = true,
  }) async {
    try {
      final res = await _dioClient.post(
        AppEndpoints.aiCuratorApply(programId),
        data: {
          if (scheduledAt != null) 'scheduledAt': scheduledAt,
          if (status != null) 'status': status,
          if (description != null) 'description': description,
          'markApplied': markApplied,
        },
      );
      final raw = res.data;
      final body = (raw is Map && raw['data'] is Map)
          ? raw['data'] as Map<String, dynamic>
          : (raw as Map<String, dynamic>);
      return ApplyCurationResult.fromJson(body);
    } on DioException catch (e) {
      throw _toAiCuratorException(e);
    }
  }

  // ── History ────────────────────────────────────────────────
  Future<List<AiCuratorReport>> history(String programId) async {
    try {
      final res = await _dioClient.get(
        AppEndpoints.aiCuratorHistory(programId),
      );
      final raw = res.data;
      final list = (raw is List)
          ? raw
          : ((raw as Map?)?['data'] as List?) ?? const [];
      return list
          .whereType<Map>()
          .map((m) => AiCuratorReport.fromJson(m.cast<String, dynamic>()))
          .toList(growable: false);
    } on DioException catch (e) {
      throw _toAiCuratorException(e);
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  /// Backend may wrap the response in `{ data: {...} }` (paginated)
  /// or return the report directly. This normalises both shapes.
  AiCuratorReport _unwrapReport(dynamic raw) {
    final Map<String, dynamic> body =
        (raw is Map && raw['data'] is Map && raw['data'] is! List)
            ? (raw['data'] as Map).cast<String, dynamic>()
            : (raw is Map ? raw.cast<String, dynamic>() : const {});
    return AiCuratorReport.fromJson(body);
  }

  AiCuratorException _toAiCuratorException(DioException e) {
    final status = e.response?.statusCode;
    final code = _mapDioError(e, status);
    final message = _resolveErrorMessage(e, status);
    return AiCuratorException(
      code: code,
      message: message,
      status: status,
    );
  }

  AiCuratorErrorCode _mapDioError(DioException e, int? status) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return AiCuratorErrorCode.timeout;
      case DioExceptionType.connectionError:
        return AiCuratorErrorCode.network;
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
      case DioExceptionType.unknown:
        return AiCuratorErrorCode.unknown;
      case DioExceptionType.badResponse:
        if (status == 401) return AiCuratorErrorCode.unauthorized;
        if (status == 403) return AiCuratorErrorCode.forbidden;
        if (status == 404) return AiCuratorErrorCode.notFound;
        if (status == 422) return AiCuratorErrorCode.validation;
        if (status == 429) return AiCuratorErrorCode.rateLimited;
        if (status != null && status >= 500) return AiCuratorErrorCode.serverError;
        return AiCuratorErrorCode.unknown;
    }
  }

  String _resolveErrorMessage(DioException e, int? status) {
    if (e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return 'Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra mạng.';
    }
    // Try to surface the backend's user-friendly message.
    final body = e.response?.data;
    if (body is Map) {
      final m = body['message'];
      if (m is String && m.isNotEmpty) return m;
      if (m is List && m.isNotEmpty) return m.join(', ');
    }
    return ErrorUtils.parseError(e);
  }
}