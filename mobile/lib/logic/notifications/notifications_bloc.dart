// OmniCast - Notifications BLoC
// ------------------------------------------------------------
// Backs the in-app bell badge + the full notifications screen.
// Polls the unread-count endpoint on a 30s interval so the bell
// stays fresh without forcing the user to pull-to-refresh.
//
// All mutations apply optimistic updates: the list flips
// instantly, the badge decrements, and we only invalidate
// the cache after the server confirms.
// ============================================================

import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../data/models/notification_model.dart';
import '../../data/repositories/notifications_repository.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class NotificationsEvent extends Equatable {
  const NotificationsEvent();
  @override
  List<Object?> get props => [];
}

/// Start polling the unread-count + list endpoints.
class NotificationsStarted extends NotificationsEvent {
  const NotificationsStarted();
}

/// Stop the polling timer — call from `dispose`.
class NotificationsStopped extends NotificationsEvent {
  const NotificationsStopped();
}

/// Force-refresh both the list and the badge.
class NotificationsRefreshed extends NotificationsEvent {
  const NotificationsRefreshed();
}

/// Switch between the 'all' and 'unread' filter chips.
class NotificationsFilterChanged extends NotificationsEvent {
  final NotificationFilter filter;
  const NotificationsFilterChanged(this.filter);
  @override
  List<Object?> get props => [filter];
}

/// Mark a single notification as read. Optimistic.
class NotificationMarkedRead extends NotificationsEvent {
  final String id;
  const NotificationMarkedRead(this.id);
  @override
  List<Object?> get props => [id];
}

/// Mark every unread notification as read. Optimistic.
class NotificationsMarkedAllRead extends NotificationsEvent {
  const NotificationsMarkedAllRead();
}

/// Delete a single notification.
class NotificationDeleted extends NotificationsEvent {
  final String id;
  const NotificationDeleted(this.id);
  @override
  List<Object?> get props => [id];
}

// ============================================================
// STATES
// ============================================================

abstract class NotificationsState extends Equatable {
  const NotificationsState();
  @override
  List<Object?> get props => [];
}

class NotificationsInitial extends NotificationsState {
  const NotificationsInitial();
}

class NotificationsLoading extends NotificationsState {
  const NotificationsLoading();
}

class NotificationsReady extends NotificationsState {
  final List<NotificationModel> items;
  final int unreadCount;
  final NotificationFilter filter;
  final bool isFetching;
  final String? error;

  const NotificationsReady({
    required this.items,
    required this.unreadCount,
    required this.filter,
    this.isFetching = false,
    this.error,
  });

  NotificationsReady copyWith({
    List<NotificationModel>? items,
    int? unreadCount,
    NotificationFilter? filter,
    bool? isFetching,
    String? error,
    bool clearError = false,
  }) {
    return NotificationsReady(
      items: items ?? this.items,
      unreadCount: unreadCount ?? this.unreadCount,
      filter: filter ?? this.filter,
      isFetching: isFetching ?? this.isFetching,
      error: clearError ? null : (error ?? this.error),
    );
  }

  /// Convenience for the bell widget — true when there's at least
  /// one unread item.
  bool get hasUnread => unreadCount > 0;

  @override
  List<Object?> get props => [items, unreadCount, filter, isFetching, error];
}

class NotificationsError extends NotificationsState {
  final String message;
  const NotificationsError(this.message);
  @override
  List<Object?> get props => [message];
}

// ============================================================
// BLOC
// ============================================================

class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  final NotificationsRepository _repo;
  Timer? _pollTimer;
  StreamSubscription<List<ConnectivityResult>>? _connSub;

  NotificationsBloc({required NotificationsRepository repository})
      : _repo = repository,
        super(const NotificationsInitial()) {
    on<NotificationsStarted>(_onStarted);
    on<NotificationsStopped>(_onStopped);
    on<NotificationsRefreshed>(_onRefreshed);
    on<NotificationsFilterChanged>(_onFilterChanged);
    on<NotificationMarkedRead>(_onMarkedRead);
    on<NotificationsMarkedAllRead>(_onMarkAllRead);
    on<NotificationDeleted>(_onDeleted);
  }

  /// Tick interval for the background poll. 60s reduces continuous network
  /// overhead on mobile while keeping notifications reasonably fresh.
  static const _pollInterval = Duration(seconds: 60);

  @override
  Future<void> close() async {
    _pollTimer?.cancel();
    await _connSub?.cancel();
    return super.close();
  }

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  Future<void> _onStarted(
    NotificationsStarted event,
    Emitter<NotificationsState> emit,
  ) async {
    if (state is NotificationsReady) return; // already running
    emit(const NotificationsLoading());
    await _refreshFromServer(emit);

    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) async {
      if (state is! NotificationsReady) return;
      // Silently re-fetch — don't kick the user back to a spinner
      await _silentRefresh();
    });

    // Also re-fetch when connectivity comes back online (in case
    // a refresh happened to land during an offline window).
    await _connSub?.cancel();
    _connSub = Connectivity().onConnectivityChanged.listen((result) {
      final online = result.isNotEmpty &&
          !result.contains(ConnectivityResult.none);
      if (online) add(const NotificationsRefreshed());
    });
  }

  Future<void> _onStopped(
    NotificationsStopped event,
    Emitter<NotificationsState> emit,
  ) async {
    _pollTimer?.cancel();
    _pollTimer = null;
    await _connSub?.cancel();
    _connSub = null;
  }

  Future<void> _onRefreshed(
    NotificationsRefreshed event,
    Emitter<NotificationsState> emit,
  ) async {
    await _refreshFromServer(emit);
  }

  Future<void> _onFilterChanged(
    NotificationsFilterChanged event,
    Emitter<NotificationsState> emit,
  ) async {
    final current = state;
    if (current is! NotificationsReady) return;
    emit(current.copyWith(
      filter: event.filter,
      isFetching: true,
      clearError: true,
    ));
    try {
      final res = await _repo.list(
        limit: 20,
        offset: 0,
        filter: event.filter,
      );
      emit(current.copyWith(
        items: res.items,
        unreadCount: res.unreadCount,
        filter: event.filter,
        isFetching: false,
      ));
    } catch (e) {
      emit(current.copyWith(
        isFetching: false,
        error: _humanise(e),
      ));
    }
  }

  Future<void> _onMarkedRead(
    NotificationMarkedRead event,
    Emitter<NotificationsState> emit,
  ) async {
    final current = state;
    if (current is! NotificationsReady) return;
    final idx = current.items.indexWhere((n) => n.id == event.id);
    if (idx < 0) return;
    final original = current.items[idx];
    if (original.isRead) return; // already read

    // Optimistic flip
    final optimisticItems = List<NotificationModel>.from(current.items);
    optimisticItems[idx] = original.copyWith(
      isRead: true,
      readAt: DateTime.now(),
    );
    final optimisticUnread =
        (current.unreadCount - 1).clamp(0, 1 << 30);
    emit(current.copyWith(
      items: optimisticItems,
      unreadCount: optimisticUnread,
      clearError: true,
    ));

    try {
      await _repo.markOneRead(event.id);
    } catch (e) {
      // Roll back to the pre-optimistic state
      emit(current.copyWith(
        error: _humanise(e),
      ));
    }
  }

  Future<void> _onMarkAllRead(
    NotificationsMarkedAllRead event,
    Emitter<NotificationsState> emit,
  ) async {
    final current = state;
    if (current is! NotificationsReady) return;
    if (current.unreadCount == 0) return;

    final now = DateTime.now();
    final optimisticItems = current.items
        .map((n) => n.isRead
            ? n
            : n.copyWith(isRead: true, readAt: now))
        .toList();
    emit(current.copyWith(
      items: optimisticItems,
      unreadCount: 0,
      clearError: true,
    ));

    try {
      await _repo.markAllRead();
    } catch (e) {
      emit(current.copyWith(error: _humanise(e)));
    }
  }

  Future<void> _onDeleted(
    NotificationDeleted event,
    Emitter<NotificationsState> emit,
  ) async {
    final current = state;
    if (current is! NotificationsReady) return;
    final removed = current.items.firstWhere(
      (n) => n.id == event.id,
      orElse: () => NotificationModel(
        id: '',
        type: NotificationType.unknown,
        title: '',
        createdAt: DateTime.now(),
        isRead: true,
      ),
    );
    if (removed.id.isEmpty) return;

    final optimisticItems =
        current.items.where((n) => n.id != event.id).toList();
    final optimisticUnread = removed.isRead
        ? current.unreadCount
        : (current.unreadCount - 1).clamp(0, 1 << 30);
    emit(current.copyWith(
      items: optimisticItems,
      unreadCount: optimisticUnread,
      clearError: true,
    ));

    try {
      await _repo.delete(event.id);
    } catch (e) {
      emit(current.copyWith(error: _humanise(e)));
    }
  }

  // ----------------------------------------------------------------
  // Internals
  // ----------------------------------------------------------------

  Future<void> _refreshFromServer(Emitter<NotificationsState> emit) async {
    final current = state;
    final filter =
        current is NotificationsReady ? current.filter : NotificationFilter.all;
    try {
      final res = await _repo.list(limit: 20, offset: 0, filter: filter);
      emit(NotificationsReady(
        items: res.items,
        unreadCount: res.unreadCount,
        filter: filter,
        isFetching: false,
      ));
    } catch (e) {
      emit(NotificationsError(_humanise(e)));
    }
  }

  /// Like [_refreshFromServer] but does not switch to a loading
  /// state — used by the periodic background poll so the user
  /// never sees the UI flicker.
  Future<void> _silentRefresh() async {
    final current = state;
    if (current is! NotificationsReady) return;
    try {
      final res = await _repo.list(
        limit: 20,
        offset: 0,
        filter: current.filter,
      );
      // Only emit if nothing has been mutated by the user in the
      // meantime — we don't want to clobber an in-flight optimistic
      // update.
      if (state is NotificationsReady) {
        // ignore: invalid_use_of_visible_for_testing_member
        emit(NotificationsReady(
          items: res.items,
          unreadCount: res.unreadCount,
          filter: current.filter,
          isFetching: false,
        ));
      }
    } catch (_) {
      // Swallow — we'll try again on the next tick.
    }
  }

  /// Map raw exception messages into something the user can read.
  String _humanise(Object e) {
    final raw = e.toString();
    if (raw.contains('SocketException') ||
        raw.contains('Failed host lookup') ||
        raw.contains('Connection refused')) {
      return 'Không có kết nối mạng. Vui lòng kiểm tra Wi-Fi hoặc dữ liệu di động.';
    }
    if (raw.contains('401') || raw.contains('Unauthorized')) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (raw.contains('429')) {
      return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít giây.';
    }
    return 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
  }
}
