// ============================================================
// OmniCast - Live Studio Repository
// ============================================================
//
// HTTP client for the Studio control surface (Staff/Admin only).
// Three flows are supported:
//
//   1. Curated Live: pick existing recordings (royalty-free /
//      self-uploaded only) and broadcast them as LIVE NOW on a
//      channel. Backend's anti-piracy guard rejects YouTube /
//      Twitch / Vimeo / Facebook / TikTok / Dailymotion / iframe
//      sources — see `LiveStudioService.assertBroadcastAllowed`.
//
//   2. Self-Record: upload a freshly-recorded clip (mobile camera
//      capture) and either save it as a Recording or push it LIVE
//      immediately.
//
//   3. Catalog (Danh mục nguồn công khai): browse a curated list
//      of pre-vetted public-domain / royalty-free video sources
//      (Mux, Cloudinary, Internet Archive, Blender Open Movie,
//      Pexels) and add one of them to a channel as a Recording.
//      The result is immediately selectable in the "Chọn nội dung"
//      picker so the operator can stream it on the very next click.
//
// The repository does **not** attempt to play the result — the
// studio's only job is to "go live" or "stop live". The viewer-side
// `OmniPlayer` (already wired to `EpgSyncBloc`) picks up the change
// on its next 60s `/epg/now` poll (≈1s in the curated path because
// `EpgNowService` short-circuits the day grid when a curated event
// is active).
// ============================================================

import 'dart:io';

import 'package:dio/dio.dart';

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/recording_model.dart';
import '../models/studio_catalog_model.dart';

class LiveStudioRepository {
  final DioClient _dioClient;
  LiveStudioRepository({required DioClient dioClient}) : _dioClient = dioClient;

  // ============================================================
  // 1. List broadcastable recordings
  // ============================================================

  /// Returns recordings on a channel that the Studio is allowed to
  /// broadcast. External platforms are filtered out server-side.
  Future<List<RecordingModel>> listBroadcastableRecordings({
    required String channelId,
    String? search,
    int? limit,
  }) async {
    final res = await _dioClient.get(
      AppEndpoints.studioRecordings(channelId, search: search, limit: limit),
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    final items = (body['items'] as List? ?? const [])
        .cast<Map<String, dynamic>>();
    return items.map(RecordingModel.fromJson).toList(growable: false);
  }

  // ============================================================
  // 2. Curate live
  // ============================================================

  /// Push one or more recordings as LIVE NOW on a channel. Returns
  /// the freshly-created LiveEvent plus the recordings it consumes.
  Future<CurateLiveResult> curateLive({
    required String channelId,
    required List<String> recordingIds,
    String? title,
    String? description,
    String? thumbnailUrl,
    int? duration,
  }) async {
    final res = await _dioClient.post(
      AppEndpoints.studioCurateLive,
      data: {
        'channelId': channelId,
        'recordingIds': recordingIds,
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (thumbnailUrl != null) 'thumbnailUrl': thumbnailUrl,
        if (duration != null) 'duration': duration,
      },
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return CurateLiveResult.fromJson(body);
  }

  // ============================================================
  // 3. Stop live
  // ============================================================

  /// End a curated live event. With `keepAsVod=true` the event
  /// moves to ON_DEMAND so viewers can re-watch.
  Future<StopLiveResult> stopLive({
    required String eventId,
    bool keepAsVod = false,
  }) async {
    final res = await _dioClient.post(
      AppEndpoints.studioStopLive(eventId),
      data: {'keepAsVod': keepAsVod},
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return StopLiveResult.fromJson(body);
  }

  // ============================================================
  // 4. Self-record upload
  // ============================================================

  /// Upload a self-recorded clip's metadata to the backend.
  ///
  /// The file itself is uploaded to backend storage by
  /// [uploadSelfRecordFile] first, which returns a public URL. That
  /// URL is then passed here as `videoUrl`.
  Future<SelfRecordResult> uploadSelfRecord({
    required String channelId,
    required String title,
    required String videoUrl,
    required int duration,
    String? description,
    String? thumbnailUrl,
    List<String>? tags,
    SelfRecordVisibility visibility = SelfRecordVisibility.scheduled,
  }) async {
    final res = await _dioClient.post(
      AppEndpoints.studioRecordingsUpload,
      data: {
        'channelId': channelId,
        'title': title,
        'videoUrl': videoUrl,
        'duration': duration,
        if (description != null) 'description': description,
        if (thumbnailUrl != null) 'thumbnailUrl': thumbnailUrl,
        if (tags != null) 'tags': tags,
        'visibility': visibility.wireName,
      },
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return SelfRecordResult.fromJson(body);
  }

  /// Upload a self-recorded file (mp4) to backend storage.
  /// Returns the public URL of the uploaded file.
  ///
  /// The backend stores the file under [STORAGE_BUCKET_VIDEOS] and
  /// returns a URL relative to the API host. This helper exposes the
  /// file bytes as a multipart `FormData` upload with progress
  /// reporting so the UI can show a determinate progress bar.
  Future<String> uploadSelfRecordFile({
    required File file,
    String? title,
    void Function(int sent, int total)? onProgress,
  }) async {
    final fileName = file.path.split(Platform.pathSeparator).last;
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: fileName,
      ),
      if (title != null) 'title': title,
    });

    final res = await _dioClient.dio.post(
      '${AppEndpoints.studioRecordingsUpload}/file',
      data: form,
      options: Options(
        // Let dio set the multipart boundary header itself.
        headers: {'Content-Type': 'multipart/form-data'},
      ),
      onSendProgress: (sent, total) {
        if (onProgress != null && total > 0) onProgress(sent, total);
      },
    );

    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return body['url'] as String;
  }

  // ============================================================
  // 5. Catalog (Mode 3 — Danh mục nguồn video công khai)
  // ============================================================

  /// Fetch the public catalog of pre-vetted video sources. Each
  /// entry can be one-click-added to a channel via [addFromCatalog].
  Future<StudioCatalogPage> listCatalogStreams({
    String? channel,
    bool? verifiedOnly,
    String? search,
  }) async {
    final res = await _dioClient.get(
      AppEndpoints.studioCatalogStreamsWithQuery(
        channel: channel,
        verified: verifiedOnly,
        search: search,
      ),
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return StudioCatalogPage.fromJson(body);
  }

  /// Add a single catalog entry to a channel. Persists the entry as
  /// a `Recording` row scoped to the chosen channel. The result is
  /// immediately selectable in the "Chọn nội dung" picker so the
  /// operator can stream it on the very next "PHÁT SÓNG" click.
  Future<AddFromCatalogResult> addFromCatalog({
    required String channelId,
    required String catalogId,
    String? title,
    String? description,
    bool? isPublished,
  }) async {
    final res = await _dioClient.post(
      AppEndpoints.studioAddFromCatalog,
      data: {
        'channelId': channelId,
        'catalogId': catalogId,
        if (title != null && title.isNotEmpty) 'title': title,
        if (description != null && description.isNotEmpty)
          'description': description,
        if (isPublished != null) 'isPublished': isPublished,
      },
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return AddFromCatalogResult.fromJson(body);
  }
}

// ============================================================
// Self-record visibility (matches backend enum)
// ============================================================

enum SelfRecordVisibility {
  immediate,
  scheduled,
  private,
}

extension _SelfRecordVisibilityWire on SelfRecordVisibility {
  String get wireName => switch (this) {
        SelfRecordVisibility.immediate => 'IMMEDIATE',
        SelfRecordVisibility.scheduled => 'SCHEDULED',
        SelfRecordVisibility.private => 'PRIVATE',
      };
}

// ============================================================
// Result DTOs
// ============================================================

class CurateLiveResult {
  final String eventId;
  final String title;
  final String message;
  final List<String> recordingIds;
  final String channelSlug;
  final String channelName;

  CurateLiveResult({
    required this.eventId,
    required this.title,
    required this.message,
    required this.recordingIds,
    required this.channelSlug,
    required this.channelName,
  });

  factory CurateLiveResult.fromJson(Map<String, dynamic> json) {
    final event = (json['event'] as Map?)?.cast<String, dynamic>() ?? const {};
    final recordings = (json['recordings'] as List? ?? const [])
        .cast<Map>()
        .map((m) => m['id']?.toString() ?? '')
        .where((s) => s.isNotEmpty)
        .toList(growable: false);
    final channel =
        (event['channel'] as Map?)?.cast<String, dynamic>() ?? const {};
    return CurateLiveResult(
      eventId: event['id']?.toString() ?? '',
      title: event['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      recordingIds: recordings,
      channelSlug: channel['slug']?.toString() ?? '',
      channelName: channel['name']?.toString() ?? '',
    );
  }
}

class StopLiveResult {
  final String eventId;
  final String status;
  final String message;
  StopLiveResult({
    required this.eventId,
    required this.status,
    required this.message,
  });
  factory StopLiveResult.fromJson(Map<String, dynamic> json) {
    final event = (json['event'] as Map?)?.cast<String, dynamic>() ?? const {};
    return StopLiveResult(
      eventId: event['id']?.toString() ?? '',
      status: event['status']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
    );
  }
}

class SelfRecordResult {
  final String recordingId;
  final String recordingTitle;
  final String? liveEventId;
  final String message;
  SelfRecordResult({
    required this.recordingId,
    required this.recordingTitle,
    required this.message,
    this.liveEventId,
  });
  factory SelfRecordResult.fromJson(Map<String, dynamic> json) {
    final rec = (json['recording'] as Map?)?.cast<String, dynamic>() ?? const {};
    final live = (json['liveEvent'] as Map?)?.cast<String, dynamic>();
    return SelfRecordResult(
      recordingId: rec['id']?.toString() ?? '',
      recordingTitle: rec['title']?.toString() ?? '',
      liveEventId: live?['id']?.toString(),
      message: json['message']?.toString() ?? '',
    );
  }
}