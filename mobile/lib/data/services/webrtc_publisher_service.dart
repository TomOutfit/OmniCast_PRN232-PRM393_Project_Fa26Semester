// ============================================================
// OmniCast - WebRTC Publisher Service
// ============================================================
//
// Real-time camera streaming service using WebRTC.
// Publishes camera feed to MediaMTX server for live broadcasting.
//
// Features:
//   - Hardware camera access with resolution control
//   - WebRTC peer connection to MediaMTX
//   - WHIP protocol support
//   - Real-time status callbacks
//
// Usage:
//   1. Create instance with config
//   2. Call startBroadcast() to begin streaming
//   3. Call stopBroadcast() to end streaming
// ============================================================

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:permission_handler/permission_handler.dart';

/// Broadcast mode selection
enum BroadcastMode {
  /// Push-to-Live: Real-time streaming from camera
  pushToLive,

  /// Record-then-Live: Record video first, then broadcast
  recordThenLive,
}

/// Connection state for the broadcast
enum BroadcastState {
  /// Initial state, not started
  idle,

  /// Requesting camera/microphone permissions
  requestingPermissions,

  /// Connecting to MediaMTX server
  connecting,

  /// Successfully streaming
  broadcasting,

  /// Disconnecting from server
  disconnecting,

  /// Error occurred
  error,
}

/// Configuration for the WebRTC publisher
class WebRTCPublisherConfig {
  /// MediaMTX server WebRTC URL
  final String serverUrl;

  /// Stream key (channel identifier)
  final String streamKey;

  /// Video constraints
  final VideoConstraints videoConstraints;

  /// Audio constraints
  final AudioConstraints audioConstraints;

  /// Enable verbose logging
  final bool debug;

  const WebRTCPublisherConfig({
    required this.serverUrl,
    required this.streamKey,
    this.videoConstraints = const VideoConstraints(),
    this.audioConstraints = const AudioConstraints(),
    this.debug = false,
  });
}

/// Video constraints configuration
class VideoConstraints {
  final int width;
  final int height;
  final int frameRate;

  const VideoConstraints({
    this.width = 1280,
    this.height = 720,
    this.frameRate = 30,
  });

  Map<String, dynamic> toMediaConstraints() {
    return {
      'mandatory': {
        'minWidth': width.toString(),
        'minHeight': height.toString(),
        'minFrameRate': frameRate.toString(),
      },
      'facingMode': 'user',
    };
  }
}

/// Audio constraints configuration
class AudioConstraints {
  final bool autoGainControl;
  final bool echoCancellation;
  final bool noiseSuppression;

  const AudioConstraints({
    this.autoGainControl = true,
    this.echoCancellation = true,
    this.noiseSuppression = true,
  });

  Map<String, dynamic> toMediaConstraints() {
    return {
      'autoGainControl': autoGainControl,
      'echoCancellation': echoCancellation,
      'noiseSuppression': noiseSuppression,
    };
  }
}

/// Main WebRTC Publisher Service
class WebRTCPublisherService {
  WebRTCPublisherConfig? _config;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  RTCSessionDescription? _localDescription;
  bool _isBroadcasting = false;

  // Callbacks
  Function(BroadcastState state)? onStateChanged;
  Function(String error)? onError;
  Function(bool isLive)? onBroadcastStatusChanged;

  BroadcastState _state = BroadcastState.idle;

  /// Current broadcast state
  BroadcastState get state => _state;

  /// Whether currently broadcasting
  bool get isBroadcasting => _isBroadcasting;

  /// Local video stream for preview
  MediaStream? get localStream => _localStream;

  // ============================================================
  // Public API
  // ============================================================

  /// Configure the publisher with server settings
  void configure(WebRTCPublisherConfig config) {
    _config = config;
  }

  /// Start broadcasting from camera
  Future<bool> startBroadcast() async {
    if (_config == null) {
      _updateState(BroadcastState.error);
      onError?.call('Publisher not configured. Call configure() first.');
      return false;
    }

    if (_isBroadcasting) {
      debugPrint('[WebRTCPublisher] Already broadcasting');
      return true;
    }

    try {
      _updateState(BroadcastState.requestingPermissions);

      // Request camera and microphone permissions
      final cameraStatus = await Permission.camera.request();
      final micStatus = await Permission.microphone.request();

      if (!cameraStatus.isGranted) {
        _updateState(BroadcastState.error);
        onError?.call('Camera permission denied');
        return false;
      }

      if (!micStatus.isGranted) {
        _updateState(BroadcastState.error);
        onError?.call('Microphone permission denied');
        return false;
      }

      _updateState(BroadcastState.connecting);

      // Get camera stream
      _localStream = await _getUserMedia();

      if (_localStream == null) {
        _updateState(BroadcastState.error);
        onError?.call('Failed to get camera stream');
        return false;
      }

      // Create WebRTC peer connection
      final success = await _createPeerConnection();

      if (!success) {
        _updateState(BroadcastState.error);
        return false;
      }

      // Create and set local description
      final offer = await _peerConnection!.createOffer({
        'mandatory': {
          'OfferToReceiveAudio': false,
          'OfferToReceiveVideo': false,
        },
      });

      await _peerConnection!.setLocalDescription(offer);

      // Send offer to MediaMTX via WHIP protocol
      final answerSdp = await _sendWhipOffer(offer.sdp!);

      if (answerSdp == null) {
        _updateState(BroadcastState.error);
        onError?.call('Failed to get answer from server');
        return false;
      }

      // Set remote description (answer from server)
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(answerSdp, 'answer'),
      );

      _isBroadcasting = true;
      _updateState(BroadcastState.broadcasting);
      onBroadcastStatusChanged?.call(true);

      debugPrint('[WebRTCPublisher] Broadcasting started: ${_config!.streamKey}');

      return true;
    } catch (e) {
      debugPrint('[WebRTCPublisher] Error starting broadcast: $e');
      _updateState(BroadcastState.error);
      onError?.call('Broadcast error: $e');
      return false;
    }
  }

  /// Stop broadcasting
  Future<void> stopBroadcast() async {
    if (!_isBroadcasting && _state != BroadcastState.connecting) {
      return;
    }

    _updateState(BroadcastState.disconnecting);

    try {
      // Send DELETE to WHIP endpoint to stop stream
      await _sendWhipDelete();

      // Clean up
      await _cleanup();

      _isBroadcasting = false;
      _updateState(BroadcastState.idle);
      onBroadcastStatusChanged?.call(false);

      debugPrint('[WebRTCPublisher] Broadcasting stopped');
    } catch (e) {
      debugPrint('[WebRTCPublisher] Error stopping broadcast: $e');
      await _cleanup();
      _isBroadcasting = false;
      _updateState(BroadcastState.error);
    }
  }

  /// Switch between front and back camera
  Future<void> switchCamera() async {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isEmpty) return;

    final currentFacingMode = videoTracks.first.getConstraints()['facingMode'];
    final newFacingMode = currentFacingMode == 'user' ? 'environment' : 'user';

    // Stop current track
    videoTracks.first.stop();

    // Get new stream with opposite camera
    final newStream = await navigator.mediaDevices.getUserMedia({
      'video': {'facingMode': newFacingMode},
      'audio': false,
    });

    // Replace track
    final newVideoTrack = newStream.getVideoTracks().first;
    await _peerConnection?.replaceTrack(videoTracks.first, newVideoTrack);

    // Update local stream
    _localStream!.removeTrack(videoTracks.first);
    _localStream!.addTrack(newVideoTrack);
  }

  /// Toggle torch/flashlight
  Future<void> toggleTorch(bool enabled) async {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isEmpty) return;

    try {
      await videoTracks.first.setFlash(enabled);
    } catch (e) {
      debugPrint('[WebRTCPublisher] Torch not supported: $e');
    }
  }

  /// Dispose all resources
  Future<void> dispose() async {
    await stopBroadcast();
    await _cleanup();
  }

  // ============================================================
  // Private Methods
  // ============================================================

  Future<MediaStream?> _getUserMedia() async {
    if (_config == null) return null;

    try {
      final stream = await navigator.mediaDevices.getUserMedia({
        'video': _config!.videoConstraints.toMediaConstraints(),
        'audio': _config!.audioConstraints.toMediaConstraints(),
      });
      return stream;
    } catch (e) {
      debugPrint('[WebRTCPublisher] Error getting user media: $e');
      return null;
    }
  }

  Future<bool> _createPeerConnection() async {
    if (_config == null) return false;

    final config = RTCConfiguration();
    config.sdpSemantics = SdpSemantics.UnifiedPlan;
    config.iceServers = [
      RTCIceServer(
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
        ],
      ),
    ];

    _peerConnection = await createPeerConnection(config);

    // Add local tracks to peer connection
    if (_localStream != null) {
      for (final track in _localStream!.getTracks()) {
        await _peerConnection!.addTrack(track, _localStream!);
      }
    }

    // Listen for ICE connection state changes
    _peerConnection!.onIceConnectionState = (state) {
      debugPrint('[WebRTCPublisher] ICE connection state: $state');

      if (state == RTCIceConnectionState.RTCIceConnectionStateFailed) {
        onError?.call('ICE connection failed');
        _updateState(BroadcastState.error);
      }
    };

    // Listen for signaling state changes
    _peerConnection!.onSignalingState = (state) {
      debugPrint('[WebRTCPublisher] Signaling state: $state');
    };

    return true;
  }

  Future<String?> _sendWhipOffer(String offerSdp) async {
    if (_config == null) return null;

    try {
      // WHIP endpoint URL
      final whipUrl = '${_config!.serverUrl}/${_config!.streamKey}';

      debugPrint('[WebRTCPublisher] Sending WHIP offer to: $whipUrl');

      // For MediaMTX, we need to use a custom HTTP request since
      // flutter_webrtc doesn't have native WHIP support
      // This is a simplified implementation - in production, you might
      // need to handle HTTPS and authentication

      final response = await _httpPost(
        whipUrl,
        offerSdp,
        {'Content-Type': 'application/sdp'},
      );

      if (response != null) {
        debugPrint('[WebRTCPublisher] Received WHIP answer');
        return response;
      }

      // Fallback: If WHIP is not supported, try direct WebRTC
      // This would require MediaMTX to have WebRTC enabled
      debugPrint('[WebRTCPublisher] WHIP not supported, using fallback');
      return _createFallbackAnswer(offerSdp);
    } catch (e) {
      debugPrint('[WebRTCPublisher] WHIP request failed: $e');
      return _createFallbackAnswer(offerSdp);
    }
  }

  Future<String?> _sendWhipDelete() async {
    if (_config == null) return null;

    try {
      final whipUrl = '${_config!.serverUrl}/${_config!.streamKey}';

      await _httpDelete(whipUrl);

      debugPrint('[WebRTCPublisher] Sent WHIP DELETE');
    } catch (e) {
      debugPrint('[WebRTCPublisher] WHIP DELETE failed: $e');
    }
  }

  /// Fallback answer creation for when WHIP is not available
  /// This creates a basic SDP answer that allows the connection to proceed
  Future<String?> _createFallbackAnswer(String offerSdp) async {
    // Parse the offer to understand the media
    // In a real implementation, you would generate a proper answer
    // For now, return null to indicate we couldn't establish connection
    debugPrint('[WebRTCPublisher] Using fallback mode - connection may not work');
    return null;
  }

  Future<String?> _httpPost(
    String url,
    String body,
    Map<String, String> headers,
  ) async {
    // Using dio for HTTP requests
    try {
      // Simple HTTP POST implementation
      final uri = Uri.parse(url);
      final client = HttpClient();

      final request = await client.postUrl(uri);
      headers.forEach((key, value) {
        request.headers.set(key, value);
      });

      request.write(body);
      final response = await request.close();

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseBody = await response.transform(utf8.decoder).join();
        client.close();
        return responseBody;
      }

      client.close();
      return null;
    } catch (e) {
      debugPrint('[WebRTCPublisher] HTTP POST error: $e');
      return null;
    }
  }

  Future<void> _httpDelete(String url) async {
    try {
      final uri = Uri.parse(url);
      final client = HttpClient();

      final request = await client.deleteUrl(uri);
      request.headers.set('Content-Type', 'application/sdp');

      await request.close();
      client.close();
    } catch (e) {
      debugPrint('[WebRTCPublisher] HTTP DELETE error: $e');
    }
  }

  void _updateState(BroadcastState newState) {
    _state = newState;
    onStateChanged?.call(newState);
  }

  Future<void> _cleanup() async {
    // Remove tracks from peer connection
    if (_localStream != null) {
      for (final track in _localStream!.getTracks()) {
        track.stop();
      }
    }

    // Close peer connection
    await _peerConnection?.close();
    _peerConnection = null;

    // Dispose local stream
    await _localStream?.dispose();
    _localStream = null;

    _localDescription = null;
  }
}

/// Import for HttpClient
import 'dart:io';
