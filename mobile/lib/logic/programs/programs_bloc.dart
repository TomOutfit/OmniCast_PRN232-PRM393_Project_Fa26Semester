// OmniCast - Programs BLoC
//
// Drives all program-list & program-detail screens. Supports:
//   * Live-now carousel
//   * Category browse with infinite scroll
//   * Channel program list
//   * Recordings (VOD) list with category filter
//   * Program detail loading
//   * Continue-watching
//   * Similar recordings

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../data/repositories/programs_repository.dart';
import '../../data/models/program_model.dart';
import '../../data/models/recording_model.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class ProgramsEvent extends Equatable {
  const ProgramsEvent();

  @override
  List<Object?> get props => [];
}

/// Refresh a category-browse page (first page, replaces state).
class LoadProgramsByCategory extends ProgramsEvent {
  final String category;
  final String? channelId;
  final int page;
  final int limit;

  const LoadProgramsByCategory({
    required this.category,
    this.channelId,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [category, channelId, page, limit];
}

/// Load the next page for an existing category list (appends).
class LoadMoreProgramsByCategory extends ProgramsEvent {
  final String category;
  final int limit;

  const LoadMoreProgramsByCategory({
    required this.category,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [category, limit];
}

/// Refresh list of live-now programs.
class LoadLiveNow extends ProgramsEvent {}

/// Generic programs loader (legacy / fallback).
class LoadPrograms extends ProgramsEvent {
  final String? channelId;
  final String? category;

  const LoadPrograms({this.channelId, this.category});

  @override
  List<Object?> get props => [channelId, category];
}

class LoadProgramDetails extends ProgramsEvent {
  final String programId;

  const LoadProgramDetails(this.programId);

  @override
  List<Object?> get props => [programId];
}

class LoadChannelPrograms extends ProgramsEvent {
  final String channelId;

  const LoadChannelPrograms(this.channelId);

  @override
  List<Object?> get props => [channelId];
}

class LoadRecordingsByCategory extends ProgramsEvent {
  final String category;
  final String? channelId;
  final int page;
  final int limit;

  const LoadRecordingsByCategory({
    required this.category,
    this.channelId,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [category, channelId, page, limit];
}

class LoadMoreRecordingsByCategory extends ProgramsEvent {
  final String category;
  final int limit;

  const LoadMoreRecordingsByCategory({
    required this.category,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [category, limit];
}

class LoadSimilarRecordings extends ProgramsEvent {
  final String recordingId;

  const LoadSimilarRecordings(this.recordingId);

  @override
  List<Object?> get props => [recordingId];
}

class LoadContinueWatching extends ProgramsEvent {}

// ============================================================
// STATES
// ============================================================

abstract class ProgramsState extends Equatable {
  const ProgramsState();

  @override
  List<Object?> get props => [];
}

class ProgramsInitial extends ProgramsState {}

class ProgramsLoading extends ProgramsState {}

/// General purpose programs list (used by `LoadPrograms`).
class ProgramsLoaded extends ProgramsState {
  final List<LiveEventModel> programs;
  final List<LiveEventModel> liveEvents;
  final bool isLiveNow;

  const ProgramsLoaded({
    required this.programs,
    this.liveEvents = const [],
    this.isLiveNow = false,
  });

  @override
  List<Object?> get props => [programs, liveEvents, isLiveNow];
}

/// State used by category-browse list screen — supports pagination.
class ProgramsCategoryLoaded extends ProgramsState {
  final String category;
  final List<LiveEventModel> programs;
  final int page;
  final int totalPages;
  final bool isLoadingMore;
  final bool isRefreshing;

  const ProgramsCategoryLoaded({
    required this.category,
    required this.programs,
    required this.page,
    required this.totalPages,
    this.isLoadingMore = false,
    this.isRefreshing = false,
  });

  bool get hasMore => page < totalPages;

  ProgramsCategoryLoaded copyWith({
    List<LiveEventModel>? programs,
    int? page,
    int? totalPages,
    bool? isLoadingMore,
    bool? isRefreshing,
  }) {
    return ProgramsCategoryLoaded(
      category: category,
      programs: programs ?? this.programs,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props =>
      [category, programs, page, totalPages, isLoadingMore, isRefreshing];
}

class ProgramDetailsLoaded extends ProgramsState {
  final LiveEventModel program;

  const ProgramDetailsLoaded(this.program);

  @override
  List<Object?> get props => [program];
}

/// VOD (recording) list state with pagination.
class RecordingsCategoryLoaded extends ProgramsState {
  final String category;
  final List<RecordingModel> recordings;
  final int page;
  final int totalPages;
  final bool isLoadingMore;
  final bool isRefreshing;

  const RecordingsCategoryLoaded({
    required this.category,
    required this.recordings,
    required this.page,
    required this.totalPages,
    this.isLoadingMore = false,
    this.isRefreshing = false,
  });

  bool get hasMore => page < totalPages;

  RecordingsCategoryLoaded copyWith({
    List<RecordingModel>? recordings,
    int? page,
    int? totalPages,
    bool? isLoadingMore,
    bool? isRefreshing,
  }) {
    return RecordingsCategoryLoaded(
      category: category,
      recordings: recordings ?? this.recordings,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props =>
      [category, recordings, page, totalPages, isLoadingMore, isRefreshing];
}

class SimilarRecordingsLoaded extends ProgramsState {
  final List<RecordingModel> recordings;

  const SimilarRecordingsLoaded(this.recordings);

  @override
  List<Object?> get props => [recordings];
}

class ContinueWatchingLoaded extends ProgramsState {
  final List<RecordingModel> items;

  const ContinueWatchingLoaded(this.items);

  @override
  List<Object?> get props => [items];
}

class ProgramsError extends ProgramsState {
  final String message;

  const ProgramsError(this.message);

  @override
  List<Object?> get props => [message];
}

// ============================================================
// BLOC
// ============================================================

class ProgramsBloc extends Bloc<ProgramsEvent, ProgramsState> {
  final ProgramsRepository _programsRepository;

  /// Read-only access for UI screens that need to fire one-off calls
  /// outside the BLoC's normal event flow (e.g. bump a view counter
  /// when the user opens the page).
  ProgramsRepository get repository => _programsRepository;

  ProgramsBloc({required ProgramsRepository programsRepository})
      : _programsRepository = programsRepository,
        super(ProgramsInitial()) {
    on<LoadPrograms>(_onLoadPrograms);
    on<LoadLiveNow>(_onLoadLiveNow);
    on<LoadProgramDetails>(_onLoadProgramDetails);
    on<LoadChannelPrograms>(_onLoadChannelPrograms);

    on<LoadProgramsByCategory>(_onLoadProgramsByCategory);
    on<LoadMoreProgramsByCategory>(_onLoadMoreProgramsByCategory);

    on<LoadRecordingsByCategory>(_onLoadRecordingsByCategory);
    on<LoadMoreRecordingsByCategory>(_onLoadMoreRecordingsByCategory);

    on<LoadSimilarRecordings>(_onLoadSimilarRecordings);
    on<LoadContinueWatching>(_onLoadContinueWatching);
  }

  Future<void> _onLoadPrograms(
    LoadPrograms event,
    Emitter<ProgramsState> emit,
  ) async {
    emit(ProgramsLoading());
    try {
      final page = await _programsRepository.getPrograms(
        channelId: event.channelId,
        category: event.category,
      );
      emit(ProgramsLoaded(programs: page.items));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadLiveNow(
    LoadLiveNow event,
    Emitter<ProgramsState> emit,
  ) async {
    emit(ProgramsLoading());
    try {
      final liveEvents = await _programsRepository.getLiveNow();
      final todaySchedule = await _programsRepository.getEpgSchedule(date: DateTime.now());
      emit(ProgramsLoaded(
        programs: liveEvents,
        liveEvents: todaySchedule,
        isLiveNow: true,
      ));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadProgramDetails(
    LoadProgramDetails event,
    Emitter<ProgramsState> emit,
  ) async {
    emit(ProgramsLoading());
    try {
      final program = await _programsRepository.getProgramById(event.programId);
      emit(ProgramDetailsLoaded(program));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadChannelPrograms(
    LoadChannelPrograms event,
    Emitter<ProgramsState> emit,
  ) async {
    emit(ProgramsLoading());
    try {
      final page = await _programsRepository.getPrograms(
        channelId: event.channelId,
        limit: 50,
      );
      final filtered = page.items
          .where((p) => p.isLive || p.isScheduled)
          .toList();
      emit(ProgramsLoaded(
        programs: page.items,
        liveEvents: filtered,
        isLiveNow: filtered.any((p) => p.isLive),
      ));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadProgramsByCategory(
    LoadProgramsByCategory event,
    Emitter<ProgramsState> emit,
  ) async {
    // Preserve current state if already loaded this category (for pull-to-refresh).
    final current = state;
    if (current is ProgramsCategoryLoaded && current.category == event.category) {
      emit(current.copyWith(isRefreshing: true));
    } else {
      emit(ProgramsLoading());
    }

    try {
      final page = await _programsRepository.getPrograms(
        category: event.category,
        channelId: event.channelId,
        page: event.page,
        limit: event.limit,
      );
      emit(ProgramsCategoryLoaded(
        category: event.category,
        programs: page.items,
        page: page.page,
        totalPages: page.totalPages,
      ));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadMoreProgramsByCategory(
    LoadMoreProgramsByCategory event,
    Emitter<ProgramsState> emit,
  ) async {
    final current = state;
    if (current is! ProgramsCategoryLoaded ||
        current.category != event.category ||
        !current.hasMore ||
        current.isLoadingMore) {
      return;
    }

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final page = await _programsRepository.getPrograms(
        category: event.category,
        page: nextPage,
        limit: event.limit,
      );
      emit(ProgramsCategoryLoaded(
        category: event.category,
        programs: [...current.programs, ...page.items],
        page: page.page,
        totalPages: page.totalPages,
      ));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadRecordingsByCategory(
    LoadRecordingsByCategory event,
    Emitter<ProgramsState> emit,
  ) async {
    final current = state;
    if (current is RecordingsCategoryLoaded &&
        current.category == event.category) {
      emit(current.copyWith(isRefreshing: true));
    } else {
      emit(ProgramsLoading());
    }

    try {
      final page = await _programsRepository.getRecordings(
        category: event.category,
        channelId: event.channelId,
        page: event.page,
        limit: event.limit,
      );
      emit(RecordingsCategoryLoaded(
        category: event.category,
        recordings: page.items,
        page: page.page,
        totalPages: page.totalPages,
      ));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadMoreRecordingsByCategory(
    LoadMoreRecordingsByCategory event,
    Emitter<ProgramsState> emit,
  ) async {
    final current = state;
    if (current is! RecordingsCategoryLoaded ||
        current.category != event.category ||
        !current.hasMore ||
        current.isLoadingMore) {
      return;
    }

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final page = await _programsRepository.getRecordings(
        category: event.category,
        page: nextPage,
        limit: event.limit,
      );
      emit(RecordingsCategoryLoaded(
        category: event.category,
        recordings: [...current.recordings, ...page.items],
        page: page.page,
        totalPages: page.totalPages,
      ));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadSimilarRecordings(
    LoadSimilarRecordings event,
    Emitter<ProgramsState> emit,
  ) async {
    try {
      final similar =
          await _programsRepository.getSimilarRecordings(event.recordingId);
      emit(SimilarRecordingsLoaded(similar));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }

  Future<void> _onLoadContinueWatching(
    LoadContinueWatching event,
    Emitter<ProgramsState> emit,
  ) async {
    emit(ProgramsLoading());
    try {
      final page = await _programsRepository.getContinueWatching();
      emit(ContinueWatchingLoaded(page.items));
    } catch (e) {
      emit(ProgramsError(e.toString()));
    }
  }
}