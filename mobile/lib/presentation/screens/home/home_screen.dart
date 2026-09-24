// OmniCast - Home Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/channel_logo.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadData() {
    context.read<ChannelsBloc>().add(const LoadChannels(isFeatured: true));
    context.read<ProgramsBloc>().add(LoadLiveNow());
  }

  Future<void> _onRefresh() async {
    _loadData();
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Widget build(BuildContext context) {
    return OfflineBanner(
      child: Scaffold(
        backgroundColor: AppColors.dark950,
        body: RefreshIndicator(
          onRefresh: _onRefresh,
          color: AppColors.primary,
          backgroundColor: AppColors.dark800,
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // App Bar
              SliverAppBar(
                floating: true,
                snap: true,
                backgroundColor: AppColors.dark950,
                title: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.asset(
                          'assets/images/omnicast_logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(Icons.tv, color: Colors.white, size: 24),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'OmniCast',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    onPressed: () {},
                  ),
                  IconButton(
                    icon: const Icon(Icons.person_outline),
                    onPressed: () => context.push('/profile'),
                  ),
                ],
              ),

              // Live Now Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const _LivePulse(),
                          const SizedBox(width: 8),
                          const Text(
                            'ĐANG PHÁT SÓNG',
                            style: TextStyle(
                              color: AppColors.liveRed,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Live Now',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Live Programs Carousel
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 200,
                  child: BlocBuilder<ProgramsBloc, ProgramsState>(
                    builder: (context, state) {
                      if (state is ProgramsLoading) {
                        return const Center(
                          child: CircularProgressIndicator(),
                        );
                      }

                      if (state is ProgramsLoaded && state.isLiveNow) {
                        if (state.programs.isEmpty) {
                          return const Center(
                            child: Text(
                              'Không có chương trình đang phát',
                              style: TextStyle(color: AppColors.dark400),
                            ),
                          );
                        }

                        return ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: state.programs.length,
                          itemBuilder: (context, index) {
                            final program = state.programs[index];
                            return _LiveProgramCard(
                              program: program,
                              onTap: () => context.push('/program/${program.id}'),
                            );
                          },
                        );
                      }

                      return const SizedBox();
                    },
                  ),
                ),
              ),

              // Featured Channels Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Kênh nổi bật',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.go('/channels'),
                        child: const Text('Xem tất cả'),
                      ),
                    ],
                  ),
                ),
              ),

              // Featured Channels Grid
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: BlocBuilder<ChannelsBloc, ChannelsState>(
                  builder: (context, state) {
                    if (state is ChannelsLoading) {
                      return const SliverToBoxAdapter(
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }

                    if (state is ChannelsLoaded) {
                      // Hiển thị tất cả các kênh (tối đa 12 kênh từ DB)
                      final channelCount = state.channels.length.clamp(0, 12);
                      return SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final channel = state.channels[index];
                            return _ChannelCard(
                              channel: channel,
                              onTap: () => context.push('/channel/${channel.id}'),
                            );
                          },
                          childCount: channelCount,
                        ),
                      );
                    }

                    return const SliverToBoxAdapter(child: SizedBox());
                  },
                ),
              ),

              // Categories Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Danh mục',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _CategoryChip(
                            label: 'Thể thao',
                            icon: Icons.sports,
                            onTap: () {},
                          ),
                          _CategoryChip(
                            label: 'Giải trí',
                            icon: Icons.movie,
                            onTap: () {},
                          ),
                          _CategoryChip(
                            label: 'Âm nhạc',
                            icon: Icons.music_note,
                            onTap: () {},
                          ),
                          _CategoryChip(
                            label: 'Tin tức',
                            icon: Icons.newspaper,
                            onTap: () {},
                          ),
                          _CategoryChip(
                            label: 'Phim truyện',
                            icon: Icons.theater_comedy,
                            onTap: () {},
                          ),
                          _CategoryChip(
                            label: 'Thiếu nhi',
                            icon: Icons.child_care,
                            onTap: () {},
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(
                child: SizedBox(height: 100),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LivePulse extends StatefulWidget {
  const _LivePulse();

  @override
  State<_LivePulse> createState() => _LivePulseState();
}

class _LivePulseState extends State<_LivePulse>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
    _animation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: AppColors.liveRed.withOpacity(_animation.value),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.liveRed.withOpacity(_animation.value * 0.5),
                blurRadius: 8,
                spreadRadius: 2,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LiveProgramCard extends StatelessWidget {
  final LiveEventModel program;
  final VoidCallback onTap;

  const _LiveProgramCard({
    required this.program,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 280,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.liveRed.withOpacity(0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Container(
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.dark700,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Stack(
                children: [
                  if (program.thumbnailUrl != null)
                    CachedNetworkImage(
                      imageUrl: program.thumbnailUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                    )
                  else
                    const Center(
                      child: Icon(
                        Icons.play_circle_outline,
                        size: 48,
                        color: AppColors.dark500,
                      ),
                    ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.liveRed,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle, size: 6, color: Colors.white),
                          SizedBox(width: 4),
                          Text(
                            'LIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.7),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.visibility, size: 12, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            '${_formatNumber(program.viewerCount)} đang xem',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    program.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (program.channel != null)
                    Text(
                      program.channel!.name,
                      style: const TextStyle(
                        color: AppColors.dark400,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }
}

class _ChannelCard extends StatelessWidget {
  final ChannelModel channel;
  final VoidCallback onTap;

  const _ChannelCard({
    required this.channel,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: channel.isLive
                ? AppColors.liveRed.withOpacity(0.5)
                : AppColors.dark700,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              children: [
                Hero(
                  tag: 'channel_logo_${channel.id}',
                  child: ChannelLogo(
                    channel: channel,
                    size: 56,
                    showLiveIndicator: channel.isLive,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                channel.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.dark700),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: AppColors.primary),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
