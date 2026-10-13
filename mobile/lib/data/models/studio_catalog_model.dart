// ============================================================
// OmniCast - Studio Catalog Stream Model
// ============================================================
//
// Mirror of the backend `StudioCatalogStream` interface exposed by
// `GET /v1/programs/studio/catalog/streams`. Each entry is a
// pre-vetted public-domain / royalty-free video source (Mux test
// streams, Cloudinary demos, Internet Archive, Blender Open Movie,
// Pexels, etc.) that Staff/Admin can add to a channel via the
// "Danh mục nguồn" tab in the Live Studio.
//
// Anti-piracy: the catalog is curated server-side; the mobile app
// never has to reason about which platforms are blocked. The
// backend's `addFromCatalog` endpoint does the actual platform
// classification (HLS / MP4 / DASH) when persisting the entry as
// a `Recording` row.
// ============================================================

class StudioCatalogStreamModel {
  final String id;
  final String title;
  final String description;
  final String url;
  final String thumbnailUrl;
  final String format; // 'HLS' | 'MP4' | 'DASH' | 'WEBM'
  final String? codec;
  final String? resolution;
  final int durationSec;
  final List<String> channelSlugs;
  final List<String> tags;
  final String source; // Mux, Cloudinary, Archive.org, ...
  final bool verified;
  final String license; // 'Creative Commons', 'Public Domain', ...
  final String? notes;

  const StudioCatalogStreamModel({
    required this.id,
    required this.title,
    required this.description,
    required this.url,
    required this.thumbnailUrl,
    required this.format,
    this.codec,
    this.resolution,
    required this.durationSec,
    required this.channelSlugs,
    required this.tags,
    required this.source,
    required this.verified,
    required this.license,
    this.notes,
  });

  factory StudioCatalogStreamModel.fromJson(Map<String, dynamic> json) {
    return StudioCatalogStreamModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      url: json['url']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString() ?? '',
      format: json['format']?.toString() ?? 'HLS',
      codec: json['codec']?.toString(),
      resolution: json['resolution']?.toString(),
      durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
      channelSlugs: ((json['channelSlugs'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      tags: ((json['tags'] as List?) ?? const [])
          .map((e) => e.toString())
          .toList(growable: false),
      source: json['source']?.toString() ?? '',
      verified: json['verified'] as bool? ?? false,
      license: json['license']?.toString() ?? '',
      notes: json['notes']?.toString(),
    );
  }

  /// License translated to a human-friendly Vietnamese label for the
  /// Studio UI. Falls back to the raw value so future licenses
  /// surface gracefully.
  String get licenseLabel {
    switch (license.toLowerCase()) {
      case 'creative commons':
        return 'Creative Commons';
      case 'public domain':
        return 'Public Domain';
      case 'pexels license':
        return 'Pexels License';
      case 'cc0':
      case 'cc0_public_domain':
        return 'CC0 — Public Domain';
      case 'blender open movie':
        return 'Blender Open Movie';
      case 'mit':
        return 'MIT';
      default:
        return license.isEmpty ? '—' : license;
    }
  }

  /// True when the license permits commercial redistribution.
  bool get isOpenLicense =>
      license.toLowerCase().contains('public') ||
      license.toLowerCase().contains('creative commons') ||
      license.toLowerCase().contains('pexels');

  /// Duration formatted as `MM:SS` or `HH:MM:SS` for compact display.
  String get formattedDuration {
    final s = durationSec;
    if (s <= 0) return '—';
    final h = s ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final sec = s % 60;
    if (h > 0) {
      return '${h.toString().padLeft(2, '0')}:'
          '${m.toString().padLeft(2, '0')}:'
          '${sec.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }
}

/// Lightweight summary block returned by the catalog endpoint.
/// Mirrors the backend's `StudioCatalogService.summarize()` shape
/// (`{ total, byFormat, verified }`).
class StudioCatalogSummary {
  final int total;
  final Map<String, int> byFormat;
  final int verified;

  const StudioCatalogSummary({
    required this.total,
    required this.byFormat,
    required this.verified,
  });

  factory StudioCatalogSummary.fromJson(Map<String, dynamic> json) {
    final byFormat = <String, int>{};
    final raw = json['byFormat'];
    if (raw is Map) {
      raw.forEach((k, v) {
        byFormat[k.toString()] = (v is num) ? v.toInt() : 0;
      });
    }
    return StudioCatalogSummary(
      total: (json['total'] as num?)?.toInt() ?? 0,
      byFormat: byFormat,
      verified: (json['verified'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Envelope for `GET /catalog/streams` (`{ total, summary, items }`).
class StudioCatalogPage {
  final List<StudioCatalogStreamModel> items;
  final StudioCatalogSummary? summary;
  const StudioCatalogPage({required this.items, this.summary});

  factory StudioCatalogPage.fromJson(Map<String, dynamic> json) {
    final items = ((json['items'] as List?) ?? const [])
        .whereType<Map>()
        .map((m) =>
            StudioCatalogStreamModel.fromJson(m.cast<String, dynamic>()))
        .toList(growable: false);
    final summaryRaw = json['summary'];
    return StudioCatalogPage(
      items: items,
      summary: summaryRaw is Map
          ? StudioCatalogSummary.fromJson(summaryRaw.cast<String, dynamic>())
          : null,
    );
  }
}

/// Result of `POST /recordings/library/from-catalog`. The backend
/// returns the freshly-persisted Recording row (matching the
/// `RecordingModel.fromJson` shape) plus a `message` string for the
/// UI toast.
class AddFromCatalogResult {
  final String recordingId;
  final String recordingTitle;
  final String message;
  const AddFromCatalogResult({
    required this.recordingId,
    required this.recordingTitle,
    required this.message,
  });

  factory AddFromCatalogResult.fromJson(Map<String, dynamic> json) {
    final rec = (json['recording'] as Map?)?.cast<String, dynamic>() ?? const {};
    return AddFromCatalogResult(
      recordingId: rec['id']?.toString() ?? '',
      recordingTitle: rec['title']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
    );
  }
}
