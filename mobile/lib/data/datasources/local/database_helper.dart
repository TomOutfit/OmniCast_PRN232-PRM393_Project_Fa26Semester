// OmniCast - SQLite Database Helper (Offline Watchlist)

import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/constants/app_constants.dart';
import '../../models/watchlist_item_model.dart';

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
    // Watchlist table
    await db.execute('''
      CREATE TABLE watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        programId TEXT NOT NULL,
        programTitle TEXT NOT NULL,
        thumbnailUrl TEXT,
        channelId TEXT,
        channelName TEXT,
        scheduledAt TEXT NOT NULL,
        duration INTEGER,
        reminderTime TEXT,
        reminderEnabled INTEGER DEFAULT 0,
        addedAt TEXT NOT NULL
      )
    ''');

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

    // Create indexes
    await db.execute('CREATE INDEX idx_watchlist_scheduled ON watchlist(scheduledAt)');
    await db.execute('CREATE INDEX idx_watchlist_reminder ON watchlist(reminderEnabled)');
    await db.execute('CREATE INDEX idx_cache_cachedAt ON cached_channels(cachedAt)');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle migrations here
  }

  // Watchlist operations
  Future<List<WatchlistItemModel>> getWatchlistItems() async {
    final db = await database;
    final result = await db.query(
      'watchlist',
      orderBy: 'scheduledAt ASC',
    );

    return result.map((e) => WatchlistItemModel.fromJson(e)).toList();
  }

  Future<int> insertWatchlistItem(WatchlistItemModel item) async {
    final db = await database;
    return await db.insert(
      'watchlist',
      item.toJson(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<int> deleteWatchlistItem(int id) async {
    final db = await database;
    return await db.delete(
      'watchlist',
      where: 'id = ?',
      whereArgs: [id],
    );
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

  // Cache operations
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

  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}
