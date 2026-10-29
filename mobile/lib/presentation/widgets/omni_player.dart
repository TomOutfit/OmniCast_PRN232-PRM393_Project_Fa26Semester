// OmniCast - Video Player Widget
// Native video_player based player with Client-Side Live Seek & VIP Paywall Overlay.
// Includes: retry on error, fallback stream URL, clean UX error state.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/lan_discovery_service.dart';
import '../../../core/utils/token_storage_helper.dart';
import 'payment/subscription_payment_sheet.dart';

// Demo fallback stream. Big Buck Bunny — Creative Commons MP4 hosted
// on verified CDN mirror. Plays directly in `video_player`,
// no API key required.
const _kFallbackStream =
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';

/// Extracts a YouTube 11-char video ID from any format (watch, shorts, embed, youtu.be).
String? _extractYouTubeVideoId(String url) {
  if (url.isEmpty) return null;
  final regExp = RegExp(
    r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})',
    caseSensitive: false,
  );
  final match = regExp.firstMatch(url);
  return match?.group(1);
}

/// Returns true when the URL should be rendered in a WebView (YouTube
/// embed / any iframe-only source). The native `video_player` package
/// cannot decode YouTube's DASH/SABR manifests, so we route YouTube
/// embeds through a WebView instead.
bool _isYouTubeEmbed(String url) {
  if (url.isEmpty) return false;
  return _extractYouTubeVideoId(url) != null ||
      url.contains('youtube.com/') ||
      url.contains('youtu.be/');
}

/// Extracts a Google Drive file ID from view, open, or uc URLs.
String? _extractGoogleDriveFileId(String url) {
  if (url.isEmpty) return null;
  final regExp1 = RegExp(
    r'(?:drive|docs)\.google\.com\/(?:file\/)?(?:u\/\d+\/)?(?:d\/|open\?id=)([a-zA-Z0-9_-]+)',
    caseSensitive: false,
  );
  final match1 = regExp1.firstMatch(url);
  if (match1?.group(1) != null) return match1!.group(1);

  final regExp2 = RegExp(
    r'[?&]id=([a-zA-Z0-9_-]+)',
    caseSensitive: false,
  );
  final match2 = regExp2.firstMatch(url);
  if (match2?.group(1) != null) return match2!.group(1);

  return null;
}

class OmniPlayer extends StatefulWidget {
  final String url;
  final String? posterUrl;
  final bool autoPlay;
  final bool showControls;
  final bool looping;
  final int initialSeekSeconds;
  final bool isPremium;
  final String? channelName;

  /// Optional upstream URL kept around by the Bunny orchestrator as a
  /// safety net. When the primary [url] fails to initialize, the player
  /// transparently swaps to [fallbackSrc] before giving up. If even
  /// [fallbackSrc] is dead, the player falls all the way back to the
  /// hard-coded Big Buck Bunny demo stream.
  final String? fallbackSrc;

  /// Short caption ("Video by Pexels", "© Blender Foundation", …) shown
  /// as a snackbar when the player swaps to a fallback. Also exposed
  /// for parents that want to render it as a static caption.
  final String? sourceAttribution;

  /// Disable fallback media when showing a specific live source.
  final bool allowFallback;

  /// When true or when the stream URL points to a live stream, the player
  /// operates in live broadcast mode: zero cartoon fallbacks, proactive auto-retry,
  /// and a dedicated live connecting / standby state.
  final bool isLive;

  const OmniPlayer({
    super.key,
    required this.url,
    this.posterUrl,
    this.autoPlay = false,
    this.showControls = true,
    this.looping = false,
    this.initialSeekSeconds = 0,
    this.isPremium = false,
    this.channelName,
    this.fallbackSrc,
    this.sourceAttribution,
    this.allowFallback = true,
    this.isLive = false,
  });

  @override
  State<OmniPlayer> createState() => _OmniPlayerState();
}

class _OmniPlayerState extends State<OmniPlayer> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _hasError = false;
  bool _usedFallback = false;
  bool _userPaused = false;
  bool _isVipUnlocked = false;
  int _lastTickSec = -1;
  bool? _lastBuffering;
  bool? _lastPlaying;

  // Live broadcast reconnection state
  int _retryCount = 0;
  static const int _maxLiveRetries = 10;
  Timer? _liveRetryTimer;
  bool _isLiveRetrying = false;

  bool get _isLiveStream =>
      widget.isLive ||
      widget.url.toLowerCase().contains(':8888/') ||
      widget.url.toLowerCase().contains('/live/') ||
      widget.url.toLowerCase().contains('.m3u8');

  @override
  void initState() {
    super.initState();
    // YouTube embeds are handled by WebView.
    // Google Drive videos stream directly in native player with live fallback.
    if (_isYouTubeEmbed(widget.url)) {
      return;
    }
    if (widget.url.isNotEmpty && (!widget.isPremium || _isVipUnlocked)) {
      _initialize(widget.url);
    }
  }

  @override
  void didUpdateWidget(covariant OmniPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.url != oldWidget.url) {
      _disposeController();
      _liveRetryTimer?.cancel();
      _hasError = false;
      _usedFallback = false;
      _retryCount = 0;
      _isLiveRetrying = false;
      if (_isYouTubeEmbed(widget.url)) {
        return;
      }
      if (widget.url.isNotEmpty && (!widget.isPremium || _isVipUnlocked)) {
        _initialize(widget.url);
      }
    }
  }

  /// Best-effort resolution of a possibly-relative URL into an
  /// absolute one the native `video_player` can dial.
  ///
  /// Live Studio "Tự ghi hình" uploads used to be persisted as
  /// relative paths (`/uploads/self-record/.../file.mp4`). Native
  /// `VideoPlayerController.networkUrl` rejects those because they
  /// have no host. Older rows in the DB still carry the relative
  /// form, so we transparently prefix them with the API origin
  /// here. Absolute URLs (the common case) pass through untouched.
  static String _resolveAbsoluteUrl(
    String url, {
    required bool allowFallback,
  }) {
    final trimmed = url.trim();
    String fallbackOrUrl() => allowFallback ? _kFallbackStream : trimmed;

    if (trimmed.isEmpty) return fallbackOrUrl();
    final lower = trimmed.toLowerCase();

    // Google Drive direct media stream resolution
    final gDriveId = _extractGoogleDriveFileId(url);
    if (gDriveId != null) {
      return 'https://drive.usercontent.google.com/download?id=$gDriveId&export=download&confirm=t';
    }

    // Browser memory blob URLs cannot be decoded by native video_player
    if (lower.startsWith('blob:')) {
      return fallbackOrUrl();
    }
    // Blocked googleapis bucket
    if (lower.contains('commondatastorage.googleapis.com')) {
      return fallbackOrUrl();
    }
    // Broken vercel serverless uploads
    if (lower.contains('omnicast-api.vercel.app/uploads/')) {
      return fallbackOrUrl();
    }
    if (lower.contains(':8888/') || (lower.contains('.m3u8') && !lower.startsWith('http'))) {
      var target = trimmed;

      // Wi-Fi Stream Optimization: If URL contains a valid non-loopback IP,
      // auto-adopt it as discovered host if no custom host is configured.
      final ipMatch = RegExp(r'^(?:https?:\/\/)?([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):8888\/').firstMatch(target);
      if (ipMatch != null) {
        final discoveredLanIp = ipMatch.group(1);
        if (discoveredLanIp != null &&
            discoveredLanIp != '127.0.0.1' &&
            !discoveredLanIp.startsWith('169.254.') &&
            !AppConstants.hasCustomMediaHost) {
          AppConstants.setDiscoveredMediaHost(discoveredLanIp);
        }
      }

      final host = AppConstants.mediaHost;
      if (lower.contains(':8888/')) {
        // Rewrite ANY scheme://[old_host]:8888/ to http://$host:8888/
        target = target.replaceFirst(
          RegExp(r'^(?:https?:\/\/)?([^\/:]+):8888\/'),
          'http://$host:8888/',
        );
      } else {
        final cleanPath = target.startsWith('/') ? target.substring(1) : target;
        target = 'http://$host:8888/$cleanPath';
      }
      // MediaMTX requires cookieCheck=1 on initial HLS manifest requests to bypass the 302 redirect
      if (!target.contains('cookieCheck=')) {
        target = target.contains('?')
            ? '$target&cookieCheck=1'
            : '$target?cookieCheck=1';
      }
      return target;
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      return url;
    }
    // Relative — glue to the API origin. baseUrl is the
    // `…/api` form (e.g. `https://omnicast-api.vercel.app/api`);
    // strip the trailing `/api` so the result lives on the same
    // origin as the API host.
    final apiBase = AppConstants.baseUrl;
    final origin = apiBase.endsWith('/api')
        ? apiBase.substring(0, apiBase.length - 4)
        : apiBase;
    final path = url.startsWith('/') ? url : '/$url';
    return '$origin$path';
  }

  Future<void> _initialize(String videoUrl) async {
    final absoluteUrl = _resolveAbsoluteUrl(
      videoUrl,
      allowFallback: widget.allowFallback && !_isLiveStream,
    );
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(absoluteUrl),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    _controller = controller;
    controller.addListener(_onTick);

    try {
      await controller.initialize();
      controller.setLooping(widget.looping);

      // Client-Side Live Seek simulation
      if (widget.initialSeekSeconds > 0) {
        final totalDuration = controller.value.duration;
        if (totalDuration.inSeconds > widget.initialSeekSeconds) {
          await controller.seekTo(Duration(seconds: widget.initialSeekSeconds));
        }
      }

      if (widget.autoPlay) {
        await controller.play();
      }
      if (mounted) {
        setState(() {
          _initialized = true;
          _hasError = false;
          _isLiveRetrying = false;
          _retryCount = 0;
        });
      }
    } catch (_) {
      controller.removeListener(_onTick);
      await controller.dispose();
      _controller = null;

      // ── Live Stream Reconnection Flow ─────────────────────────
      // Live camera broadcasts must NEVER swap to Big Buck Bunny cartoon!
      // They retry with backoff to give MediaMTX time to remux the first chunk.
      if (_isLiveStream || videoUrl.contains(':8888/')) {
        // Wi-Fi Auto-Discovery: on initial connection failure, immediately scan the local Wi-Fi
        // in background to discover if MediaMTX is broadcasting on another IP in the same network!
        if (_retryCount == 0) {
          LanDiscoveryService().autoDiscoverMediaHost().then((res) {
            if (res.success && res.host != null && mounted) {
              debugPrint('[OmniPlayer] ⚡ Wi-Fi Auto-Discovery resolved mediaHost to: ${res.host}');
            }
          });
        }

        if (_retryCount < _maxLiveRetries) {
          _retryCount++;
          if (mounted) {
            setState(() {
              _isLiveRetrying = true;
              _hasError = false;
              _initialized = false;
            });
          }
          _liveRetryTimer?.cancel();
          _liveRetryTimer = Timer(const Duration(seconds: 2), () {
            if (mounted) {
              _initialize(videoUrl);
            }
          });
          return;
        }

        // Retries exhausted for live camera stream
        if (mounted) {
          setState(() {
            _hasError = true;
            _isLiveRetrying = false;
            _initialized = false;
          });
        }
        return;
      }

      // ── Non-Live (VOD / Recording) Fallback Chain ───────────────
      //   primary  -> configured [fallbackSrc] (Bunny keeps the
      //                upstream URL around for exactly this case)
      //           -> hard-coded Big Buck Bunny demo stream
      //   failure  -> _hasError overlay
      if (widget.allowFallback && !_usedFallback) {
        _usedFallback = true;

        // Try the configured upstream fallback first.
        final fb = widget.fallbackSrc;
        if (fb != null && fb.isNotEmpty && videoUrl != fb) {
          if (mounted) {
            _showFallbackToast(
              '🔁 Đang chuyển sang nguồn dự phòng${widget.sourceAttribution != null ? ' (${widget.sourceAttribution})' : ''}…',
            );
          }
          await _initialize(fb);
          return;
        }

        // Then the demo stream as the last resort for catalog/VOD only.
        if (videoUrl != _kFallbackStream) {
          if (mounted) {
            _showFallbackToast('🔁 Đang kết nối stream dự phòng…');
          }
          await _initialize(_kFallbackStream);
          return;
        }
      }

      if (mounted) {
        setState(() {
          _hasError = true;
          _initialized = false;
          _isLiveRetrying = false;
        });
      }
    }
  }

  void _showFallbackToast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
          backgroundColor: const Color(0xFF0F172A),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  void _disposeController() {
    _controller?.removeListener(_onTick);
    _controller?.dispose();
    _controller = null;
    _initialized = false;
  }

  @override
  void dispose() {
    _liveRetryTimer?.cancel();
    _disposeController();
    super.dispose();
  }

  void _onTick() {
    if (!mounted) return;
    final c = _controller;
    if (c == null) return;
    final val = c.value;
    final curSec = val.position.inSeconds;
    if (curSec != _lastTickSec ||
        val.isBuffering != _lastBuffering ||
        val.isPlaying != _lastPlaying) {
      _lastTickSec = curSec;
      _lastBuffering = val.isBuffering;
      _lastPlaying = val.isPlaying;
      setState(() {});
    }
  }

  void _togglePlay() {
    final c = _controller;
    if (c == null || !_initialized) return;
    if (c.value.isPlaying) {
      c.pause();
      _userPaused = true;
    } else {
      c.play();
      _userPaused = false;
    }
    setState(() {});
  }

  void _retry() {
    _disposeController();
    _liveRetryTimer?.cancel();
    setState(() {
      _hasError = false;
      _usedFallback = false;
      _retryCount = 0;
      _isLiveRetrying = false;
    });
    _initialize(widget.url);
  }

  void _unlockVipDemo() {
    setState(() {
      _isVipUnlocked = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content:
            Text('👑 Đã kích hoạt OmniPass VIP Demo! Mở khóa toàn bộ kênh.'),
        backgroundColor: Color(0xFFD97706),
      ),
    );
    _initialize(widget.url);
  }

  @override
  Widget build(BuildContext context) {
    // 1. VIP Paywall Overlay
    if (widget.isPremium && !_isVipUnlocked) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0A0F1D),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
              width: 1,
            ),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (widget.posterUrl != null && widget.posterUrl!.isNotEmpty)
                Opacity(
                  opacity: 0.15,
                  child: Image.network(
                    widget.posterUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox(),
                  ),
                ),
              Center(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color:
                              const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.workspace_premium_rounded,
                          color: Color(0xFFF59E0B),
                          size: 32,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        widget.channelName ?? 'KÊNH BẢN QUYỀN 4K',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Thuộc gói OmniPass VIP (99.000đ/tháng)',
                        style: TextStyle(
                          color: AppColors.stitchOnSurfaceVariant,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF59E0B),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                            onPressed: () {
                              SubscriptionPaymentSheet.show(
                                context,
                                onSuccess: _unlockVipDemo,
                              );
                            },
                            icon: const Icon(Icons.qr_code_2_rounded, size: 16),
                            label: const Text(
                              'NẠP TIỀN / MUA VIP',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: _unlockVipDemo,
                            child: const Text(
                              'VIP DEMO',
                              style: TextStyle(
                                color: Color(0xFFF59E0B),
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 2. YouTube embed — render in WebView (free, no native YouTube SDK)
    if (_isYouTubeEmbed(widget.url)) {
      return _YouTubeEmbed(
        url: widget.url,
        posterUrl: widget.posterUrl,
        channelName: widget.channelName,
      );
    }

    // 3. Empty URL
    if (widget.url.isEmpty) {
      return _PosterOnly(
        posterUrl: widget.posterUrl,
        message: 'Chưa có nguồn phát',
      );
    }

    // 4. Live Broadcast Specialized States
    if (_isLiveStream) {
      if (_hasError) {
        return _LiveStandbyState(
          posterUrl: widget.posterUrl,
          channelName: widget.channelName,
          onRetry: _retry,
        );
      }
      if (_isLiveRetrying || _controller == null || !_initialized) {
        return _LiveConnectingState(
          retryCount: _retryCount == 0 ? 1 : _retryCount,
          maxRetries: _maxLiveRetries,
          channelName: widget.channelName,
          onRetry: _retry,
        );
      }
    }

    // 5. General Error state with Retry button (non-live)
    if (_hasError) {
      return _ErrorState(
        posterUrl: widget.posterUrl,
        onRetry: _retry,
      );
    }

    // 6. Loading / Buffering (non-live)
    final controller = _controller;
    if (controller == null || !_initialized) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: Colors.black,
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(
                  color: AppColors.stitchPrimaryContainer),
              const SizedBox(height: 12),
              Text(
                _usedFallback
                    ? 'Đang kết nối stream dự phòng...'
                    : 'Đang tải luồng phát sóng...',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ),
        ),
      );
    }

    // 6. Playing state
    final isAudioOnly = controller.value.size.width == 0 ||
        controller.value.size.height == 0 ||
        controller.value.size.isEmpty;

    return AspectRatio(
      aspectRatio: controller.value.aspectRatio == 0
          ? 16 / 9
          : controller.value.aspectRatio,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (isAudioOnly)
            _buildAudioVisualizer(controller)
          else
            GestureDetector(
              onTap: _togglePlay,
              child: VideoPlayer(controller),
            ),
          if (!controller.value.isPlaying && _userPaused)
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  color: Colors.black.withValues(alpha: 0.25),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.play_arrow_rounded,
                    size: 64,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ),
            ),
          if (controller.value.isBuffering)
            const Positioned.fill(
              child: IgnorePointer(
                child: Center(
                  child: SizedBox(
                    width: 36,
                    height: 36,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white70,
                    ),
                  ),
                ),
              ),
            ),
          if (widget.showControls)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _PlayerOverlay(
                controller: controller,
                onTogglePlay: _togglePlay,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAudioVisualizer(VideoPlayerController controller) {
    return GestureDetector(
      onTap: _togglePlay,
      child: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 0.9,
            colors: [
              Color(0xFF1E293B),
              Color(0xFF0B1320),
              Color(0xFF05080E),
            ],
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Keep VideoPlayer in tree with opacity 0 to maintain sound playback
            Opacity(opacity: 0, child: VideoPlayer(controller)),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.35),
                        blurRadius: 18,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.podcasts_rounded,
                    color: Colors.black,
                    size: 32,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFF00E5FF).withValues(alpha: 0.4),
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.graphic_eq_rounded,
                          color: Color(0xFF00E5FF), size: 14),
                      SizedBox(width: 6),
                      Text(
                        'LUỒNG PHÁT THANH / RADIO',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'JetBrainsMono',
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Đang phát âm thanh trực tiếp (Audio-Only Stream)',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error state widget with Retry button
// ─────────────────────────────────────────────────────────────────────────────
class _ErrorState extends StatelessWidget {
  final String? posterUrl;
  final VoidCallback onRetry;

  const _ErrorState({this.posterUrl, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (posterUrl != null && posterUrl!.isNotEmpty)
            Image.network(posterUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.black))
          else
            Container(color: const Color(0xFF0A0F1D)),
          Container(color: Colors.black.withValues(alpha: 0.75)),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                    Icons.signal_wifi_statusbar_connected_no_internet_4_rounded,
                    color: Color(0xFFEF4444),
                    size: 44),
                const SizedBox(height: 10),
                const Text(
                  'Không thể kết nối luồng phát sóng',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Vui lòng kiểm tra kết nối Internet',
                  style: TextStyle(color: Colors.white60, fontSize: 12),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text(
                    'THỬ LẠI',
                    style: TextStyle(
                        fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Poster-only placeholder (no URL provided)
// ─────────────────────────────────────────────────────────────────────────────
class _PosterOnly extends StatelessWidget {
  final String? posterUrl;
  final String message;

  const _PosterOnly({this.posterUrl, required this.message});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (posterUrl != null && posterUrl!.isNotEmpty)
            Image.network(
              posterUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(color: Colors.black),
            )
          else
            Container(color: Colors.black),
          Container(color: Colors.black.withValues(alpha: 0.6)),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.live_tv_rounded,
                    color: Colors.white70, size: 40),
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Player control overlay (bottom bar)
// ─────────────────────────────────────────────────────────────────────────────
class _PlayerOverlay extends StatelessWidget {
  final VideoPlayerController controller;
  final VoidCallback onTogglePlay;

  const _PlayerOverlay({
    required this.controller,
    required this.onTogglePlay,
  });

  @override
  Widget build(BuildContext context) {
    final isPlaying = controller.value.isPlaying;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Colors.black.withValues(alpha: 0.8),
            Colors.transparent,
          ],
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
              color: Colors.white,
            ),
            onPressed: onTogglePlay,
          ),
          const SizedBox(width: 8),
          const Text(
            'TRỰC TIẾP',
            style: TextStyle(
              color: Colors.redAccent,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const Spacer(),
          const Icon(Icons.hd_rounded, color: Colors.white70, size: 20),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube embed widget — renders any youtube.com/embed URL in a WebView.
// Used when the recording's `videoUrl` points at a YouTube embed (free,
// no API key, no Bunny / Mux billing). Falls back to a poster image if
// the WebView fails to load within a few seconds.
// ─────────────────────────────────────────────────────────────────────────────
class _YouTubeEmbed extends StatefulWidget {
  final String url;
  final String? posterUrl;
  final String? channelName;

  const _YouTubeEmbed({
    required this.url,
    this.posterUrl,
    this.channelName,
  });

  @override
  State<_YouTubeEmbed> createState() => _YouTubeEmbedState();
}

class _YouTubeEmbedState extends State<_YouTubeEmbed> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    final videoId = _extractYouTubeVideoId(widget.url) ?? '';

    final html = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #player { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script src="https://www.youtube.com/iframe_api"></script>
  <script>
    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        width: '100%',
        height: '100%',
        videoId: '$videoId',
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: 'https://www.youtube-nocookie.com'
        },
        events: {
          onReady: function(e) {
            try {
              e.target.playVideo();
              setTimeout(function() {
                try { e.target.unMute(); } catch(_) {}
              }, 500);
            } catch(_) {}
          }
        }
      });
    }
  </script>
</body>
</html>
''';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final lower = request.url.toLowerCase();
            // Prevent Google login or consent screen redirects
            if (lower.contains('accounts.google.com') ||
                lower.contains('accounts.youtube.com') ||
                lower.contains('consent.youtube.com') ||
                lower.contains('myaccount.google.com')) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (error) {
            // Only trigger failure on main frame navigation failure
            if (error.isForMainFrame ?? true) {
              if (mounted) setState(() => _failed = true);
            }
          },
        ),
      )
      ..loadHtmlString(html, baseUrl: 'https://www.youtube-nocookie.com');
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (widget.posterUrl != null && widget.posterUrl!.isNotEmpty)
            Image.network(
              widget.posterUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(color: Colors.black),
            )
          else
            Container(color: Colors.black),
          // The WebView sits on the poster so the embed overlays nicely.
          WebViewWidget(controller: _controller),
          if (_loading)
            Container(
              color: Colors.black.withValues(alpha: 0.45),
              alignment: Alignment.center,
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Color(0xFF00E5FF)),
                  SizedBox(height: 12),
                  Text(
                    'Đang kết nối YouTube...',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
          if (_failed)
            Container(
              color: Colors.black.withValues(alpha: 0.75),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      color: Color(0xFFEF4444), size: 36),
                  const SizedBox(height: 8),
                  Text(
                    widget.channelName ?? 'Không tải được video YouTube',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Broadcast Connecting State (Studio camera sync)
// ─────────────────────────────────────────────────────────────────────────────
class _LiveConnectingState extends StatelessWidget {
  final int retryCount;
  final int maxRetries;
  final String? channelName;
  final VoidCallback onRetry;

  const _LiveConnectingState({
    required this.retryCount,
    required this.maxRetries,
    this.channelName,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 0.9,
            colors: [
              Color(0xFF0C1929),
              Color(0xFF070B12),
              Colors.black,
            ],
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 54,
                      height: 54,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          const Color(0xFF00E5FF).withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.videocam_rounded,
                      color: Color(0xFF00E5FF),
                      size: 26,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text(
                  'Đang đồng bộ camera trực tiếp…',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  channelName != null
                      ? '$channelName • Đang nhận luồng hình ảnh Studio ($retryCount/$maxRetries)'
                      : 'Đang kết nối luồng camera ($retryCount/$maxRetries)…',
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Đích: http://${AppConstants.mediaHost}:8888',
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 10,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: onRetry,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFF00E5FF).withValues(alpha: 0.35),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.refresh_rounded,
                                color: Color(0xFF00E5FF), size: 14),
                            SizedBox(width: 6),
                            Text(
                              'Thử lại ngay',
                              style: TextStyle(
                                color: Color(0xFF00E5FF),
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () => showMediaHostConfigDialog(context, onSaved: onRetry),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.2),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.tune_rounded, color: Colors.white70, size: 14),
                            SizedBox(width: 6),
                            Text(
                              'Đổi IP',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Broadcast Standby State (No active broadcast)
// ─────────────────────────────────────────────────────────────────────────────
class _LiveStandbyState extends StatelessWidget {
  final String? posterUrl;
  final String? channelName;
  final VoidCallback onRetry;

  const _LiveStandbyState({
    this.posterUrl,
    this.channelName,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (posterUrl != null && posterUrl!.isNotEmpty)
            Opacity(
              opacity: 0.2,
              child: Image.network(
                posterUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.black),
              ),
            )
          else
            Container(color: const Color(0xFF0A0F1D)),
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 0.85,
                colors: [
                  const Color(0xFFFF2A55).withValues(alpha: 0.08),
                  Colors.black.withValues(alpha: 0.85),
                ],
              ),
            ),
          ),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFFF2A55).withValues(alpha: 0.15),
                      border: Border.all(
                        color: const Color(0xFFFF2A55).withValues(alpha: 0.5),
                        width: 1.5,
                      ),
                    ),
                    child: const Icon(
                      Icons.videocam_off_rounded,
                      color: Color(0xFFFF2A55),
                      size: 26,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Chưa nhận được tín hiệu camera từ Studio',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Outfit',
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    channelName != null
                        ? 'Studio $channelName chưa bật camera hoặc buổi phát đã kết thúc.'
                        : 'Vui lòng kiểm tra màn hình Studio đang bật camera và thử lại.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Đích kết nối: http://${AppConstants.mediaHost}:8888',
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 10,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00E5FF),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          elevation: 4,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        onPressed: onRetry,
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text(
                          'KẾT NỐI LẠI',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF00E5FF),
                          side: const BorderSide(color: Color(0xFF00E5FF)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        onPressed: () =>
                            showMediaHostConfigDialog(context, onSaved: onRetry),
                        icon: const Icon(Icons.tune_rounded, size: 16),
                        label: const Text(
                          'ĐỔI IP',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MediaMTX Server IP Configuration Dialog
// ─────────────────────────────────────────────────────────────────────────────
void showMediaHostConfigDialog(BuildContext context, {VoidCallback? onSaved}) {
  final ctrl = TextEditingController(text: AppConstants.mediaHost);
  bool isScanning = false;
  String? scanMessage;

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setDialogState) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.wifi_tethering_rounded,
                color: Color(0xFF00E5FF), size: 22),
            SizedBox(width: 8),
            Text(
              'Kết Nối Wi-Fi Nội Bộ',
              style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chỉ cần máy tính và điện thoại cùng mạng Wi-Fi, hệ thống sẽ tự động bắt luồng phát trực tiếp:',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 12),
            // Auto Scan Button
            InkWell(
              onTap: isScanning
                  ? null
                  : () async {
                      setDialogState(() {
                        isScanning = true;
                        scanMessage = 'Đang quét mạng Wi-Fi…';
                      });
                      final res = await LanDiscoveryService().autoDiscoverMediaHost();
                      setDialogState(() {
                        isScanning = false;
                        if (res.success && res.host != null) {
                          ctrl.text = res.host!;
                          scanMessage = '✓ Đã tìm thấy máy chủ: ${res.host} (${res.source})';
                        } else {
                          scanMessage = 'Chưa thấy máy chủ phát. Bạn có thể nhập IP thủ công:';
                        }
                      });
                    },
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFF00E5FF).withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (isScanning)
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF00E5FF),
                        ),
                      )
                    else
                      const Icon(Icons.bolt_rounded,
                          color: Color(0xFF00E5FF), size: 16),
                    const SizedBox(width: 8),
                    Text(
                      isScanning ? 'Đang tự động quét…' : '⚡ Tự Động Quét Wi-Fi (Auto Scan)',
                      style: const TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (scanMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                scanMessage!,
                style: TextStyle(
                  color: scanMessage!.startsWith('✓') ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1E293B),
                labelText: 'Địa chỉ IP MediaMTX',
                labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                hintText: 'Ví dụ: 10.12.2.162',
                hintStyle: const TextStyle(color: Colors.white38),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF00E5FF)),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child:
                const Text('Đóng', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final newHost = ctrl.text.trim();
              if (newHost.isNotEmpty) {
                await TokenStorageHelper().saveCustomMediaHost(newHost);
                if (ctx.mounted) Navigator.pop(ctx);
                onSaved?.call();
              }
            },
            child: const Text('Lưu & Kết nối ngay',
                style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    ),
  );
}
