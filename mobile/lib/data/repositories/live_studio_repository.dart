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
  // 4b. Cloudinary direct upload (bypass Vercel 4.5 MB body limit)
  // ============================================================
  //
  // Why this flow exists:
  //   The existing `uploadSelfRecordFile` posts the file to the
  //   backend, which writes it to local storage. On Vercel this
  //   breaks in two ways:
  //     1. The 4.5 MB body-size cap rejects large clips.
  //     2. The serverless filesystem is ephemeral — even if the
  //        upload succeeds, the URL handed back stops resolving
  //        once the function instance is recycled.
  //
  //   Cloudinary fixes both. The mobile app asks the backend to
  //   sign a payload, then POSTs the file directly to Cloudinary
  //   (the file never goes through Vercel). Cloudinary returns a
  //   permanent `secure_url` we persist in the Recording row.
  //
  // The combined helper `addToLibraryFromCloudinaryUpload` runs
  // all three steps (sign → upload → addToLibrary) in sequence
  // and is what the Studio UI should call.
  //
  // Free-tier cap: 100 MB per file, 25 GB total storage.

  /// Returns the signed payload the mobile app needs to upload
  /// the file directly to Cloudinary.
  Future<CloudinarySignedPayload> signCloudinaryUpload({
    required String channelSlug,
    required String title,
    List<String>? tags,
    int? maxBytes,
  }) async {
    final res = await _dioClient.post(
      AppEndpoints.cloudinarySign,
      data: {
        'channelSlug': channelSlug,
        'title': title,
        if (tags != null) 'tags': tags,
        if (maxBytes != null) 'maxBytes': maxBytes,
      },
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    return CloudinarySignedPayload.fromJson(body);
  }

  /// Upload the file to Cloudinary using a previously-signed
  /// payload. Returns Cloudinary's response envelope (which
  /// contains the public `secure_url`).
  ///
  /// We use a fresh Dio instance here because:
  ///   • the auth interceptor must not attach our `Authorization`
  ///     header (Cloudinary would reject it as an unknown field),
  ///   • Cloudinary's `uploadUrl` is on a different host so the
  ///     BaseOptions.baseUrl from the app's API client would
  ///     prefix the path.
  Future<CloudinaryUploadResult> uploadFileToCloudinary({
    required File file,
    required CloudinarySignedPayload signed,
    void Function(int sent, int total)? onProgress,
  }) async {
    final fileName = file.path.split(Platform.pathSeparator).last;

    // Use the file's MediaType if Dio can detect it; otherwise
    // Cloudinary infers from the filename.
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: fileName,
      ),
      'api_key': signed.apiKey,
      'timestamp': signed.timestamp,
      'signature': signed.signature,
      'folder': signed.folder,
      'public_id': signed.publicId,
      'allowed_formats': signed.allowedFormats.join(','),
      if (signed.context.isNotEmpty) 'context': signed.context,
      if (signed.tags.isNotEmpty) 'tags': signed.tags.join(','),
    });

    // Dedicated Dio so the auth interceptor / baseUrl don't
    // touch Cloudinary's payload.
    final cloudinaryDio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 60),
      sendTimeout: const Duration(minutes: 5),
      receiveTimeout: const Duration(minutes: 5),
      headers: {
        'Accept': 'application/json',
      },
    ));

    final res = await cloudinaryDio.post<Map<String, dynamic>>(
      signed.uploadUrl,
      data: form,
      options: Options(
        // Cloudinary expects multipart, dio will set the boundary.
        headers: {'Content-Type': 'multipart/form-data'},
      ),
      onSendProgress: (sent, total) {
        if (onProgress != null && total > 0) onProgress(sent, total);
      },
    );

    return CloudinaryUploadResult.fromJson(res.data ?? const {});
  }

  /// All-in-one helper: sign → upload to Cloudinary → register
  /// the resulting URL in the Studio library. This is the single
  /// entry point the Studio UI should call from "TỰ GHI HÌNH".
  ///
  /// `onUploadProgress` is the upload-to-Cloudinary progress
  /// (0..1). The metadata step (sign + addToLibrary) is fast and
  /// doesn't surface its own progress bar.
  Future<CloudinaryAddToLibraryResult> addToLibraryFromCloudinaryUpload({
    required File file,
    required String channelId,
    required String channelSlug,
    required String title,
    String? description,
    List<String>? tags,
    int? maxBytes,
    void Function(double progress)? onUploadProgress,
  }) async {
    // 1. Get a signed payload from the backend.
    final signed = await signCloudinaryUpload(
      channelSlug: channelSlug,
      title: title,
      tags: tags,
      maxBytes: maxBytes,
    );

    // 2. Upload the file directly to Cloudinary.
    final cloudinary = await uploadFileToCloudinary(
      file: file,
      signed: signed,
      onProgress: (sent, total) {
        if (onUploadProgress != null && total > 0) {
          onUploadProgress(sent / total);
        }
      },
    );

    // 3. Register the resulting URL in the Studio library.
    final library = await addToLibrary(
      channelId: channelId,
      title: title,
      videoUrl: cloudinary.url,
      duration: (cloudinary.durationSec ?? 0).round().clamp(1, 86400),
      description: description,
      thumbnailUrl: cloudinary.thumbnailUrl,
      // Force classification as self-hosted. The auto-inference
      // would map any cloudinary.com URL to CLOUDINARY_DEMO +
      // DEMO_PRODUCTION_OK, which is fine but not as accurate
      // as flagging it as the operator's own upload.
      platform: 'CUSTOM_MP4',
      sourceTypeOverride: 'UPLOADED_LOCAL',
      licenseOverride: 'BUNNY_SELF_HOSTED',
      sourceAttribution: 'Video uploaded by Studio operator',
      extraTags: [
        'cloudinary',
        'cloudinary-public-id:${cloudinary.publicId}',
        ...?tags,
      ],
    );

    return CloudinaryAddToLibraryResult(
      cloudinary: cloudinary,
      library: library,
    );
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

  // ============================================================
  // 5b. Add to library (raw URL)
  // ============================================================
  //
  // The Studio "Danh mục nguồn" tab also lets the operator paste
  // a direct MP4/HLS URL (e.g. a Cloudinary `secure_url` returned
  // by the upload flow above) and persist it as a Recording row
  // on a chosen channel. The endpoint HEAD-probes the URL before
  // saving so dead links are rejected.
  //
  // This is the lowest-friction path for "I have a URL, just
  // broadcast it" workflows. Anti-piracy guard still rejects
  // YouTube/Twitch/Vimeo/Facebook/TikTok/Dailymotion sources.

  Future<RecordingModel> addToLibrary({
    required String channelId,
    required String title,
    required String videoUrl,
    required int duration,
    String? description,
    String? thumbnailUrl,
    String? platform,
    String? sourceTypeOverride,
    String? licenseOverride,
    String? sourceAttribution,
    List<String>? extraTags,
  }) async {
    final res = await _dioClient.post(
      AppEndpoints.studioAddToLibrary,
      data: {
        'channelId': channelId,
        'title': title,
        'videoUrl': videoUrl,
        'duration': duration,
        if (description != null && description.isNotEmpty)
          'description': description,
        if (thumbnailUrl != null && thumbnailUrl.isNotEmpty)
          'thumbnailUrl': thumbnailUrl,
        if (platform != null) 'platform': platform,
        if (sourceTypeOverride != null) 'sourceTypeOverride': sourceTypeOverride,
        if (licenseOverride != null) 'licenseOverride': licenseOverride,
        if (sourceAttribution != null) 'sourceAttribution': sourceAttribution,
        if (extraTags != null && extraTags.isNotEmpty) 'tags': extraTags,
      },
    );
    final raw = res.data;
    final body = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : (raw as Map<String, dynamic>);
    final rec = (body['recording'] as Map?)?.cast<String, dynamic>() ?? const {};
    return RecordingModel.fromJson(rec);
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

// ============================================================
// Cloudinary signed-payload & upload result DTOs
// ============================================================
//
// `CloudinarySignedPayload` mirrors the backend `CloudinaryService
// .signDirectUpload()` return value. The mobile client uses it to
// build a multipart POST body for `https://api.cloudinary.com/
// v1_1/<cloud>/<resource_type>/upload`.
//
// `CloudinaryUploadResult` mirrors the JSON envelope Cloudinary
// returns. The fields we actually use are `secure_url` (the public
// CDN URL) and `public_id` (so the operator can find / delete
// the asset in the Cloudinary Media Library).

class CloudinarySignedPayload {
  final String cloudName;
  final String apiKey;
  final int timestamp;
  final String signature;
  final String folder;
  final String publicId;
  final String resourceType;
  final List<String> tags;
  final List<String> allowedFormats;
  final int maxFileSize;
  final String context;
  final String uploadUrl;

  CloudinarySignedPayload({
    required this.cloudName,
    required this.apiKey,
    required this.timestamp,
    required this.signature,
    required this.folder,
    required this.publicId,
    required this.resourceType,
    required this.tags,
    required this.allowedFormats,
    required this.maxFileSize,
    required this.context,
    required this.uploadUrl,
  });

  factory CloudinarySignedPayload.fromJson(Map<String, dynamic> json) {
    return CloudinarySignedPayload(
      cloudName: json['cloudName']?.toString() ?? '',
      apiKey: json['apiKey']?.toString() ?? '',
      timestamp: (json['timestamp'] as num?)?.toInt() ?? 0,
      signature: json['signature']?.toString() ?? '',
      folder: json['folder']?.toString() ?? '',
      publicId: json['publicId']?.toString() ?? '',
      resourceType: json['resourceType']?.toString() ?? 'video',
      tags: ((json['tags'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      allowedFormats: ((json['allowedFormats'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      maxFileSize: (json['maxFileSize'] as num?)?.toInt() ?? 0,
      context: json['context']?.toString() ?? '',
      uploadUrl: json['uploadUrl']?.toString() ?? '',
    );
  }
}

class CloudinaryUploadResult {
  final String url;
  final String publicId;
  final int bytes;
  final String resourceType;
  final String format;
  final double? durationSec;
  final String? thumbnailUrl;
  final int? width;
  final int? height;

  CloudinaryUploadResult({
    required this.url,
    required this.publicId,
    required this.bytes,
    required this.resourceType,
    required this.format,
    this.durationSec,
    this.thumbnailUrl,
    this.width,
    this.height,
  });

  factory CloudinaryUploadResult.fromJson(Map<String, dynamic> json) {
    return CloudinaryUploadResult(
      url: json['secure_url']?.toString() ??
          json['url']?.toString() ??
          '',
      publicId: json['public_id']?.toString() ?? '',
      bytes: (json['bytes'] as num?)?.toInt() ?? 0,
      resourceType: json['resource_type']?.toString() ?? 'video',
      format: json['format']?.toString() ?? '',
      durationSec: (json['duration'] as num?)?.toDouble(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      width: (json['width'] as num?)?.toInt(),
      height: (json['height'] as num?)?.toInt(),
    );
  }
}

/// Combined result of `addToLibraryFromCloudinaryUpload`:
///   • `cloudinary` — Cloudinary's response envelope
///   • `library` — the Recording row persisted in the Studio library
class CloudinaryAddToLibraryResult {
  final CloudinaryUploadResult cloudinary;
  final RecordingModel library;

  CloudinaryAddToLibraryResult({
    required this.cloudinary,
    required this.library,
  });
}