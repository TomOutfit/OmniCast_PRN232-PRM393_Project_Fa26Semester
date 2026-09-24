// OmniCast - Featured Carousel Widget
// Auto-scrolling carousel for featured content

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/channel_model.dart';
import '../../../../data/models/program_model.dart';
import '../../../widgets/live_pulse_widget.dart';

class FeaturedCarousel extends StatefulWidget {
  final List<FeaturedItem> items;
  final Duration autoScrollDuration;
  final bool autoScroll;
  final double height;
  final Function(int)? onPageChanged;

  const FeaturedCarousel({
    super.key,
    required this.items,
    this.autoScrollDuration = const Duration(seconds: 5),
    this.autoScroll = true,
    this.height = 220,
    this.onPageChanged,
  });

  @override
  State<FeaturedCarousel> createState() => _FeaturedCarouselState();
}

class _FeaturedCarouselState extends State<FeaturedCarousel> {
  late PageController _pageController;
  Timer? _autoScrollTimer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.92);
    if (widget.autoScroll) {
      _startAutoScroll();
    }
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    _autoScrollTimer = Timer.periodic(widget.autoScrollDuration, (timer) {
      if (mounted && widget.items.isNotEmpty) {
        final nextPage = (_currentPage + 1) % widget.items.length;
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });
    widget.onPageChanged?.call(page);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return SizedBox(
        height: widget.height,
        child: const Center(
          child: Text(
            'Không có nội dung nổi bật',
            style: TextStyle(color: AppColors.dark400),
          ),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: widget.height,
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: _onPageChanged,
            itemCount: widget.items.length,
            itemBuilder: (context, index) {
              return _FeaturedCard(
                item: widget.items[index],
                onTap: () => _onItemTap(widget.items[index]),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        // Page Indicators
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.items.length, (index) {
            return _PageIndicator(
              isActive: index == _currentPage,
              onTap: () {
                _pageController.animateToPage(
                  index,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeInOut,
                );
              },
            );
          }),
        ),
      ],
    );
  }

  void _onItemTap(FeaturedItem item) {
    if (item is ChannelFeaturedItem) {
      context.push('/channel/${item.channel.id}');
    } else if (item is ProgramFeaturedItem) {
      context.push('/program/${item.program.id}');
    }
  }
}

class _FeaturedCard extends StatelessWidget {
  final FeaturedItem item;
  final VoidCallback onTap;

  const _FeaturedCard({
    required this.item,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Background Image
              _buildBackground(),

              // Gradient Overlay
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.7),
                      Colors.black.withOpacity(0.9),
                    ],
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ),

              // Content
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: _buildContent(),
              ),

              // Live Badge
              if (item.isLive)
                Positioned(
                  top: 12,
                  left: 12,
                  child: const LiveBadge(),
                ),

              // Featured Badge
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.accentGold,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.star,
                        color: Colors.white,
                        size: 12,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        item.featuredLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackground() {
    if (item.imageUrl != null) {
      return CachedNetworkImage(
        imageUrl: item.imageUrl!,
        fit: BoxFit.cover,
        placeholder: (context, url) => Container(
          color: AppColors.dark800,
          child: const Center(
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
        errorWidget: (context, url, error) => _buildPlaceholder(),
      );
    }
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withOpacity(0.8),
            AppColors.accentCyan.withOpacity(0.8),
          ],
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.tv,
          size: 64,
          color: Colors.white30,
        ),
      ),
    );
  }

  Widget _buildContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Category
        if (item.category != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              item.category!,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        const SizedBox(height: 8),

        // Title
        Text(
          item.title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            height: 1.2,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),

        // Subtitle
        if (item.subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            item.subtitle!,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],

        // Channel/Time info
        const SizedBox(height: 8),
        Row(
          children: [
            if (item is ChannelFeaturedItem) ...[
              Icon(
                Icons.tv,
                size: 14,
                color: Colors.white.withOpacity(0.7),
              ),
              const SizedBox(width: 4),
              Text(
                (item as ChannelFeaturedItem).channel.name,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 12,
                ),
              ),
            ],
            if (item is ProgramFeaturedItem) ...[
              Icon(
                Icons.schedule,
                size: 14,
                color: Colors.white.withOpacity(0.7),
              ),
              const SizedBox(width: 4),
              Text(
                (item as ProgramFeaturedItem).formattedTime,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 12,
                ),
              ),
            ],
            if (item.viewerCount > 0) ...[
              const SizedBox(width: 12),
              Icon(
                Icons.visibility,
                size: 14,
                color: Colors.white.withOpacity(0.7),
              ),
              const SizedBox(width: 4),
              Text(
                _formatViewerCount(item.viewerCount),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 12,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  String _formatViewerCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return '$count';
  }
}

class _PageIndicator extends StatelessWidget {
  final bool isActive;
  final VoidCallback onTap;

  const _PageIndicator({
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 3),
        width: isActive ? 24 : 8,
        height: 8,
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : AppColors.dark600,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}

// Featured Item Models
abstract class FeaturedItem {
  String get id;
  String get title;
  String? get subtitle;
  String? get imageUrl;
  String? get category;
  String get featuredLabel;
  bool get isLive;
  int get viewerCount;
}

class ChannelFeaturedItem extends FeaturedItem {
  final ChannelModel channel;

  ChannelFeaturedItem({required this.channel});

  @override
  String get id => channel.id;

  @override
  String get title => channel.name;

  @override
  String? get subtitle => channel.tagline;

  @override
  String? get imageUrl => channel.bannerUrl;

  @override
  String? get category => channel.categoryDisplayName;

  @override
  String get featuredLabel => 'Nổi bật';

  @override
  bool get isLive => channel.isLive;

  @override
  int get viewerCount => channel.totalViews;
}

class ProgramFeaturedItem extends FeaturedItem {
  final LiveEventModel program;

  ProgramFeaturedItem({required this.program});

  @override
  String get id => program.id;

  @override
  String get title => program.title;

  @override
  String? get subtitle => program.channel?.name;

  @override
  String? get imageUrl => program.thumbnailUrl;

  @override
  String? get category => program.tags.isNotEmpty ? program.tags.first : null;

  @override
  String get featuredLabel => 'Hot';

  @override
  bool get isLive => program.isLive;

  @override
  int get viewerCount => program.viewerCount;

  String get formattedTime {
    final hour = program.scheduledAt.hour.toString().padLeft(2, '0');
    final minute = program.scheduledAt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

// Extension to convert models to featured items
extension ChannelToFeatured on ChannelModel {
  ChannelFeaturedItem toFeaturedItem() => ChannelFeaturedItem(channel: this);
}

extension ProgramToFeatured on LiveEventModel {
  ProgramFeaturedItem toFeaturedItem() => ProgramFeaturedItem(program: this);
}
