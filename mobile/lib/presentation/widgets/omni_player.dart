// OmniCast - Video Player Widget
// Native video_player based player with Client-Side Live Seek & VIP Paywall Overlay.
// Includes: retry on error, fallback stream URL, clean UX error state.

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';

// Demo fallback stream. Big Buck Bunny — Creative Commons MP4 hosted
// on verified CDN mirror. Plays directly in `video_player`,
// no API key required.
const _kFallbackStream =
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';

/// Returns true when the URL should be rendered in a WebView (YouTube
/// embed / any iframe-only source). The native `video_player` package
/// cannot decode YouTube's DASH/SABR manifests, so we route YouTube
/// embeds through a WebView instead.
bool _isYouTubeEmbed(String url) {
  if (url.isEmpty) return false;
  return url.contains('youtube.com/embed/') ||
      url.contains('youtu.be/') ||
      url.contains('youtube.com/watch?v=');
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

  @override
  void initState() {
    super.initState();
    if (widget.url.isNotEmpty && (!widget.isPremium || _isVipUnlocked)) {
      _initialize(widget.url);
    }
  }

  @override
  void didUpdateWidget(covariant OmniPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.url != oldWidget.url) {
      _disposeController();
      _hasError = false;
      _usedFallback = false;
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
  static String _resolveAbsoluteUrl(String url) {
    if (url.isEmpty) return url;
    final lower = url.toLowerCase();
    if (lower.contains('commondatastorage.googleapis.com')) {
      return _kFallbackStream;
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      return url;
    }
    // Relative — glue to the API origin. baseUrl is the
    // `…/api` form (e.g. `https://omnicast-api.vercel.app/api`);
    // strip the trailing `/api` so the result lives on the same
    // origin as the API host.
    const apiBase = AppConstants.baseUrl;
    final origin = apiBase.endsWith('/api')
        ? apiBase.substring(0, apiBase.length - 4)
        : apiBase;
    final path = url.startsWith('/') ? url : '/$url';
    return '$origin$path';
  }

  Future<void> _initialize(String videoUrl) async {
    final absoluteUrl = _resolveAbsoluteUrl(videoUrl);
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
        });
      }
    } catch (_) {
      controller.removeListener(_onTick);
      await controller.dispose();
      _controller = null;

      // Smart fallback chain (Catalog v2.1):
      //   primary  -> configured [fallbackSrc] (Bunny keeps the
      //                upstream URL around for exactly this case)
      //           -> hard-coded Big Buck Bunny demo stream
      //   failure  -> _hasError overlay
      if (!_usedFallback) {
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

        // Then the demo stream as the last resort.
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
    _disposeController();
    super.dispose();
  }

  void _onTick() {
    if (mounted) setState(() {});
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
    setState(() {
      _hasError = false;
      _usedFallback = false;
    });
    _initialize(widget.url);
  }

  void _unlockVipDemo() {
    setState(() {
      _isVipUnlocked = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('👑 Đã kích hoạt OmniPass VIP Demo! Mở khóa toàn bộ kênh.'),
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
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
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
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        onPressed: _unlockVipDemo,
                        icon: const Icon(Icons.flash_on_rounded, size: 16),
                        label: const Text(
                          'KÍCH HOẠT VIP DEMO',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
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

    // 4. Error state with Retry button
    if (_hasError) {
      return _ErrorState(
        posterUrl: widget.posterUrl,
        onRetry: _retry,
      );
    }

    // 5. Loading / Buffering
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
              const CircularProgressIndicator(color: AppColors.stitchPrimaryContainer),
              const SizedBox(height: 12),
              Text(
                _usedFallback ? 'Đang kết nối stream dự phòng...' : 'Đang tải luồng phát sóng...',
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
      aspectRatio: controller.value.aspectRatio == 0 ? 16 / 9 : controller.value.aspectRatio,
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
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                      Icon(Icons.graphic_eq_rounded, color: Color(0xFF00E5FF), size: 14),
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
            Image.network(posterUrl!, fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: Colors.black))
          else
            Container(color: const Color(0xFF0A0F1D)),
          Container(color: Colors.black.withValues(alpha: 0.75)),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.signal_wifi_statusbar_connected_no_internet_4_rounded,
                    color: Color(0xFFEF4444), size: 44),
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
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text(
                    'THỬ LẠI',
                    style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5),
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
                const Icon(Icons.live_tv_rounded, color: Colors.white70, size: 40),
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
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (_) {
            if (mounted) setState(() => _failed = true);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
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
                  CircularProgressIndicator(color: Colors.white70),
                  SizedBox(height: 12),
                  Text(
                    'Đang tải YouTube embed...',
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
                    widget.channelName ?? 'Không tải được video',
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
