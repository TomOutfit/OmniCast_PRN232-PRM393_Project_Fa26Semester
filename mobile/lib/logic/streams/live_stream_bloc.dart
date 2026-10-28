// ============================================================
// OmniCast - LiveStream BLoC
// ============================================================
//
// BLoC for real-time live streaming notifications.
// Connects to the WebSocket gateway and listens for:
//   - live:started   → when Admin starts streaming
//   - live:stopped   → when Admin stops streaming
//   - live:viewerCount → periodic viewer count update
//
// Usage:
//   BlocProvider(
//     create: (_) => LiveStreamBloc(channelSlug),
//     child: LiveStreamBuilder(...),
//   );
//
// ============================================================

import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// ── Events ────────────────────────────────────────────────────────────────────

abstract class LiveStreamEvent extends Equatable {
  const LiveStreamEvent();

  @override
  List<Object?> get props => [];
}

class LiveStreamConnect extends LiveStreamEvent {
  final String channelSlug;

  const LiveStreamConnect(this.channelSlug);

  @override
  List<Object?> get props => [channelSlug];
}

class LiveStreamDisconnect extends LiveStreamEvent {
  const LiveStreamDisconnect();
}

class LiveStreamReconnect extends LiveStreamEvent {
  const LiveStreamReconnect();
}

/// Emitted when Admin starts a live stream
class LiveStarted extends LiveStreamEvent {
  final String eventId;
  final String title;
  final String streamUrl;
  final String? hlsUrl;
  final String? thumbnailUrl;
  final DateTime startedAt;

  const LiveStarted({
    required this.eventId,
    required this.title,
    required this.streamUrl,
    this.hlsUrl,
    this.thumbnailUrl,
    required this.startedAt,
  });

  @override
  List<Object?> get props => [eventId, title, streamUrl, hlsUrl, thumbnailUrl, startedAt];
}

/// Emitted when Admin stops a live stream
class LiveStopped extends LiveStreamEvent {
  final String eventId;
  final DateTime stoppedAt;

  const LiveStopped({ required this.eventId, required this.stoppedAt });

  @override
  List<Object?> get props => [eventId, stoppedAt];
}

/// Emitted periodically with viewer count
class ViewerCountUpdated extends LiveStreamEvent {
  final String channelSlug;
  final int viewerCount;

  const ViewerCountUpdated({
    required this.channelSlug,
    required this.viewerCount,
  });

  @override
  List<Object?> get props => [channelSlug, viewerCount];
}

/// Socket connection state changed
class ConnectionStateChanged extends LiveStreamEvent {
  final bool isConnected;

  const ConnectionStateChanged(this.isConnected);

  @override
  List<Object?> get props => [isConnected];
}

/// Socket error occurred
class SocketErrorOccurred extends LiveStreamEvent {
  final String message;

  const SocketErrorOccurred(this.message);

  @override
  List<Object?> get props => [message];
}

// ── State ──────────────────────────────────────────────────────────────────────

class LiveStreamState extends Equatable {
  final bool isConnected;
  final bool isLive;
  final String? eventId;
  final String? liveTitle;
  final String? streamUrl;
  final String? hlsUrl;
  final String? thumbnailUrl;
  final DateTime? liveStartedAt;
  final int viewerCount;
  final String? errorMessage;
  final String? subscribedChannel;

  const LiveStreamState({
    this.isConnected = false,
    this.isLive = false,
    this.eventId,
    this.liveTitle,
    this.streamUrl,
    this.hlsUrl,
    this.thumbnailUrl,
    this.liveStartedAt,
    this.viewerCount = 0,
    this.errorMessage,
    this.subscribedChannel,
  });

  LiveStreamState copyWith({
    bool? isConnected,
    bool? isLive,
    String? eventId,
    String? liveTitle,
    String? streamUrl,
    String? hlsUrl,
    String? thumbnailUrl,
    DateTime? liveStartedAt,
    int? viewerCount,
    String? errorMessage,
    String? subscribedChannel,
    bool clearLive = false,
    bool clearError = false,
  }) {
    return LiveStreamState(
      isConnected: isConnected ?? this.isConnected,
      isLive: clearLive ? false : (isLive ?? this.isLive),
      eventId: clearLive ? null : (eventId ?? this.eventId),
      liveTitle: clearLive ? null : (liveTitle ?? this.liveTitle),
      streamUrl: clearLive ? null : (streamUrl ?? this.streamUrl),
      hlsUrl: clearLive ? null : (hlsUrl ?? this.hlsUrl),
      thumbnailUrl: clearLive ? null : (thumbnailUrl ?? this.thumbnailUrl),
      liveStartedAt: clearLive ? null : (liveStartedAt ?? this.liveStartedAt),
      viewerCount: viewerCount ?? this.viewerCount,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      subscribedChannel: subscribedChannel ?? this.subscribedChannel,
    );
  }

  @override
  List<Object?> get props => [
        isConnected,
        isLive,
        eventId,
        liveTitle,
        streamUrl,
        hlsUrl,
        thumbnailUrl,
        liveStartedAt,
        viewerCount,
        errorMessage,
        subscribedChannel,
      ];
}

// ── BLoC ─────────────────────────────────────────────────────────────────────

class LiveStreamBloc extends Bloc<LiveStreamEvent, LiveStreamState> {
  io.Socket? _socket;
  String? _currentChannelSlug;

  // API URL for WebSocket connection
  static const String _defaultApiUrl = 'http://localhost:3000';

  LiveStreamBloc({String? channelSlug}) : super(const LiveStreamState()) {
    on<LiveStreamConnect>(_onConnect);
    on<LiveStreamDisconnect>(_onDisconnect);
    on<LiveStreamReconnect>(_onReconnect);
    on<LiveStarted>(_onLiveStarted);
    on<LiveStopped>(_onLiveStopped);
    on<ViewerCountUpdated>(_onViewerCountUpdated);
    on<ConnectionStateChanged>(_onConnectionStateChanged);
    on<SocketErrorOccurred>(_onSocketError);

    // Auto-connect if channel slug provided
    if (channelSlug != null && channelSlug.isNotEmpty) {
      add(LiveStreamConnect(channelSlug));
    }
  }

  Future<void> _onConnect(
    LiveStreamConnect event,
    Emitter<LiveStreamState> emit,
  ) async {
    // Disconnect existing socket if any
    await _disconnectSocket();

    _currentChannelSlug = event.channelSlug;

    // Build WebSocket URL
    const apiUrl = _defaultApiUrl; // In production, get from config
    final wsUrl = apiUrl.replaceAll(RegExp(r'^http'), 'ws');

    _socket = io.io(
      '$wsUrl/live',
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .setTimeout(20000)
          .build(),
    );

    // Connection events
    _socket!.onConnect((_) {
      add(const ConnectionStateChanged(true));

      // Subscribe to channel room
      if (_currentChannelSlug != null) {
        _socket!.emit('subscribe:channel', _currentChannelSlug);
      }
    });

    _socket!.onDisconnect((_) {
      add(const ConnectionStateChanged(false));
    });

    _socket!.onConnectError((data) {
      add(SocketErrorOccurred('Connection error: $data'));
    });

    // Channel subscription confirmation
    _socket!.on('subscribed', (data) {
      // ignore
    });

    // Live streaming events
    _socket!.on('live:started', (data) {
      if (data is Map<String, dynamic>) {
        add(LiveStarted(
          eventId: data['eventId'] as String? ?? '',
          title: data['title'] as String? ?? 'Live Stream',
          streamUrl: data['streamUrl'] as String? ?? '',
          hlsUrl: data['hlsUrl'] as String?,
          thumbnailUrl: data['thumbnailUrl'] as String?,
          startedAt: data['startedAt'] != null
              ? DateTime.tryParse(data['startedAt'] as String) ?? DateTime.now()
              : DateTime.now(),
        ));
      }
    });

    _socket!.on('live:stopped', (data) {
      String eventId = '';
      if (data is Map<String, dynamic>) {
        eventId = data['eventId'] as String? ?? '';
      }
      add(LiveStopped(
        eventId: eventId,
        stoppedAt: DateTime.now(),
      ));
    });

    _socket!.on('live:viewerCount', (data) {
      if (data is Map<String, dynamic>) {
        add(ViewerCountUpdated(
          channelSlug: data['channelSlug'] as String? ?? '',
          viewerCount: data['viewerCount'] as int? ?? 0,
        ));
      }
    });

    _socket!.on('pong', (data) {
      // ignore heartbeat response
    });

    // Connect
    _socket!.connect();
  }

  Future<void> _onDisconnect(
    LiveStreamDisconnect event,
    Emitter<LiveStreamState> emit,
  ) async {
    await _disconnectSocket();
    emit(state.copyWith(
      isConnected: false,
      subscribedChannel: null,
    ));
  }

  Future<void> _onReconnect(
    LiveStreamReconnect event,
    Emitter<LiveStreamState> emit,
  ) async {
    if (_currentChannelSlug != null) {
      add(LiveStreamConnect(_currentChannelSlug!));
    }
  }

  void _onLiveStarted(
    LiveStarted event,
    Emitter<LiveStreamState> emit,
  ) {
    emit(state.copyWith(
      isLive: true,
      eventId: event.eventId,
      liveTitle: event.title,
      streamUrl: event.streamUrl,
      hlsUrl: event.hlsUrl,
      thumbnailUrl: event.thumbnailUrl,
      liveStartedAt: event.startedAt,
    ));
  }

  void _onLiveStopped(
    LiveStopped event,
    Emitter<LiveStreamState> emit,
  ) {
    emit(state.copyWith(clearLive: true));
  }

  void _onViewerCountUpdated(
    ViewerCountUpdated event,
    Emitter<LiveStreamState> emit,
  ) {
    emit(state.copyWith(viewerCount: event.viewerCount));
  }

  void _onConnectionStateChanged(
    ConnectionStateChanged event,
    Emitter<LiveStreamState> emit,
  ) {
    emit(state.copyWith(
      isConnected: event.isConnected,
      subscribedChannel: event.isConnected ? _currentChannelSlug : null,
      clearError: true,
    ));
  }

  void _onSocketError(
    SocketErrorOccurred event,
    Emitter<LiveStreamState> emit,
  ) {
    emit(state.copyWith(errorMessage: event.message));
  }

  Future<void> _disconnectSocket() async {
    if (_socket != null) {
      // Unsubscribe from channel
      if (_currentChannelSlug != null) {
        _socket!.emit('unsubscribe:channel', _currentChannelSlug);
      }

      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
  }

  @override
  Future<void> close() async {
    await _disconnectSocket();
    return super.close();
  }
}

// ── Convenience Widgets ────────────────────────────────────────────────────────

/// Simple BLoC builder for live status
class LiveStreamBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, LiveStreamState state) builder;

  const LiveStreamBuilder({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<LiveStreamBloc, LiveStreamState>(
      builder: (context, state) => builder(context, state),
    );
  }
}
