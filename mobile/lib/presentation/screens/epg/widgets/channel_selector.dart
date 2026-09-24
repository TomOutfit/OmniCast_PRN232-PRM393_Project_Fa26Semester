// OmniCast - Channel Selector Widget
// Horizontal scrollable channel selector for EPG

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/channel_model.dart';
import '../../../widgets/live_pulse_widget.dart';
import '../../../widgets/channel_logo.dart';

class ChannelSelector extends StatelessWidget {
  final List<ChannelModel> channels;
  final String? selectedChannelId;
  final Function(ChannelModel?) onChannelSelected;
  final bool showAllOption;

  const ChannelSelector({
    super.key,
    required this.channels,
    this.selectedChannelId,
    required this.onChannelSelected,
    this.showAllOption = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.dark900,
        border: Border(
          bottom: BorderSide(
            color: AppColors.dark700.withOpacity(0.5),
          ),
        ),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: showAllOption ? channels.length + 1 : channels.length,
        itemBuilder: (context, index) {
          if (showAllOption && index == 0) {
            return _AllChannelsChip(
              isSelected: selectedChannelId == null,
              onTap: () => onChannelSelected(null),
            );
          }

          final channelIndex = showAllOption ? index - 1 : index;
          final channel = channels[channelIndex];
          return _ChannelChip(
            channel: channel,
            isSelected: selectedChannelId == channel.id,
            onTap: () => onChannelSelected(channel),
          );
        },
      ),
    );
  }
}

class _AllChannelsChip extends StatelessWidget {
  final bool isSelected;
  final VoidCallback onTap;

  const _AllChannelsChip({
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.dark700,
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.grid_view_rounded,
              size: 24,
              color: isSelected ? Colors.white : AppColors.dark400,
            ),
            const SizedBox(height: 4),
            Text(
              'Tất cả',
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.dark400,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChannelChip extends StatelessWidget {
  final ChannelModel channel;
  final bool isSelected;
  final VoidCallback onTap;

  const _ChannelChip({
    required this.channel,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.2) : AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.dark700,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Channel Logo
            ChannelLogoCompact(
              channel: channel,
              size: 40,
              showLiveIndicator: channel.isLive,
            ),
            const SizedBox(width: 8),

            // Channel Name
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      channel.name,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppColors.dark300,
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      ),
                    ),
                    if (channel.isLive) ...[
                      const SizedBox(width: 4),
                      const LivePulseWidget(
                        size: 6,
                        showText: false,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  channel.categoryDisplayName,
                  style: const TextStyle(
                    color: AppColors.dark500,
                    fontSize: 10,
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

// Compact version for narrow spaces
class ChannelSelectorCompact extends StatelessWidget {
  final List<ChannelModel> channels;
  final String? selectedChannelId;
  final Function(ChannelModel?) onChannelSelected;

  const ChannelSelectorCompact({
    super.key,
    required this.channels,
    this.selectedChannelId,
    required this.onChannelSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: channels.length,
        itemBuilder: (context, index) {
          final channel = channels[index];
          final isSelected = selectedChannelId == channel.id;

          return GestureDetector(
            onTap: () => onChannelSelected(channel),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              width: 56,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.dark800,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.dark700,
                  width: 1.5,
                ),
              ),
              child: Center(
                child: ChannelLogoCompact(
                  channel: channel,
                  size: 40,
                  showLiveIndicator: channel.isLive,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
