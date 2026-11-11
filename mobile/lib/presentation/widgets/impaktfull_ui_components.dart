import 'package:flutter/material.dart';

/// OmniCast Design System Tokens & Components
/// Inspired by Impaktfull UI & Shadcn Dark Glassmorphic Design System.
/// Provides unified high-contrast neon badges, frosted glass cards, and buttons.
class ImpaktfullTokens {
  // Surface colors (Deep Obsidian & Slate Glass)
  static const Color background = Color(0xFF070B12);
  static const Color surface = Color(0xFF0B1320);
  static const Color surfaceCard = Color(0xFF0F172A);
  static const Color surfaceElevated = Color(0xFF1E293B);

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

  // Text
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color textMuted = Color(0xFF94A3B8);
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
          onTap: onTap,
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
enum ImpaktBadgeVariant { live, upcoming, replay, pro, neutral, success }

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
