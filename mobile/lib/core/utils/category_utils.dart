// OmniCast - Category Utilities
// Dynamic category mapping from backend API to UI icons and colors

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CategoryInfo {
  final String label;
  final IconData icon;
  final Color color;

  CategoryInfo({
    required this.label,
    required this.icon,
    required this.color,
  });
}

CategoryInfo getCategoryInfo(String category) {
  final cat = category.toUpperCase();

  switch (cat) {
    case 'SPORTS':
      return CategoryInfo(
        label: 'Thể thao',
        icon: Icons.sports_soccer,
        color: AppColors.sports,
      );
    case 'SHOW':
      return CategoryInfo(
        label: 'Show',
        icon: Icons.theater_comedy,
        color: AppColors.entertainment,
      );
    case 'ENTERTAINMENT':
      return CategoryInfo(
        label: 'Giải trí',
        icon: Icons.movie,
        color: AppColors.entertainment,
      );
    case 'CINE':
      return CategoryInfo(
        label: 'Điện ảnh',
        icon: Icons.movie_filter,
        color: AppColors.cinema,
      );
    case 'DRAMA':
      return CategoryInfo(
        label: 'Phim truyện',
        icon: Icons.tv,
        color: AppColors.cinema,
      );
    case 'NEWS':
      return CategoryInfo(
        label: 'Tin tức',
        icon: Icons.article,
        color: AppColors.news,
      );
    case 'MUSIC':
      return CategoryInfo(
        label: 'Âm nhạc',
        icon: Icons.music_note,
        color: AppColors.music,
      );
    case 'KIDS':
      return CategoryInfo(
        label: 'Thiếu nhi',
        icon: Icons.child_care,
        color: AppColors.kids,
      );
    case 'TECH':
      return CategoryInfo(
        label: 'Công nghệ',
        icon: Icons.memory,
        color: AppColors.tech,
      );
    case 'FOOD':
      return CategoryInfo(
        label: 'Ẩm thực',
        icon: Icons.restaurant,
        color: AppColors.cinema,
      );
    case 'DOCUMENTARY':
      return CategoryInfo(
        label: 'Khám phá',
        icon: Icons.travel_explore,
        color: AppColors.tech,
      );
    case 'EDUCATION':
      return CategoryInfo(
        label: 'Giáo dục',
        icon: Icons.school,
        color: AppColors.kids,
      );
    case 'GAMING':
      return CategoryInfo(
        label: 'Esports',
        icon: Icons.sports_esports,
        color: AppColors.music,
      );
    case 'PODCAST':
      return CategoryInfo(
        label: 'Podcast',
        icon: Icons.mic,
        color: AppColors.music,
      );
    case 'LIFESTYLE':
      return CategoryInfo(
        label: 'Phong cách sống',
        icon: Icons.spa,
        color: AppColors.entertainment,
      );
    case 'TRAVEL':
      return CategoryInfo(
        label: 'Du lịch',
        icon: Icons.flight,
        color: AppColors.news,
      );
    case 'ART':
      return CategoryInfo(
        label: 'Nghệ thuật',
        icon: Icons.palette,
        color: AppColors.entertainment,
      );
    case 'BUSINESS':
      return CategoryInfo(
        label: 'Kinh doanh',
        icon: Icons.business_center,
        color: AppColors.news,
      );
    case 'HEALTH':
      return CategoryInfo(
        label: 'Sức khỏe',
        icon: Icons.health_and_safety,
        color: AppColors.success,
      );
    default:
      return CategoryInfo(
        label: category,
        icon: Icons.apps_rounded,
        color: AppColors.primary,
      );
  }
}
