// OmniCast - Programs BLoC

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../data/repositories/programs_repository.dart';
import '../../../data/models/program_model.dart';

// Events
abstract class ProgramsEvent extends Equatable {
  const ProgramsEvent();

  @override
  List<Object?> get props => [];
}

class LoadPrograms extends ProgramsEvent {
  final String? channelId;
  final String? category;

  const LoadPrograms({this.channelId, this.category});

  @override
  List<Object?> get props => [channelId, category];
}

class LoadLiveNow extends ProgramsEvent {}

class LoadProgramDetails extends ProgramsEvent {
  final String programId;

  const LoadProgramDetails(this.programId);

  @override
  List<Object?> get props => [programId];
}

// States
abstract class ProgramsState extends Equatable {
  const ProgramsState();

  @override
  List<Object?> get props => [];
}

class ProgramsInitial extends ProgramsState {}

class ProgramsLoading extends ProgramsState {}

class ProgramsLoaded extends ProgramsState {
  final List<LiveEventModel> programs;
  final bool isLiveNow;

  const ProgramsLoaded({
    required this.programs,
    this.isLiveNow = false,
  });

  @override
  List<Object?> get props => [programs, isLiveNow];
}

class ProgramDetailsLoaded extends ProgramsState {
  final LiveEventModel program;

  const ProgramDetailsLoaded(this.program);

  @override
  List<Object?> get props => [program];
}

class ProgramsError extends ProgramsState {
  final String message;

  const ProgramsError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class ProgramsBloc extends Bloc<ProgramsEvent, ProgramsState> {
  final ProgramsRepository _programsRepository;

  ProgramsBloc({required ProgramsRepository programsRepository})
      : _programsRepository = programsRepository,
        super(ProgramsInitial()) {
    on<LoadPrograms>(_onLoadPrograms);
    on<LoadLiveNow>(_onLoadLiveNow);
    on<LoadProgramDetails>(_onLoadProgramDetails);
  }

  Future<void> _onLoadPrograms(
    LoadPrograms event,
    Emitter<ProgramsState> emit,
  ) async {
    emit(ProgramsLoading());
    try {
      final programs = await _programsRepository.getPrograms(
        channelId: event.channelId,
        category: event.category,
      );
      emit(ProgramsLoaded(programs: programs));
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
      emit(ProgramsLoaded(programs: liveEvents, isLiveNow: true));
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
}
