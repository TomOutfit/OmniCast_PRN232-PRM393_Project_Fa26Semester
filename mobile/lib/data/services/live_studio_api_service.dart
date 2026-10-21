// ============================================================
// OmniCast - Live Studio API Service
// ============================================================
//
// Mobile API service for Studio Live features.
// Handles push-to-live notifications from mobile to backend.
//
// Features:
//   - Notify backend when starting/stopping live stream
//   - Get active live streams for viewer UI
//   - WebSocket connection management for real-time updates
// ============================================================

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

/// Response from the backend when starting a live stream
class PushToLiveResponse {
  final bool success;
  final String eventId;
  final String channelSlug;
  final String hlsUrl;
  final String webrtcUrl;
  final String message;

  PushToLiveResponse({
    required this.success,
    required this.eventId,
    required this.channelSlug,
    required this.hlsUrl,
    required this.webrtcUrl,
    required this.message,
  });

  factory PushToLiveResponse.fromJson(Map<String, dynamic> json) {
    return PushToLiveResponse(
      success: json['success'] ?? false,
      eventId: json['eventId'] ?? '',
      channelSlug: json['channelSlug'] ?? '',
      hlsUrl: json['hlsUrl'] ?? '',
      webrtcUrl: json['webrtcUrl'] ?? '',
      message: json['message'] ?? '',
    );
  }
}

/// Active live stream info
class ActiveLiveStream {
  final String eventId;
  final String title;
  final String description;
  final String? thumbnailUrl;
  final String streamUrl;
  final String hlsUrl;
  final DateTime? startedAt;
  final int? duration;
  final String channelId;
  final String channelSlug;
  final String channelName;
  final String? channelLogoUrl;

  ActiveLiveStream({
    required this.eventId,
    required this.title,
    this.description = '',
    this.thumbnailUrl,
    required this.streamUrl,
    required this.hlsUrl,
    this.startedAt,
    this.duration,
    required this.channelId,
    required this.channelSlug,
    required this.channelName,
    this.channelLogoUrl,
  });

  factory ActiveLiveStream.fromJson(Map<String, dynamic> json) {
    final channel = json['channel'] as Map<String, dynamic>? ?? {};
    return ActiveLiveStream(
      eventId: json['eventId'] ?? '',
      title: json['title'] ?? 'Live Stream',
      description: json['description'] ?? '',
      thumbnailUrl: json['thumbnailUrl'],
      streamUrl: json['streamUrl'] ?? '',
      hlsUrl: json['hlsUrl'] ?? '',
      startedAt: json['startedAt'] != null 
          ? DateTime.tryParse(json['startedAt']) 
          : null,
      duration: json['duration'],
      channelId: channel['id'] ?? '',
      channelSlug: channel['slug'] ?? '',
      channelName: channel['name'] ?? 'Channel',
      channelLogoUrl: channel['logoUrl'],
    );
  }
}

/// Stream URL response for a channel
class StreamUrlResponse {
  final bool isLive;
  final String type;
  final String? streamUrl;
  final String? eventId;
  final String? title;
  final String? thumbnailUrl;
  final DateTime? startedAt;
  final int viewerCount;
  final String? message;

  StreamUrlResponse({
    required this.isLive,
    required this.type,
    this.streamUrl,
    this.eventId,
    this.title,
    this.thumbnailUrl,
    this.startedAt,
    this.viewerCount = 0,
    this.message,
  });

  factory StreamUrlResponse.fromJson(Map<String, dynamic> json) {
    return StreamUrlResponse(
      isLive: json['isLive'] ?? false,
      type: json['type'] ?? 'vod',
      streamUrl: json['streamUrl'],
      eventId: json['eventId'],
      title: json['title'],
      thumbnailUrl: json['thumbnailUrl'],
      startedAt: json['startedAt'] != null 
          ? DateTime.tryParse(json['startedAt']) 
          : null,
      viewerCount: json['viewerCount'] ?? 0,
      message: json['message'],
    );
  }
}

/// Main API Service for Studio Live features
class LiveStudioApiService {
  final Dio _dio;
  final String _baseUrl;
  
  // Socket.IO for real-time updates
  io.Socket? _socket;
  bool _isConnected = false;
  
  // Stream controllers for real-time events
  final _liveStartedController = StreamController<ActiveLiveStream>.broadcast();
  final _liveStoppedController = StreamController<String>.broadcast(); // eventId
  final _viewerCountController = StreamController<int>.broadcast();
  final _connectionStatusController = StreamController<bool>.broadcast();

  /// Stream of live started events
  Stream<ActiveLiveStream> get onLiveStarted => _liveStartedController.stream;
  
  /// Stream of live stopped events (eventId)
  Stream<String> get onLiveStopped => _liveStoppedController.stream;
  
  /// Stream of viewer count updates
  Stream<int> get onViewerCountUpdated => _viewerCountController.stream;
  
  /// Stream of WebSocket connection status
  Stream<bool> get onConnectionStatusChanged => _connectionStatusController.stream;
  
  /// Current connection status
  bool get isConnected => _isConnected;

  LiveStudioApiService({
    required String baseUrl,
    Dio? dio,
  })  : _baseUrl = baseUrl,
        _dio = dio ?? Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {
            'Content-Type': 'application/json',
          },
        ));

  /// Set auth token for authenticated requests
  void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  // ============================================================
  // HTTP API Methods
  // ============================================================

  /**
   * Notify backend that mobile is starting a live stream.
   * Backend will broadcast to all connected viewers.
   */
  Future<PushToLiveResponse?> pushToLive({
    required String channelSlug,
    required String title,
    required String streamKey,
    String? thumbnailUrl,
  }) async {
    try {
      final response = await _dio.post(
        '/programs/studio/live/mobile/start',
        data: {
          'channelSlug': channelSlug,
          'title': title,
          'streamKey': streamKey,
          'thumbnailUrl': thumbnailUrl,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return PushToLiveResponse.fromJson(response.data);
      }
      
      debugPrint('[LiveStudioApi] pushToLive failed: ${response.statusCode}');
      return null;
    } on DioException catch (e) {
      debugPrint('[LiveStudioApi] pushToLive error: ${e.message}');
      return null;
    }
  }

  /**
   * Notify backend that mobile is stopping the live stream.
   * Backend will broadcast to all connected viewers.
   */
  Future<bool> stopLive({
    required String channelSlug,
    String? eventId,
  }) async {
    try {
      final response = await _dio.post(
        '/programs/studio/live/mobile/stop',
        data: {
          'channelSlug': channelSlug,
          'eventId': eventId,
        },
      );

      return response.statusCode == 200;
    } on DioException catch (e) {
      debugPrint('[LiveStudioApi] stopLive error: ${e.message}');
      return false;
    }
  }

  /**
   * Get all currently active live streams.
   * Used by viewer app to show "LIVE NOW" indicators.
   */
  Future<List<ActiveLiveStream>> getActiveLiveStreams() async {
    try {
      final response = await _dio.get('/programs/studio/live/active');

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final streams = (data['streams'] as List?) ?? [];
        return streams
            .map((s) => ActiveLiveStream.fromJson(s))
            .toList();
      }
      
      return [];
    } on DioException catch (e) {
      debugPrint('[LiveStudioApi] getActiveLiveStreams error: ${e.message}');
      return [];
    }
  }

  /**
   * Get stream URL for a specific channel.
   * Returns live URL if channel is live, null otherwise.
   */
  Future<StreamUrlResponse?> getStreamUrl(String channelSlug) async {
    try {
      final response = await _dio.get(
        '/programs/studio/stream-url/$channelSlug',
      );

      if (response.statusCode == 200) {
        return StreamUrlResponse.fromJson(response.data);
      }
      
      return null;
    } on DioException catch (e) {
      debugPrint('[LiveStudioApi] getStreamUrl error: ${e.message}');
      return null;
    }
  }

  // ============================================================
  // Socket.IO Methods for Real-time Updates
  // ============================================================

  /**
   * Connect to Socket.IO for real-time live stream updates.
   * Listens for:
   *   - live:started - when a live stream begins
   *   - live:stopped - when a live stream ends
   *   - live:viewerCount - periodic viewer count updates
   */
  Future<bool> connectSocketIO({
    String? token,
    String? channelSlug,
  }) async {
    try {
      // Build Socket.IO URL
      final socketUrl = _baseUrl
          .replaceFirst('http://', 'http://')
          .replaceFirst('https://', 'https://')
          .replaceFirst('/api', '');

      debugPrint('[LiveStudioApi] Connecting to Socket.IO: $socketUrl/live');

      // Create Socket.IO connection
      _socket = io.io(
        '$socketUrl/live',
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
        _isConnected = true;
        _connectionStatusController.add(true);
        debugPrint('[LiveStudioApi] Socket.IO connected');

        // Subscribe to channel if provided
        if (channelSlug != null) {
          subscribeToChannel(channelSlug);
        }
      });

      _socket!.onDisconnect((_) {
        _isConnected = false;
        _connectionStatusController.add(false);
        debugPrint('[LiveStudioApi] Socket.IO disconnected');
      });

      _socket!.onConnectError((error) {
        debugPrint('[LiveStudioApi] Socket.IO connection error: $error');
        _isConnected = false;
        _connectionStatusController.add(false);
      });

      _socket!.onError((error) {
        debugPrint('[LiveStudioApi] Socket.IO error: $error');
      });

      // Live streaming event handlers
      _socket!.on('live:started', (data) {
        debugPrint('[LiveStudioApi] live:started event received');
        if (data is Map<String, dynamic>) {
          _liveStartedController.add(ActiveLiveStream.fromJson(data));
        }
      });

      _socket!.on('live:stopped', (data) {
        debugPrint('[LiveStudioApi] live:stopped event received');
        if (data is Map<String, dynamic>) {
          _liveStoppedController.add(data['eventId'] ?? '');
        }
      });

      _socket!.on('live:viewerCount', (data) {
        debugPrint('[LiveStudioApi] live:viewerCount event received');
        if (data is Map<String, dynamic>) {
          _viewerCountController.add(data['viewerCount'] ?? 0);
        }
      });

      _socket!.on('subscribed', (data) {
        debugPrint('[LiveStudioApi] Subscribed: $data');
      });

      _socket!.on('pong', (data) {
        // Heartbeat response - connection is alive
      });

      // Connect
      _socket!.connect();

      return true;
    } catch (e) {
      debugPrint('[LiveStudioApi] Socket.IO connection error: $e');
      return false;
    }
  }

  /**
   * Disconnect from Socket.IO.
   */
  void disconnectSocketIO() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _connectionStatusController.add(false);
  }

  /**
   * Subscribe to a specific channel for live updates.
   */
  void subscribeToChannel(String channelSlug) {
    if (_socket != null && _isConnected) {
      _socket!.emit('subscribe:channel', channelSlug);
    }
  }

  /**
   * Unsubscribe from a channel.
   */
  void unsubscribeFromChannel(String channelSlug) {
    if (_socket != null && _isConnected) {
      _socket!.emit('unsubscribe:channel', channelSlug);
    }
  }

  /**
   * Send heartbeat ping to keep connection alive.
   */
  void sendPing() {
    if (_isConnected) {
      _socket?.emit('ping', {'timestamp': DateTime.now().millisecondsSinceEpoch});
    }
  }

  // ============================================================
  // Cleanup
  // ============================================================

  /**
   * Dispose all resources and close streams.
   */
  void dispose() {
    disconnectSocketIO();
    _liveStartedController.close();
    _liveStoppedController.close();
    _viewerCountController.close();
    _connectionStatusController.close();
  }
}
