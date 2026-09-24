// OmniCast - Category Section Widget
// Browse channels/programs by category

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';

class CategorySection extends StatelessWidget {
  final List<CategoryItem> categories;
  final Function(CategoryItem)? onCategoryTap;
  final String title;
  final bool showViewAll;
  final VoidCallback? onViewAllTap;

  const CategorySection({
    super.key,
    required this.categories,
    this.onCategoryTap,
    this.title = 'Danh mục',
    this.showViewAll = true,
    this.onViewAllTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        if (title.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                if (showViewAll)
                  TextButton(
                    onPressed: onViewAllTap ?? () {},
                    child: const Text('Xem tất cả'),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 12),

        // Categories Grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: categories.map((category) {
              return CategoryChip(
                category: category,
                onTap: () => onCategoryTap?.call(category),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class CategoryChip extends StatelessWidget {
  final CategoryItem category;
  final VoidCallback? onTap;
  final bool isSelected;

  const CategoryChip({
    super.key,
    required this.category,
    this.onTap,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? category.color.withOpacity(0.2)
              : AppColors.dark800,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? category.color : AppColors.dark700,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              category.icon,
              size: 18,
              color: isSelected ? category.color : AppColors.dark400,
            ),
            const SizedBox(width: 8),
            Text(
              category.label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.dark300,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            if (category.count != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected
                      ? category.color.withOpacity(0.3)
                      : AppColors.dark700,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${category.count}',
                  style: TextStyle(
                    color: isSelected ? category.color : AppColors.dark500,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CategoryItem {
  final String id;
  final String label;
  final IconData icon;
  final Color color;
  final int? count;
  final String? category;

  const CategoryItem({
    required this.id,
    required this.label,
    required this.icon,
    required this.color,
    this.count,
    this.category,
  });

  // Default categories
  static const List<CategoryItem> defaultCategories = [
    CategoryItem(
      id: 'SPORTS',
      label: 'Thể thao',
      icon: Icons.sports,
      color: Color(0xFF22C55E),
    ),
    CategoryItem(
      id: 'ENTERTAINMENT',
      label: 'Giải trí',
      icon: Icons.movie,
      color: Color(0xFFEAB308),
    ),
    CategoryItem(
      id: 'CINE',
      label: 'Điện ảnh',
      icon: Icons.theater_comedy,
      color: Color(0xFF8B5CF6),
    ),
    CategoryItem(
      id: 'MUSIC',
      label: 'Âm nhạc',
      icon: Icons.music_note,
      color: Color(0xFFEC4899),
    ),
    CategoryItem(
      id: 'NEWS',
      label: 'Tin tức',
      icon: Icons.newspaper,
      color: Color(0xFF3B82F6),
    ),
    CategoryItem(
      id: 'DRAMA',
      label: 'Phim truyện',
      icon: Icons.live_tv,
      color: Color(0xFFEF4444),
    ),
    CategoryItem(
      id: 'KIDS',
      label: 'Thiếu nhi',
      icon: Icons.child_care,
      color: Color(0xFFF472B6),
    ),
    CategoryItem(
      id: 'TECH',
      label: 'Công nghệ',
      icon: Icons.computer,
      color: Color(0xFF06B6D4),
    ),
    CategoryItem(
      id: 'FOOD',
      label: 'Ẩm thực',
      icon: Icons.restaurant,
      color: Color(0xFFF97316),
    ),
    CategoryItem(
      id: 'LIFESTYLE',
      label: 'Phong cách',
      icon: Icons.spa,
      color: Color(0xFF10B981),
    ),
  ];
}

// Category Grid View
class CategoryGridSection extends StatelessWidget {
  final List<CategoryItem> categories;
  final Function(CategoryItem)? onCategoryTap;
  final String title;

  const CategoryGridSection({
    super.key,
    required this.categories,
    this.onCategoryTap,
    this.title = 'Khám phá theo danh mục',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.6,
          ),
          itemCount: categories.length,
          itemBuilder: (context, index) {
            return _CategoryGridCard(
              category: categories[index],
              onTap: () => onCategoryTap?.call(categories[index]),
            );
          },
        ),
      ],
    );
  }
}

class _CategoryGridCard extends StatelessWidget {
  final CategoryItem category;
  final VoidCallback? onTap;

  const _CategoryGridCard({
    required this.category,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              category.color.withOpacity(0.3),
              category.color.withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: category.color.withOpacity(0.3),
          ),
        ),
        child: Stack(
          children: [
            // Background Icon
            Positioned(
              right: -10,
              bottom: -10,
              child: Icon(
                category.icon,
                size: 80,
                color: category.color.withOpacity(0.2),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: category.color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      category.icon,
                      color: category.color,
                      size: 20,
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category.label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      if (category.count != null)
                        Text(
                          '${category.count} kênh',
                          style: const TextStyle(
                            color: AppColors.dark400,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Compact Category List
class CategoryListSection extends StatelessWidget {
  final List<CategoryItem> categories;
  final Function(CategoryItem)? onCategoryTap;
  final String title;

  const CategoryListSection({
    super.key,
    required this.categories,
    this.onCategoryTap,
    this.title = 'Danh mục',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: categories.length,
            itemBuilder: (context, index) {
              return _CategoryListCard(
                category: categories[index],
                onTap: () => onCategoryTap?.call(categories[index]),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CategoryListCard extends StatelessWidget {
  final CategoryItem category;
  final VoidCallback? onTap;

  const _CategoryListCard({
    required this.category,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: category.color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: category.color.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                category.icon,
                color: category.color,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              category.label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
