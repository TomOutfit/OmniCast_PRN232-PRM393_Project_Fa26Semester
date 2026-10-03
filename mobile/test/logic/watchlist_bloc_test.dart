// OmniCast - WatchlistBloc unit tests
//
// Covers the five bloc events with mocked repository, db helper and
// notification service. Uses `bloc_test` for the happy paths and
// plain `test` for edge cases. Goal: lock in the bucket logic and
// the side-effect orchestration (notification scheduling, sync queue).

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:omnicast/data/datasources/local/database_helper.dart';
import 'package:omnicast/data/models/watchlist_item_model.dart';
import 'package:omnicast/data/repositories/watchlist_repository.dart';
import 'package:omnicast/core/services/notification_service.dart';
import 'package:omnicast/logic/watchlist/watchlist_bloc.dart';

class _MockRepo extends Mock implements WatchlistRepository {}

class _MockDb extends Mock implements DatabaseHelper {}

class _MockNotifications extends Mock implements NotificationService {}

class _NoopStreamHandler extends MockStreamHandler {
  @override
  void onListen(Object? arguments, MockStreamHandlerEventSink? events) {
    // Intentionally do nothing — the bloc's connectivity listener just
    // sits there waiting for events that never come.
  }

  @override
  void onCancel(Object? arguments) {}
}

WatchlistItemModel _item({
  String programId = 'prog-1',
  DateTime? scheduledAt,
  String programTitle = 'Test Show',
}) {
  return WatchlistItemModel(
    programId: programId,
    programTitle: programTitle,
    scheduledAt: scheduledAt ?? DateTime.now().add(const Duration(hours: 1)),
    reminderEnabled: false,
    addedAt: DateTime.now(),
  );
}

WatchlistBuckets _buckets({List<WatchlistItemModel>? upcoming}) {
  return WatchlistBuckets(
    upcoming: upcoming ?? [],
    live: const [],
    past: const [],
  );
}

void main() {
  // The bloc subscribes to `Connectivity().onConnectivityChanged` in its
  // constructor, which requires the platform-channel binding to be up.
  TestWidgetsFlutterBinding.ensureInitialized();

  // The method-channel for Connectivity().check() returns wifi so the
  // bloc treats the test environment as online. This call needs to live
  // inside a test zone so addTearDown works.
  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/connectivity'),
      (MethodCall call) async {
        if (call.method == 'check') return ['wifi'];
        return null;
      },
    );
    // Stub the event stream used by `onConnectivityChanged`. The stream
    // never receives data in tests, so the bloc simply stays quiet on
    // that channel.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockStreamHandler(
      const EventChannel('dev.fluttercommunity.plus/connectivity_status'),
      _NoopStreamHandler(),
    );
  });

  setUpAll(() {
    registerFallbackValue(
      WatchlistItemModel(
        programId: 'fb',
        programTitle: 'fb',
        scheduledAt: DateTime.now(),
        reminderEnabled: false,
        addedAt: DateTime.now(),
      ),
    );
    registerFallbackValue(DateTime.now());
  });

  late _MockRepo repo;
  late _MockDb db;
  late _MockNotifications notifications;

  setUp(() {
    repo = _MockRepo();
    db = _MockDb();
    notifications = _MockNotifications();

    when(() => notifications.scheduleReminder(item: any(named: 'item')))
        .thenAnswer((_) async {});
    when(() => notifications.cancelReminder(any())).thenAnswer((_) async {});
  });

  WatchlistBloc build() => WatchlistBloc(
        databaseHelper: db,
        notificationService: notifications,
        repository: repo,
      );

  group('LoadWatchlist', () {
    blocTest<WatchlistBloc, WatchlistState>(
      'emits [WatchlistLoading, WatchlistLoaded] on success',
      setUp: () {
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) => bloc.add(const LoadWatchlist()),
      wait: const Duration(milliseconds: 50),
      expect: () => [
        isA<WatchlistLoading>(),
        isA<WatchlistLoaded>()
            .having((s) => s.buckets.upcoming.length, 'upcoming', 0)
            .having((s) => s.isOfflineMode, 'isOfflineMode', false)
            .having((s) => s.pendingSyncCount, 'pendingSyncCount', 0),
      ],
    );

    blocTest<WatchlistBloc, WatchlistState>(
      'emits WatchlistError when grouped() throws',
      setUp: () {
        when(() => repo.grouped()).thenThrow(Exception('boom'));
      },
      build: build,
      act: (bloc) => bloc.add(const LoadWatchlist()),
      wait: const Duration(milliseconds: 50),
      expect: () => [
        isA<WatchlistLoading>(),
        isA<WatchlistError>().having((e) => e.message, 'message', contains('boom')),
      ],
    );
  });

  group('AddToWatchlist', () {
    blocTest<WatchlistBloc, WatchlistState>(
      'calls repository.add and emits LoadWatchlist afterwards',
      setUp: () {
        when(() => repo.add(
              item: any(named: 'item'),
              programId: any(named: 'programId'),
              channelId: any(named: 'channelId'),
              note: any(named: 'note'),
            )).thenAnswer((_) async {});
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) async {
        bloc.add(AddToWatchlist(
          item: _item(),
          programId: 'prog-1',
          channelId: 'channel-1',
        ));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      },
      verify: (_) {
        verify(() => repo.add(
              item: any(named: 'item'),
              programId: 'prog-1',
              channelId: 'channel-1',
              note: null,
            )).called(1);
      },
    );

    blocTest<WatchlistBloc, WatchlistState>(
      'schedules a notification when reminderEnabled=true',
      setUp: () {
        when(() => repo.add(
              item: any(named: 'item'),
              programId: any(named: 'programId'),
              channelId: any(named: 'channelId'),
              note: any(named: 'note'),
            )).thenAnswer((_) async {});
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) async {
        final item = _item().copyWith(
          reminderEnabled: true,
          reminderTime: DateTime.now().add(const Duration(hours: 2)),
        );
        bloc.add(AddToWatchlist(
          item: item,
          programId: item.programId,
        ));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      },
      verify: (_) {
        verify(() => notifications.scheduleReminder(item: any(named: 'item')))
            .called(1);
      },
    );

    blocTest<WatchlistBloc, WatchlistState>(
      'does not schedule when reminderEnabled is false',
      setUp: () {
        when(() => repo.add(
              item: any(named: 'item'),
              programId: any(named: 'programId'),
              channelId: any(named: 'channelId'),
              note: any(named: 'note'),
            )).thenAnswer((_) async {});
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) async {
        bloc.add(AddToWatchlist(item: _item(), programId: 'prog-1'));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      },
      verify: (_) {
        verifyNever(() =>
            notifications.scheduleReminder(item: any(named: 'item')));
      },
    );
  });

  group('RemoveFromWatchlist', () {
    blocTest<WatchlistBloc, WatchlistState>(
      'cancels the reminder and removes via repository',
      setUp: () {
        when(() => notifications.cancelReminder(any()))
            .thenAnswer((_) async {});
        when(() => repo.removeByProgramId(any())).thenAnswer((_) async {});
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) async {
        bloc.add(const RemoveFromWatchlist('prog-1'));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      },
      verify: (_) {
        verify(() => notifications.cancelReminder('prog-1')).called(1);
        verify(() => repo.removeByProgramId('prog-1')).called(1);
      },
    );
  });

  group('ToggleWatchlistReminder', () {
    blocTest<WatchlistBloc, WatchlistState>(
      'updates DB and schedules a notification when time is non-null',
      setUp: () {
        when(() => db.updateReminderTime(any(), any()))
            .thenAnswer((_) async => 1);
        when(() => db.getWatchlistItems()).thenAnswer((_) async => [
              _item(programId: 'p1').copyWith(id: 7),
            ]);
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) async {
        bloc.add(ToggleWatchlistReminder(
          itemId: 7,
          reminderTime: DateTime.now().add(const Duration(hours: 1)),
        ));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      },
      verify: (_) {
        verify(() => db.updateReminderTime(7, any())).called(1);
        verify(() => notifications.scheduleReminder(item: any(named: 'item')))
            .called(1);
      },
    );

    blocTest<WatchlistBloc, WatchlistState>(
      'cancels reminder when time is null',
      setUp: () {
        when(() => db.updateReminderTime(any(), null))
            .thenAnswer((_) async => 1);
        when(() => db.getWatchlistItems()).thenAnswer((_) async => [
              _item(programId: 'p1').copyWith(id: 7),
            ]);
        when(() => repo.grouped()).thenAnswer((_) async => _buckets());
        when(() => db.pendingOpCount()).thenAnswer((_) async => 0);
      },
      build: build,
      act: (bloc) async {
        bloc.add(const ToggleWatchlistReminder(itemId: 7));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      },
      verify: (_) {
        verify(() => notifications.cancelReminder('p1')).called(1);
        verifyNever(() =>
            notifications.scheduleReminder(item: any(named: 'item')));
      },
    );
  });

  group('isInWatchlist extension', () {
    test('returns true when the programId is in any bucket', () {
      final item = _item(programId: 'prog-A');
      final loaded = WatchlistLoaded(buckets: _buckets(upcoming: [item]));
      expect(loaded.isInWatchlist('prog-A'), true);
    });

    test('returns false when not present and on non-loaded states', () {
      final loaded = WatchlistLoaded(buckets: _buckets());
      expect(loaded.isInWatchlist('prog-A'), false);
      expect(WatchlistInitial().isInWatchlist('prog-A'), false);
      expect(WatchlistLoading().isInWatchlist('prog-A'), false);
    });
  });
}
