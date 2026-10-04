// OmniCast - EPG BLoC
// Reads from SQLite cache first (instant), refreshes from cloud.

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../data/datasources/local/database_helper.dart';
import '../../../data/repositories/programs_repository.dart';
import '../../../data/models/program_model.dart';

// ============================================================
// EVENTS
// ============================================================

abstract class EpgEvent extends Equatable {
  const EpgEvent();
  @override
  List<Object?> get props => [];
}

class LoadEpgSchedule extends EpgEvent {
  final DateTime date;
  final String? channelId;
  const LoadEpgSchedule({required this.date, this.channelId});
  @override
  List<Object?> get props => [date, channelId];
}

class ChangeEpgDate extends EpgEvent {
  final DateTime date;
  const ChangeEpgDate(this.date);
  @override
  List<Object?> get props => [date];
}

class SelectEpgChannel extends EpgEvent {
  final String? channelId;
  const SelectEpgChannel(this.channelId);
  @override
  List<Object?> get props => [channelId];
}

// ============================================================
// STATES
// ============================================================

abstract class EpgState extends Equatable {
  const EpgState();
  @override
  List<Object?> get props => [];
}

class EpgInitial extends EpgState {}

class EpgLoading extends EpgState {}

class EpgLoaded extends EpgState {
  final DateTime selectedDate;
  final String? selectedChannelId;
  final List<LiveEventModel> events;
  final List<String> timeSlots;
  final bool isOfflineMode;

  /// When non-null and isOfflineMode is true, the banner shows
  /// "Dữ liệu cập nhật lúc HH:mm".
  final DateTime? lastFetchedAt;

  const EpgLoaded({
    required this.selectedDate,
    this.selectedChannelId,
    required this.events,
    required this.timeSlots,
    this.isOfflineMode = false,
    this.lastFetchedAt,
  });

  @override
  List<Object?> get props =>
      [selectedDate, selectedChannelId, events, timeSlots, isOfflineMode, lastFetchedAt];
}

class EpgError extends EpgState {
  final String message;
  const EpgError(this.message);
  @override
  List<Object?> get props => [message];
}

// ============================================================
// BLOC
// ============================================================

class EpgBloc extends Bloc<EpgEvent, EpgState> {
  final ProgramsRepository _programsRepository;
  final DatabaseHelper _db;

  EpgBloc({
    required ProgramsRepository programsRepository,
    required DatabaseHelper db,
  })  : _programsRepository = programsRepository,
        _db = db,
        super(EpgInitial()) {
    on<LoadEpgSchedule>(_onLoadEpgSchedule);
    on<ChangeEpgDate>(_onChangeEpgDate);
    on<SelectEpgChannel>(_onSelectEpgChannel);
  }

  Future<void> _onLoadEpgSchedule(
    LoadEpgSchedule event,
    Emitter<EpgState> emit,
  ) async {
    emit(EpgLoading());
    try {
      final events = await _programsRepository.getEpgSchedule(
        date: event.date,
        channelId: event.channelId,
      );
      final timeSlots = _generateTimeSlots();
      final dateKey = _ymd(event.date);
      final fetchedAt = await _db.lastEpgFetchAt(dateKey);

      emit(EpgLoaded(
        selectedDate: event.date,
        selectedChannelId: event.channelId,
        events: events,
        timeSlots: timeSlots,
        isOfflineMode: false,
        lastFetchedAt: fetchedAt,
      ));
    } catch (e) {
      // Try cache as last resort
      final dateKey = _ymd(event.date);
      final cached = await _db.getEpgCachePayload(dateKey);
      if (cached != null) {
        final list = _tryDecode(cached);
        if (list != null && list.isNotEmpty) {
          final fetchedAt = await _db.lastEpgFetchAt(dateKey);
          emit(EpgLoaded(
            selectedDate: event.date,
            selectedChannelId: event.channelId,
            events: list,
            timeSlots: _generateTimeSlots(),
            isOfflineMode: true,
            lastFetchedAt: fetchedAt,
          ));
          return;
        }
      }

      emit(EpgError(e.toString()));
    }
  }

  Future<void> _onChangeEpgDate(
    ChangeEpgDate event,
    Emitter<EpgState> emit,
  ) async {
    final currentState = state;
    if (currentState is EpgLoaded) {
      add(LoadEpgSchedule(
        date: event.date,
        channelId: currentState.selectedChannelId,
      ));
    }
  }

  Future<void> _onSelectEpgChannel(
    SelectEpgChannel event,
    Emitter<EpgState> emit,
  ) async {
    final currentState = state;
    if (currentState is EpgLoaded) {
      add(LoadEpgSchedule(
        date: currentState.selectedDate,
        channelId: event.channelId,
      ));
    }
  }

  List<String> _generateTimeSlots() {
    return List.generate(25, (index) => '${index.toString().padLeft(2, '0')}:00');
  }

  String _ymd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  List<LiveEventModel>? _tryDecode(String raw) {
    return _programsRepository.tryDecodeEpg(raw);
  }
}
