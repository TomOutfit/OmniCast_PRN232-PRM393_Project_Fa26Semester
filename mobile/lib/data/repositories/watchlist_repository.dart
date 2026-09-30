// OmniCast - Watchlist Repository (Cloud Primary, mobile mirror)
//
// Backend is the source of truth. Mobile keeps a SQLite mirror so the
// user can still see + manage the list offline. Mutations made offline
// are queued in `pending_ops` and replayed via `/me/watchlist/sync`.

import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../datasources/local/database_helper.dart';
import '../models/watchlist_item_model.dart';

class WatchlistRepository {
  final DioClient _dioClient;
  final DatabaseHelper _db;

  WatchlistRepository({required DioClient dioClient, required DatabaseHelper db})
      : _dioClient = dioClient,
        _db = db;

  /// Returns true if the device currently has network connectivity.
  Future<bool> get _isOnline async {
    final result = await Connectivity().checkConnectivity();
    return result.isNotEmpty &&
        !result.contains(ConnectivityResult.none);
  }

  // ============================================================
  // LIST / READ
  // ============================================================

  /// Returns local items immediately, then refreshes from the cloud
  /// in the background (write-through cache).
  Future<List<WatchlistItemModel>> list({bool upcomingOnly = false}) async {
    final local = await _db.getWatchlistItems();

    if (await _isOnline) {
      try {
        await _refreshFromCloud();
        final refreshed = await _db.getWatchlistItems();
        return upcomingOnly ? _filterUpcoming(refreshed) : refreshed;
      } catch (_) {
        return upcomingOnly ? _filterUpcoming(local) : local;
      }
    }
    return upcomingOnly ? _filterUpcoming(local) : local;
  }

  /// Returns the 3-tab grouped payload (upcoming/live/past) by consulting
  /// the local mirror. Used by the Watchlist UI.
  Future<WatchlistBuckets> grouped() async {
    final items = await list();
    final now = DateTime.now();
    final upcoming = <WatchlistItemModel>[];
    final live = <WatchlistItemModel>[];
    final past = <WatchlistItemModel>[];

    for (final item in items) {
      final scheduledMs = item.scheduledAt.millisecondsSinceEpoch;
      final endMs =
          scheduledMs + (item.duration ?? 120) * 60 * 1000;
      if (item.programTitle.isEmpty) continue;
      if (scheduledMs <= now.millisecondsSinceEpoch &&
          endMs > now.millisecondsSinceEpoch) {
        live.add(item);
      } else if (scheduledMs >= now.millisecondsSinceEpoch) {
        upcoming.add(item);
      } else {
        past.add(item);
      }
    }
    upcoming.sort((a, b) =>
        a.scheduledAt.compareTo(b.scheduledAt));
    past.sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));

    return WatchlistBuckets(
      upcoming: upcoming,
      live: live,
      past: past,
    );
  }

  // ============================================================
  // MUTATIONS
  // ============================================================

  Future<void> add({
    required WatchlistItemModel item,
    required String programId,
    String? channelId,
    String? note,
  }) async {
    // Write locally first — the UI feels instant.
    await _db.insertWatchlistItem(item: item, dirty: true);

    if (await _isOnline) {
      try {
        final res = await _dioClient.post(
          AppEndpoints.watchlist,
          data: {
            'programId': programId,
            if (channelId != null) 'channelId': channelId,
            if (note != null) 'note': note,
          },
        );
        final cloudId = res.data['data']?['id'] as String?;
        if (cloudId != null) {
          // Replace local row with synced version
          await _db.insertWatchlistItem(
            item: item,
            cloudId: cloudId,
            dirty: false,
          );
        }
      } catch (_) {
        // Offline or transient — leave the dirty flag set so the
        // next sync pass will retry.
        await _db.queueOp(PendingOp(
          kind: PendingOpKind.add,
          programId: programId,
          channelId: channelId,
          note: note,
          createdAt: DateTime.now(),
        ));
      }
    } else {
      await _db.queueOp(PendingOp(
        kind: PendingOpKind.add,
        programId: programId,
        channelId: channelId,
        note: note,
        createdAt: DateTime.now(),
      ));
    }
  }

  Future<void> removeByProgramId(String programId) async {
    // Capture cloudId first so we can DELETE the right item.
    // `cloudId` lives on the DB row (not on the model), so we ask
    // the helper directly instead of digging through toJson().
    final cloudId = await _db.getCloudIdByProgramId(programId);

    // Drop locally first
    await _db.deleteWatchlistByProgramId(programId);

    if (await _isOnline) {
      if (cloudId != null) {
        try {
          await _dioClient.delete('${AppEndpoints.watchlist}/$cloudId');
          return;
        } catch (_) {
          // fall through to queue
        }
      }
      await _db.queueOp(PendingOp(
        kind: PendingOpKind.remove,
        programId: programId,
        createdAt: DateTime.now(),
      ));
    } else {
      await _db.queueOp(PendingOp(
        kind: PendingOpKind.remove,
        programId: programId,
        createdAt: DateTime.now(),
      ));
    }
  }

  // ============================================================
  // SYNC (called periodically + on connectivity-up event)
  // ============================================================

  /// Replays queued offline mutations through `/me/watchlist/sync`,
  /// then refreshes the local mirror from the cloud.
  Future<int> sync() async {
    if (!await _isOnline) return 0;

    final queued = await _db.getPendingOps();
    if (queued.isEmpty) {
      await _refreshFromCloud();
      return 0;
    }

    final items = queued
        .where((o) => o.kind == PendingOpKind.add)
        .map((o) => {
              'programId': o.programId,
              if (o.channelId != null) 'channelId': o.channelId,
              if (o.note != null) 'note': o.note,
            })
        .toList();

    try {
      await _dioClient.post(
        AppEndpoints.watchlistSync,
        data: {
          'lastSyncedAt':
              DateTime.now().subtract(const Duration(days: 30)).toIso8601String(),
          'items': items,
        },
      );
      // Also fire-and-forget direct DELETEs for queued removes.
      // Backend exposes `DELETE /me/watchlist/:id` (not `/by-program/...`),
      // so we look up the cloud row by programId before deleting.
      final cloudList = await _dioClient.get(AppEndpoints.watchlist);
      final cloudItems = (cloudList.data['data'] as List? ?? [])
          .cast<Map<String, dynamic>>();
      final byProgramId = <String, String>{
        for (final c in cloudItems) c['programId'] as String: c['id'] as String,
      };
      for (final op in queued.where((o) => o.kind == PendingOpKind.remove)) {
        final cloudId = byProgramId[op.programId];
        if (cloudId == null) continue;
        try {
          await _dioClient.delete('${AppEndpoints.watchlist}/$cloudId');
        } catch (_) {/* best-effort */}
      }
      // Wipe queue on success
      for (final op in queued) {
        if (op.id != null) await _db.deletePendingOp(op.id!);
      }
      await _refreshFromCloud();
      return queued.length;
    } catch (_) {
      return 0;
    }
  }

  Future<void> _refreshFromCloud() async {
    try {
      final res = await _dioClient.get(AppEndpoints.watchlist);
      final items = (res.data['data'] as List? ?? [])
          .map((e) => _itemFromCloud(e as Map<String, dynamic>))
          .toList();
      await _db.replaceWatchlistWithCloud(items);
    } catch (_) {/* offline mode — keep local mirror */}
  }

  WatchlistItemModel _itemFromCloud(Map<String, dynamic> json) {
    final program = json['program'] as Map<String, dynamic>;
    final channel = program['channel'] as Map<String, dynamic>;
    return WatchlistItemModel(
      // Use cloud UUID as local id by hashing it
      id: (json['id'] as String).hashCode,
      programId: json['programId'] as String,
      programTitle: program['title'] as String,
      thumbnailUrl: program['thumbnailUrl'] as String?,
      channelId: (channel['id'] as String?) ?? json['channelId'] as String?,
      channelName: channel['name'] as String?,
      scheduledAt: DateTime.parse(program['scheduledAt'] as String),
      duration: (program['duration'] as num?)?.toInt(),
      addedAt: DateTime.parse(json['addedAt'] as String),
      reminderEnabled: false,
    );
  }

  List<WatchlistItemModel> _filterUpcoming(
      List<WatchlistItemModel> items) {
    final now = DateTime.now();
    return items
        .where((i) =>
            i.scheduledAt.millisecondsSinceEpoch >=
            now.millisecondsSinceEpoch -
                const Duration(hours: 2).inMilliseconds)
        .toList();
  }
}

class WatchlistBuckets {
  final List<WatchlistItemModel> upcoming;
  final List<WatchlistItemModel> live;
  final List<WatchlistItemModel> past;

  WatchlistBuckets({
    required this.upcoming,
    required this.live,
    required this.past,
  });

  int get total => upcoming.length + live.length + past.length;
}
