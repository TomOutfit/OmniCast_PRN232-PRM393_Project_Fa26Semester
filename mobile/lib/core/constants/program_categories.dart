// OmniCast - Category Constants
//
// Shared mapping between the OmniCast `LiveCategory` enum (backend) and
// the localized display name, icon and brand color used throughout the
// mobile UI. Mirrors the 19 categories defined in the Prisma schema
// and the 12 source mappings registered in ContentAggregatorService.

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ProgramCategory {
  final String value; // matches LiveCategory enum string
  final String label;
  final IconData icon;
  final Color color;

  const ProgramCategory({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });
}

class ProgramCategories {
  static const ProgramCategory all = ProgramCategory(
    value: '__ALL__',
    label: 'Tất cả',
    icon: Icons.apps_rounded,
    color: AppColors.primary,
  );

  /// Ordered list mirroring the Prisma `LiveCategory` enum (19 categories).
  /// Reordering here will reorder the home category grid and category-browse
  /// screen everywhere.
  static const List<ProgramCategory> all19 = [
    ProgramCategory(
      value: 'SPORTS',
      label: 'Thể thao',
      icon: Icons.sports_soccer,
      color: AppColors.sports,
    ),
    ProgramCategory(
      value: 'SHOW',
      label: 'Show',
      icon: Icons.theater_comedy,
      color: AppColors.entertainment,
    ),
    ProgramCategory(
      value: 'ENTERTAINMENT',
      label: 'Giải trí',
      icon: Icons.movie,
      color: AppColors.entertainment,
    ),
    ProgramCategory(
      value: 'CINE',
      label: 'Điện ảnh',
      icon: Icons.movie_filter,
      color: AppColors.cinema,
    ),
    ProgramCategory(
      value: 'DRAMA',
      label: 'Phim truyện',
      icon: Icons.tv,
      color: AppColors.cinema,
    ),
    ProgramCategory(
      value: 'NEWS',
      label: 'Tin tức',
      icon: Icons.article,
      color: AppColors.news,
    ),
    ProgramCategory(
      value: 'MUSIC',
      label: 'Âm nhạc',
      icon: Icons.music_note,
      color: AppColors.music,
    ),
    ProgramCategory(
      value: 'KIDS',
      label: 'Thiếu nhi',
      icon: Icons.child_care,
      color: AppColors.kids,
    ),
    ProgramCategory(
      value: 'TECH',
      label: 'Công nghệ',
      icon: Icons.memory,
      color: AppColors.tech,
    ),
    ProgramCategory(
      value: 'FOOD',
      label: 'Ẩm thực',
      icon: Icons.restaurant,
      color: AppColors.cinema,
    ),
    ProgramCategory(
      value: 'DOCUMENTARY',
      label: 'Khám phá',
      icon: Icons.travel_explore,
      color: AppColors.tech,
    ),
    ProgramCategory(
      value: 'EDUCATION',
      label: 'Giáo dục',
      icon: Icons.school,
      color: AppColors.kids,
    ),
    ProgramCategory(
      value: 'GAMING',
      label: 'Esports',
      icon: Icons.sports_esports,
      color: AppColors.music,
    ),
    ProgramCategory(
      value: 'PODCAST',
      label: 'Podcast',
      icon: Icons.mic,
      color: AppColors.music,
    ),
    ProgramCategory(
      value: 'LIFESTYLE',
      label: 'Phong cách sống',
      icon: Icons.spa,
      color: AppColors.entertainment,
    ),
    ProgramCategory(
      value: 'TRAVEL',
      label: 'Du lịch',
      icon: Icons.flight,
      color: AppColors.news,
    ),
    ProgramCategory(
      value: 'ART',
      label: 'Nghệ thuật',
      icon: Icons.palette,
      color: AppColors.entertainment,
    ),
    ProgramCategory(
      value: 'BUSINESS',
      label: 'Kinh doanh',
      icon: Icons.business_center,
      color: AppColors.news,
    ),
    ProgramCategory(
      value: 'HEALTH',
      label: 'Sức khỏe',
      icon: Icons.health_and_safety,
      color: AppColors.success,
    ),
  ];

  /// Lookup map by enum value (e.g. `lookup['SPORTS']`).
  static final Map<String, ProgramCategory> byValue = {
    for (final c in all19) c.value: c,
  };

  /// Convenience: localized display name with safe fallback to the raw
  /// enum string for unknown values.
  static String labelFor(String? value) {
    if (value == null || value.isEmpty) return 'Tất cả';
    return byValue[value]?.label ?? value;
  }

  /// Convenience: icon for an enum value with a sensible default.
  static IconData iconFor(String? value) {
    if (value == null || value.isEmpty) return Icons.apps_rounded;
    return byValue[value]?.icon ?? Icons.tv;
  }

  /// Convenience: brand color for an enum value.
  static Color colorFor(String? value) {
    if (value == null || value.isEmpty) return AppColors.primary;
    return byValue[value]?.color ?? AppColors.primary;
  }
}