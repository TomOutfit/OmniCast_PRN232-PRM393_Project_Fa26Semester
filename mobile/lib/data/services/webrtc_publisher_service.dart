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
import 'dart:io';

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

  /// Access token for MediaMTX publish authorization.
  final String? authToken;

  /// Short-lived ICE/TURN servers returned by the backend.
  final List<Map<String, dynamic>> iceServers;

  /// Video constraints
  final VideoConstraints videoConstraints;

  /// Audio constraints
  final AudioConstraints audioConstraints;

  /// Enable verbose logging
  final bool debug;

  const WebRTCPublisherConfig({
    required this.serverUrl,
    required this.streamKey,
    this.authToken,
    this.iceServers = const [],
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
  final String facingMode;

  const VideoConstraints({
    this.width = 1280,
    this.height = 720,
    this.frameRate = 30,
    this.facingMode = 'user',
  });

  Map<String, dynamic> toMediaConstraints() {
    return {
      'mandatory': {
        'minWidth': '640',
        'maxWidth': width.toString(),
        'minHeight': '360',
        'maxHeight': height.toString(),
        'minFrameRate': '15',
        'maxFrameRate': frameRate.toString(),
      },
      'facingMode': facingMode,
      'optional': [],
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
  Completer<bool>? _iceConnectedCompleter;
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

  /// Local WebRTC video renderer for camera preview
  RTCVideoRenderer? _localRenderer;
  RTCVideoRenderer? get localRenderer => _localRenderer;

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

      // Initialize local renderer for live preview
      try {
        _localRenderer ??= RTCVideoRenderer();
        await _localRenderer!.initialize();
        _localRenderer!.srcObject = _localStream;
      } catch (renderErr) {
        debugPrint('[WebRTCPublisher] Could not initialize local preview renderer: $renderErr');
      }

      // Create WebRTC peer connection
      final success = await _createPeerConnection();

      if (!success) {
        throw StateError('Could not create a WebRTC peer connection.');
      }

      // Create and set local description
      final offer = await _peerConnection!.createOffer({
        'mandatory': {
          'OfferToReceiveAudio': false,
          'OfferToReceiveVideo': false,
        },
      });

      // Prioritize H264 codec in SDP so MediaMTX can remux to HLS for viewers
      final rawSdp = offer.sdp ?? '';
      final modifiedSdp = _preferH264InSdp(rawSdp);
      final modifiedOffer = RTCSessionDescription(modifiedSdp, offer.type);

      await _peerConnection!.setLocalDescription(modifiedOffer);
      await _waitForIceGathering();
      final gatheredOffer =
          (await _peerConnection!.getLocalDescription()) ?? modifiedOffer;

      // Send offer to MediaMTX via WHIP protocol
      final answerSdp = await _sendWhipOffer(gatheredOffer.sdp ?? modifiedSdp);

      if (answerSdp == null || answerSdp.trim().isEmpty) {
        throw StateError('Không nhận được phản hồi SDP từ máy chủ MediaMTX WHIP.');
      }

      // Set remote description (answer from server)
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(answerSdp, 'answer'),
      );

      // Once MediaMTX returns HTTP 201 with answer SDP, the WHIP session is created.
      // Wait up to 10s for ICE connected confirmation, proceeding gracefully if already transmitting
      await _iceConnectedCompleter!.future.timeout(
        const Duration(seconds: 10),
        onTimeout: () => true,
      );

      _isBroadcasting = true;
      _updateState(BroadcastState.broadcasting);
      onBroadcastStatusChanged?.call(true);

      debugPrint(
          '[WebRTCPublisher] Broadcasting started: ${_config!.streamKey}');

      return true;
    } catch (e) {
      debugPrint('[WebRTCPublisher] Error starting broadcast: $e');
      await _cleanup();
      _iceConnectedCompleter = null;
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

    try {
      await Helper.switchCamera(videoTracks.first);
    } catch (e) {
      debugPrint('[WebRTCPublisher] Error switching camera: $e');
    }
  }

  /// Toggle torch/flashlight
  Future<void> toggleTorch(bool enabled) async {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isEmpty) return;

    try {
      final track = videoTracks.first;
      if (await track.hasTorch()) {
        await track.setTorch(enabled);
      }
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

    final configuration = <String, dynamic>{
      'sdpSemantics': 'unified-plan',
      'iceServers': _config!.iceServers.isNotEmpty
          ? _config!.iceServers
          : [
              {
                'urls': [
                  'stun:stun.l.google.com:19302',
                  'stun:stun1.l.google.com:19302',
                ],
              },
            ],
    };

    _peerConnection = await createPeerConnection(configuration);
    _iceConnectedCompleter = Completer<bool>();

    // Add local tracks to peer connection
    if (_localStream != null) {
      for (final track in _localStream!.getTracks()) {
        await _peerConnection!.addTrack(track, _localStream!);
      }
    }

    // Listen for ICE connection state changes
    _peerConnection!.onIceConnectionState = (state) {
      debugPrint('[WebRTCPublisher] ICE connection state: $state');

      if (state == RTCIceConnectionState.RTCIceConnectionStateConnected ||
          state == RTCIceConnectionState.RTCIceConnectionStateCompleted) {
        if (!(_iceConnectedCompleter?.isCompleted ?? true)) {
          _iceConnectedCompleter!.complete(true);
        }
      } else if (state == RTCIceConnectionState.RTCIceConnectionStateFailed) {
        if (!(_iceConnectedCompleter?.isCompleted ?? true)) {
          _iceConnectedCompleter!.complete(false);
        }
        onError?.call('ICE connection failed');
        _updateState(BroadcastState.error);
      }
    };

    // Listen for PeerConnection state changes
    _peerConnection!.onConnectionState = (state) {
      debugPrint('[WebRTCPublisher] Peer connection state: $state');
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
        if (!(_iceConnectedCompleter?.isCompleted ?? true)) {
          _iceConnectedCompleter!.complete(true);
        }
      } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
        if (!(_iceConnectedCompleter?.isCompleted ?? true)) {
          _iceConnectedCompleter!.complete(false);
        }
      }
    };

    // Listen for signaling state changes
    _peerConnection!.onSignalingState = (state) {
      debugPrint('[WebRTCPublisher] Signaling state: $state');
    };

    return true;
  }

  Future<void> _waitForIceGathering() async {
    final peerConnection = _peerConnection;
    if (peerConnection == null) return;

    bool isComplete() =>
        peerConnection.iceGatheringState
            ?.toString()
            .toLowerCase()
            .contains('complete') ??
        false;

    if (isComplete()) return;

    final completer = Completer<void>();
    peerConnection.onIceGatheringState = (state) {
      if (state.toString().toLowerCase().contains('complete') &&
          !completer.isCompleted) {
        completer.complete();
      }
    };

    if (isComplete()) completer.complete();

    await completer.future.timeout(
      const Duration(seconds: 4),
      onTimeout: () {},
    );
  }

  Future<String?> _sendWhipOffer(String offerSdp) async {
    if (_config == null) return null;

    try {
      // Resolve WHIP endpoint URL cleanly without duplicating streamKey or whip
      String whipUrl = _config!.serverUrl.trim();
      if (!whipUrl.endsWith('/whip')) {
        whipUrl = whipUrl.endsWith('/')
            ? '$whipUrl${_config!.streamKey}/whip'
            : '$whipUrl/${_config!.streamKey}/whip';
      }

      debugPrint('[WebRTCPublisher] Sending WHIP offer to: $whipUrl');

      final response = await _httpPost(
        whipUrl,
        offerSdp,
        {
          'Content-Type': 'application/sdp',
          if (_config!.authToken?.isNotEmpty == true)
            'Authorization': 'Bearer ${_config!.authToken}',
        },
      );

      if (response != null && response.trim().isNotEmpty) {
        debugPrint('[WebRTCPublisher] Received WHIP answer (${response.length} bytes)');
        return response;
      }

      debugPrint('[WebRTCPublisher] WHIP response was empty');
      return null;
    } catch (e) {
      debugPrint('[WebRTCPublisher] WHIP request failed: $e');
      return null;
    }
  }

  Future<void> _sendWhipDelete() async {
    if (_config == null) return;

    try {
      String whipUrl = _config!.serverUrl.trim();
      if (!whipUrl.endsWith('/whip')) {
        whipUrl = whipUrl.endsWith('/')
            ? '$whipUrl${_config!.streamKey}/whip'
            : '$whipUrl/${_config!.streamKey}/whip';
      }

      await _httpDelete(whipUrl);
      debugPrint('[WebRTCPublisher] Sent WHIP DELETE to: $whipUrl');
    } catch (e) {
      debugPrint('[WebRTCPublisher] WHIP DELETE failed: $e');
    }
  }

  Future<String?> _httpPost(
    String url,
    String body,
    Map<String, String> headers,
  ) async {
    HttpClient? client;
    try {
      final uri = Uri.parse(url);
      client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 15);
      client.badCertificateCallback = (cert, host, port) => true;

      final request = await client.postUrl(uri);
      headers.forEach((key, value) {
        request.headers.set(key, value);
      });

      request.write(body);
      final response = await request.close();

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseBody = await response.transform(utf8.decoder).join();
        return responseBody;
      } else {
        final errBody = await response.transform(utf8.decoder).join().catchError((_) => '');
        debugPrint('[WebRTCPublisher] HTTP POST rejected with status ${response.statusCode}: $errBody');
        return null;
      }
    } catch (e) {
      debugPrint('[WebRTCPublisher] HTTP POST error to $url: $e');
      return null;
    } finally {
      client?.close(force: true);
    }
  }

  Future<void> _httpDelete(String url) async {
    HttpClient? client;
    try {
      final uri = Uri.parse(url);
      client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 10);
      client.badCertificateCallback = (cert, host, port) => true;

      final request = await client.deleteUrl(uri);
      request.headers.set('Content-Type', 'application/sdp');
      if (_config!.authToken?.isNotEmpty == true) {
        request.headers.set('Authorization', 'Bearer ${_config!.authToken}');
      }

      await request.close();
    } catch (e) {
      debugPrint('[WebRTCPublisher] HTTP DELETE error to $url: $e');
    } finally {
      client?.close(force: true);
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

    // Dispose local renderer
    try {
      _localRenderer?.srcObject = null;
      await _localRenderer?.dispose();
    } catch (_) {}
    _localRenderer = null;

    // Dispose local stream
    await _localStream?.dispose();
    _localStream = null;
  }

  /// Prioritize H264 payload types in m=video line so MediaMTX can remux to HLS
  String _preferH264InSdp(String sdp) {
    if (sdp.isEmpty) return sdp;
    final h264Regex = RegExp(r'a=rtpmap:(\d+)\s+H264\/', caseSensitive: false);
    final h264Pts = h264Regex.allMatches(sdp).map((m) => m.group(1)!).toList();
    if (h264Pts.isEmpty) return sdp;

    final lines = sdp.split(RegExp(r'\r?\n'));
    final result = <String>[];
    for (final line in lines) {
      if (line.startsWith('m=video ')) {
        final parts = line.split(' ');
        if (parts.length > 3) {
          final prefix = parts.sublist(0, 3);
          final pts = parts.sublist(3);
          final orderedPts = <String>[];
          for (final pt in h264Pts) {
            if (pts.contains(pt)) orderedPts.add(pt);
          }
          for (final pt in pts) {
            if (!orderedPts.contains(pt)) orderedPts.add(pt);
          }
          result.add('${prefix.join(' ')} ${orderedPts.join(' ')}');
          continue;
        }
      }
      result.add(line);
    }
    return result.join('\r\n');
  }
}
