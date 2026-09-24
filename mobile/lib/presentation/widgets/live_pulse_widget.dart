// OmniCast - Live Pulse Widget
// Red pulsing indicator for live content

import 'package:flutter/material.dart';
import 'dart:async';

import '../../../core/theme/app_theme.dart';

class LivePulseWidget extends StatefulWidget {
  final double size;
  final Color color;
  final Duration duration;
  final bool showText;
  final String text;
  final TextStyle? textStyle;

  const LivePulseWidget({
    super.key,
    this.size = 8,
    this.color = AppColors.liveRed,
    this.duration = const Duration(milliseconds: 1200),
    this.showText = false,
    this.text = 'LIVE',
    this.textStyle,
  });

  @override
  State<LivePulseWidget> createState() => _LivePulseWidgetState();
}

class _LivePulseWidgetState extends State<LivePulseWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 2.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _opacityAnimation = Tween<double>(
      begin: 1.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Pulsing dot
        SizedBox(
          width: widget.size * 3,
          height: widget.size,
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // Outer pulse ring
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _scaleAnimation.value,
                    child: Container(
                      width: widget.size,
                      height: widget.size,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.color.withOpacity(_opacityAnimation.value * 0.5),
                      ),
                    ),
                  );
                },
              ),
              // Inner solid dot
              Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.color,
                  boxShadow: [
                    BoxShadow(
                      color: widget.color.withOpacity(0.5),
                      blurRadius: 4,
                      spreadRadius: 1,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        // Live text
        if (widget.showText) ...[
          const SizedBox(width: 6),
          Text(
            widget.text,
            style: widget.textStyle ??
                const TextStyle(
                  color: AppColors.liveRed,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
          ),
        ],
      ],
    );
  }
}

class LiveBadge extends StatelessWidget {
  final bool compact;

  const LiveBadge({
    super.key,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Container(
        padding: const EdgeInsets.all(4),
        decoration: const BoxDecoration(
          color: AppColors.liveRed,
          shape: BoxShape.circle,
        ),
        child: const LivePulseWidget(
          size: 6,
          showText: false,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.liveRed,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow(
            color: AppColors.liveRed.withOpacity(0.3),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          LivePulseWidget(
            size: 6,
            showText: false,
          ),
          SizedBox(width: 6),
          Text(
            'LIVE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}

class LiveStatusIndicator extends StatelessWidget {
  final bool isLive;
  final int viewerCount;

  const LiveStatusIndicator({
    super.key,
    required this.isLive,
    this.viewerCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    if (!isLive) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const LivePulseWidget(
            size: 6,
            showText: false,
          ),
          const SizedBox(width: 6),
          Text(
            _formatViewerCount(viewerCount),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _formatViewerCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M đang xem';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K đang xem';
    }
    return '$count đang xem';
  }
}
