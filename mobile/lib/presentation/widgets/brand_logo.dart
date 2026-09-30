// OmniCast - Brand Logo Widget
// Displays official OmniCast beacon vector SVG logo

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/channel_logo_helper.dart';

class OmniCastBrandLogo extends StatelessWidget {
  final double size;
  final bool showGlow;
  final bool withCard;
  final BorderRadius? borderRadius;

  const OmniCastBrandLogo({
    super.key,
    this.size = 40,
    this.showGlow = false,
    this.withCard = false,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(size * 0.25);

    Widget logoContent = SvgPicture.asset(
      ChannelLogoHelper.brandLogoSvg,
      width: size,
      height: size,
      fit: BoxFit.contain,
      placeholderBuilder: (context) => Image.asset(
        ChannelLogoHelper.brandLogoPng,
        width: size,
        height: size,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => Icon(
          Icons.tv,
          size: size * 0.7,
          color: AppColors.primary,
        ),
      ),
    );

    if (withCard) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.dark900,
          borderRadius: radius,
          border: Border.all(
            color: AppColors.primary.withOpacity(0.3),
            width: 1.5,
          ),
          boxShadow: showGlow
              ? [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.35),
                    blurRadius: size * 0.3,
                    spreadRadius: 2,
                  ),
                ]
              : null,
        ),
        child: ClipRRect(
          borderRadius: radius,
          child: logoContent,
        ),
      );
    }

    if (showGlow) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: radius,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.4),
              blurRadius: size * 0.4,
              spreadRadius: 2,
            ),
          ],
        ),
        child: logoContent,
      );
    }

    return logoContent;
  }
}
