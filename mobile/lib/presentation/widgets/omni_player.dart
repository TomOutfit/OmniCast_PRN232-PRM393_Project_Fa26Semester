// OmniCast - Video Player Widget
// Native video_player based player with optional Chewie-like controls.

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class OmniPlayer extends StatefulWidget {
  final String url;
  final String? posterUrl;
  final bool autoPlay;
  final bool showControls;
  final bool looping;

  const OmniPlayer({
    super.key,
    required this.url,
    this.posterUrl,
    this.autoPlay = false,
    this.showControls = true,
    this.looping = false,
  });

  @override
  State<OmniPlayer> createState() => _OmniPlayerState();
}

class _OmniPlayerState extends State<OmniPlayer> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _hasError = false;
  String? _errorMessage;
  bool _userPaused = false;

  @override
  void initState() {
    super.initState();
    if (widget.url.isNotEmpty) {
      _initialize();
    }
  }

  @override
  void didUpdateWidget(covariant OmniPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.url != oldWidget.url) {
      _disposeController();
      _hasError = false;
      _errorMessage = null;
      if (widget.url.isNotEmpty) {
        _initialize();
      }
    }
  }

  Future<void> _initialize() async {
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.url),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    _controller = controller;
    try {
      await controller.initialize();
      controller.setLooping(widget.looping);
      if (widget.autoPlay) {
        await controller.play();
      }
      if (mounted) {
        setState(() {
          _initialized = true;
          _hasError = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = 'Không thể phát video: $e';
        });
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

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (widget.url.isEmpty) {
      return _PosterOnly(
        posterUrl: widget.posterUrl,
        message: 'Chưa có nguồn phát',
      );
    }
    if (_hasError) {
      return _PosterOnly(
        posterUrl: widget.posterUrl,
        message: _errorMessage ?? 'Lỗi phát video',
        isError: true,
      );
    }
    if (controller == null || !_initialized) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: Colors.black,
          alignment: Alignment.center,
          child: const CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    controller.addListener(_onTick);

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
                  color: Colors.black.withOpacity(0.25),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.play_arrow_rounded,
                    size: 64,
                    color: Colors.white.withOpacity(0.85),
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

class _PlayerOverlay extends StatelessWidget {
  final VideoPlayerController controller;
  final VoidCallback onTogglePlay;

  const _PlayerOverlay({
    required this.controller,
    required this.onTogglePlay,
  });

  @override
  Widget build(BuildContext context) {
    final v = controller.value;
    final position = v.position;
    final duration = v.duration;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.transparent,
            Colors.black.withOpacity(0.7),
          ],
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          VideoProgressIndicator(
            controller,
            allowScrubbing: true,
            padding: const EdgeInsets.symmetric(vertical: 6),
            colors: const VideoProgressColors(
              playedColor: Colors.white,
              bufferedColor: Colors.white24,
              backgroundColor: Colors.white12,
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: onTogglePlay,
                icon: Icon(
                  v.isPlaying
                      ? Icons.pause_circle_filled
                      : Icons.play_circle_filled,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              Text(
                _format(position),
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
              const Spacer(),
              Text(
                _format(duration),
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () {
                  controller.seekTo(Duration.zero);
                },
                icon: const Icon(Icons.replay, color: Colors.white),
              ),
              IconButton(
                onPressed: () {
                  if (controller.value.volume > 0) {
                    controller.setVolume(0);
                  } else {
                    controller.setVolume(1);
                  }
                },
                icon: const Icon(Icons.volume_up, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _format(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }
}

class _PosterOnly extends StatelessWidget {
  final String? posterUrl;
  final String message;
  final bool isError;

  const _PosterOnly({
    required this.posterUrl,
    required this.message,
    this.isError = false,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        color: Colors.black,
        alignment: Alignment.center,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (posterUrl != null && posterUrl!.isNotEmpty)
              Image.network(
                posterUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) =>
                    Container(color: Colors.grey.shade900),
              ),
            Container(
              color: Colors.black54,
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isError
                        ? Icons.error_outline
                        : Icons.play_circle_outline,
                    color: Colors.white,
                    size: 56,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message,
                    style: const TextStyle(color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
