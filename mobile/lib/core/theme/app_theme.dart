import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// OmniCast — Now-Playing Hero design tokens.
///
/// Layered so existing screens pick up the new palette without changing their
/// field references (e.g. `AppColors.dark800` now resolves to the new surface).
///
/// The colour system is a direct port of the **Stitch Live TV & EPG** canonical
/// design (M3 dark theme · cyan primary). Both the web (Next.js) and mobile
/// (Flutter) clients share the same tokens for visual parity.
class AppColors {
  /* ── Brand · Now-Playing Hero palette (legacy, kept for back-compat) ── */
  static const Color primary = Color(0xFF3B82F6);       // electric blue
  static const Color primaryLight = Color(0xFF60A5FA);
  static const Color primaryDark = Color(0xFF2563EB);

  static const Color accent = Color(0xFF8B5CF6);        // violet (gradient end)
  static const Color accentCyan = Color(0xFF22D3EE);    // cool teal accent
  static const Color accentGold = Color(0xFFFCD34D);    // highlight / featured

  /* ── Surfaces (deep-navy streaming palette) ─────────────────────────── */
  static const Color bg = Color(0xFF0F131D);             // page background
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
  static const Color dark900 = Color(0xFF171B26);        // surface-container-low
  static const Color dark800 = Color(0xFF1C1F2A);        // surface-container
  static const Color dark700 = Color(0xFF262A35);        // surface-container-high
  static const Color dark600 = Color(0xFF313540);        // surface-container-highest
  static const Color dark500 = Color(0xFF3A494B);        // outline-variant
  static const Color dark400 = Color(0xFF849495);        // outline
  static const Color dark300 = textDim;
  static const Color dark200 = Color(0xFFD3DAE0);

  static const Color lightSurface = Color(0xFFF8FAFC);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightDivider = Color(0xFFCBD5E1);
  static const Color lightMuted = Color(0xFF64748B);
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF334155);

  static const Color liveRed = live;

  /* ══════════════════════════════════════════════════════════════════════
     Stitch Design System · M3 dark tokens (canonical brand colours)
     ══════════════════════════════════════════════════════════════════════ */

  /* ── Brand · cyan (primary) ──────────────────────────────────────────── */
  static const Color stitchPrimary = Color(0xFFE0FDFF);          // primary (text)
  static const Color stitchPrimaryContainer = Color(0xFF00F2FE);  // chips / buttons
  static const Color stitchPrimaryFixed = Color(0xFF6FF6FF);
  static const Color stitchPrimaryFixedDim = Color(0xFF00DCE6);
  static const Color stitchOnPrimary = Color(0xFF00373A);
  static const Color stitchOnPrimaryContainer = Color(0xFF006A70);
  static const Color stitchOnPrimaryFixed = Color(0xFF002022);
  static const Color stitchOnPrimaryFixedVariant = Color(0xFF004F53);
  static const Color stitchInversePrimary = Color(0xFF00696F);

  /* ── Surfaces (deep navy → almost black) ────────────────────────────── */
  static const Color stitchSurface = Color(0xFF0F131D);
  static const Color stitchSurfaceDim = Color(0xFF0F131D);
  static const Color stitchSurfaceBright = Color(0xFF353944);
  static const Color stitchSurfaceContainerLowest = Color(0xFF0A0E18);
  static const Color stitchSurfaceContainerLow = Color(0xFF171B26);
  static const Color stitchSurfaceContainer = Color(0xFF1C1F2A);
  static const Color stitchSurfaceContainerHigh = Color(0xFF262A35);
  static const Color stitchSurfaceContainerHighest = Color(0xFF313540);
  static const Color stitchSurfaceVariant = Color(0xFF313540);
  static const Color stitchSurfaceTint = Color(0xFF00DCE6);
  static const Color stitchInverseSurface = Color(0xFFDFE2F1);

  /* ── Text / foreground ──────────────────────────────────────────────── */
  static const Color stitchOnSurface = Color(0xFFDFE2F1);
  static const Color stitchOnSurfaceVariant = Color(0xFFB9CACB);
  static const Color stitchInverseOnSurface = Color(0xFF2C303B);

  /* ── Secondary · ice blue ───────────────────────────────────────────── */
  static const Color stitchSecondary = Color(0xFF9BCBFF);
  static const Color stitchSecondaryContainer = Color(0xFF3196E6);
  static const Color stitchSecondaryFixed = Color(0xFFD0E4FF);
  static const Color stitchSecondaryFixedDim = Color(0xFF9BCBFF);
  static const Color stitchOnSecondary = Color(0xFF003256);
  static const Color stitchOnSecondaryContainer = Color(0xFF002C4B);
  static const Color stitchOnSecondaryFixed = Color(0xFF001D34);
  static const Color stitchOnSecondaryFixedVariant = Color(0xFF004A7A);

  /* ── Tertiary · purple ──────────────────────────────────────────────── */
  static const Color stitchTertiary = Color(0xFFFCF5FF);
  static const Color stitchTertiaryContainer = Color(0xFFE3D4FF);
  static const Color stitchTertiaryFixed = Color(0xFFE9DDFF);
  static const Color stitchTertiaryFixedDim = Color(0xFFD1BCFF);
  static const Color stitchOnTertiary = Color(0xFF3C0090);
  static const Color stitchOnTertiaryContainer = Color(0xFF7318FF);
  static const Color stitchOnTertiaryFixed = Color(0xFF23005B);
  static const Color stitchOnTertiaryFixedVariant = Color(0xFF5700C9);

  /* ── Error · coral red ──────────────────────────────────────────────── */
  static const Color stitchError = Color(0xFFFFB4AB);
  static const Color stitchErrorContainer = Color(0xFF93000A);
  static const Color stitchOnError = Color(0xFF690005);
  static const Color stitchOnErrorContainer = Color(0xFFFFDAD6);

  /* ── Outline ────────────────────────────────────────────────────────── */
  static const Color stitchOutline = Color(0xFF849495);
  static const Color stitchOutlineVariant = Color(0xFF3A494B);

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

  static List<BoxShadow> get glowCyan => [
        BoxShadow(
          color: stitchPrimaryContainer.withValues(alpha: 0.35),
          blurRadius: 24,
          spreadRadius: -4,
        ),
        BoxShadow(
          color: stitchPrimaryContainer.withValues(alpha: 0.18),
          blurRadius: 48,
          spreadRadius: -8,
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

/// Pre-defined Google Fonts that mirror the Stitch typography stack.
/// Loaded via `google_fonts` (already a project dependency on most Flutter
/// setups). If you prefer `google_fonts` lazy loading, swap the constructors.
class AppFonts {
  // Outfit (Stitch headline) — fallback to system sans-serif on platforms
  // where Outfit is not pre-installed.
  static const String display = 'Outfit';
  static const String body = 'Inter';
  static const String mono = 'JetBrainsMono';
}

class AppTheme {
  static ThemeData get darkTheme {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.bg,
      canvasColor: AppColors.bg,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.stitchPrimaryContainer,
        primaryContainer: AppColors.stitchPrimaryContainer,
        onPrimary: AppColors.stitchOnPrimaryContainer,
        onPrimaryContainer: AppColors.stitchOnPrimaryContainer,
        secondary: AppColors.stitchSecondary,
        secondaryContainer: AppColors.stitchSecondaryContainer,
        onSecondary: AppColors.stitchOnSecondary,
        onSecondaryContainer: AppColors.stitchOnSecondaryContainer,
        tertiary: AppColors.stitchTertiary,
        tertiaryContainer: AppColors.stitchTertiaryContainer,
        onTertiary: AppColors.stitchOnTertiary,
        onTertiaryContainer: AppColors.stitchOnTertiaryContainer,
        surface: AppColors.stitchSurface,
        surfaceContainerLowest: AppColors.stitchSurfaceContainerLowest,
        surfaceContainerLow: AppColors.stitchSurfaceContainerLow,
        surfaceContainer: AppColors.stitchSurfaceContainer,
        surfaceContainerHigh: AppColors.stitchSurfaceContainerHigh,
        surfaceContainerHighest: AppColors.stitchSurfaceContainerHighest,
        surfaceTint: AppColors.stitchPrimaryContainer,
        error: AppColors.error,
        onSurface: AppColors.stitchOnSurface,
        onSurfaceVariant: AppColors.stitchOnSurfaceVariant,
        onError: AppColors.stitchOnError,
        outline: AppColors.stitchOutline,
        outlineVariant: AppColors.stitchOutlineVariant,
        inverseSurface: AppColors.stitchInverseSurface,
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
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.stitchSurfaceContainer,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rLg),
          side: const BorderSide(color: AppColors.stitchOutlineVariant, width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.stitchPrimaryContainer,
          foregroundColor: AppColors.stitchOnPrimaryContainer,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rXl),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.1,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.stitchOnSurface,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          side: const BorderSide(color: AppColors.stitchOutlineVariant),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rXl),
          ),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.stitchPrimaryContainer,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.stitchSurfaceContainerLow,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.stitchOutlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.stitchOutlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.stitchPrimaryContainer, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.stitchError),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.stitchError, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: const TextStyle(color: AppColors.textMuted),
        labelStyle: const TextStyle(color: AppColors.stitchOnSurfaceVariant),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.stitchSurfaceContainer,
        selectedItemColor: AppColors.stitchPrimaryContainer,
        unselectedItemColor: AppColors.stitchOnSurfaceVariant,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        showUnselectedLabels: true,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.stitchSurfaceContainer,
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.stitchPrimaryContainer.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected)
                ? AppColors.stitchOnSurface
                : AppColors.stitchOnSurfaceVariant,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? AppColors.stitchPrimaryContainer
                : AppColors.stitchOnSurfaceVariant,
            size: 22,
          ),
        ),
        elevation: 0,
        height: 64,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AppColors.stitchOnSurface,
        unselectedLabelColor: AppColors.stitchOnSurfaceVariant,
        indicatorColor: AppColors.stitchPrimaryContainer,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: TextStyle(
          fontSize: 14,
          fontFamily: AppFonts.display,
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.stitchSurfaceContainerHigh,
        selectedColor: AppColors.stitchPrimaryContainer,
        labelStyle: const TextStyle(
          color: AppColors.stitchOnSurface,
          fontSize: 12,
          fontFamily: AppFonts.mono,
          fontWeight: FontWeight.w600,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rPill),
          side: const BorderSide(color: AppColors.stitchOutlineVariant),
        ),
        side: const BorderSide(color: AppColors.stitchOutlineVariant),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.stitchOutlineVariant,
        thickness: 0.5,
        space: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.stitchSurfaceContainerHigh,
        contentTextStyle: const TextStyle(color: AppColors.stitchOnSurface),
        actionTextColor: AppColors.stitchPrimaryContainer,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          side: const BorderSide(color: AppColors.stitchOutlineVariant),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.stitchPrimaryContainer,
        linearTrackColor: AppColors.stitchSurfaceContainer,
        circularTrackColor: AppColors.stitchSurfaceContainer,
      ),
      iconTheme: const IconThemeData(color: AppColors.stitchOnSurfaceVariant, size: 22),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
            fontSize: 36,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w800,
            color: AppColors.stitchPrimary,
            letterSpacing: -0.5),
        displayMedium: TextStyle(
            fontSize: 28,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            color: AppColors.stitchPrimary,
            letterSpacing: -0.4),
        displaySmall: TextStyle(
            fontSize: 22,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            color: AppColors.stitchPrimary),
        headlineLarge: TextStyle(
            fontSize: 22,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            color: AppColors.stitchPrimary,
            letterSpacing: -0.3),
        headlineMedium: TextStyle(
            fontSize: 18,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w600,
            color: AppColors.stitchPrimary),
        headlineSmall: TextStyle(
            fontSize: 16,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w600,
            color: AppColors.stitchPrimary),
        titleLarge: TextStyle(
            fontSize: 16,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            color: AppColors.stitchOnSurface),
        titleMedium: TextStyle(
            fontSize: 14,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w600,
            color: AppColors.stitchOnSurface),
        titleSmall: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.stitchOnSurfaceVariant),
        bodyLarge: TextStyle(
            fontSize: 16,
            fontFamily: AppFonts.body,
            color: AppColors.stitchOnSurface,
            height: 1.5),
        bodyMedium: TextStyle(
            fontSize: 14,
            fontFamily: AppFonts.body,
            color: AppColors.stitchOnSurfaceVariant,
            height: 1.5),
        bodySmall: TextStyle(
            fontSize: 12,
            fontFamily: AppFonts.body,
            color: AppColors.stitchOnSurfaceVariant),
        labelLarge: TextStyle(
            fontSize: 12,
            fontFamily: AppFonts.mono,
            fontWeight: FontWeight.w700,
            color: AppColors.stitchOnSurface),
        labelMedium: TextStyle(
            fontSize: 11,
            fontFamily: AppFonts.mono,
            fontWeight: FontWeight.w600,
            color: AppColors.stitchOnSurfaceVariant),
        labelSmall: TextStyle(
            fontSize: 10,
            fontFamily: AppFonts.mono,
            fontWeight: FontWeight.w500,
            color: AppColors.stitchOnSurfaceVariant,
            letterSpacing: 0.06),
      ),
    );
  }

  static ThemeData get lightTheme {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.lightSurface,
      colorScheme: const ColorScheme.light(
        primary: AppColors.stitchPrimaryContainer,
        primaryContainer: AppColors.stitchPrimaryFixedDim,
        secondary: AppColors.stitchSecondary,
        surface: AppColors.lightCard,
        surfaceContainerHighest: Color(0xFFF1F5F9),
        error: AppColors.error,
        onPrimary: AppColors.stitchOnPrimaryContainer,
        onSecondary: AppColors.stitchOnSecondary,
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
          backgroundColor: AppColors.stitchPrimaryContainer,
          foregroundColor: AppColors.stitchOnPrimaryContainer,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rXl),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.lightText,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          side: const BorderSide(color: AppColors.lightDivider),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.rXl),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.stitchPrimaryContainer),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide: const BorderSide(color: AppColors.stitchPrimaryContainer, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.lightMuted),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.lightCard,
        selectedItemColor: AppColors.stitchPrimaryContainer,
        unselectedItemColor: AppColors.lightMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AppColors.stitchPrimaryContainer,
        unselectedLabelColor: AppColors.lightMuted,
        indicatorColor: AppColors.stitchPrimaryContainer,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFE2E8F0),
        selectedColor: AppColors.stitchPrimaryContainer,
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
            fontSize: 32,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w800,
            color: AppColors.lightText),
        displayMedium: TextStyle(
            fontSize: 28,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            color: AppColors.lightText),
        headlineLarge: TextStyle(
            fontSize: 22,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w700,
            color: AppColors.lightText),
        headlineMedium: TextStyle(
            fontSize: 18,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w600,
            color: AppColors.lightText),
        titleLarge: TextStyle(
            fontSize: 16,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w600,
            color: AppColors.lightText),
        titleMedium: TextStyle(
            fontSize: 14,
            fontFamily: AppFonts.display,
            fontWeight: FontWeight.w500,
            color: AppColors.lightText),
        bodyLarge: TextStyle(
            fontSize: 15,
            fontFamily: AppFonts.body,
            color: AppColors.lightTextSecondary),
        bodyMedium: TextStyle(
            fontSize: 14,
            fontFamily: AppFonts.body,
            color: AppColors.lightTextSecondary),
        bodySmall: TextStyle(
            fontSize: 12,
            fontFamily: AppFonts.body,
            color: AppColors.lightMuted),
      ),
    );
  }
}
