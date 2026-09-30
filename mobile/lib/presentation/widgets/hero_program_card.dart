// OmniCast — Hero Program Card
// The signature "now-playing" card used across home, channels, search, etc.

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../core/theme/app_theme.dart';
import '../../core/constants/app_constants.dart';
import 'channel_logo.dart';
import 'live_pulse_widget.dart';

class HeroProgramCard extends StatefulWidget {
  final HeroProgramData program;
  final VoidCallback? onTap;
  final bool wide;

  const HeroProgramCard({
    super.key,
    required this.program,
    this.onTap,
    this.wide = false,
  });

  @override
  State<HeroProgramCard> createState() => _HeroProgramCardState();
}

class _HeroProgramCardState extends State<HeroProgramCard> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.program;
    final theme = Theme.of(context);

    final start = p.startTime;
    final end = p.endTime;
    final now = DateTime.now();
    final total = end.difference(start).inSeconds.clamp(1, 1 << 31);
    final elapsed = now.difference(start).inSeconds.clamp(0, total);
    final pct = (elapsed / total).clamp(0.0, 1.0);
    final remainingMin = ((total - elapsed) / 60).round();
    final remainingStr = remainingMin >= 60
        ? '${remainingMin ~/ 60}h ${remainingMin % 60}\''
        : '$remainingMin\'';

    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        transform: _hover
            ? (Matrix4.identity()..translate(0, -2, 0))
            : Matrix4.identity(),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppColors.rLg),
          border: Border.all(
            color: _hover ? AppColors.borderStrong : AppColors.border,
          ),
          boxShadow: _hover
              ? [
                  BoxShadow(
                    color: p.isLive ? AppColors.liveGlow : Colors.black54,
                    blurRadius: 24,
                    spreadRadius: -8,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(AppColors.rLg),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(AppColors.rLg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _thumbnail(p),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleLarge?.copyWith(
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _progressBar(pct, p.isLive),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            '${_fmt(start)} – ${_fmt(end)}',
                            style: theme.textTheme.bodySmall,
                          ),
                          const Spacer(),
                          if (p.isLive)
                            Text(
                              'Còn $remainingStr',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.live,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _thumbnail(HeroProgramData p) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Thumbnail or gradient
          if (p.thumbnailUrl != null && p.thumbnailUrl!.isNotEmpty)
            CachedNetworkImage(
              imageUrl: AppConstants.resolveAssetUrl(p.thumbnailUrl!),
              fit: BoxFit.cover,
              placeholder: (_, __) => _gradient(p),
              errorWidget: (_, __, ___) => _gradient(p),
            )
          else
            _gradient(p),
          // Bottom gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Color(0x99000000),
                ],
              ),
            ),
          ),
          // Top-left badges
          Positioned(
            top: 8,
            left: 8,
            child: Row(
              children: [
                if (p.isLive) const LiveBadge(compact: false),
                if (p.isLive && p.category != null) const SizedBox(width: 6),
                if (p.category != null) _categoryChip(p.category!),
              ],
            ),
          ),
          // Bottom-left channel
          Positioned(
            left: 8,
            right: 8,
            bottom: 8,
            child: Row(
              children: [
                if (p.channelName != null)
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: p.channelLogo != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(5),
                            child: ChannelLogo(
                              channel: p.channelLogo,
                              size: 24,
                              fit: BoxFit.cover,
                            ),
                          )
                        : null,
                  ),
                if (p.channelName != null) const SizedBox(width: 6),
                if (p.channelName != null)
                  Flexible(
                    child: Text(
                      p.channelName!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _gradient(HeroProgramData p) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: p.isLive
              ? const [AppColors.primary, AppColors.accent]
              : [AppColors.surfaceRaised, AppColors.surface],
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.play_circle_outline,
          size: 56,
          color: Colors.white24,
        ),
      ),
    );
  }

  Widget _progressBar(double pct, bool isLive) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: SizedBox(
        height: 3,
        child: Stack(
          children: [
            Container(color: AppColors.surfaceRaised),
            FractionallySizedBox(
              widthFactor: pct,
              child: Container(
                decoration: BoxDecoration(
                  color: isLive ? AppColors.live : AppColors.primary,
                  boxShadow: isLive
                      ? [BoxShadow(color: AppColors.liveGlow, blurRadius: 6)]
                      : null,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _categoryChip(String cat) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        cat,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _fmt(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

class HeroProgramData {
  final String id;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final bool isLive;
  final String? thumbnailUrl;
  final String? category;
  final String? channelName;
  final dynamic channelLogo;
  final int? viewerCount;

  const HeroProgramData({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.isLive,
    this.thumbnailUrl,
    this.category,
    this.channelName,
    this.channelLogo,
    this.viewerCount,
  });
}