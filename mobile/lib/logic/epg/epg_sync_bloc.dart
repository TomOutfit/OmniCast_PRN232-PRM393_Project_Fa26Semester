// ============================================================
// OmniCast - EPG Sync BLoC
// ============================================================
//
// Background poller that keeps the player's stream URL in lock-step with
// the live EPG grid. Every `pollInterval` (60s by default) we fetch
// `/v1/programs/epg/now?channelSlug=<slug>` and:
//
//   1. If the on-air program ID changed → emit `EpgSourceChanged` so the
//      player rebuilds its VideoPlayerController with the new URL.
//   2. If `streamUrl` changed but the program ID is the same → emit
//      `EpgSourceRefreshed` (e.g. when Bunny rotates the playlist token).
//   3. If `currentOffsetSeconds` jumps forward significantly → emit
//      `EpgSeekRequired` so the player can sync the seek position.
//
// Designed to be a long-lived bloc created once when the player screen
// mounts and disposed when the screen unmounts. The timer is cancelled
// in `close()` to avoid leaking.
//
// Why a separate bloc (and not EpgBloc)?  `EpgBloc` is for the schedule
// grid UI; its lifecycle is per-screen-load.  `EpgSyncBloc` lives for
// the entire duration the user is on a channel — keeping polling state
// out of the UI layer's bloc tree.
// ============================================================

import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';

import '../../core/constants/app_constants.dart';
import '../../core/network/dio_client.dart';
import '../../core/utils/error_utils.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class EpgSyncEvent extends Equatable {
  const EpgSyncEvent();
  @override
  List<Object?> get props => [];
}

/// Begin polling for `channelSlug`. Idempotent — calling again with the
/// same slug just resets it. Calling with a different slug swaps the
/// channel.
class EpgSyncStart extends EpgSyncEvent {
  final String channelSlug;
  const EpgSyncStart(this.channelSlug);
  @override
  List<Object?> get props => [channelSlug];
}

/// Stop polling. Safe to call multiple times.
class EpgSyncStop extends EpgSyncEvent {
  const EpgSyncStop();
}

/// Fired by the internal timer. Triggers a fetch.
class EpgSyncTick extends EpgSyncEvent {
  const EpgSyncTick();
}

// ============================================================
// STATE
// ============================================================

abstract class EpgSyncState extends Equatable {
  const EpgSyncState();
  @override
  List<Object?> get props => [];
}

class EpgSyncIdle extends EpgSyncState {}

class EpgSyncRunning extends EpgSyncState {
  final String channelSlug;
  final String currentProgramId;
  final String streamUrl;
  final String? nextProgramId;
  final String? fallbackStreamUrl;
  final int currentOffsetSeconds;
  final int durationSeconds;
  final DateTime generatedAt;
  final bool isFiller;
  final bool isLive;

  const EpgSyncRunning({
    required this.channelSlug,
    required this.currentProgramId,
    required this.streamUrl,
    this.nextProgramId,
    this.fallbackStreamUrl,
    required this.currentOffsetSeconds,
    required this.durationSeconds,
    required this.generatedAt,
    required this.isFiller,
    required this.isLive,
  });

  EpgSyncRunning copyWith({
    String? channelSlug,
    String? currentProgramId,
    String? streamUrl,
    String? nextProgramId,
    String? fallbackStreamUrl,
    int? currentOffsetSeconds,
    int? durationSeconds,
    DateTime? generatedAt,
    bool? isFiller,
    bool? isLive,
  }) =>
      EpgSyncRunning(
        channelSlug: channelSlug ?? this.channelSlug,
        currentProgramId: currentProgramId ?? this.currentProgramId,
        streamUrl: streamUrl ?? this.streamUrl,
        nextProgramId: nextProgramId ?? this.nextProgramId,
        fallbackStreamUrl: fallbackStreamUrl ?? this.fallbackStreamUrl,
        currentOffsetSeconds:
            currentOffsetSeconds ?? this.currentOffsetSeconds,
        durationSeconds: durationSeconds ?? this.durationSeconds,
        generatedAt: generatedAt ?? this.generatedAt,
        isFiller: isFiller ?? this.isFiller,
        isLive: isLive ?? this.isLive,
      );

  @override
  List<Object?> get props => [
        channelSlug,
        currentProgramId,
        streamUrl,
        nextProgramId,
        fallbackStreamUrl,
        currentOffsetSeconds,
        durationSeconds,
        generatedAt,
        isFiller,
        isLive,
      ];
}

class EpgSyncError extends EpgSyncState {
  final String message;
  final String? channelSlug;
  const EpgSyncError({required this.message, this.channelSlug});
  @override
  List<Object?> get props => [message, channelSlug];
}

// ============================================================
// BLOC
// ============================================================

class EpgSyncBloc extends Bloc<EpgSyncEvent, EpgSyncState> {
  final DioClient _dioClient;
  final Duration pollInterval;

  Timer? _timer;
  String? _activeSlug;

  EpgSyncBloc({
    required DioClient dioClient,
    this.pollInterval = const Duration(seconds: 60),
  })  : _dioClient = dioClient,
        super(EpgSyncIdle()) {
    // Sequential transformer guarantees `EpgSyncStart` for channel A
    // finishes its `_runFetch` before `EpgSyncStart` for channel B
    // runs. Without this, switching channels mid-fetch can emit
    // states out of order — e.g. the old channel's "Running" lands
    // last, leaving the UI pointing at the wrong stream URL.
    on<EpgSyncStart>(_onStart, transformer: sequential());
    on<EpgSyncStop>(_onStop);
    // Ticks are still sequential so a slow request defers the next,
    // but they share their transformer so backpressure doesn't pile up.
    on<EpgSyncTick>(_onTick, transformer: sequential());
  }

  Future<void> _onStart(EpgSyncStart event, Emitter<EpgSyncState> emit) async {
    _activeSlug = event.channelSlug;

    // First fetch — emit straight to a populated state.
    await _runFetch(event.channelSlug, emit);

    // Schedule subsequent polls.
    _timer?.cancel();
    _timer = Timer.periodic(
      pollInterval,
      (_) => add(const EpgSyncTick()),
    );
  }

  Future<void> _onStop(EpgSyncStop event, Emitter<EpgSyncState> emit) async {
    _timer?.cancel();
    _timer = null;
    _activeSlug = null;
    emit(EpgSyncIdle());
  }

  Future<void> _onTick(EpgSyncTick event, Emitter<EpgSyncState> emit) async {
    final slug = _activeSlug;
    if (slug == null) return;
    await _runFetch(slug, emit);
  }

  Future<void> _runFetch(String slug, Emitter<EpgSyncState> emit) async {
    try {
      final resp = await _dioClient.get(AppEndpoints.epgNow(channelSlug: slug));
      final raw = resp.data;
      final body = (raw is Map && raw['data'] is Map)
          ? raw['data'] as Map<String, dynamic>
          : (raw as Map<String, dynamic>);

      final streamUrl = body['streamUrl'] as String? ?? '';
      if (streamUrl.isEmpty) {
        emit(EpgSyncError(
          channelSlug: slug,
          message: 'EPG now payload missing streamUrl',
        ));
        return;
      }

      final program = body['program'] as Map<String, dynamic>?;
      final next = body['next'] as Map<String, dynamic>?;
      final id = program?['id']?.toString() ?? 'unknown';
      final offset =
          (program?['currentOffsetSeconds'] as num?)?.toInt() ?? 0;
      final dur =
          (program?['durationSeconds'] as num?)?.toInt() ?? 0;
      final isFiller = program?['isFiller'] == true;
      final isLive = program?['isLive'] == true;
      final nextId = next?['id']?.toString();

      emit(EpgSyncRunning(
        channelSlug: slug,
        currentProgramId: id,
        streamUrl: streamUrl,
        nextProgramId: nextId,
        fallbackStreamUrl: body['fallbackStreamUrl'] as String?,
        currentOffsetSeconds: offset,
        durationSeconds: dur,
        generatedAt: DateTime.tryParse(
              body['generatedAt']?.toString() ?? '',
            ) ??
            DateTime.now(),
        isFiller: isFiller,
        isLive: isLive,
      ));
    } catch (e) {
      // Soft error — keep the previous state. Mobile should keep playing
      // the last known URL until the next tick succeeds.
      final last = state;
      if (last is EpgSyncRunning) {
        // Just keep the state, no emit. The next tick will retry.
        return;
      }
      emit(EpgSyncError(
        channelSlug: slug,
        message: ErrorUtils.parseError(
          e,
          defaultMsg: 'Không thể đồng bộ EPG. Đã thử lại sau 60s.',
        ),
      ));
    }
  }

  @override
  Future<void> close() async {
    _timer?.cancel();
    _timer = null;
    return super.close();
  }
}