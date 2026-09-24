// OmniCast - Channel Logo Widget
// Displays channel logo with category-based color

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/theme/app_theme.dart';
import '../../../data/models/channel_model.dart';

/// Widget hiển thị logo kênh với màu theo category
/// Thay thế cho Icons.tv khi hiển thị thông tin kênh
class ChannelLogo extends StatelessWidget {
  final ChannelModel channel;
  final double size;
  final double? fontSize;
  final bool showLiveIndicator;
  final BoxFit fit;

  const ChannelLogo({
    super.key,
    required this.channel,
    this.size = 40,
    this.fontSize,
    this.showLiveIndicator = false,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    // Get category color
    final categoryColor = _getCategoryColor(channel.category);

    return Stack(
      children: [
        // Logo container
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: categoryColor.withOpacity(0.15),
            borderRadius: BorderRadius.circular(size * 0.2),
            border: Border.all(
              color: categoryColor.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: channel.logoUrl != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(size * 0.2),
                  child: CachedNetworkImage(
                    imageUrl: channel.logoUrl!,
                    fit: fit,
                    placeholder: (context, url) => _buildPlaceholder(categoryColor),
                    errorWidget: (context, url, error) =>
                        _buildPlaceholder(categoryColor),
                  ),
                )
              : _buildPlaceholder(categoryColor),
        ),

        // Live indicator
        if (showLiveIndicator && channel.isLive)
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              width: size * 0.3,
              height: size * 0.3,
              decoration: BoxDecoration(
                color: AppColors.liveRed,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.dark950,
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.liveRed.withOpacity(0.5),
                    blurRadius: 4,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildPlaceholder(Color categoryColor) {
    // Hiển thị chữ cái đầu của tên kênh thay vì icon TV
    final initials = _getInitials(channel.name);
    final calculatedFontSize = fontSize ?? (size * 0.4);

    return Center(
      child: Text(
        initials,
        style: TextStyle(
          color: categoryColor,
          fontSize: calculatedFontSize,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  /// Lấy 2 chữ cái đầu của tên kênh
  String _getInitials(String name) {
    final words = name.trim().split(RegExp(r'\s+'));
    if (words.isEmpty) return '?';
    if (words.length == 1) {
      return words[0].substring(0, words[0].length.clamp(0, 2)).toUpperCase();
    }
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }

  /// Lấy màu theo category
  static Color _getCategoryColor(String category) {
    switch (category.toUpperCase()) {
      case 'SPORTS':
        return AppColors.sports;
      case 'ENTERTAINMENT':
        return AppColors.entertainment;
      case 'NEWS':
        return AppColors.news;
      case 'MUSIC':
        return AppColors.music;
      case 'CINE':
      case 'DRAMA':
        return AppColors.cinema;
      case 'KIDS':
        return AppColors.kids;
      case 'TECH':
        return AppColors.tech;
      case 'FOOD':
        return AppColors.food;
      case 'SHOW':
        return AppColors.accentGold;
      case 'EDUCATION':
        return AppColors.education;
      default:
        return AppColors.primary;
    }
  }
}

/// Compact version của ChannelLogo cho những nơi có không gian hạn chế
class ChannelLogoCompact extends StatelessWidget {
  final ChannelModel channel;
  final double size;
  final bool showLiveIndicator;

  const ChannelLogoCompact({
    super.key,
    required this.channel,
    this.size = 32,
    this.showLiveIndicator = false,
  });

  @override
  Widget build(BuildContext context) {
    final categoryColor = ChannelLogo._getCategoryColor(channel.category);

    return Stack(
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: categoryColor.withOpacity(0.2),
            borderRadius: BorderRadius.circular(6),
          ),
          child: channel.logoUrl != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: CachedNetworkImage(
                    imageUrl: channel.logoUrl!,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) =>
                        _buildInitials(categoryColor),
                  ),
                )
              : _buildInitials(categoryColor),
        ),
        if (showLiveIndicator && channel.isLive)
          Positioned(
            top: -1,
            right: -1,
            child: Container(
              width: size * 0.35,
              height: size * 0.35,
              decoration: BoxDecoration(
                color: AppColors.liveRed,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.dark950,
                  width: 1.5,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildInitials(Color categoryColor) {
    final initials = _getInitials(channel.name);
    return Center(
      child: Text(
        initials,
        style: TextStyle(
          color: categoryColor,
          fontSize: size * 0.35,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final words = name.trim().split(RegExp(r'\s+'));
    if (words.isEmpty) return '?';
    if (words.length == 1) {
      return words[0].substring(0, words[0].length.clamp(0, 2)).toUpperCase();
    }
    return '${words[0][0]}${words[1][0]}'.toUpperCase();
  }
}

/// Widget hiển thị tên kênh với logo (dùng trong list items)
class ChannelInfo extends StatelessWidget {
  final ChannelModel channel;
  final double logoSize;
  final TextStyle? nameStyle;
  final TextStyle? categoryStyle;
  final MainAxisAlignment mainAxisAlignment;
  final CrossAxisAlignment crossAxisAlignment;
  final bool showLiveIndicator;

  const ChannelInfo({
    super.key,
    required this.channel,
    this.logoSize = 24,
    this.nameStyle,
    this.categoryStyle,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.showLiveIndicator = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: mainAxisAlignment,
      crossAxisAlignment: crossAxisAlignment,
      children: [
        ChannelLogoCompact(
          channel: channel,
          size: logoSize,
          showLiveIndicator: showLiveIndicator,
        ),
        const SizedBox(width: 8),
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              channel.name,
              style: nameStyle ??
                  const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
            ),
            Text(
              channel.categoryDisplayName,
              style: categoryStyle ??
                  const TextStyle(
                    color: AppColors.dark500,
                    fontSize: 11,
                  ),
            ),
          ],
        ),
      ],
    );
  }
}
