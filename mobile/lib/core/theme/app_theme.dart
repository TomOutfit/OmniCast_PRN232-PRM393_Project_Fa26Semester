import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppColors {
  // Primary Brand Colors
  static const Color primary = Color(0xFF0EA5E9);
  static const Color primaryLight = Color(0xFF38BDF8);
  static const Color primaryDark = Color(0xFF0284C7);

  // Accent Colors
  static const Color accentGold = Color(0xFFFFD700);
  static const Color accentCyan = Color(0xFF00D9FF);
  static const Color accentMagenta = Color(0xFFFF00FF);

  // Dark Theme Colors
  static const Color dark950 = Color(0xFF020617);
  static const Color dark900 = Color(0xFF0F172A);
  static const Color dark800 = Color(0xFF1E293B);
  static const Color dark700 = Color(0xFF334155);
  static const Color dark600 = Color(0xFF475569);
  static const Color dark500 = Color(0xFF64748B);
  static const Color dark400 = Color(0xFF94A3B8);
  static const Color dark300 = Color(0xFFCBD5E1);

  // Light Theme Colors
  static const Color lightSurface = Color(0xFFF8FAFC);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightDivider = Color(0xFFCBD5E1);
  static const Color lightMuted = Color(0xFF64748B);
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF334155);

  // Status Colors
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Live Badge
  static const Color liveRed = Color(0xFFDC2626);

  // Category Colors — Brand Guidelines 25 Kênh / 19 Category
  static const Color sports = Color(0xFFEF4444);      // Đỏ - Thể thao
  static const Color entertainment = Color(0xFFEC4899); // Hồng - Giải trí
  static const Color news = Color(0xFF3B82F6);          // Xanh dương - Tin tức
  static const Color music = Color(0xFFA855F7);         // Tím - Âm nhạc
  static const Color cinema = Color(0xFFF59E0B);         // Cam - Điện ảnh / Phim truyện
  static const Color kids = Color(0xFF84CC16);          // Xanh cốm - Thiếu nhi
  static const Color tech = Color(0xFF06B6D4);          // Cyan - Công nghệ
  static const Color food = Color(0xFFEA580C);           // Cam ấm - Ẩm thực
  static const Color education = Color(0xFF8B5CF6);      // Tím nhạt - Giáo dục
  // --- 8 category mở rộng ---
  static const Color gaming = Color(0xFFDC2626);        // Đỏ rực - Esports & Indie
  static const Color podcast = Color(0xFFF59E0B);       // Vàng cam - Audio / Sách nói
  static const Color lifestyle = Color(0xFFF43F5E);     // Hồng rose - Wellness / Fashion
  static const Color travel = Color(0xFF14B8A6);        // Teal - Du lịch
  static const Color art = Color(0xFFE11D48);           // Đỏ hồng - Nghệ thuật
  static const Color business = Color(0xFF1E40AF);      // Navy - Tài chính / Khởi nghiệp
  static const Color health = Color(0xFF10B981);        // Xanh lá - Sức khỏe / Y khoa
  static const Color documentary = Color(0xFF14B8A6);   // Teal - Discovery / Tài liệu
  static const Color show = Color(0xFF8B5CF6);           // Tím - Show / Talkshow
}

class AppTheme {
  static ThemeData get darkTheme {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.dark950,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        primaryContainer: AppColors.primaryDark,
        secondary: AppColors.accentCyan,
        surface: AppColors.dark900,
        surfaceContainerHighest: AppColors.dark800,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: Colors.white,
        onError: Colors.white,
      ),
    );
    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.dark950,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      cardTheme: CardThemeData(
        color: AppColors.dark800,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.dark700, width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          side: const BorderSide(color: AppColors.dark600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.dark800,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.dark700),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.dark700),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.dark500),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.dark900,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.dark500,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.dark400,
        indicatorColor: AppColors.primary,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.dark800,
        selectedColor: AppColors.primary,
        labelStyle: const TextStyle(color: Colors.white),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.dark700,
        thickness: 0.5,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
            fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
        displayMedium: TextStyle(
            fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
        headlineLarge: TextStyle(
            fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        headlineMedium: TextStyle(
            fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white),
        titleLarge: TextStyle(
            fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white),
        titleMedium: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w500, color: Colors.white),
        bodyLarge: TextStyle(fontSize: 16, color: AppColors.dark300),
        bodyMedium: TextStyle(fontSize: 14, color: AppColors.dark300),
        bodySmall: TextStyle(fontSize: 12, color: AppColors.dark400),
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
          borderRadius: BorderRadius.circular(16),
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
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.lightText,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          side: const BorderSide(color: AppColors.lightDivider),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
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
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.lightDivider,
        thickness: 0.5,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: AppColors.lightText),
        displayMedium: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: AppColors.lightText),
        headlineLarge: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.lightText),
        headlineMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.lightText),
        titleLarge: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.lightText),
        titleMedium: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppColors.lightText),
        bodyLarge: TextStyle(fontSize: 16, color: AppColors.lightTextSecondary),
        bodyMedium:
            TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
        bodySmall: TextStyle(fontSize: 12, color: AppColors.lightMuted),
      ),
    );
  }
}
