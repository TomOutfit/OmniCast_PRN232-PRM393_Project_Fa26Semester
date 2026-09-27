// OmniCast - Watchlist BLoC (Offline SQLite)

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../core/services/notification_service.dart';
import '../../../data/datasources/local/database_helper.dart';
import '../../../data/models/watchlist_item_model.dart';

// Events
abstract class WatchlistEvent extends Equatable {
  const WatchlistEvent();

  @override
  List<Object?> get props => [];
}

class LoadWatchlist extends WatchlistEvent {}

class AddToWatchlist extends WatchlistEvent {
  final WatchlistItemModel item;

  const AddToWatchlist(this.item);

  @override
  List<Object?> get props => [item];
}

class RemoveFromWatchlist extends WatchlistEvent {
  final int itemId;

  const RemoveFromWatchlist(this.itemId);

  @override
  List<Object?> get props => [itemId];
}

class ToggleWatchlistReminder extends WatchlistEvent {
  final int itemId;
  final DateTime? reminderTime;

  const ToggleWatchlistReminder({
    required this.itemId,
    this.reminderTime,
  });

  @override
  List<Object?> get props => [itemId, reminderTime];
}

// States
abstract class WatchlistState extends Equatable {
  const WatchlistState();

  @override
  List<Object?> get props => [];
}

class WatchlistInitial extends WatchlistState {}

class WatchlistLoading extends WatchlistState {}

class WatchlistLoaded extends WatchlistState {
  final List<WatchlistItemModel> items;
  final bool isOfflineMode;

  const WatchlistLoaded({
    required this.items,
    this.isOfflineMode = false,
  });

  @override
  List<Object?> get props => [items, isOfflineMode];
}

class WatchlistError extends WatchlistState {
  final String message;

  const WatchlistError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class WatchlistBloc extends Bloc<WatchlistEvent, WatchlistState> {
  final DatabaseHelper _databaseHelper;
  final NotificationService _notificationService;

  WatchlistBloc({
    required DatabaseHelper databaseHelper,
    required NotificationService notificationService,
  })  : _databaseHelper = databaseHelper,
        _notificationService = notificationService,
        super(WatchlistInitial()) {
    on<LoadWatchlist>(_onLoadWatchlist);
    on<AddToWatchlist>(_onAddToWatchlist);
    on<RemoveFromWatchlist>(_onRemoveFromWatchlist);
    on<ToggleWatchlistReminder>(_onToggleWatchlistReminder);
  }

  Future<void> _onLoadWatchlist(
    LoadWatchlist event,
    Emitter<WatchlistState> emit,
  ) async {
    emit(WatchlistLoading());
    try {
      final items = await _databaseHelper.getWatchlistItems();
      emit(WatchlistLoaded(items: items));
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }

  Future<void> _onAddToWatchlist(
    AddToWatchlist event,
    Emitter<WatchlistState> emit,
  ) async {
    try {
      await _databaseHelper.insertWatchlistItem(event.item);
      // If reminder was enabled, schedule it
      if (event.item.reminderEnabled && event.item.reminderTime != null) {
        await _notificationService.scheduleReminder(
          item: event.item,
          minutesBefore: 15,
        );
      }
      add(LoadWatchlist());
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }

  Future<void> _onRemoveFromWatchlist(
    RemoveFromWatchlist event,
    Emitter<WatchlistState> emit,
  ) async {
    try {
      // Cancel any scheduled notification first
      final items = await _databaseHelper.getWatchlistItems();
      WatchlistItemModel? item;
      for (final i in items) {
        if (i.id == event.itemId) {
          item = i;
          break;
        }
      }
      if (item != null) {
        await _notificationService.cancelReminder(item.programId);
      }
      await _databaseHelper.deleteWatchlistItem(event.itemId);
      add(LoadWatchlist());
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

      // Schedule or cancel notification based on new state
      if (event.reminderTime != null) {
        final items = await _databaseHelper.getWatchlistItems();
        WatchlistItemModel? item;
        for (final i in items) {
          if (i.id == event.itemId) {
            item = i;
            break;
          }
        }
        if (item != null) {
          await _notificationService.scheduleReminder(
            item: item,
            minutesBefore: 15,
          );
        }
      }
      add(LoadWatchlist());
    } catch (e) {
      emit(WatchlistError(e.toString()));
    }
  }
}
