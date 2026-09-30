// OmniCast - Programs Repository
//
// Thin HTTP wrapper around the OmniCast backend programs API.
//
// The backend pulls program data from 12 category-specific external sources
// (sports, news, movies, music, gaming, tech, education, food, health,
// travel, art, lifestyle) via the Content Aggregator service. The
// repository here simply exposes those endpoints to the Flutter client
// and normalizes the paginated `{ data, meta }` envelope.

import 'dart:convert';

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../datasources/local/database_helper.dart';
import '../models/program_model.dart';
import '../models/recording_model.dart';

class ProgramsRepository {
  final DioClient _dioClient;
  final DatabaseHelper? _db;

  ProgramsRepository({
    required DioClient dioClient,
    DatabaseHelper? db,
  })  : _dioClient = dioClient,
        _db = db;

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

  /// Scheduled programs for EPG. Uses the new `/epg/day` endpoint and
  /// transparently falls back to the SQLite cache when offline.
  Future<List<LiveEventModel>> getEpgSchedule({
    required DateTime date,
    String? channelId,
    List<String>? channelIds,
  }) async {
    final dateKey = _ymd(date);

    // 1) Always serve from cache if present and recent.
    if (_db != null) {
      final cached = await _db!.getEpgCachePayload(dateKey);
      if (cached != null) {
        final parsed = _tryDecodeEpg(cached);
        if (parsed != null) return parsed;
      }
    }

    // 2) Hit the network.
    final queryParams = <String, dynamic>{'date': dateKey};
    if (channelIds != null && channelIds.isNotEmpty) {
      queryParams['channelIds'] = channelIds.join(',');
    } else if (channelId != null) {
      queryParams['channelIds'] = channelId;
    }

    try {
      final response = await _dioClient.get(
        AppEndpoints.epgDay,
        queryParameters: queryParams,
      );
      final body = response.data as Map<String, dynamic>;
      final json = jsonEncode(body);

      // Write to cache.
      if (_db != null) {
        await _db!.putEpgCachePayload(dateKey: dateKey, payload: json);
      }
      return _flattenEpg(body);
    } catch (_) {
      // Last-resort: legacy endpoint (v1) for the requested day.
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));
      final legacyResp = await _dioClient.get(
        AppEndpoints.liveEvents,
        queryParameters: {
          'fromDate': startOfDay.toIso8601String(),
          'toDate': endOfDay.toIso8601String(),
          if (channelId != null) 'channelId': channelId,
        },
      );
      final data = legacyResp.data['data'] as List;
      return data
          .map((e) => LiveEventModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
  }

  /// Now+Next snapshot for the home/dashboard banner.
  Future<List<EpgNowNextEntry>> getEpgSnapshot() async {
    try {
      final resp = await _dioClient.get(AppEndpoints.epgSnapshot);
      final body = resp.data as Map<String, dynamic>;
      final channels = (body['channels'] as List? ?? []);
      return channels
          .map((c) => EpgNowNextEntry.fromJson(c as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  // ============================================================
  // WATCHLIST HELPERS
  // ============================================================

  /// Used by the watchlist flow to inspect a single event (for "add to
  /// watchlist" from program detail).
  Future<LiveEventModel?> getEventForWatchlist(String programId) async {
    try {
      return await getProgramById(programId);
    } catch (_) {
      return null;
    }
  }

  // ============================================================
  // INTERNAL
  // ============================================================

  String _ymd(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  List<LiveEventModel>? _tryDecodeEpg(String raw) {
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return _flattenEpg(decoded);
    } catch (_) {
      return null;
    }
  }

  List<LiveEventModel> _flattenEpg(Map<String, dynamic> body) {
    final channels = body['channels'] as List? ?? [];
    final list = <LiveEventModel>[];
    for (final c in channels) {
      final channel = c as Map<String, dynamic>;
      final programs = channel['programs'] as List? ?? [];
      for (final p in programs) {
        final program = p as Map<String, dynamic>;
        list.add(LiveEventModel(
          id: program['id'] as String,
          title: program['title'] as String,
          contentSource: 'EXTERNAL',
          isPrivate: false,
          quality: 'AUTO',
          language: 'vi',
          status: program['status']?.toString() ?? 'SCHEDULED',
          scheduledAt: DateTime.parse(program['startTime'] as String),
          endedAt: program['endTime'] != null
              ? DateTime.parse(program['endTime'] as String)
              : null,
          duration: (program['durationMinutes'] as num?)?.toInt(),
          viewerCount: 0,
          peakViewers: 0,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          channelId: channel['channelId'] as String,
          tags: (program['tags'] as List?)?.cast<String>() ?? const [],
          autoRecord: true,
          slowMode: false,
          chatEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          thumbnailUrl: program['thumbnailUrl'] as String?,
          channel: ChannelInfo(
            id: channel['channelId'] as String,
            name: channel['channelName'] as String,
            slug: '',
            logoUrl: channel['channelLogoUrl'] as String?,
          ),
          isFiller: program['isFiller'] as bool? ?? false,
          fillerKind: program['fillerKind'] as String?,
          sourceRecordingId: program['sourceRecordingId'] as String?,
        ));
      }
    }
    return list;
  }

  Future<void> likeProgram(String programId) async {
    await _dioClient.post('${AppEndpoints.liveEvents}/$programId/like');
  }

  Future<void> shareProgram(String programId) async {
    await _dioClient.post('${AppEndpoints.liveEvents}/$programId/share');
  }

  /// Increment + return the new share count for a live event.
  /// Fire-and-forget — failures are swallowed by callers.
  Future<int?> bumpLiveEventShare(String programId) async {
    try {
      final res = await _dioClient.post(
        '${AppEndpoints.liveEvents}/$programId/share',
      );
      final data = res.data;
      if (data is Map && data['shareCount'] is num) {
        return (data['shareCount'] as num).toInt();
      }
    } catch (_) {/* best-effort */}
    return null;
  }

  /// Bump the view counter for a live event (once per session per device).
  Future<void> bumpLiveEventView(String programId) async {
    try {
      await _dioClient.post('${AppEndpoints.liveEvents}/$programId/view');
    } catch (_) {/* best-effort */}
  }

  /// Toggle a reaction on a live event. Returns true if the reaction
  /// was added, false if it was removed.
  Future<bool> toggleLiveEventReaction(String programId) async {
    try {
      final res = await _dioClient.post(
        '${AppEndpoints.liveEvents}/$programId/reactions',
        data: {'type': 'HEART'},
      );
      final data = res.data;
      if (data is Map && data['toggled'] is bool) {
        return data['toggled'] as bool;
      }
    } catch (_) {/* swallow */}
    return false;
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

/// Flattened snapshot row used by the home / dashboard.
class EpgNowNextEntry {
  final String channelId;
  final String channelName;
  final String? channelLogoUrl;
  final String channelCategory;
  final EpgProgramEntry? now;
  final EpgProgramEntry? next;

  EpgNowNextEntry({
    required this.channelId,
    required this.channelName,
    this.channelLogoUrl,
    required this.channelCategory,
    this.now,
    this.next,
  });

  factory EpgNowNextEntry.fromJson(Map<String, dynamic> json) {
    EpgProgramEntry? parse(dynamic raw) {
      if (raw == null) return null;
      return EpgProgramEntry.fromJson(raw as Map<String, dynamic>);
    }

    return EpgNowNextEntry(
      channelId: json['channelId'] as String,
      channelName: json['channelName'] as String,
      channelLogoUrl: json['channelLogoUrl'] as String?,
      channelCategory: json['channelCategory']?.toString() ?? '',
      now: parse(json['now']),
      next: parse(json['next']),
    );
  }
}

class EpgProgramEntry {
  final String id;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final int elapsedPercent;

  EpgProgramEntry({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.elapsedPercent,
  });

  factory EpgProgramEntry.fromJson(Map<String, dynamic> json) {
    return EpgProgramEntry(
      id: json['id'] as String,
      title: json['title'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
      elapsedPercent: (json['elapsedPercent'] as num?)?.toInt() ?? 0,
    );
  }
}