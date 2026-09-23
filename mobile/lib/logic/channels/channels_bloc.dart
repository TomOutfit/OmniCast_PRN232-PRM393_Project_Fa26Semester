// OmniCast - Channels BLoC

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../../data/repositories/channels_repository.dart';
import '../../../data/models/channel_model.dart';

// Events
abstract class ChannelsEvent extends Equatable {
  const ChannelsEvent();

  @override
  List<Object?> get props => [];
}

class LoadChannels extends ChannelsEvent {
  final String? category;
  final bool refresh;
  final bool isFeatured;

  const LoadChannels({this.category, this.refresh = false, this.isFeatured = false});

  @override
  List<Object?> get props => [category, refresh, isFeatured];
}

class LoadChannelDetails extends ChannelsEvent {
  final String channelId;

  const LoadChannelDetails(this.channelId);

  @override
  List<Object?> get props => [channelId];
}

class SearchChannels extends ChannelsEvent {
  final String query;

  const SearchChannels(this.query);

  @override
  List<Object?> get props => [query];
}

class FollowChannel extends ChannelsEvent {
  final String channelId;

  const FollowChannel(this.channelId);

  @override
  List<Object?> get props => [channelId];
}

// States
abstract class ChannelsState extends Equatable {
  const ChannelsState();

  @override
  List<Object?> get props => [];
}

class ChannelsInitial extends ChannelsState {}

class ChannelsLoading extends ChannelsState {}

class ChannelsLoaded extends ChannelsState {
  final List<ChannelModel> channels;
  final String? selectedCategory;

  const ChannelsLoaded({
    required this.channels,
    this.selectedCategory,
  });

  @override
  List<Object?> get props => [channels, selectedCategory];
}

class ChannelDetailsLoaded extends ChannelsState {
  final ChannelModel channel;

  const ChannelDetailsLoaded(this.channel);

  @override
  List<Object?> get props => [channel];
}

class ChannelsError extends ChannelsState {
  final String message;

  const ChannelsError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class ChannelsBloc extends Bloc<ChannelsEvent, ChannelsState> {
  final ChannelsRepository _channelsRepository;

  ChannelsBloc({required ChannelsRepository channelsRepository})
      : _channelsRepository = channelsRepository,
        super(ChannelsInitial()) {
    on<LoadChannels>(_onLoadChannels);
    on<LoadChannelDetails>(_onLoadChannelDetails);
    on<SearchChannels>(_onSearchChannels);
    on<FollowChannel>(_onFollowChannel);
  }

  Future<void> _onLoadChannels(
    LoadChannels event,
    Emitter<ChannelsState> emit,
  ) async {
    emit(ChannelsLoading());
    try {
      final channels = await _channelsRepository.getChannels(
        category: event.category,
      );
      emit(ChannelsLoaded(
        channels: channels,
        selectedCategory: event.category,
      ));
    } catch (e) {
      emit(ChannelsError(e.toString()));
    }
  }

  Future<void> _onLoadChannelDetails(
    LoadChannelDetails event,
    Emitter<ChannelsState> emit,
  ) async {
    emit(ChannelsLoading());
    try {
      final channel = await _channelsRepository.getChannelById(event.channelId);
      emit(ChannelDetailsLoaded(channel));
    } catch (e) {
      emit(ChannelsError(e.toString()));
    }
  }

  Future<void> _onSearchChannels(
    SearchChannels event,
    Emitter<ChannelsState> emit,
  ) async {
    emit(ChannelsLoading());
    try {
      final channels = await _channelsRepository.searchChannels(event.query);
      emit(ChannelsLoaded(channels: channels));
    } catch (e) {
      emit(ChannelsError(e.toString()));
    }
  }

  Future<void> _onFollowChannel(
    FollowChannel event,
    Emitter<ChannelsState> emit,
  ) async {
    try {
      await _channelsRepository.followChannel(event.channelId);
      // Reload channels after following
      add(const LoadChannels());
    } catch (e) {
      emit(ChannelsError(e.toString()));
    }
  }
}
