// OmniCast - SaveToWatchlistButton widget tests
//
// Verifies the button:
//  - renders the "Lưu" label when the program is NOT in the watchlist
//  - renders "Đã lưu" when the bloc state reports it IS in the watchlist
//  - dispatches AddToWatchlist when tapped from the unsaved state
//  - dispatches RemoveFromWatchlist when tapped from the saved state
//
// Uses mocktail for the bloc dependency and an in-memory stub state.

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:omnicast/data/models/watchlist_item_model.dart';
import 'package:omnicast/data/models/program_model.dart';
import 'package:omnicast/data/repositories/watchlist_repository.dart';
import 'package:omnicast/logic/watchlist/watchlist_bloc.dart';
import 'package:omnicast/presentation/widgets/save_to_watchlist_button.dart';

class _MockWatchlistBloc
    extends MockBloc<WatchlistEvent, WatchlistState>
    implements WatchlistBloc {}

WatchlistState _stateWith(String programId) {
  return WatchlistLoaded(
    buckets: WatchlistBuckets(
      upcoming: [
        WatchlistItemModel(
          programId: programId,
          programTitle: 'Test',
          scheduledAt: DateTime.now(),
          reminderEnabled: false,
          addedAt: DateTime.now(),
        ),
      ],
      live: const [],
      past: const [],
    ),
  );
}

LiveEventModel _stubProgram() {
  return LiveEventModel(
    id: 'prog-1',
    title: 'Championship',
    contentSource: 'UPLOADED',
    isPrivate: false,
    quality: 'HD',
    language: 'vi',
    status: 'SCHEDULED',
    scheduledAt: DateTime.now().add(const Duration(hours: 1)),
    viewerCount: 0,
    peakViewers: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    channelId: 'channel-1',
    tags: const [],
    autoRecord: false,
    slowMode: false,
    chatEnabled: true,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );
}

Future<void> _pumpButton(
  WidgetTester tester, {
  required _MockWatchlistBloc bloc,
  required String programId,
  LiveEventModel? program,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: BlocProvider<WatchlistBloc>.value(
          value: bloc,
          child: Center(
            child: SaveToWatchlistButton(
              programId: programId,
              channelId: 'channel-1',
              program: program,
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() {
    registerFallbackValue(_stubProgram());
    registerFallbackValue(
      WatchlistItemModel(
        programId: 'fb',
        programTitle: 'fb',
        scheduledAt: DateTime.now(),
        reminderEnabled: false,
        addedAt: DateTime.now(),
      ),
    );
    // Fallback for `bloc.add(any())` — mocktail requires a concrete
    // WatchlistEvent instance to satisfy the type checker.
    registerFallbackValue(RemoveFromWatchlist('fb'));
  });

  testWidgets('shows "Lưu" label when the program is not saved', (tester) async {
    final bloc = _MockWatchlistBloc();
    when(() => bloc.state).thenReturn(WatchlistLoaded(
      buckets: WatchlistBuckets(
        upcoming: const [],
        live: const [],
        past: const [],
      ),
    ));

    await _pumpButton(tester, bloc: bloc, programId: 'prog-1');

    expect(find.text('Lưu'), findsOneWidget);
    expect(find.text('Đã lưu'), findsNothing);
  });

  testWidgets('shows "Đã lưu" label when the program is in the watchlist',
      (tester) async {
    final bloc = _MockWatchlistBloc();
    when(() => bloc.state).thenReturn(_stateWith('prog-1'));

    await _pumpButton(tester, bloc: bloc, programId: 'prog-1');

    expect(find.text('Đã lưu'), findsOneWidget);
    expect(find.text('Lưu'), findsNothing);
  });

  testWidgets('dispatches AddToWatchlist when tapped from the unsaved state',
      (tester) async {
    final bloc = _MockWatchlistBloc();
    when(() => bloc.state).thenReturn(WatchlistLoaded(
      buckets: WatchlistBuckets(
        upcoming: const [],
        live: const [],
        past: const [],
      ),
    ));
    when(() => bloc.add(any())).thenReturn(null);

    await _pumpButton(tester, bloc: bloc, programId: 'prog-1', program: _stubProgram());

    await tester.tap(find.byType(SaveToWatchlistButton));
    await tester.pump(const Duration(milliseconds: 200));

    final captured = verify(() => bloc.add(captureAny())).captured;
    expect(captured.whereType<AddToWatchlist>().length, 1);
    expect(
      captured.whereType<RemoveFromWatchlist>().length,
      0,
    );
  });

  testWidgets('dispatches RemoveFromWatchlist when tapped from the saved state',
      (tester) async {
    final bloc = _MockWatchlistBloc();
    when(() => bloc.state).thenReturn(_stateWith('prog-1'));
    when(() => bloc.add(any())).thenReturn(null);

    await _pumpButton(tester, bloc: bloc, programId: 'prog-1');

    await tester.tap(find.byType(SaveToWatchlistButton));
    await tester.pump(const Duration(milliseconds: 200));

    final captured = verify(() => bloc.add(captureAny())).captured;
    expect(captured.whereType<RemoveFromWatchlist>().length, 1);
    expect(captured.whereType<AddToWatchlist>().length, 0);
  });
}
