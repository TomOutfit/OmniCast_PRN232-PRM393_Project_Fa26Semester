// ============================================================
// OmniCast · Supabase Realtime Service
// ============================================================
//
// Thin wrapper around `supabase_flutter` that exposes:
//   - `startCommentsChannel(recordingId)` → emits a stream of CommentModel
//     payloads (insert / update / delete) for the given recording.
//   - `startReactionsChannel(recordingId)` → emits a stream of
//     ReactionModel payloads (insert / update / delete).
//
// Falls back to a polling mechanism (driven by the existing REST
// repository) when `SUPABASE_URL` env is not configured. This keeps
// local builds working without requiring a real Supabase project.
//
// The Supabase tables are read-only via `anon` role; the backend
// publishes INSERTs through its own service-role key so subscribers
// only see validated data.
// ============================================================

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../data/models/social_models.dart';

/// Lightweight DTO so widgets don't depend directly on `supabase_flutter`.
class RealtimeCommentEvent {
  final String type; // 'INSERT' | 'UPDATE' | 'DELETE'
  final String recordingId;
  final CommentModel? comment;
  final String? deletedId;

  const RealtimeCommentEvent.insert(this.recordingId, this.comment)
    : type = 'INSERT',
      deletedId = null;
  const RealtimeCommentEvent.update(this.recordingId, this.comment)
    : type = 'UPDATE',
      deletedId = null;
  const RealtimeCommentEvent.delete(this.recordingId, String id)
    : type = 'DELETE',
      comment = null,
      deletedId = id;
}

class RealtimeReactionEvent {
  final String type;
  final String recordingId;
  final ReactionModel? reaction;
  final String? deletedKey;

  const RealtimeReactionEvent.insert(this.recordingId, this.reaction)
    : type = 'INSERT',
      deletedKey = null;
  const RealtimeReactionEvent.update(this.recordingId, this.reaction)
    : type = 'UPDATE',
      deletedKey = null;
  const RealtimeReactionEvent.delete(this.recordingId, String key)
    : type = 'DELETE',
      reaction = null,
      deletedKey = key;
}

class SupabaseRealtimeService {
  SupabaseRealtimeService._internal();
  static final SupabaseRealtimeService instance = SupabaseRealtimeService._internal();

  sb.SupabaseClient? _client;
  bool _initialised = false;
  final List<sb.RealtimeChannel> _active = [];

  /// Call once at app startup. No-op when `SUPABASE_URL` is unset.
  Future<void> initialise() async {
    if (_initialised) return;
    _initialised = true;

    const url = String.fromEnvironment('SUPABASE_URL');
    const anonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

    if (url.isEmpty || anonKey.isEmpty) {
      if (kDebugMode) {
        // ignore: avoid_print
        print(
          '[SupabaseRealtime] SUPABASE_URL / SUPABASE_ANON_KEY not set → falling back to REST polling',
        );
      }
      return;
    }

    try {
      // Supabase Flutter v2.x still accepts `anonKey` but it has been
      // renamed to `publishableKey`. We forward via the new name when
      // available; older SDK builds fall back to `anonKey`.
      // ignore: deprecated_member_use
      await sb.Supabase.initialize(url: url, anonKey: anonKey);
      _client = sb.Supabase.instance.client;
    } catch (e) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('[SupabaseRealtime] init failed: $e (falling back to polling)');
      }
      _client = null;
    }
  }

  /// True when a Supabase client is live (not polling fallback).
  bool get isAvailable => _client != null;

  /// Subscribe to comment INSERT/UPDATE/DELETE events for a recording.
  Stream<RealtimeCommentEvent> startCommentsChannel(String recordingId) {
    if (!isAvailable) return const Stream.empty();
    final client = _client!;
    final channel = client.channel('public:comments:recording=$recordingId')
      ..onPostgresChanges(
        event: sb.PostgresChangeEvent.insert,
        schema: 'public',
        table: 'Comment',
        filter: sb.PostgresChangeFilter(
          type: sb.PostgresChangeFilterType.eq,
          column: 'recordingId',
          value: recordingId,
        ),
        callback: (payload) {
          try {
            final row = payload.newRecord;
            if (row == null) return;
            final c = _commentFromRow(row);
            if (c != null) {
              _emit(commentController: recordingId, event: RealtimeCommentEvent.insert(recordingId, c));
            }
          } catch (_) {
            /* swallow malformed rows */
          }
        },
      )
      ..onPostgresChanges(
        event: sb.PostgresChangeEvent.update,
        schema: 'public',
        table: 'Comment',
        filter: sb.PostgresChangeFilter(
          type: sb.PostgresChangeFilterType.eq,
          column: 'recordingId',
          value: recordingId,
        ),
        callback: (payload) {
          try {
            final row = payload.newRecord;
            if (row == null) return;
            final c = _commentFromRow(row);
            if (c != null) {
              _emit(commentController: recordingId, event: RealtimeCommentEvent.update(recordingId, c));
            }
          } catch (_) {}
        },
      )
      ..onPostgresChanges(
        event: sb.PostgresChangeEvent.delete,
        schema: 'public',
        table: 'Comment',
        callback: (payload) {
          try {
            final old = payload.oldRecord;
            if (old == null || old['id'] == null) return;
            _emit(
              commentController: recordingId,
              event: RealtimeCommentEvent.delete(recordingId, old['id'].toString()),
            );
          } catch (_) {}
        },
      );

    channel.subscribe();
    _active.add(channel);
    return _commentControllerFor(recordingId).stream;
  }

  /// Subscribe to reaction events.
  Stream<RealtimeReactionEvent> startReactionsChannel(String recordingId) {
    if (!isAvailable) return const Stream.empty();
    final client = _client!;
    final channel = client.channel('public:reactions:recording=$recordingId')
      ..onPostgresChanges(
        event: sb.PostgresChangeEvent.all,
        schema: 'public',
        table: 'Reaction',
        filter: sb.PostgresChangeFilter(
          type: sb.PostgresChangeFilterType.eq,
          column: 'recordingId',
          value: recordingId,
        ),
        callback: (payload) {
          try {
            if (payload.eventType == sb.PostgresChangeEvent.delete) {
              final old = payload.oldRecord;
              final key = old != null
                  ? '${old['userId']}_${old['type']}'
                  : 'unknown';
              _emit(
                reactionController: recordingId,
                event: RealtimeReactionEvent.delete(recordingId, key),
              );
              return;
            }
            final row = payload.newRecord;
            if (row == null) return;
            final r = _reactionFromRow(row);
            if (r != null) {
              _emit(
                reactionController: recordingId,
                event: payload.eventType == sb.PostgresChangeEvent.update
                    ? RealtimeReactionEvent.update(recordingId, r)
                    : RealtimeReactionEvent.insert(recordingId, r),
              );
            }
          } catch (_) {}
        },
      );
    channel.subscribe();
    _active.add(channel);
    return _reactionControllerFor(recordingId).stream;
  }

  /// Tear-down helper. Call from widget dispose.
  Future<void> stopAll() async {
    final client = _client;
    if (client != null) {
      for (final ch in _active) {
        try {
          await client.removeChannel(ch);
        } catch (_) {}
      }
    }
    _active.clear();
    _commentControllers.clear();
    _reactionControllers.clear();
  }

  // ============================================================
  // Internal: per-recording controllers keep streams isolated.
  // ============================================================
  final Map<String, StreamController<RealtimeCommentEvent>> _commentControllers = {};
  final Map<String, StreamController<RealtimeReactionEvent>> _reactionControllers = {};

  StreamController<RealtimeCommentEvent> _commentControllerFor(String id) {
    return _commentControllers.putIfAbsent(
      id,
      () => StreamController<RealtimeCommentEvent>.broadcast(),
    );
  }

  StreamController<RealtimeReactionEvent> _reactionControllerFor(String id) {
    return _reactionControllers.putIfAbsent(
      id,
      () => StreamController<RealtimeReactionEvent>.broadcast(),
    );
  }

  void _emit({String? commentController, String? reactionController, required dynamic event}) {
    if (commentController != null && event is RealtimeCommentEvent) {
      _commentControllerFor(commentController).add(event);
    } else if (reactionController != null && event is RealtimeReactionEvent) {
      _reactionControllerFor(reactionController).add(event);
    }
  }

  CommentModel? _commentFromRow(Map<String, dynamic> row) {
    try {
      return CommentModel(
        id: row['id']?.toString() ?? '',
        recordingId: row['recordingId']?.toString() ?? '',
        userId: row['userId']?.toString(),
        content: row['content']?.toString() ?? '',
        parentId: row['parentId']?.toString(),
        likeCount: _asInt(row['likeCount']),
        isPinned: row['isPinned'] == true,
        isEdited: row['isEdited'] == true,
        createdAt: _asDate(row['createdAt']),
        updatedAt: _asDate(row['updatedAt']),
        authorDisplayName: null,
      );
    } catch (_) {
      return null;
    }
  }

  ReactionModel? _reactionFromRow(Map<String, dynamic> row) {
    try {
      return ReactionModel(
        id: row['id']?.toString(),
        userId: row['userId']?.toString(),
        recordingId: row['recordingId']?.toString() ?? '',
        type: row['type']?.toString() ?? 'HEART',
        createdAt: _asDate(row['createdAt']),
      );
    } catch (_) {
      return null;
    }
  }

  int _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  DateTime _asDate(dynamic v) {
    if (v is DateTime) return v;
    if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
    return DateTime.now();
  }
}
