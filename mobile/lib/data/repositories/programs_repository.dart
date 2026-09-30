// OmniCast - Programs Repository
//
// Thin HTTP wrapper around the OmniCast backend programs API.
//
// The backend pulls program data from 12 category-specific external sources
// (sports, news, movies, music, gaming, tech, education, food, health,
// travel, art, lifestyle) via the Content Aggregator service. The
// repository here simply exposes those endpoints to the Flutter client
// and normalizes the paginated `{ data, meta }` envelope.

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/program_model.dart';

class ProgramsRepository {
  final DioClient _dioClient;

  ProgramsRepository({required DioClient dioClient}) : _dioClient = dioClient;

  // ============================================================
  // LIVE EVENTS
  // ============================================================

  /// Returns the currently-airing live events across all channels.
  Future<List<LiveEventModel>> getLiveNow() async {
    final response = await _dioClient.get(AppEndpoints.liveNow);
    final data = response.data['data'] as List;
    return data
        .map((e) => LiveEventModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Returns a paginated page of live events, optionally filtered by
  /// channel, category, status and date range.
  Future<ProgramsPage<LiveEventModel>> getPrograms({
    String? channelId,
    String? category,
    String? status,
    DateTime? fromDate,
    DateTime? toDate,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (channelId != null) queryParams['channelId'] = channelId;
    if (category != null) queryParams['category'] = category;
    if (status != null) queryParams['status'] = status;
    if (fromDate != null) queryParams['fromDate'] = fromDate.toIso8601String();
    if (toDate != null) queryParams['toDate'] = toDate.toIso8601String();

    final response = await _dioClient.get(
      AppEndpoints.liveEvents,
      queryParameters: queryParams,
    );

    return ProgramsPage<LiveEventModel>.fromJson(
      response.data as Map<String, dynamic>,
      LiveEventModel.fromJson,
    );
  }

  Future<LiveEventModel> getProgramById(String programId) async {
    final response = await _dioClient.get(AppEndpoints.liveEvent(programId));
    return LiveEventModel.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  /// Continue-watching list (recordings the user has started).
  Future<ProgramsPage<RecordingModel>> getContinueWatching({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dioClient.get(
      AppEndpoints.continueWatching,
      queryParameters: {'page': page, 'limit': limit},
    );
    return ProgramsPage<RecordingModel>.fromJson(
      response.data as Map<String, dynamic>,
      RecordingModel.fromJson,
    );
  }

  /// Scheduled programs for EPG. Optionally filtered by channel.
  Future<List<LiveEventModel>> getEpgSchedule({
    required DateTime date,
    String? channelId,
  }) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));

    final queryParams = <String, dynamic>{
      'fromDate': startOfDay.toIso8601String(),
      'toDate': endOfDay.toIso8601String(),
    };

    if (channelId != null) queryParams['channelId'] = channelId;

    final response = await _dioClient.get(
      AppEndpoints.liveEvents,
      queryParameters: queryParams,
    );

    final data = response.data['data'] as List;
    return data
        .map((e) => LiveEventModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> likeProgram(String programId) async {
    await _dioClient.post('${AppEndpoints.liveEvents}/$programId/like');
  }

  Future<void> shareProgram(String programId) async {
    await _dioClient.post('${AppEndpoints.liveEvents}/$programId/share');
  }

  // ============================================================
  // RECORDINGS / VOD
  // ============================================================

  Future<ProgramsPage<RecordingModel>> getRecordings({
    String? channelId,
    String? category,
    bool? isFeatured,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (channelId != null) queryParams['channelId'] = channelId;
    if (category != null) queryParams['category'] = category;
    if (isFeatured != null) queryParams['isFeatured'] = isFeatured;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final response = await _dioClient.get(
      AppEndpoints.recordings,
      queryParameters: queryParams,
    );

    return ProgramsPage<RecordingModel>.fromJson(
      response.data as Map<String, dynamic>,
      RecordingModel.fromJson,
    );
  }

  Future<RecordingModel> getRecordingById(String recordingId) async {
    final response = await _dioClient.get(AppEndpoints.recording(recordingId));
    return RecordingModel.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  Future<List<RecordingModel>> getSimilarRecordings(String recordingId) async {
    final response = await _dioClient.get(
      AppEndpoints.similarRecordings(recordingId),
    );
    final data = response.data['data'] as List;
    return data
        .map((e) => RecordingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

/// Lightweight pagination envelope mirroring the backend `{ data, meta }`.
class ProgramsPage<T> {
  final List<T> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  ProgramsPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  bool get hasNext => page < totalPages;
  bool get hasPrev => page > 1;

  factory ProgramsPage.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromItemJson,
  ) {
    final raw = json['data'] as List;
    final meta = json['meta'] as Map<String, dynamic>?;
    return ProgramsPage<T>(
      items: raw.map((e) => fromItemJson(e as Map<String, dynamic>)).toList(),
      page: (meta?['page'] as int?) ?? 1,
      limit: (meta?['limit'] as int?) ?? raw.length,
      total: (meta?['total'] as int?) ?? raw.length,
      totalPages: (meta?['totalPages'] as int?) ?? 1,
    );
  }
}

class RecordingModel {
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final String contentSource;
  final String? externalUrl;
  final String? videoUrl;
  final int duration;
  final String? quality;
  final String? contentType;
  final int viewCount;
  final int likeCount;
  final int commentCount;
  final int shareCount;
  final String channelId;
  final ChannelInfo? channel;
  final DateTime publishedAt;
  final List<String> tags;

  RecordingModel({
    required this.id,
    required this.title,
    this.description,
    this.thumbnailUrl,
    required this.contentSource,
    this.externalUrl,
    this.videoUrl,
    required this.duration,
    this.quality,
    this.contentType,
    required this.viewCount,
    required this.likeCount,
    required this.commentCount,
    required this.shareCount,
    required this.channelId,
    this.channel,
    required this.publishedAt,
    this.tags = const [],
  });

  factory RecordingModel.fromJson(Map<String, dynamic> json) {
    return RecordingModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      contentSource: json['contentSource'] as String? ?? 'EXTERNAL',
      externalUrl: json['externalUrl'] as String?,
      videoUrl: json['videoUrl'] as String?,
      duration: json['duration'] as int? ?? 0,
      quality: json['quality'] as String?,
      contentType: json['contentType'] as String?,
      viewCount: json['viewCount'] as int? ?? 0,
      likeCount: json['likeCount'] as int? ?? 0,
      commentCount: json['commentCount'] as int? ?? 0,
      shareCount: json['shareCount'] as int? ?? 0,
      channelId: json['channelId'] as String,
      channel: json['channel'] != null
          ? ChannelInfo.fromJson(json['channel'] as Map<String, dynamic>)
          : null,
      publishedAt: DateTime.parse(json['publishedAt'] as String),
      tags: (json['tags'] as List?)?.cast<String>() ?? const [],
    );
  }

  String get formattedDuration {
    final hours = duration ~/ 3600;
    final minutes = (duration % 3600) ~/ 60;
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }
}