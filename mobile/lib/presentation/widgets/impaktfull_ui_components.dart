import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// OmniCast Modern Minimalist Design System Tokens & Components
/// Clean, high-end streaming UI inspired by Apple TV+ and modern minimalist design systems.
/// Removes visual clutter, neon shadows, and busy borders in favor of optical clarity.
class ImpaktfullTokens {
  // Surface colors (Deep Obsidian & Refined Slate)
  static const Color background = Color(0xFF080B11);
  static const Color surface = Color(0xFF0F1523);
  static const Color surfaceCard = Color(0xFF131B2E);
  static const Color surfaceElevated = Color(0xFF192338);
  static const Color surfaceInput = Color(0xFF0D1424);

  // Clean Borders & Dividers (subtle, non-distracting)
  static const Color borderSubtle = Color(0x14FFFFFF); // 8% white
  static const Color borderMedium = Color(0x24FFFFFF); // 14% white
  static const Color borderGlow = Color(0x2E00E5FF);   // 18% cyan subtle

  // Accents (used with purpose)
  static const Color cyan = Color(0xFF00E5FF);
  static const Color redLive = Color(0xFFEF4444);
  static const Color gold = Color(0xFFF59E0B);
  static const Color emerald = Color(0xFF10B981);
  static const Color purple = Color(0xFFA855F7);
  static const Color blue = Color(0xFF3B82F6);

  // Typography
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textFaint = Color(0xFF64748B);
}

/// Modern Minimalist Card with subtle border and crisp tap feedback
class ImpaktfullCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderWidth;
  final double borderRadius;
  final List<BoxShadow>? shadow;

  const ImpaktfullCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 0.8,
    this.borderRadius = 16.0,
    this.shadow,
  });

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? ImpaktfullTokens.surfaceCard;
    final border = borderColor ?? ImpaktfullTokens.borderSubtle;

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: border, width: borderWidth),
        boxShadow: shadow ??
            const [
              BoxShadow(
                color: Color(0x26000000),
                blurRadius: 10,
                offset: Offset(0, 3),
              ),
            ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap != null
              ? () {
                  HapticFeedback.lightImpact();
                  onTap!();
                }
              : null,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Minimalist Pill Badge (Clean, sharp, no distracting glow)
enum ImpaktBadgeVariant { live, upcoming, replay, pro, neutral, success, warning, error }

class ImpaktfullBadge extends StatelessWidget {
  final String label;
  final IconData? icon;
  final ImpaktBadgeVariant variant;
  final double fontSize;

  const ImpaktfullBadge({
    super.key,
    required this.label,
    this.icon,
    this.variant = ImpaktBadgeVariant.neutral,
    this.fontSize = 10,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color border;
    Color text;

    switch (variant) {
      case ImpaktBadgeVariant.live:
        bg = const Color(0xFFEF4444).withValues(alpha: 0.16);
        border = const Color(0xFFEF4444).withValues(alpha: 0.4);
        text = const Color(0xFFF87171);
        break;
      case ImpaktBadgeVariant.upcoming:
        bg = const Color(0xFF00E5FF).withValues(alpha: 0.12);
        border = const Color(0xFF00E5FF).withValues(alpha: 0.35);
        text = const Color(0xFF38BDF8);
        break;
      case ImpaktBadgeVariant.replay:
        bg = const Color(0xFF6366F1).withValues(alpha: 0.14);
        border = const Color(0xFF6366F1).withValues(alpha: 0.35);
        text = const Color(0xFFA5B4FC);
        break;
      case ImpaktBadgeVariant.pro:
        bg = const Color(0xFFF59E0B).withValues(alpha: 0.14);
        border = const Color(0xFFF59E0B).withValues(alpha: 0.4);
        text = const Color(0xFFFBBF24);
        break;
      case ImpaktBadgeVariant.success:
        bg = const Color(0xFF10B981).withValues(alpha: 0.14);
        border = const Color(0xFF10B981).withValues(alpha: 0.35);
        text = const Color(0xFF34D399);
        break;
      case ImpaktBadgeVariant.warning:
        bg = const Color(0xFFF59E0B).withValues(alpha: 0.14);
        border = const Color(0xFFF59E0B).withValues(alpha: 0.35);
        text = const Color(0xFFFBBF24);
        break;
      case ImpaktBadgeVariant.error:
        bg = const Color(0xFFEF4444).withValues(alpha: 0.14);
        border = const Color(0xFFEF4444).withValues(alpha: 0.35);
        text = const Color(0xFFF87171);
        break;
      case ImpaktBadgeVariant.neutral:
        bg = const Color(0xFF1E293B);
        border = const Color(0x1FFFFFFF);
        text = const Color(0xFFCBD5E1);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: border, width: 0.7),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (variant == ImpaktBadgeVariant.live) ...[
            Container(
              width: 5,
              height: 5,
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
          ] else if (icon != null) ...[
            Icon(icon, size: fontSize + 1, color: text),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: text,
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Modern Clean Action Button
class ImpaktfullButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isFullWidth;
  final Color backgroundColor;
  final Color foregroundColor;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const ImpaktfullButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.isFullWidth = true,
    this.backgroundColor = ImpaktfullTokens.cyan,
    this.foregroundColor = const Color(0xFF070B12),
    this.borderRadius = 12,
    this.padding = const EdgeInsets.symmetric(vertical: 12, horizontal: 18),
  });

  @override
  Widget build(BuildContext context) {
    final btn = ElevatedButton(
      onPressed: isLoading
          ? null
          : (onPressed != null
              ? () {
                  HapticFeedback.lightImpact();
                  onPressed!();
                }
              : null),
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        foregroundColor: foregroundColor,
        elevation: 0,
        padding: padding,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
      child: isLoading
          ? SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
              ),
            )
          : Row(
              mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 16),
                  const SizedBox(width: 6),
                ],
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                    color: foregroundColor,
                  ),
                ),
              ],
            ),
    );

    if (isFullWidth) {
      return SizedBox(width: double.infinity, child: btn);
    }
    return btn;
  }
}

/// Minimalist Section Header
class ImpaktfullSectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color accentColor;

  const ImpaktfullSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
    this.accentColor = ImpaktfullTokens.cyan,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 14,
            decoration: BoxDecoration(
              color: accentColor,
              borderRadius: BorderRadius.circular(1.5),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              color: ImpaktfullTokens.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
          const Spacer(),
          if (actionLabel != null && onAction != null)
            TextButton(
              onPressed: () {
                HapticFeedback.lightImpact();
                onAction!();
              },
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Row(
                children: [
                  Text(
                    actionLabel!,
                    style: TextStyle(
                      color: accentColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Icon(Icons.chevron_right_rounded, size: 16, color: accentColor),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
