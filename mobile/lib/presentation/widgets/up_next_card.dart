// OmniCast — Compact Up-Next Card
// Slim horizontal card used in "Sắp chiếu" rails.

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'channel_logo.dart';

class UpNextCard extends StatelessWidget {
  final UpNextData data;
  final VoidCallback? onTap;

  const UpNextCard({super.key, required this.data, this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        child: Container(
          width: 240,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppColors.rMd),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceRaised,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(5),
                      child: ChannelLogo(
                        channel: data.channel,
                        size: 24,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      data.channelName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.textDim,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Text(
                    data.startLabel,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.primary,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                data.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(height: 1.3),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    data.countdownLabel,
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class UpNextData {
  final String id;
  final String title;
  final DateTime startTime;
  final String channelName;
  final dynamic channel;
  final String startLabel;
  final String countdownLabel;

  const UpNextData({
    required this.id,
    required this.title,
    required this.startTime,
    required this.channelName,
    required this.channel,
    required this.startLabel,
    required this.countdownLabel,
  });
}