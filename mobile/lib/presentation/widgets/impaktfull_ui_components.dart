import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// OmniCast Impaktfull Design System Tokens & Components
/// Inspired by Impaktfull UI & Shadcn Dark Glassmorphic Design System.
/// Provides unified high-contrast neon badges, frosted glass cards, inputs, and buttons.
class ImpaktfullTokens {
  // Surface colors (Deep Obsidian & Slate Glass)
  static const Color background = Color(0xFF070B12);
  static const Color surface = Color(0xFF0B1320);
  static const Color surfaceCard = Color(0xFF0F172A);
  static const Color surfaceElevated = Color(0xFF1E293B);
  static const Color surfaceInput = Color(0xFF131D31);

  // Borders & Dividers
  static const Color borderSubtle = Color(0x1FFFFFFF); // 12% white
  static const Color borderMedium = Color(0x2EFFFFFF); // 18% white
  static const Color borderGlow = Color(0x4D00E5FF);   // 30% cyan

  // Neon & Brand Accents
  static const Color cyan = Color(0xFF00E5FF);
  static const Color redLive = Color(0xFFEF4444);
  static const Color gold = Color(0xFFF59E0B);
  static const Color emerald = Color(0xFF10B981);
  static const Color purple = Color(0xFFA855F7);
  static const Color blue = Color(0xFF3B82F6);

  // Text
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textFaint = Color(0xFF64748B);
}

/// Impaktfull-style Card with optional glowing border and touch ripple
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
    this.borderWidth = 1.0,
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
                color: Color(0x66000000),
                blurRadius: 16,
                offset: Offset(0, 4),
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

/// Impaktfull / Shadcn Pill Badge
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
        bg = const Color(0xFF450A0A);
        border = const Color(0xFFEF4444);
        text = const Color(0xFFF87171);
        break;
      case ImpaktBadgeVariant.upcoming:
        bg = const Color(0x1F00E5FF);
        border = const Color(0x6600E5FF);
        text = const Color(0xFF00E5FF);
        break;
      case ImpaktBadgeVariant.replay:
        bg = const Color(0xFF1E1B4B);
        border = const Color(0xFF6366F1);
        text = const Color(0xFFA5B4FC);
        break;
      case ImpaktBadgeVariant.pro:
        bg = const Color(0x26F59E0B);
        border = const Color(0x80F59E0B);
        text = const Color(0xFFFBBF24);
        break;
      case ImpaktBadgeVariant.success:
        bg = const Color(0x1A10B981);
        border = const Color(0x6610B981);
        text = const Color(0xFF34D399);
        break;
      case ImpaktBadgeVariant.warning:
        bg = const Color(0x26F59E0B);
        border = const Color(0x66F59E0B);
        text = const Color(0xFFFBBF24);
        break;
      case ImpaktBadgeVariant.error:
        bg = const Color(0x26EF4444);
        border = const Color(0x66EF4444);
        text = const Color(0xFFF87171);
        break;
      case ImpaktBadgeVariant.neutral:
        bg = const Color(0xFF1E293B);
        border = const Color(0x26FFFFFF);
        text = const Color(0xFFCBD5E1);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border, width: 0.8),
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
              fontWeight: FontWeight.w900,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}

/// Impaktfull-styled Neon Action Button
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
    this.borderRadius = 14,
    this.padding = const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
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
        elevation: 6,
        shadowColor: backgroundColor.withValues(alpha: 0.4),
        padding: padding,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
      child: isLoading
          ? SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2.2,
                valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
              ),
            )
          : Row(
              mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: 8),
                ],
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
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

/// Impaktfull Standard Section Header
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 3.5,
            height: 16,
            decoration: BoxDecoration(
              color: accentColor,
              borderRadius: BorderRadius.circular(2),
              boxShadow: [
                BoxShadow(
                  color: accentColor.withValues(alpha: 0.5),
                  blurRadius: 6,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: ImpaktfullTokens.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
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
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Icon(Icons.chevron_right, size: 14, color: accentColor),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
