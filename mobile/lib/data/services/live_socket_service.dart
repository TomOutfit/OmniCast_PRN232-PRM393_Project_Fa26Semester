// ============================================================
// OmniCast - Live Stream Socket.IO Service
// ============================================================
// Real-time two-way interaction client for live streams:
//   - Chat messaging (viewer ↔ broadcaster)
//   - Live reaction streaming
//   - Realtime viewer count updates
//   - Broadcaster announcements
//   - Moderation (chat delete)
// ============================================================

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../../core/constants/app_constants.dart';
import '../../core/utils/token_storage_helper.dart';

class LiveSocketService {
  static final LiveSocketService _instance = LiveSocketService._internal();
  factory LiveSocketService() => _instance;
  static LiveSocketService get instance => _instance;

  LiveSocketService._internal();

  IO.Socket? _socket;
  String? _currentEventId;
  String? _currentChannelSlug;
  bool _isConnected = false;

  bool get isConnected => _isConnected;
  String? get currentEventId => _currentEventId;

  // Stream controllers for realtime events
  final _chatController = StreamController<Map<String, dynamic>>.broadcast();
  final _reactionController = StreamController<Map<String, dynamic>>.broadcast();
  final _broadcasterMsgController = StreamController<Map<String, dynamic>>.broadcast();
  final _chatDeletedController = StreamController<Map<String, dynamic>>.broadcast();
  final _viewerCountController = StreamController<int>.broadcast();
  final _liveStartedController = StreamController<Map<String, dynamic>>.broadcast();
  final _liveStoppedController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onChatNew => _chatController.stream;
  Stream<Map<String, dynamic>> get onReactionNew => _reactionController.stream;
  Stream<Map<String, dynamic>> get onBroadcasterMessage => _broadcasterMsgController.stream;
  Stream<Map<String, dynamic>> get onChatDeleted => _chatDeletedController.stream;
  Stream<int> get onViewerCount => _viewerCountController.stream;
  Stream<Map<String, dynamic>> get onLiveStarted => _liveStartedController.stream;
  Stream<Map<String, dynamic>> get onLiveStopped => _liveStoppedController.stream;

  /// Connect to the `/live` WebSocket namespace with JWT authentication
  Future<void> connect({String? customToken}) async {
    if (_socket != null) {
      if (kDebugMode) print('[LiveSocket] Connection already initialized');
      return;
    }

    final token = customToken ?? await TokenStorageHelper().getAccessToken();
    final baseUrl = AppConstants.socketUrl;

    if (_socket != null) {
      if (kDebugMode) print('[LiveSocket] Connection already initialized');
      return;
    }

    try {
      final isVercel = baseUrl.contains('vercel.app');
      final opts = IO.OptionBuilder()
          .setTransports(isVercel ? ['polling'] : ['websocket', 'polling'])
          .enableAutoConnect();

      if (!isVercel) {
        opts.enableReconnection();
      } else {
        opts.disableReconnection();
      }

      opts
          .setReconnectionDelay(1500)
          .setReconnectionAttempts(isVercel ? 1 : 10);

      if (token != null && token.isNotEmpty) {
        opts.setAuth({'token': token});
      }

      _socket = IO.io('$baseUrl/live', opts.build());

      _socket?.onConnect((_) {
        _isConnected = true;
        if (kDebugMode) print('[LiveSocket] Connected to $baseUrl/live');

        // Re-subscribe if reconnecting
        if (_currentEventId != null) {
          subscribeEvent(_currentEventId!);
        }
        if (_currentChannelSlug != null) {
          subscribeChannel(_currentChannelSlug!);
        }
      });

      _socket?.onDisconnect((_) {
        _isConnected = false;
        if (kDebugMode) print('[LiveSocket] Disconnected');
      });

      _socket?.onConnectError((err) {
        _isConnected = false;
        if (kDebugMode) print('[LiveSocket] Connect error: $err');
      });

      // Listen for room & broadcast events
      _socket?.on('live:chat:new', (data) {
        if (data is Map) {
          _chatController.add(data.cast<String, dynamic>());
        }
      });

      _socket?.on('live:reaction:new', (data) {
        if (data is Map) {
          _reactionController.add(data.cast<String, dynamic>());
        }
      });

      _socket?.on('broadcaster:message', (data) {
        if (data is Map) {
          _broadcasterMsgController.add(data.cast<String, dynamic>());
        }
      });

      _socket?.on('chat:deleted', (data) {
        if (data is Map) {
          _chatDeletedController.add(data.cast<String, dynamic>());
        }
      });

      _socket?.on('live:viewerCount', (data) {
        if (data is Map) {
          final count = (data['viewerCount'] as num?)?.toInt() ?? 0;
          _viewerCountController.add(count);
        }
      });

      _socket?.on('live:started', (data) {
        if (data is Map) {
          _liveStartedController.add(data.cast<String, dynamic>());
        }
      });

      _socket?.on('live:stopped', (data) {
        if (data is Map) {
          _liveStoppedController.add(data.cast<String, dynamic>());
        }
      });
    } catch (e) {
      if (kDebugMode) print('[LiveSocket] Init exception: $e');
    }
  }

  /// Subscribe to a specific live event room `event:{eventId}`
  void subscribeEvent(String eventId) {
    _currentEventId = eventId;
    if (_socket != null && _isConnected) {
      _socket?.emit('subscribe:event', {'eventId': eventId});
      if (kDebugMode) print('[LiveSocket] Subscribed to event:$eventId');
    }
  }

  /// Unsubscribe from a live event room
  void unsubscribeEvent(String eventId) {
    if (_socket != null && _isConnected) {
      _socket?.emit('unsubscribe:event', {'eventId': eventId});
    }
    if (_currentEventId == eventId) {
      _currentEventId = null;
    }
  }

  /// Subscribe to a channel room `channel:{channelSlug}`
  void subscribeChannel(String channelSlug) {
    _currentChannelSlug = channelSlug;
    if (_socket != null && _isConnected) {
      _socket?.emit('subscribe:channel', channelSlug);
    }
  }

  /// Unsubscribe from a channel room
  void unsubscribeChannel(String channelSlug) {
    if (_socket != null && _isConnected) {
      _socket?.emit('unsubscribe:channel', channelSlug);
    }
    if (_currentChannelSlug == channelSlug) {
      _currentChannelSlug = null;
    }
  }

  /// Post a chat comment to the live stream
  void sendChat({
    required String eventId,
    required String content,
    String? parentId,
  }) {
    if (_socket == null || !_isConnected) return;
    _socket?.emit('live:chat', {
      'eventId': eventId,
      'content': content,
      if (parentId != null) 'parentId': parentId,
    });
  }

  /// Send a live reaction (heart, clap, thumbs up, etc.)
  void sendReaction({
    required String eventId,
    required String type,
  }) {
    if (_socket == null || !_isConnected) return;
    _socket?.emit('live:reaction', {
      'eventId': eventId,
      'type': type,
    });
  }

  /// Broadcaster: send pinned announcement to all viewers
  void sendBroadcasterMessage({
    required String eventId,
    required String message,
  }) {
    if (_socket == null || !_isConnected) return;
    _socket?.emit('broadcaster:message', {
      'eventId': eventId,
      'message': message,
    });
  }

  /// Moderator/Broadcaster: delete an inappropriate comment
  void deleteChat({
    required String eventId,
    required String commentId,
  }) {
    if (_socket == null || !_isConnected) return;
    _socket?.emit('chat:delete', {
      'eventId': eventId,
      'commentId': commentId,
    });
  }

  /// Close connection and clean up
  void disconnect() {
    if (_currentEventId != null) {
      unsubscribeEvent(_currentEventId!);
    }
    if (_currentChannelSlug != null) {
      unsubscribeChannel(_currentChannelSlug!);
    }
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
