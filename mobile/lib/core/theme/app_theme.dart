import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// OmniCast — Now-Playing Hero design tokens.
///
/// Layered so existing screens pick up the new palette without changing their
/// field references (e.g. `AppColors.dark800` now resolves to the new surface).
class AppColors {
  /* ── Brand · Now-Playing Hero palette ───────────────────────────────── */
  static const Color primary = Color(0xFF3B82F6);       // electric blue
  static const Color primaryLight = Color(0xFF60A5FA);
  static const Color primaryDark = Color(0xFF2563EB);

  static const Color accent = Color(0xFF8B5CF6);        // violet (gradient end)
  static const Color accentCyan = Color(0xFF22D3EE);    // cool teal accent
  static const Color accentGold = Color(0xFFFCD34D);    // highlight / featured

  /* ── Surfaces (deep-navy streaming palette) ─────────────────────────── */
  static const Color bg = Color(0xFF0A0E1A);             // page background
  static const Color surface = Color(0xFF141826);        // card base
  static const Color surfaceRaised = Color(0xFF1A1F30);  // raised card / input

  /* ── Borders (white-on-dark, alpha-encoded) ─────────────────────────── */
  static const Color border = Color(0x14FFFFFF);         // rgba(255,255,255,.08)
  static const Color borderStrong = Color(0x24FFFFFF);   // rgba(255,255,255,.14)

  /* ── Text scale (cool neutral on navy) ──────────────────────────────── */
  static const Color text = Color(0xFFF1F5F9);           // primary
  static const Color textDim = Color(0xFFCBD5E1);        // secondary
  static const Color textFaint = Color(0xFF94A3B8);      // tertiary
  static const Color textMuted = Color(0xFF64748B);       // quaternary / hints

  /* ── LIVE / status ──────────────────────────────────────────────────── */
  static const Color live = Color(0xFFEF4444);           // live red
  static const Color liveGlow = Color(0x59EF4444);       // rgba(239,68,68,.35)

  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  /* ── Back-compat aliases for screens that haven't migrated yet ───────── */
  static const Color dark950 = bg;
  static const Color dark900 = surface;
  static const Color dark800 = surfaceRaised;
  static const Color dark700 = Color(0xFF252B3E);        // a touch lighter than surface
  static const Color dark600 = borderStrong;
  static const Color dark500 = textMuted;
  static const Color dark400 = textFaint;
  static const Color dark300 = textDim;

  static const Color lightSurface = Color(0xFFF8FAFC);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightDivider = Color(0xFFCBD5E1);
  static const Color lightMuted = Color(0xFF64748B);
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF334155);

  static const Color liveRed = live;

  /* ── Category palette (from brand guidelines) ───────────────────────── */
  static const Color sports = Color(0xFFEF4444);
  static const Color entertainment = Color(0xFFEC4899);
  static const Color news = Color(0xFF3B82F6);
  static const Color music = Color(0xFFA855F7);
  static const Color cinema = Color(0xFFF59E0B);
  static const Color kids = Color(0xFF84CC16);
  static const Color tech = Color(0xFF06B6D4);
  static const Color food = Color(0xFFEA580C);
  static const Color education = Color(0xFF8B5CF6);
  static const Color gaming = Color(0xFFDC2626);
  static const Color podcast = Color(0xFFF59E0B);
  static const Color lifestyle = Color(0xFFF43F5E);
  static const Color travel = Color(0xFF14B8A6);
  static const Color art = Color(0xFFE11D48);
  static const Color business = Color(0xFF1E40AF);
  static const Color health = Color(0xFF10B981);
  static const Color documentary = Color(0xFF14B8A6);
  static const Color show = Color(0xFF8B5CF6);

  /* ── Spacing & radius tokens ────────────────────────────────────────── */
  static const double rXs = 4;
  static const double rSm = 6;
  static const double rMd = 10;
  static const double rLg = 14;
  static const double rXl = 20;
  static const double rPill = 999;

  /* ── Elevation tokens (BoxShadow) ────────────────────────────────────── */
  static List<BoxShadow> get glowLive => [
        BoxShadow(
          color: liveGlow,
          blurRadius: 24,
          spreadRadius: -4,
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.5),
          blurRadius: 16,
          spreadRadius: -4,
        ),
      ];
}

class AppTheme {
  static ThemeData get darkTheme {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.bg,
      canvasColor: AppColors.bg,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        primaryContainer: AppColors.primaryDark,
        secondary: AppColors.accentCyan,
        tertiary: AppColors.accent,
        surface: AppColors.surface,
        surfaceContainerHighest: AppColors.surfaceRaised,
        surfaceContainerHigh: AppColors.surfaceRaised,
        surfaceContainer: AppColors.surface,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.black,
        onSurface: AppColors.text,
        onSurfaceVariant: AppColors.textDim,
        onError: Colors.white,
        outline: AppColors.borderStrong,
        outlineVariant: AppColors.border,
      ),
    );
    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: TextStyle(
          color: AppColors.text,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rLg),
          side: const BorderSide(color: AppColors.border, width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.text,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          side: const BorderSide(color: AppColors.borderStrong),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceRaised,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: const TextStyle(color: AppColors.textMuted),
        labelStyle: const TextStyle(color: AppColors.textDim),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.text,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showUnselectedLabels: true,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.primary.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w600
                : FontWeight.w500,
            color: states.contains(WidgetState.selected)
                ? AppColors.text
                : AppColors.textMuted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? AppColors.text
                : AppColors.textMuted,
            size: 22,
          ),
        ),
        elevation: 0,
        height: 64,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AppColors.text,
        unselectedLabelColor: AppColors.textMuted,
        indicatorColor: AppColors.primary,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceRaised,
        selectedColor: AppColors.primary,
        labelStyle: const TextStyle(color: AppColors.text, fontSize: 12),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rPill),
          side: const BorderSide(color: AppColors.border),
        ),
        side: const BorderSide(color: AppColors.border),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        thickness: 0.5,
        space: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceRaised,
        contentTextStyle: const TextStyle(color: AppColors.text),
        actionTextColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.surfaceRaised,
        circularTrackColor: AppColors.surfaceRaised,
      ),
      iconTheme: const IconThemeData(color: AppColors.textDim, size: 22),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
            fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.text, letterSpacing: -0.5),
        displayMedium: TextStyle(
            fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.text, letterSpacing: -0.4),
        headlineLarge: TextStyle(
            fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.text, letterSpacing: -0.3),
        headlineMedium: TextStyle(
            fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.text),
        titleLarge: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.text),
        titleMedium: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text),
        titleSmall: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textDim),
        bodyLarge: TextStyle(fontSize: 15, color: AppColors.textDim, height: 1.5),
        bodyMedium: TextStyle(fontSize: 14, color: AppColors.textDim, height: 1.5),
        bodySmall: TextStyle(fontSize: 12, color: AppColors.textFaint),
        labelLarge: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.text),
        labelMedium: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textDim),
        labelSmall: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.textMuted),
      ),
    );
  }

  static ThemeData get lightTheme {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.lightSurface,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        primaryContainer: AppColors.primaryLight,
        secondary: AppColors.accentCyan,
        surface: AppColors.lightCard,
        surfaceContainerHighest: Color(0xFFF1F5F9),
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.black,
        onSurface: AppColors.lightText,
        onError: Colors.white,
        outline: AppColors.lightBorder,
      ),
    );
    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.lightCard,
        foregroundColor: AppColors.lightText,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      cardTheme: CardThemeData(
        color: AppColors.lightCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rLg),
          side: const BorderSide(color: AppColors.lightBorder, width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.lightText,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          side: const BorderSide(color: AppColors.lightDivider),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.primary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.lightMuted),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.lightCard,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.lightMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.lightMuted,
        indicatorColor: AppColors.primary,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFE2E8F0),
        selectedColor: AppColors.primary,
        labelStyle: const TextStyle(color: AppColors.lightText),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rPill),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.lightDivider,
        thickness: 0.5,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
            fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.lightText),
        displayMedium: TextStyle(
            fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.lightText),
        headlineLarge: TextStyle(
            fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.lightText),
        headlineMedium: TextStyle(
            fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.lightText),
        titleLarge: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.lightText),
        titleMedium: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.lightText),
        bodyLarge: TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
        bodyMedium: TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
        bodySmall: TextStyle(fontSize: 12, color: AppColors.lightMuted),
      ),
    );
  }
}