// OmniCast - WatchlistItemModel serialization tests
//
// Covers the round-trip of `WatchlistItemModel.fromJson` / `toJson`
// plus the small `isUpcoming` / `isPast` helpers. The model is the
// contract between the SQLite mirror and the bloc, so it has to
// stay canonical.

import 'package:flutter_test/flutter_test.dart';
import 'package:omnicast/data/models/watchlist_item_model.dart';

void main() {
  group('WatchlistItemModel.fromJson', () {
    test('parses a fully-populated row', () {
      final json = {
        'id': 42,
        'programId': 'prog-1',
        'programTitle': 'Championship Final',
        'thumbnailUrl': 'https://img/thumb.jpg',
        'channelId': 'channel-1',
        'channelName': 'Sports HD',
        'scheduledAt': '2026-12-31T20:00:00.000Z',
        'duration': 120,
        'reminderTime': '2026-12-31T19:45:00.000Z',
        'reminderEnabled': 1,
        'addedAt': '2026-09-29T13:00:00.000Z',
      };

      final item = WatchlistItemModel.fromJson(json);

      expect(item.id, 42);
      expect(item.programId, 'prog-1');
      expect(item.programTitle, 'Championship Final');
      expect(item.thumbnailUrl, 'https://img/thumb.jpg');
      expect(item.channelId, 'channel-1');
      expect(item.channelName, 'Sports HD');
      expect(item.duration, 120);
      expect(item.reminderEnabled, true);
      expect(item.reminderTime, isA<DateTime>());
      expect(item.addedAt.toUtc().hour, 13);
    });

    test('treats reminderEnabled 0 as false and missing reminderTime as null', () {
      final json = {
        'programId': 'p',
        'programTitle': 't',
        'scheduledAt': '2026-12-31T20:00:00.000Z',
        'reminderEnabled': 0,
        'addedAt': '2026-09-29T13:00:00.000Z',
      };
      final item = WatchlistItemModel.fromJson(json);
      expect(item.reminderEnabled, false);
      expect(item.reminderTime, isNull);
      expect(item.thumbnailUrl, isNull);
      expect(item.channelId, isNull);
      expect(item.channelName, isNull);
      expect(item.duration, isNull);
    });
  });

  group('WatchlistItemModel.toJson', () {
    test('round-trips through fromJson/toJson', () {
      final original = WatchlistItemModel(
        id: 1,
        programId: 'prog-1',
        programTitle: 'Game Night',
        thumbnailUrl: 'https://img/x.jpg',
        channelId: 'c-1',
        channelName: 'C1',
        scheduledAt: DateTime.utc(2026, 12, 31, 20, 0, 0),
        duration: 90,
        reminderTime: DateTime.utc(2026, 12, 31, 19, 45, 0),
        reminderEnabled: true,
        addedAt: DateTime.utc(2026, 9, 29, 13, 0, 0),
      );

      final json = original.toJson();
      final restored = WatchlistItemModel.fromJson(json);

      expect(restored.id, original.id);
      expect(restored.programId, original.programId);
      expect(restored.programTitle, original.programTitle);
      expect(restored.thumbnailUrl, original.thumbnailUrl);
      expect(restored.channelId, original.channelId);
      expect(restored.channelName, original.channelName);
      expect(restored.scheduledAt, original.scheduledAt);
      expect(restored.duration, original.duration);
      expect(restored.reminderTime, original.reminderTime);
      expect(restored.reminderEnabled, original.reminderEnabled);
      expect(restored.addedAt, original.addedAt);
    });

    test('serializes reminderEnabled as integer 0/1', () {
      final item = WatchlistItemModel(
        programId: 'p',
        programTitle: 't',
        scheduledAt: DateTime.utc(2026, 1, 1),
        reminderEnabled: false,
        addedAt: DateTime.utc(2026, 1, 1),
      );
      final json = item.toJson();
      expect(json['reminderEnabled'], 0);
    });

    test('omits id when null', () {
      final item = WatchlistItemModel(
        programId: 'p',
        programTitle: 't',
        scheduledAt: DateTime.utc(2026, 1, 1),
        reminderEnabled: false,
        addedAt: DateTime.utc(2026, 1, 1),
      );
      expect(item.toJson().containsKey('id'), false);
    });
  });

  group('WatchlistItemModel status helpers', () {
    test('isUpcoming is true when scheduledAt is in the future', () {
      final item = WatchlistItemModel(
        programId: 'p',
        programTitle: 't',
        scheduledAt: DateTime.now().add(const Duration(days: 1)),
        reminderEnabled: false,
        addedAt: DateTime.now(),
      );
      expect(item.isUpcoming, true);
      expect(item.isPast, false);
    });

    test('isPast is true when scheduledAt is in the past', () {
      final item = WatchlistItemModel(
        programId: 'p',
        programTitle: 't',
        scheduledAt: DateTime.now().subtract(const Duration(days: 1)),
        reminderEnabled: false,
        addedAt: DateTime.now(),
      );
      expect(item.isUpcoming, false);
      expect(item.isPast, true);
    });
  });

  group('WatchlistItemModel.copyWith', () {
    test('overrides only the fields provided', () {
      final item = WatchlistItemModel(
        id: 1,
        programId: 'p',
        programTitle: 'old',
        scheduledAt: DateTime.utc(2026, 1, 1),
        reminderEnabled: false,
        addedAt: DateTime.utc(2026, 1, 1),
      );
      final updated = item.copyWith(programTitle: 'new', reminderEnabled: true);
      expect(updated.id, 1);
      expect(updated.programTitle, 'new');
      expect(updated.reminderEnabled, true);
      expect(updated.programId, item.programId);
    });
  });
}
