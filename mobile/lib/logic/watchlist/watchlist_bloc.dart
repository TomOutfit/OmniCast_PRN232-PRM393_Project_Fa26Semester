// OmniCast - Watchlist BLoC
// Cloud-primary. Reads from SQLite mirror (instant), refreshes from cloud.

import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../../core/services/notification_service.dart';
import '../../../data/datasources/local/database_helper.dart';
import '../../../data/repositories/watchlist_repository.dart';
import '../../../data/models/watchlist_item_model.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class WatchlistEvent extends Equatable {
  const WatchlistEvent();
  @override
  List<Object?> get props => [];
}

class LoadWatchlist extends WatchlistEvent {
  const LoadWatchlist();
}

class RefreshWatchlistFromCloud extends WatchlistEvent {
  const RefreshWatchlistFromCloud();
}

class AddToWatchlist extends WatchlistEvent {
  final WatchlistItemModel item;
  final String programId;
  final String? channelId;
  final String? note;
  /// When true, the bloc will also schedule a local notification
  /// reminder 15 minutes before the program airs. Defaults to false.
  final bool scheduleReminder;
  const AddToWatchlist({
    required this.item,
    required this.programId,
    this.channelId,
    this.note,
    this.scheduleReminder = false,
  });
  @override
  List<Object?> get props =>
      [item, programId, channelId, note, scheduleReminder];
}

class RemoveFromWatchlist extends WatchlistEvent {
  final String programId;
  const RemoveFromWatchlist(this.programId);
  @override
  List<Object?> get props => [programId];
}

class ToggleWatchlistReminder extends WatchlistEvent {
  final int itemId;
  final DateTime? reminderTime;
  const ToggleWatchlistReminder({required this.itemId, this.reminderTime});
  @override
  List<Object?> get props => [itemId, reminderTime];
}

// ============================================================
// STATES
// ============================================================

abstract class WatchlistState extends Equatable {
  const WatchlistState();
  @override
  List<Object?> get props => [];
}

class WatchlistInitial extends WatchlistState {}

class WatchlistLoading extends WatchlistState {}

class WatchlistLoaded extends WatchlistState {
  final WatchlistBuckets buckets;
  final bool isOfflineMode;
  final int pendingSyncCount;

  const WatchlistLoaded({
    required this.buckets,
    this.isOfflineMode = false,
    this.pendingSyncCount = 0,
  });

  WatchlistLoaded copyWith({
    WatchlistBuckets? buckets,
    bool? isOfflineMode,
    int? pendingSyncCount,
  }) {
    return WatchlistLoaded(
      buckets: buckets ?? this.buckets,
      isOfflineMode: isOfflineMode ?? this.isOfflineMode,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
    );
  }

  @override
  List<Object?> get props => [buckets, isOfflineMode, pendingSyncCount];
}

class WatchlistError extends WatchlistState {
  final String message;
  const WatchlistError(this.message);
  @override
  List<Object?> get props => [message];
}

/// Convenience helpers on any [WatchlistState] — lets widgets like the
/// "bookmark" toggle decide their visual state without subscribing to
/// every detail of the buckets payload.
extension WatchlistStateLookup on WatchlistState {
  /// True when the program (by its source `programId`) is currently in
  /// one of the three loaded buckets. Always false when the bloc is
  /// still in its initial / error state.
  bool isInWatchlist(String programId) {
    final s = this;
    if (s is WatchlistLoaded) {
      final b = s.buckets;
      final inUpcoming =
          b.upcoming.any((i) => i.programId == programId);
      final inLive = b.live.any((i) => i.programId == programId);
      final inPast = b.past.any((i) => i.programId == programId);
      return inUpcoming || inLive || inPast;
    }
    return false;
  }
}

// ============================================================
// BLOC
// ============================================================

class WatchlistBloc extends Bloc<WatchlistEvent, WatchlistState> {
  final DatabaseHelper _databaseHelper;
  final NotificationService _notificationService;
  final WatchlistRepository _repository;
  StreamSubscription<List<ConnectivityResult>>? _connSub;
  Timer? _syncTimer;

  WatchlistBloc({
    required DatabaseHelper databaseHelper,
    required NotificationService notificationService,
    required WatchlistRepository repository,
  })  : _databaseHelper = databaseHelper,
        _notificationService = notificationService,
        _repository = repository,
        super(WatchlistInitial()) {
    on<LoadWatchlist>(_onLoadWatchlist);
    on<RefreshWatchlistFromCloud>(_onRefreshFromCloud);
    on<AddToWatchlist>(_onAddToWatchlist);
    on<RemoveFromWatchlist>(_onRemoveFromWatchlist);
    on<ToggleWatchlistReminder>(_onToggleWatchlistReminder);

    // Auto-sync every 30s + on connectivity-up
    _syncTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => add(const RefreshWatchlistFromCloud()),
    );
    _connSub = Connectivity().onConnectivityChanged.listen((result) {
      final online = result.isNotEmpty &&
          !result.contains(ConnectivityResult.none);
      if (online) add(const RefreshWatchlistFromCloud());
    });
  }

  @override
  Future<void> close() async {
    _syncTimer?.cancel();
    await _connSub?.cancel();
    return super.close();
  }

  Future<void> _onLoadWatchlist(
    LoadWatchlist event,
    Emitter<WatchlistState> emit,
  ) async {
    emit(WatchlistLoading());
    try {
      final buckets = await _repository.grouped();
      final pending = await _databaseHelper.pendingOpCount();
      final isOnline = await _checkOnline();
      emit(WatchlistLoaded(
        buckets: buckets,
        isOfflineMode: !isOnline,
        pendingSyncCount: pending,
      ));
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }

  Future<void> _onRefreshFromCloud(
    RefreshWatchlistFromCloud event,
    Emitter<WatchlistState> emit,
  ) async {
    try {
      await _repository.sync();
      final buckets = await _repository.grouped();
      final pending = await _databaseHelper.pendingOpCount();
      final isOnline = await _checkOnline();
      emit(WatchlistLoaded(
        buckets: buckets,
        isOfflineMode: !isOnline,
        pendingSyncCount: pending,
      ));
    } catch (_) {/* keep existing state */}
  }

  Future<void> _onAddToWatchlist(
    AddToWatchlist event,
    Emitter<WatchlistState> emit,
  ) async {
    try {
      await _repository.add(
        item: event.item,
        programId: event.programId,
        channelId: event.channelId,
        note: event.note,
      );
      // Honor both the event flag and the model's own flag. The
      // event flag lets callers (e.g. the "Nhắc tôi" button) opt-in
      // without having to mutate the model first.
      final shouldSchedule = event.scheduleReminder ||
          (event.item.reminderEnabled && event.item.reminderTime != null);
      if (shouldSchedule && event.item.reminderTime != null) {
        await _notificationService.scheduleReminder(item: event.item);
      }
      add(const LoadWatchlist());
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }

  Future<void> _onRemoveFromWatchlist(
    RemoveFromWatchlist event,
    Emitter<WatchlistState> emit,
  ) async {
    try {
      await _notificationService.cancelReminder(event.programId);
      await _repository.removeByProgramId(event.programId);
      add(const LoadWatchlist());
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }

  Future<void> _onToggleWatchlistReminder(
    ToggleWatchlistReminder event,
    Emitter<WatchlistState> emit,
  ) async {
    try {
      await _databaseHelper.updateReminderTime(
        event.itemId,
        event.reminderTime,
      );
      if (event.reminderTime != null) {
        final items = await _databaseHelper.getWatchlistItems();
        for (final i in items) {
          if (i.id == event.itemId) {
            await _notificationService.scheduleReminder(item: i);
            break;
          }
        }
      } else {
        // Find item to cancel by id
        final items = await _databaseHelper.getWatchlistItems();
        for (final i in items) {
          if (i.id == event.itemId) {
            await _notificationService.cancelReminder(i.programId);
            break;
          }
        }
      }
      add(const LoadWatchlist());
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }

  Future<bool> _checkOnline() async {
    final r = await Connectivity().checkConnectivity();
    return r.isNotEmpty && !r.contains(ConnectivityResult.none);
  }
}
