// OmniCast - Recordings (VOD) BLoC
//
// Drives the mobile VOD library experience. Mirrors the Frontend
// `/recordings` page: featured strip, category-filtered list, search
// and pagination, plus a dedicated detail state with similar-recordings
// pre-fetch.
//
// The state model is intentionally self-contained — separate from
// `ProgramsBloc` — so the recordings UI can be opened as a stand-alone
// tab (or pushed as a full-screen route) without polluting the live
// event state.

import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/repositories/programs_repository.dart';
import '../../data/models/recording_model.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class RecordingsEvent extends Equatable {
  const RecordingsEvent();

  @override
  List<Object?> get props => [];
}

/// Replace the current list (used on first load & filter changes).
class LoadRecordings extends RecordingsEvent {
  final String? category;
  final String? channelId;
  final String? search;
  final int page;
  final int limit;

  const LoadRecordings({
    this.category,
    this.channelId,
    this.search,
    this.page = 1,
    this.limit = 24,
  });

  @override
  List<Object?> get props => [category, channelId, search, page, limit];
}

/// Append the next page when the user scrolls.
class LoadMoreRecordings extends RecordingsEvent {
  final String? category;
  final String? channelId;
  final String? search;
  final int limit;

  const LoadMoreRecordings({
    this.category,
    this.channelId,
    this.search,
    this.limit = 24,
  });

  @override
  List<Object?> get props => [category, channelId, search, limit];
}

/// Re-fetch the current view (pull-to-refresh).
class RefreshRecordings extends RecordingsEvent {}

/// Load featured recordings for the top strip.
class LoadFeaturedRecordings extends RecordingsEvent {
  final int limit;
  const LoadFeaturedRecordings({this.limit = 6});
  @override
  List<Object?> get props => [limit];
}

/// Load a single recording (used by the detail page).
class LoadRecordingDetails extends RecordingsEvent {
  final String recordingId;
  const LoadRecordingDetails(this.recordingId);
  @override
  List<Object?> get props => [recordingId];
}

/// Load "similar" recordings for the detail sidebar.
class LoadSimilarRecordings extends RecordingsEvent {
  final String recordingId;
  const LoadSimilarRecordings(this.recordingId);
  @override
  List<Object?> get props => [recordingId];
}

class ResetRecordings extends RecordingsEvent {}

// ============================================================
// STATES
// ============================================================

abstract class RecordingsState extends Equatable {
  const RecordingsState();

  @override
  List<Object?> get props => [];
}

class RecordingsInitial extends RecordingsState {}

class RecordingsLoading extends RecordingsState {
  final List<RecordingModel> previous;
  const RecordingsLoading({this.previous = const []});
  @override
  List<Object?> get props => [previous];
}

class RecordingsLoaded extends RecordingsState {
  final List<RecordingModel> recordings;
  final List<RecordingModel> featured;
  final String? category;
  final String? channelId;
  final String? search;
  final int page;
  final int totalPages;
  final int total;
  final bool isLoadingMore;
  final bool isRefreshing;

  const RecordingsLoaded({
    required this.recordings,
    this.featured = const [],
    this.category,
    this.channelId,
    this.search,
    required this.page,
    required this.totalPages,
    required this.total,
    this.isLoadingMore = false,
    this.isRefreshing = false,
  });

  bool get hasMore => page < totalPages;

  RecordingsLoaded copyWith({
    List<RecordingModel>? recordings,
    List<RecordingModel>? featured,
    String? category,
    String? channelId,
    String? search,
    int? page,
    int? totalPages,
    int? total,
    bool? isLoadingMore,
    bool? isRefreshing,
  }) {
    return RecordingsLoaded(
      recordings: recordings ?? this.recordings,
      featured: featured ?? this.featured,
      category: category ?? this.category,
      channelId: channelId ?? this.channelId,
      search: search ?? this.search,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props => [
        recordings,
        featured,
        category,
        channelId,
        search,
        page,
        totalPages,
        total,
        isLoadingMore,
        isRefreshing,
      ];
}

class RecordingDetailsLoaded extends RecordingsState {
  final RecordingModel recording;
  final List<RecordingModel> similar;
  final bool isLoadingSimilar;

  const RecordingDetailsLoaded({
    required this.recording,
    this.similar = const [],
    this.isLoadingSimilar = false,
  });

  RecordingDetailsLoaded copyWith({
    RecordingModel? recording,
    List<RecordingModel>? similar,
    bool? isLoadingSimilar,
  }) {
    return RecordingDetailsLoaded(
      recording: recording ?? this.recording,
      similar: similar ?? this.similar,
      isLoadingSimilar: isLoadingSimilar ?? this.isLoadingSimilar,
    );
  }

  @override
  List<Object?> get props => [recording, similar, isLoadingSimilar];
}

class RecordingsError extends RecordingsState {
  final String message;
  const RecordingsError(this.message);
  @override
  List<Object?> get props => [message];
}

// ============================================================
// BLOC
// ============================================================

class RecordingsBloc extends Bloc<RecordingsEvent, RecordingsState> {
  final ProgramsRepository _repository;

  // Most-recent query envelope — needed for LoadMoreRecordings and
  // RefreshRecordings without forcing the caller to resend it.
  String? _lastCategory;
  String? _lastChannelId;
  String? _lastSearch;
  int _lastLimit = 24;

  RecordingsBloc({required ProgramsRepository repository})
      : _repository = repository,
        super(RecordingsInitial()) {
    on<LoadRecordings>(_onLoad);
    on<LoadMoreRecordings>(_onLoadMore);
    on<RefreshRecordings>(_onRefresh);
    on<LoadFeaturedRecordings>(_onLoadFeatured);
    on<LoadRecordingDetails>(_onLoadDetails);
    on<LoadSimilarRecordings>(_onLoadSimilar);
    on<ResetRecordings>(_onReset);
  }

  Future<void> _onLoad(
    LoadRecordings event,
    Emitter<RecordingsState> emit,
  ) async {
    _lastCategory = event.category;
    _lastChannelId = event.channelId;
    _lastSearch = event.search;
    _lastLimit = event.limit;

    final previous = state is RecordingsLoaded
        ? (state as RecordingsLoaded).recordings
        : <RecordingModel>[];

    emit(RecordingsLoading(previous: previous));

    try {
      final page = await _repository.getRecordings(
        category: event.category,
        channelId: event.channelId,
        search: event.search,
        page: event.page,
        limit: event.limit,
      );
      final featured = await _fetchFeatured(event.limit);

      emit(RecordingsLoaded(
        recordings: page.items,
        featured: featured,
        category: event.category,
        channelId: event.channelId,
        search: event.search,
        page: page.page,
        totalPages: page.totalPages,
        total: page.total,
      ));
    } catch (e) {
      emit(RecordingsError(e.toString()));
    }
  }

  Future<void> _onLoadMore(
    LoadMoreRecordings event,
    Emitter<RecordingsState> emit,
  ) async {
    final current = state;
    if (current is! RecordingsLoaded || !current.hasMore || current.isLoadingMore) {
      return;
    }

    emit(current.copyWith(isLoadingMore: true));

    try {
      final page = await _repository.getRecordings(
        category: event.category ?? _lastCategory,
        channelId: event.channelId ?? _lastChannelId,
        search: event.search ?? _lastSearch,
        page: current.page + 1,
        limit: event.limit,
      );

      emit(current.copyWith(
        recordings: [...current.recordings, ...page.items],
        page: page.page,
        totalPages: page.totalPages,
        total: page.total,
        isLoadingMore: false,
      ));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  Future<void> _onRefresh(
    RefreshRecordings event,
    Emitter<RecordingsState> emit,
  ) async {
    final current = state;
    if (current is RecordingsLoaded) {
      emit(current.copyWith(isRefreshing: true));
      try {
        final featured = await _fetchFeatured(_lastLimit);
        final page = await _repository.getRecordings(
          category: current.category,
          channelId: current.channelId,
          search: current.search,
          page: 1,
          limit: _lastLimit,
        );

        emit(RecordingsLoaded(
          recordings: page.items,
          featured: featured,
          category: current.category,
          channelId: current.channelId,
          search: current.search,
          page: page.page,
          totalPages: page.totalPages,
          total: page.total,
        ));
      } catch (e) {
        emit(RecordingsError(e.toString()));
      }
    } else {
      add(LoadRecordings(
        category: _lastCategory,
        channelId: _lastChannelId,
        search: _lastSearch,
        page: 1,
        limit: _lastLimit,
      ));
    }
  }

  Future<List<RecordingModel>> _fetchFeatured(int limit) async {
    try {
      final page = await _repository.getRecordings(
        isFeatured: true,
        page: 1,
        limit: limit,
      );
      return page.items;
    } catch (_) {
      return const [];
    }
  }

  Future<void> _onLoadFeatured(
    LoadFeaturedRecordings event,
    Emitter<RecordingsState> emit,
  ) async {
    final current = state;
    if (current is! RecordingsLoaded) return;
    final featured = await _fetchFeatured(event.limit);
    emit(current.copyWith(featured: featured));
  }

  Future<void> _onLoadDetails(
    LoadRecordingDetails event,
    Emitter<RecordingsState> emit,
  ) async {
    emit(RecordingsLoading(previous: const []));
    try {
      final recording = await _repository.getRecordingById(event.recordingId);
      emit(RecordingDetailsLoaded(recording: recording));
      // Pre-load similar recordings so the sidebar is ready when the
      // first frame renders.
      add(LoadSimilarRecordings(event.recordingId));
    } catch (e) {
      emit(RecordingsError(e.toString()));
    }
  }

  Future<void> _onLoadSimilar(
    LoadSimilarRecordings event,
    Emitter<RecordingsState> emit,
  ) async {
    final current = state;
    if (current is RecordingDetailsLoaded &&
        current.recording.id == event.recordingId) {
      emit(current.copyWith(isLoadingSimilar: true));
    }
    try {
      final similar =
          await _repository.getSimilarRecordings(event.recordingId);
      final cur = state;
      if (cur is RecordingDetailsLoaded) {
        emit(cur.copyWith(similar: similar, isLoadingSimilar: false));
      } else {
        emit(RecordingDetailsLoaded(
          recording: RecordingModel(
            id: event.recordingId,
            title: '',
            contentSource: 'EXTERNAL',
            duration: 0,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            channelId: '',
            publishedAt: DateTime.now(),
          ),
          similar: similar,
        ));
      }
    } catch (_) {
      if (state is RecordingDetailsLoaded) {
        emit((state as RecordingDetailsLoaded)
            .copyWith(isLoadingSimilar: false));
      }
    }
  }

  void _onReset(ResetRecordings event, Emitter<RecordingsState> emit) {
    _lastCategory = null;
    _lastChannelId = null;
    _lastSearch = null;
    _lastLimit = 24;
    emit(RecordingsInitial());
  }
}
