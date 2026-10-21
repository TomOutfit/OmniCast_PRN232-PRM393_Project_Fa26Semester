// ============================================================
// OmniCast - Live Session Cubit
// ============================================================
// Manages the state of an active live event session:
//   - Join Lobby (pre-roll confirmation card)
//   - Active live stream viewing & playback state
//   - 2-way real-time chat (live:chat:new / live:chat)
//   - Live reaction ticker (live:reaction:new / live:reaction)
//   - Pinned broadcaster messages (broadcaster:message)
//   - Realtime viewer count sync (live:viewerCount)
// ============================================================

import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/network/dio_client.dart';
import '../../core/di/injection.dart';
import '../../data/services/live_socket_service.dart';

enum LiveSessionStage {
  initial,
  lobby,
  watching,
  ended,
  error,
}

class LiveSessionState extends Equatable {
  final LiveSessionStage stage;
  final String eventId;
  final String title;
  final String? description;
  final String? streamUrl;
  final String? thumbnailUrl;
  final String? channelName;
  final String? channelSlug;
  final String? channelLogoUrl;
  final int viewerCount;
  final List<Map<String, dynamic>> comments;
  final Map<String, int> reactionCounts;
  final String? latestReactionType;
  final Map<String, dynamic>? broadcasterAnnouncement;
  final String? errorMessage;
  final bool isSubmitting;

  const LiveSessionState({
    this.stage = LiveSessionStage.initial,
    this.eventId = '',
    this.title = '',
    this.description,
    this.streamUrl,
    this.thumbnailUrl,
    this.channelName,
    this.channelSlug,
    this.channelLogoUrl,
    this.viewerCount = 0,
    this.comments = const [],
    this.reactionCounts = const {},
    this.latestReactionType,
    this.broadcasterAnnouncement,
    this.errorMessage,
    this.isSubmitting = false,
  });

  LiveSessionState copyWith({
    LiveSessionStage? stage,
    String? eventId,
    String? title,
    String? description,
    String? streamUrl,
    String? thumbnailUrl,
    String? channelName,
    String? channelSlug,
    String? channelLogoUrl,
    int? viewerCount,
    List<Map<String, dynamic>>? comments,
    Map<String, int>? reactionCounts,
    String? latestReactionType,
    Map<String, dynamic>? broadcasterAnnouncement,
    bool clearAnnouncement = false,
    String? errorMessage,
    bool? isSubmitting,
  }) {
    return LiveSessionState(
      stage: stage ?? this.stage,
      eventId: eventId ?? this.eventId,
      title: title ?? this.title,
      description: description ?? this.description,
      streamUrl: streamUrl ?? this.streamUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      channelName: channelName ?? this.channelName,
      channelSlug: channelSlug ?? this.channelSlug,
      channelLogoUrl: channelLogoUrl ?? this.channelLogoUrl,
      viewerCount: viewerCount ?? this.viewerCount,
      comments: comments ?? this.comments,
      reactionCounts: reactionCounts ?? this.reactionCounts,
      latestReactionType: latestReactionType ?? this.latestReactionType,
      broadcasterAnnouncement: clearAnnouncement
          ? null
          : (broadcasterAnnouncement ?? this.broadcasterAnnouncement),
      errorMessage: errorMessage ?? this.errorMessage,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }

  @override
  List<Object?> get props => [
        stage,
        eventId,
        title,
        description,
        streamUrl,
        thumbnailUrl,
        channelName,
        channelSlug,
        channelLogoUrl,
        viewerCount,
        comments,
        reactionCounts,
        latestReactionType,
        broadcasterAnnouncement,
        errorMessage,
        isSubmitting,
      ];
}

class LiveSessionCubit extends Cubit<LiveSessionState> {
  final LiveSocketService _socketService;
  final DioClient _dioClient;

  StreamSubscription? _chatSub;
  StreamSubscription? _reactionSub;
  StreamSubscription? _broadcasterSub;
  StreamSubscription? _deletedSub;
  StreamSubscription? _viewerSub;
  StreamSubscription? _stoppedSub;

  LiveSessionCubit({
    LiveSocketService? socketService,
    DioClient? dioClient,
  })  : _socketService = socketService ?? LiveSocketService.instance,
        _dioClient = dioClient ?? getIt<DioClient>(),
        super(const LiveSessionState());

  /// Step 1: Open Join Lobby for the live event
  Future<void> openLobby(String eventId) async {
    emit(state.copyWith(stage: LiveSessionStage.initial, eventId: eventId));

    try {
      // Connect socket early so it's ready
      await _socketService.connect();

      // Fetch snapshot from backend
      final res = await _dioClient.get<Map<String, dynamic>>(
        '/programs/studio/events/$eventId/interaction',
      );

      final data = res.data;
      if (data != null) {
        final channel = data['channel'] as Map<String, dynamic>?;
        final rawComments = (data['comments'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        final rawReactions = (data['reactions'] as Map<String, dynamic>?)?.map(
              (k, v) => MapEntry(k, (v as num).toInt()),
            ) ??
            {};

        emit(state.copyWith(
          stage: LiveSessionStage.lobby,
          eventId: eventId,
          title: data['title']?.toString() ?? 'Chương trình phát sóng',
          description: data['description']?.toString(),
          streamUrl: data['streamUrl']?.toString(),
          thumbnailUrl: data['thumbnailUrl']?.toString(),
          channelName: channel?['name']?.toString() ?? 'OmniCast Live',
          channelSlug: channel?['slug']?.toString() ?? 'live',
          channelLogoUrl: channel?['logoUrl']?.toString(),
          viewerCount: (data['viewerCount'] as num?)?.toInt() ?? 0,
          comments: rawComments,
          reactionCounts: rawReactions,
        ));
      } else {
        emit(state.copyWith(stage: LiveSessionStage.lobby, eventId: eventId));
      }
    } catch (e) {
      // If interaction API is unavailable, still permit joining lobby
      emit(state.copyWith(
        stage: LiveSessionStage.lobby,
        eventId: eventId,
        errorMessage: 'Đang kết nối luồng trực tiếp...',
      ));
    }
  }

  /// Step 2: Viewer confirms entering the live stream ("VÀO XEM")
  void enterLive() {
    if (state.eventId.isEmpty) return;

    // Transition to watching
    emit(state.copyWith(stage: LiveSessionStage.watching));

    // Subscribe to event room in Socket.IO
    _socketService.subscribeEvent(state.eventId);

    // Cancel old subs
    _cancelSubscriptions();

    // Wire up real-time stream listeners
    _chatSub = _socketService.onChatNew.listen((payload) {
      if (payload['eventId'] == state.eventId) {
        final comment = payload['comment'] as Map<String, dynamic>?;
        if (comment != null) {
          final updated = List<Map<String, dynamic>>.from(state.comments);
          // Insert newest at beginning for reverse listview or end
          updated.insert(0, comment);
          emit(state.copyWith(comments: updated));
        }
      }
    });

    _reactionSub = _socketService.onReactionNew.listen((payload) {
      if (payload['eventId'] == state.eventId) {
        final type = payload['type']?.toString();
        final rawCounts = payload['counts'] as Map<String, dynamic>?;
        Map<String, int> counts = Map.from(state.reactionCounts);
        if (rawCounts != null) {
          counts = rawCounts.map((k, v) => MapEntry(k, (v as num).toInt()));
        } else if (type != null) {
          counts[type] = (counts[type] ?? 0) + 1;
        }
        emit(state.copyWith(
          reactionCounts: counts,
          latestReactionType: type,
        ));
      }
    });

    _broadcasterSub = _socketService.onBroadcasterMessage.listen((payload) {
      if (payload['eventId'] == state.eventId) {
        emit(state.copyWith(broadcasterAnnouncement: payload));
      }
    });

    _deletedSub = _socketService.onChatDeleted.listen((payload) {
      if (payload['eventId'] == state.eventId) {
        final commentId = payload['commentId']?.toString();
        if (commentId != null) {
          final updated = state.comments
              .where((c) => c['id']?.toString() != commentId)
              .toList();
          emit(state.copyWith(comments: updated));
        }
      }
    });

    _viewerSub = _socketService.onViewerCount.listen((count) {
      emit(state.copyWith(viewerCount: count));
    });

    _stoppedSub = _socketService.onLiveStopped.listen((payload) {
      if (payload['eventId'] == state.eventId) {
        emit(state.copyWith(stage: LiveSessionStage.ended));
      }
    });
  }

  /// Post a chat comment
  void sendChat(String content) {
    if (content.trim().isEmpty || state.eventId.isEmpty) return;
    _socketService.sendChat(
      eventId: state.eventId,
      content: content.trim(),
    );
  }

  /// Send a reaction
  void sendReaction(String type) {
    if (state.eventId.isEmpty) return;
    _socketService.sendReaction(
      eventId: state.eventId,
      type: type,
    );
  }

  /// Dismiss the broadcaster announcement banner
  void dismissAnnouncement() {
    emit(state.copyWith(clearAnnouncement: true));
  }

  /// Broadcaster: post announcement
  void broadcastMessage(String message) {
    if (message.trim().isEmpty || state.eventId.isEmpty) return;
    _socketService.sendBroadcasterMessage(
      eventId: state.eventId,
      message: message.trim(),
    );
  }

  /// Broadcaster/Moderator: delete comment
  void deleteComment(String commentId) {
    if (state.eventId.isEmpty) return;
    _socketService.deleteChat(
      eventId: state.eventId,
      commentId: commentId,
    );
  }

  /// Leave the live stream
  void leaveLive() {
    if (state.eventId.isNotEmpty) {
      _socketService.unsubscribeEvent(state.eventId);
    }
    _cancelSubscriptions();
    emit(const LiveSessionState());
  }

  void _cancelSubscriptions() {
    _chatSub?.cancel();
    _reactionSub?.cancel();
    _broadcasterSub?.cancel();
    _deletedSub?.cancel();
    _viewerSub?.cancel();
    _stoppedSub?.cancel();
  }

  @override
  Future<void> close() {
    leaveLive();
    return super.close();
  }
}
