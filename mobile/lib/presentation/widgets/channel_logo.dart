// OmniCast - Channel Logo & Badge Widgets
// Displays official 25 channel SVG logos, badges, and fallback branding

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/utils/channel_logo_helper.dart';
import '../../../data/models/channel_model.dart';

/// Standard Channel Logo with category border & SVG/Network support
class ChannelLogo extends StatelessWidget {
  final dynamic channel; // ChannelModel or object with slug/logoUrl/category
  final double size;
  final double? fontSize;
  final bool showLiveIndicator;
  final bool preferBadge;
  final BoxFit fit;

  const ChannelLogo({
    super.key,
    required this.channel,
    this.size = 40,
    this.fontSize,
    this.showLiveIndicator = false,
    this.preferBadge = false,
    this.fit = BoxFit.contain,
  });

  @override
  Widget build(BuildContext context) {
    String? slug;
    String? logoUrl;
    String? category;
    String name = '';
    bool isLive = false;

    if (channel is ChannelModel) {
      final m = channel as ChannelModel;
      slug = m.slug;
      logoUrl = preferBadge ? (m.badgeUrl ?? m.logoUrl) : m.logoUrl;
      category = m.category;
      name = m.name;
      isLive = m.isLive;
    } else {
      try {
        final dynamic dyn = channel;
        slug = dyn.slug?.toString();
        logoUrl = preferBadge
            ? (dyn.badgeUrl?.toString() ?? dyn.logoUrl?.toString())
            : dyn.logoUrl?.toString();
        category = dyn.category?.toString();
        name = dyn.name?.toString() ?? '';
        isLive = dyn.isLive == true;
      } catch (_) {}
    }

    final categoryColor = Color(ChannelLogoHelper.getFallbackColor(category));
    final localAsset = ChannelLogoHelper.resolveLocalAsset(
      logoUrl: logoUrl,
      slug: slug,
      preferBadge: preferBadge,
    );

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: categoryColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(size * 0.22),
            border: Border.all(
              color: categoryColor.withOpacity(0.4),
              width: 1.2,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(size * 0.2),
            child: _buildLogoImage(
              localAsset: localAsset,
              remoteUrl: logoUrl,
              categoryColor: categoryColor,
              name: name,
            ),
          ),
        ),

        // Live indicator
        if (showLiveIndicator && isLive)
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
                    color: AppColors.liveRed.withOpacity(0.6),
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

  Widget _buildLogoImage({
    String? localAsset,
    String? remoteUrl,
    required Color categoryColor,
    required String name,
  }) {
    // 1. Try local SVG asset first (instant loading, highest fidelity)
    if (localAsset != null) {
      return SvgPicture.asset(
        localAsset,
        width: size,
        height: size,
        fit: fit,
        placeholderBuilder: (_) => _buildPlaceholder(categoryColor, name),
      );
    }

    // 2. Try remote URL
    if (remoteUrl != null && remoteUrl.isNotEmpty) {
      final resolvedUrl = AppConstants.resolveAssetUrl(remoteUrl);
      if (resolvedUrl.toLowerCase().endsWith('.svg')) {
        return SvgPicture.network(
          resolvedUrl,
          width: size,
          height: size,
          fit: fit,
          placeholderBuilder: (_) => _buildPlaceholder(categoryColor, name),
        );
      } else {
        return CachedNetworkImage(
          imageUrl: resolvedUrl,
          width: size,
          height: size,
          fit: fit,
          placeholder: (_, __) => _buildPlaceholder(categoryColor, name),
          errorWidget: (_, __, ___) => _buildPlaceholder(categoryColor, name),
        );
      }
    }

    // 3. Fallback initials
    return _buildPlaceholder(categoryColor, name);
  }

  Widget _buildPlaceholder(Color categoryColor, String name) {
    final initial = ChannelLogoHelper.getInitial(name);
    final calculatedFontSize = fontSize ?? (size * 0.42);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            categoryColor.withOpacity(0.3),
            categoryColor.withOpacity(0.1),
          ],
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: Colors.white,
            fontSize: calculatedFontSize,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  /// Lấy màu theo category
  static Color getCategoryColor(String? category) {
    return Color(ChannelLogoHelper.getFallbackColor(category));
  }
}

/// Compact version của ChannelLogo cho danh sách, row, chip
class ChannelLogoCompact extends StatelessWidget {
  final dynamic channel;
  final double size;
  final bool showLiveIndicator;
  final bool preferBadge;

  const ChannelLogoCompact({
    super.key,
    required this.channel,
    this.size = 32,
    this.showLiveIndicator = false,
    this.preferBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    return ChannelLogo(
      channel: channel,
      size: size,
      showLiveIndicator: showLiveIndicator,
      preferBadge: preferBadge,
      fit: BoxFit.contain,
    );
  }
}

/// Channel Badge widget (for wider horizontal or badge displays)
class ChannelBadge extends StatelessWidget {
  final dynamic channel;
  final double width;
  final double height;

  const ChannelBadge({
    super.key,
    required this.channel,
    this.width = 120,
    this.height = 40,
  });

  @override
  Widget build(BuildContext context) {
    String? slug;
    String? badgeUrl;
    String? category;
    String name = '';

    if (channel is ChannelModel) {
      final m = channel as ChannelModel;
      slug = m.slug;
      badgeUrl = m.badgeUrl ?? m.logoUrl;
      category = m.category;
      name = m.name;
    } else {
      try {
        final dynamic dyn = channel;
        slug = dyn.slug?.toString();
        badgeUrl = dyn.badgeUrl?.toString() ?? dyn.logoUrl?.toString();
        category = dyn.category?.toString();
        name = dyn.name?.toString() ?? '';
      } catch (_) {}
    }

    final localAsset = ChannelLogoHelper.resolveLocalAsset(
      logoUrl: badgeUrl,
      slug: slug,
      preferBadge: true,
    );

    final categoryColor = Color(ChannelLogoHelper.getFallbackColor(category));

    if (localAsset != null) {
      return SvgPicture.asset(
        localAsset,
        width: width,
        height: height,
        fit: BoxFit.contain,
        placeholderBuilder: (_) => _buildFallback(categoryColor, name),
      );
    }

    if (badgeUrl != null && badgeUrl.isNotEmpty) {
      final resolvedUrl = AppConstants.resolveAssetUrl(badgeUrl);
      if (resolvedUrl.toLowerCase().endsWith('.svg')) {
        return SvgPicture.network(
          resolvedUrl,
          width: width,
          height: height,
          fit: BoxFit.contain,
          placeholderBuilder: (_) => _buildFallback(categoryColor, name),
        );
      } else {
        return CachedNetworkImage(
          imageUrl: resolvedUrl,
          width: width,
          height: height,
          fit: BoxFit.contain,
          errorWidget: (_, __, ___) => _buildFallback(categoryColor, name),
        );
      }
    }

    return _buildFallback(categoryColor, name);
  }

  Widget _buildFallback(Color categoryColor, String name) {
    return Container(
      width: width,
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: categoryColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: categoryColor.withOpacity(0.4)),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name : 'OmniCast',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}

/// Widget hiển thị tên kênh với logo
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
    this.logoSize = 28,
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
