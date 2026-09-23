// OmniCast - EPG BLoC

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../data/repositories/programs_repository.dart';
import '../../../data/models/program_model.dart';

// Events
abstract class EpgEvent extends Equatable {
  const EpgEvent();

  @override
  List<Object?> get props => [];
}

class LoadEpgSchedule extends EpgEvent {
  final DateTime date;
  final String? channelId;

  const LoadEpgSchedule({
    required this.date,
    this.channelId,
  });

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

// States
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

  const EpgLoaded({
    required this.selectedDate,
    this.selectedChannelId,
    required this.events,
    required this.timeSlots,
  });

  @override
  List<Object?> get props => [selectedDate, selectedChannelId, events, timeSlots];
}

class EpgError extends EpgState {
  final String message;

  const EpgError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class EpgBloc extends Bloc<EpgEvent, EpgState> {
  final ProgramsRepository _programsRepository;

  EpgBloc({required ProgramsRepository programsRepository})
      : _programsRepository = programsRepository,
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

      emit(EpgLoaded(
        selectedDate: event.date,
        selectedChannelId: event.channelId,
        events: events,
        timeSlots: timeSlots,
      ));
    } catch (e) {
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
    return List.generate(24, (index) => '${index.toString().padLeft(2, '0')}:00');
  }
}
