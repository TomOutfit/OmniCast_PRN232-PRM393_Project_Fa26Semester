// OmniCast - SQLite Database Helper
// Stores: watchlist items, EPG cache, pending offline ops

import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/constants/app_constants.dart';
import '../../models/watchlist_item_model.dart';

/// One queued mutation that hasn't been replayed to the server yet.
enum PendingOpKind { add, remove }

class PendingOp {
  final int? id;
  final PendingOpKind kind;
  final String programId;
  final String? channelId;
  final String? note;
  final DateTime createdAt;

  PendingOp({
    this.id,
    required this.kind,
    required this.programId,
    this.channelId,
    this.note,
    required this.createdAt,
  });

  factory PendingOp.fromJson(Map<String, dynamic> json) => PendingOp(
        id: json['id'] as int?,
        kind: json['kind'] == 'add'
            ? PendingOpKind.add
            : PendingOpKind.remove,
        programId: json['programId'] as String,
        channelId: json['channelId'] as String?,
        note: json['note'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'kind': kind == PendingOpKind.add ? 'add' : 'remove',
        'programId': programId,
        'channelId': channelId,
        'note': note,
        'createdAt': createdAt.toIso8601String(),
      };
}

class DatabaseHelper {
  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, AppConstants.databaseName);

    return await openDatabase(
      path,
      version: AppConstants.databaseVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Watchlist table (kept as-is for v2, with cloud mirror added at runtime)
    await db.execute('''
      CREATE TABLE watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        programId TEXT NOT NULL UNIQUE,
        programTitle TEXT NOT NULL,
        thumbnailUrl TEXT,
        channelId TEXT,
        channelName TEXT,
        scheduledAt TEXT NOT NULL,
        duration INTEGER,
        reminderTime TEXT,
        reminderEnabled INTEGER DEFAULT 0,
        addedAt TEXT NOT NULL,
        -- cloud mirror columns
        cloudId TEXT,
        lastSyncedAt TEXT,
        dirty INTEGER DEFAULT 0
      )
    ''');

    await db.execute('CREATE INDEX idx_watchlist_scheduled ON watchlist(scheduledAt)');
    await db.execute('CREATE INDEX idx_watchlist_reminder ON watchlist(reminderEnabled)');

    // Cached channels table
    await db.execute('''
      CREATE TABLE cached_channels (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cachedAt TEXT NOT NULL
      )
    ''');

    // Cached programs table
    await db.execute('''
      CREATE TABLE cached_programs (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        cachedAt TEXT NOT NULL
      )
    ''');

    await db.execute('CREATE INDEX idx_cache_cachedAt ON cached_channels(cachedAt)');

    // EPG cache (per-day) - C2
    await db.execute('''
      CREATE TABLE epg_cache (
        date TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        fetchedAt TEXT NOT NULL
      )
    ''');

    // Pending offline ops for watchlist (C1)
    await db.execute('''
      CREATE TABLE pending_ops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        programId TEXT NOT NULL,
        channelId TEXT,
        note TEXT,
        createdAt TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX idx_pending_ops_createdAt ON pending_ops(createdAt)');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // v1 -> v2: add new tables + cloud mirror columns
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE watchlist ADD COLUMN cloudId TEXT');
      await db.execute('ALTER TABLE watchlist ADD COLUMN lastSyncedAt TEXT');
      await db.execute('ALTER TABLE watchlist ADD COLUMN dirty INTEGER DEFAULT 0');
      await db.execute('CREATE UNIQUE INDEX idx_watchlist_programId ON watchlist(programId)');

      await db.execute('''
        CREATE TABLE IF NOT EXISTS epg_cache (
          date TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          fetchedAt TEXT NOT NULL
        )
      ''');
      await db.execute('''
        CREATE TABLE IF NOT EXISTS pending_ops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          programId TEXT NOT NULL,
          channelId TEXT,
          note TEXT,
          createdAt TEXT NOT NULL
        )
      ''');
    }

    // v2 -> v3: invalidate EPG cache so the new auto-fill `isFiller` /
    // `fillerKind` / `sourceRecordingId` shape is always served fresh from
    // the backend. Old payloads will deserialize but lack the filler
    // entries, leaving the grid mostly empty.
    if (oldVersion < 4) {
      await db.delete('epg_cache');
    }
  }

  // ============================================================
  // WATCHLIST (local mirror of cloud)
  // ============================================================

  Future<List<WatchlistItemModel>> getWatchlistItems() async {
    final db = await database;
    final result = await db.query(
      'watchlist',
      orderBy: 'scheduledAt ASC',
    );
    return result.map((e) => WatchlistItemModel.fromJson(e)).toList();
  }

  /// Mirror-write: insert local row, marking it dirty so the next
  /// sync pass will push it to the server.
  Future<int> insertWatchlistItem({
    required WatchlistItemModel item,
    String? cloudId,
    bool dirty = true,
  }) async {
    final db = await database;
    final payload = item.toJson()
      ..['cloudId'] = cloudId
      ..['lastSyncedAt'] = dirty ? null : DateTime.now().toIso8601String()
      ..['dirty'] = dirty ? 1 : 0;
    if (payload['id'] == null) payload.remove('id');
    return await db.insert(
      'watchlist',
      payload,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Bulk-replace watchlist from cloud payload.
  Future<void> replaceWatchlistWithCloud(
    List<WatchlistItemModel> items,
  ) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('watchlist');
      for (final item in items) {
        final payload = item.toJson()
          ..['cloudId'] = item.id
          ..['lastSyncedAt'] = DateTime.now().toIso8601String()
          ..['dirty'] = 0;
        // Local id = hash of programId to avoid collisions
        payload['id'] = item.programId.hashCode;
        await txn.insert(
          'watchlist',
          payload,
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<int> deleteWatchlistItem(int id) async {
    final db = await database;
    return await db.delete(
      'watchlist',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> deleteWatchlistByProgramId(String programId) async {
    final db = await database;
    return await db.delete(
      'watchlist',
      where: 'programId = ?',
      whereArgs: [programId],
    );
  }

  /// Returns the cloud-side UUID for a watchlist row, or null if the
  /// row hasn't been synced yet. Used when calling the backend
  /// DELETE endpoint so we can target the correct cloud item.
  Future<String?> getCloudIdByProgramId(String programId) async {
    final db = await database;
    final rows = await db.query(
      'watchlist',
      columns: ['cloudId'],
      where: 'programId = ?',
      whereArgs: [programId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['cloudId'] as String?;
  }

  Future<int> updateReminderTime(int id, DateTime? reminderTime) async {
    final db = await database;
    return await db.update(
      'watchlist',
      {
        'reminderTime': reminderTime?.toIso8601String(),
        'reminderEnabled': reminderTime != null ? 1 : 0,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<List<WatchlistItemModel>> getUpcomingWithReminders() async {
    final db = await database;
    final now = DateTime.now().toIso8601String();

    final result = await db.query(
      'watchlist',
      where: 'reminderEnabled = 1 AND scheduledAt > ?',
      whereArgs: [now],
      orderBy: 'scheduledAt ASC',
    );

    return result.map((e) => WatchlistItemModel.fromJson(e)).toList();
  }

  // ============================================================
  // EPG CACHE (C2)
  // ============================================================

  /// dateKey must be in `YYYY-MM-DD` UTC.
  Future<String?> getEpgCachePayload(String dateKey) async {
    final db = await database;
    final rows = await db.query(
      'epg_cache',
      where: 'date = ?',
      whereArgs: [dateKey],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final fetchedAt = DateTime.parse(rows.first['fetchedAt'] as String);
    if (DateTime.now().difference(fetchedAt) >
        AppConstants.longCacheExpiry) {
      return null;
    }
    return rows.first['payload'] as String?;
  }

  Future<void> putEpgCachePayload({
    required String dateKey,
    required String payload,
  }) async {
    final db = await database;
    await db.insert(
      'epg_cache',
      {
        'date': dateKey,
        'payload': payload,
        'fetchedAt': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Returns the last fetchedAt time if available — used by the banner
  /// to show "Cập nhật lúc HH:mm" while offline.
  Future<DateTime?> lastEpgFetchAt(String dateKey) async {
    final db = await database;
    final rows = await db.query(
      'epg_cache',
      where: 'date = ?',
      whereArgs: [dateKey],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return DateTime.parse(rows.first['fetchedAt'] as String);
  }

  // ============================================================
  // PENDING OPS (C1 offline queue)
  // ============================================================

  Future<int> queueOp(PendingOp op) async {
    final db = await database;
    final payload = op.toJson();
    payload.remove('id');
    return await db.insert('pending_ops', payload);
  }

  Future<List<PendingOp>> getPendingOps() async {
    final db = await database;
    final rows = await db.query(
      'pending_ops',
      orderBy: 'createdAt ASC',
    );
    return rows.map((e) => PendingOp.fromJson(e)).toList();
  }

  Future<int> deletePendingOp(int id) async {
    final db = await database;
    return await db.delete(
      'pending_ops',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> pendingOpCount() async {
    final db = await database;
    final r = await db.rawQuery('SELECT COUNT(*) AS c FROM pending_ops');
    return (r.first['c'] as int?) ?? 0;
  }

  // ============================================================
  // CACHE operations
  // ============================================================

  Future<void> cacheChannels(List<Map<String, dynamic>> channels) async {
    final db = await database;
    final batch = db.batch();

    for (final channel in channels) {
      batch.insert(
        'cached_channels',
        {
          'id': channel['id'],
          'data': channel.toString(),
          'cachedAt': DateTime.now().toIso8601String(),
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getCachedChannels() async {
    final db = await database;
    final cutoff = DateTime.now()
        .subtract(AppConstants.longCacheExpiry)
        .toIso8601String();

    final result = await db.query(
      'cached_channels',
      where: 'cachedAt > ?',
      whereArgs: [cutoff],
    );

    return result.map((e) {
      return {'id': e['id'], 'data': e['data']};
    }).toList();
  }

  Future<void> clearExpiredCache() async {
    final db = await database;
    final cutoff = DateTime.now()
        .subtract(AppConstants.cacheExpiry)
        .toIso8601String();

    await db.delete(
      'cached_channels',
      where: 'cachedAt < ?',
      whereArgs: [cutoff],
    );

    await db.delete(
      'cached_programs',
      where: 'cachedAt < ?',
      whereArgs: [cutoff],
    );
  }

  // Clear ALL local data (watchlist + cache + ops + epg_cache)
  Future<void> clearAllData() async {
    final db = await database;
    await db.delete('watchlist');
    await db.delete('cached_channels');
    await db.delete('cached_programs');
    await db.delete('epg_cache');
    await db.delete('pending_ops');
  }

  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}
