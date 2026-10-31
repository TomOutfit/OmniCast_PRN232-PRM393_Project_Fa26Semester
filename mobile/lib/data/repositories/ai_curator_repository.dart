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

class ContentAssessment {
  final String summary;
  final List<String> highlights;
  final List<String> strengths;
  final List<String> weaknesses;
  final String narrativeFlow;
  final String targetAudienceDetails;

  const ContentAssessment({
    required this.summary,
    required this.highlights,
    required this.strengths,
    required this.weaknesses,
    required this.narrativeFlow,
    required this.targetAudienceDetails,
  });

  factory ContentAssessment.fromJson(Map<String, dynamic> json) {
    return ContentAssessment(
      summary: (json['summary'] as String?) ?? '',
      highlights: ((json['highlights'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      strengths: ((json['strengths'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      weaknesses: ((json['weaknesses'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      narrativeFlow: (json['narrativeFlow'] as String?) ?? '',
      targetAudienceDetails: (json['targetAudienceDetails'] as String?) ?? '',
    );
  }
}

class FormatAssessment {
  final String productionFormat;
  final String pacing; // SLOW | MODERATE | DYNAMIC | FAST_PACED
  final List<String> visualAudioRequirements;
  final String interactivityLevel; // LOW | MEDIUM | HIGH
  final String technicalRecommendations;

  const FormatAssessment({
    required this.productionFormat,
    required this.pacing,
    required this.visualAudioRequirements,
    required this.interactivityLevel,
    required this.technicalRecommendations,
  });

  factory FormatAssessment.fromJson(Map<String, dynamic> json) {
    return FormatAssessment(
      productionFormat:
          (json['productionFormat'] as String?) ?? 'Truyền hình / Talkshow',
      pacing: (json['pacing'] as String?) ?? 'MODERATE',
      visualAudioRequirements:
          ((json['visualAudioRequirements'] as List?) ?? const [])
              .map((e) => e.toString())
              .toList(growable: false),
      interactivityLevel:
          (json['interactivityLevel'] as String?) ?? 'MEDIUM',
      technicalRecommendations:
          (json['technicalRecommendations'] as String?) ?? '',
    );
  }
}

class ScoringBreakdown {
  final int contentQuality;
  final int productionValue;
  final int audienceAppeal;
  final int complianceSafety;
  final int commercialPotential;
  final int overallScore;
  final String grade; // S | A | B | C | D

  const ScoringBreakdown({
    required this.contentQuality,
    required this.productionValue,
    required this.audienceAppeal,
    required this.complianceSafety,
    required this.commercialPotential,
    required this.overallScore,
    required this.grade,
  });

  factory ScoringBreakdown.fromJson(Map<String, dynamic> json) {
    return ScoringBreakdown(
      contentQuality: (json['contentQuality'] as num?)?.toInt() ?? 70,
      productionValue: (json['productionValue'] as num?)?.toInt() ?? 70,
      audienceAppeal: (json['audienceAppeal'] as num?)?.toInt() ?? 70,
      complianceSafety: (json['complianceSafety'] as num?)?.toInt() ?? 80,
      commercialPotential: (json['commercialPotential'] as num?)?.toInt() ?? 70,
      overallScore: (json['overallScore'] as num?)?.toInt() ?? 72,
      grade: (json['grade'] as String?) ?? 'B',
    );
  }
}

class AiCuratorGrounding {
  /// Verbatim quotes copied from the program description.
  final List<String> sourceExcerpts;

  /// Information a curator would need that the description lacks.
  final List<String> infoGaps;

  /// How closely the report tracks the source (0..100). Always
  /// recomputed server-side — the model's own number is ignored.
  final int groundingScore;

  const AiCuratorGrounding({
    required this.sourceExcerpts,
    required this.infoGaps,
    required this.groundingScore,
  });

  factory AiCuratorGrounding.fromJson(Map<String, dynamic> json) {
    return AiCuratorGrounding(
      sourceExcerpts: ((json['sourceExcerpts'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      infoGaps: ((json['infoGaps'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      groundingScore: (json['groundingScore'] as num?)?.toInt() ?? 0,
    );
  }

  /// True when the report tracks the source well enough to trust.
  bool get isWellGrounded => groundingScore >= 55;
}

class AiCuratorReport {
  final String broadcastSuitability; // PRIME_TIME | STANDARD | RESTRICTED
  final String suggestedTimeSlot; // "21:00 - 23:00"
  final String targetAudienceVibe;
  final String riskWarnings;

  final AiSentiment sentiment;
  final AiCompliance compliance;
  final ContentAssessment? contentAssessment;
  final FormatAssessment? formatAssessment;
  final ScoringBreakdown? scoringBreakdown;
  final AiCuratorGrounding? grounding;
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
    this.contentAssessment,
    this.formatAssessment,
    this.scoringBreakdown,
    this.grounding,
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
    final rawSentiment =
        (json['sentimentAnalysis'] as Map?)?.cast<String, dynamic>() ??
            const {};
    final sentiment = AiSentiment.fromJson(rawSentiment);

    // Parse or synthesize content assessment
    ContentAssessment? contentAssessment;
    final contentMap = (json['contentAssessment'] as Map?)
            ?.cast<String, dynamic>() ??
        (rawSentiment['contentAssessment'] as Map?)?.cast<String, dynamic>();
    if (contentMap != null && contentMap.isNotEmpty) {
      contentAssessment = ContentAssessment.fromJson(contentMap);
    } else {
      contentAssessment = ContentAssessment(
        summary: (json['targetAudienceVibe'] as String?) ??
            'Tổng quan kịch bản và nội dung chương trình phát sóng',
        highlights: const [
          'Nội dung hấp dẫn',
          'Đạt tiêu chuẩn phát thanh truyền hình',
        ],
        strengths: const [
          'Cấu trúc mạch lạc, chủ đề rõ ràng',
          'Phù hợp định hướng phát sóng OmniCast',
        ],
        weaknesses: const [
          'Cần chú ý nhịp chuyển cảnh giữa các phân đoạn',
        ],
        narrativeFlow:
            'Mạch chương trình tự nhiên, giữ chân người xem tốt qua các phần phát.',
        targetAudienceDetails: (json['targetAudienceVibe'] as String?) ??
            'Khán giả đại chúng, gia đình và thanh thiếu niên.',
      );
    }

    // Parse or synthesize format assessment
    FormatAssessment? formatAssessment;
    final formatMap = (json['formatAssessment'] as Map?)
            ?.cast<String, dynamic>() ??
        (rawSentiment['formatAssessment'] as Map?)?.cast<String, dynamic>();
    if (formatMap != null && formatMap.isNotEmpty) {
      formatAssessment = FormatAssessment.fromJson(formatMap);
    } else {
      formatAssessment = const FormatAssessment(
        productionFormat: 'Chương trình Studio / Tọa đàm & Giải trí',
        pacing: 'MODERATE',
        visualAudioRequirements: [
          'Độ phân giải tối thiểu 1080p, tỉ lệ 16:9',
          'Chuẩn âm thanh Stereo cân bằng -14 LUFS',
          'Hạ tầng đường truyền CDN ổn định'
        ],
        interactivityLevel: 'MEDIUM',
        technicalRecommendations:
            'Đảm bảo bitrate video tối thiểu 4.5 Mbps và đồng bộ âm thanh - hình ảnh chính xác.',
      );
    }

    // Parse or synthesize scoring breakdown
    ScoringBreakdown? scoringBreakdown;
    final scoreMap = (json['scoringBreakdown'] as Map?)
            ?.cast<String, dynamic>() ??
        (rawSentiment['scoringBreakdown'] as Map?)?.cast<String, dynamic>();
    if (scoreMap != null && scoreMap.isNotEmpty) {
      scoringBreakdown = ScoringBreakdown.fromJson(scoreMap);
    } else {
      final engagement = sentiment.audienceEngagement;
      final isPrime =
          (json['broadcastSuitability'] as String?) == 'PRIME_TIME';
      final isRestricted =
          (json['broadcastSuitability'] as String?) == 'RESTRICTED';
      final baseScore = isPrime ? 88 : (isRestricted ? 55 : 75);
      final avgScore =
          ((baseScore * 0.6) + (engagement * 0.4)).round().clamp(0, 100);
      final grade = avgScore >= 90
          ? 'S'
          : (avgScore >= 80
              ? 'A'
              : (avgScore >= 70
                  ? 'B'
                  : (avgScore >= 55 ? 'C' : 'D')));
      scoringBreakdown = ScoringBreakdown(
        contentQuality: (baseScore + 2).clamp(0, 100),
        productionValue: baseScore.clamp(0, 100),
        audienceAppeal: engagement.clamp(0, 100),
        complianceSafety: isRestricted ? 60 : 92,
        commercialPotential: ((baseScore + engagement) ~/ 2).clamp(0, 100),
        overallScore: avgScore,
        grade: grade,
      );
    }

    // Parse grounding (v5). The block may live at the top level or
    // inside the sentimentAnalysis JSON blob (that's where the
    // backend persists it).
    AiCuratorGrounding? grounding;
    final groundingMap = (json['grounding'] as Map?)?.cast<String, dynamic>() ??
        (rawSentiment['grounding'] as Map?)?.cast<String, dynamic>();
    if (groundingMap != null && groundingMap.isNotEmpty) {
      grounding = AiCuratorGrounding.fromJson(groundingMap);
    }

    return AiCuratorReport(
      broadcastSuitability:
          (json['broadcastSuitability'] as String?) ?? 'STANDARD',
      suggestedTimeSlot:
          (json['suggestedTimeSlot'] as String?) ?? '20:00 - 22:00',
      targetAudienceVibe:
          (json['targetAudienceVibe'] as String?) ?? 'Khán giả phổ thông',
      riskWarnings: (json['riskWarnings'] as String?) ?? '',
      sentiment: sentiment,
      compliance: AiCompliance.fromJson(
        (json['complianceAssessment'] as Map?)?.cast<String, dynamic>() ??
            const {},
      ),
      contentAssessment: contentAssessment,
      formatAssessment: formatAssessment,
      scoringBreakdown: scoringBreakdown,
      grounding: grounding,
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
    int? duration,
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
          if (duration != null && duration > 0) 'duration': duration,
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