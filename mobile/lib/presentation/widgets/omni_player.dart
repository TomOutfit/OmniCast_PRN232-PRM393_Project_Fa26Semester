// OmniCast - Video Player Widget
// Native video_player based player with Client-Side Live Seek & VIP Paywall Overlay.
// Includes: retry on error, fallback stream URL, clean UX error state.

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../../core/theme/app_theme.dart';

// Fallback stream used when the primary URL fails
const _kFallbackStream = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

class OmniPlayer extends StatefulWidget {
  final String url;
  final String? posterUrl;
  final bool autoPlay;
  final bool showControls;
  final bool looping;
  final int initialSeekSeconds;
  final bool isPremium;
  final String? channelName;

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

  Future<void> _initialize(String videoUrl) async {
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(videoUrl),
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

      // Try fallback stream once
      if (!_usedFallback && videoUrl != _kFallbackStream) {
        _usedFallback = true;
        await _initialize(_kFallbackStream);
      } else {
        if (mounted) {
          setState(() {
            _hasError = true;
            _initialized = false;
          });
        }
      }
    }
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

    // 2. Empty URL
    if (widget.url.isEmpty) {
      return _PosterOnly(
        posterUrl: widget.posterUrl,
        message: 'Chưa có nguồn phát',
      );
    }

    // 3. Error state with Retry button
    if (_hasError) {
      return _ErrorState(
        posterUrl: widget.posterUrl,
        onRetry: _retry,
      );
    }

    // 4. Loading / Buffering
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

    // 5. Playing state
    return AspectRatio(
      aspectRatio: controller.value.aspectRatio == 0 ? 16 / 9 : controller.value.aspectRatio,
      child: Stack(
        fit: StackFit.expand,
        children: [
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
