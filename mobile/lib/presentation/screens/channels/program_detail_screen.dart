// OmniCast - Program Detail Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/programs/programs_bloc.dart';
import '../../../logic/auth/auth_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/program_model.dart';
import '../../../data/models/watchlist_item_model.dart';
import '../../../logic/watchlist/watchlist_bloc.dart';

class ProgramDetailScreen extends StatefulWidget {
  final String programId;

  const ProgramDetailScreen({
    super.key,
    required this.programId,
  });

  @override
  State<ProgramDetailScreen> createState() => _ProgramDetailScreenState();
}

class _ProgramDetailScreenState extends State<ProgramDetailScreen> {
  @override
  void initState() {
    super.initState();
    context.read<ProgramsBloc>().add(LoadProgramDetails(widget.programId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      body: BlocBuilder<ProgramsBloc, ProgramsState>(
        builder: (context, state) {
          if (state is ProgramsLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ProgramDetailsLoaded) {
            final program = state.program;
            return CustomScrollView(
              slivers: [
                // Video Player / Thumbnail
                SliverAppBar(
                  expandedHeight: 250,
                  pinned: true,
                  backgroundColor: AppColors.dark950,
                  leading: IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.arrow_back, color: Colors.white),
                    ),
                    onPressed: () => context.pop(),
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: _VideoPlayer(program: program),
                  ),
                ),

                // Program Info
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title and Status
                        Row(
                          children: [
                            if (program.isLive) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.liveRed,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.circle, size: 8, color: Colors.white),
                                    SizedBox(width: 6),
                                    Text(
                                      'LIVE',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Expanded(
                              child: Text(
                                program.title,
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Meta info
                        Row(
                          children: [
                            if (program.isLive) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.dark800,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.visibility,
                                      size: 14,
                                      color: AppColors.primary,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${_formatNumber(program.viewerCount)} đang xem',
                                      style: const TextStyle(
                                        color: AppColors.dark300,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                            ],
                            Icon(
                              Icons.schedule,
                              size: 14,
                              color: AppColors.dark400,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _formatScheduleTime(program),
                              style: const TextStyle(
                                color: AppColors.dark400,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Action buttons
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  // Watch stream
                                },
                                icon: Icon(
                                  program.isLive
                                      ? Icons.play_arrow
                                      : Icons.notifications_outlined,
                                ),
                                label: Text(
                                  program.isLive ? 'Xem ngay' : 'Nhắc tôi',
                                ),
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            _ActionButton(
                              icon: Icons.thumb_up_outlined,
                              label: _formatNumber(program.likeCount),
                              onTap: () {},
                            ),
                            const SizedBox(width: 8),
                            _ActionButton(
                              icon: Icons.share_outlined,
                              label: 'Chia sẻ',
                              onTap: () {},
                            ),
                            const SizedBox(width: 8),
                            _ActionButton(
                              icon: Icons.bookmark_outline,
                              label: 'Lưu',
                              onTap: () => _addToWatchlist(context, program),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Channel info
                        if (program.channel != null)
                          InkWell(
                            onTap: () {
                              context.push('/channel/${program.channel!.id}');
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.dark800,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppColors.dark700,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: program.channel!.logoUrl != null
                                        ? ClipRRect(
                                            borderRadius: BorderRadius.circular(12),
                                            child: CachedNetworkImage(
                                              imageUrl: program.channel!.logoUrl!,
                                              fit: BoxFit.cover,
                                            ),
                                          )
                                        : const Icon(
                                            Icons.tv,
                                            color: AppColors.dark500,
                                          ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          program.channel!.name,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const Text(
                                          'Xem kênh',
                                          style: TextStyle(
                                            color: AppColors.dark400,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(
                                    Icons.chevron_right,
                                    color: AppColors.dark500,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 24),

                        // Description
                        if (program.description != null) ...[
                          const Text(
                            'Mô tả',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            program.description!,
                            style: const TextStyle(
                              color: AppColors.dark300,
                              fontSize: 14,
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Tags
                        if (program.tags.isNotEmpty) ...[
                          const Text(
                            'Tags',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: program.tags.map((tag) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.dark800,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '#$tag',
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 12,
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

                const SliverToBoxAdapter(
                  child: SizedBox(height: 100),
                ),
              ],
            );
          }

          if (state is ProgramsError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: AppColors.error),
                  const SizedBox(height: 16),
                  Text(
                    state.message,
                    style: const TextStyle(color: AppColors.error),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<ProgramsBloc>().add(
                            LoadProgramDetails(widget.programId),
                          );
                    },
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          return const SizedBox();
        },
      ),
    );
  }

  void _addToWatchlist(BuildContext context, LiveEventModel program) {
    final watchlistItem = WatchlistItemModel(
      programId: program.id,
      programTitle: program.title,
      thumbnailUrl: program.thumbnailUrl,
      channelId: program.channelId,
      channelName: program.channel?.name,
      scheduledAt: program.scheduledAt,
      duration: program.duration,
      reminderEnabled: false,
      addedAt: DateTime.now(),
    );

    context.read<WatchlistBloc>().add(AddToWatchlist(watchlistItem));

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã thêm vào danh sách yêu thích'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  String _formatScheduleTime(LiveEventModel program) {
    if (program.isLive) {
      return 'Đang phát';
    }

    final now = DateTime.now();
    final diff = program.scheduledAt.difference(now);

    if (diff.inDays == 0) {
      return 'Hôm nay ${program.scheduledAt.hour.toString().padLeft(2, '0')}:${program.scheduledAt.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Ngày mai ${program.scheduledAt.hour.toString().padLeft(2, '0')}:${program.scheduledAt.minute.toString().padLeft(2, '0')}';
    } else {
      return '${program.scheduledAt.day}/${program.scheduledAt.month}/${program.scheduledAt.year} ${program.scheduledAt.hour.toString().padLeft(2, '0')}:${program.scheduledAt.minute.toString().padLeft(2, '0')}';
    }
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

class _VideoPlayer extends StatelessWidget {
  final LiveEventModel program;

  const _VideoPlayer({required this.program});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Thumbnail or Stream
        if (program.thumbnailUrl != null)
          CachedNetworkImage(
            imageUrl: program.thumbnailUrl!,
            fit: BoxFit.cover,
            errorWidget: (_, __, ___) => Container(
              color: AppColors.dark800,
              child: const Icon(
                Icons.play_circle_outline,
                size: 80,
                color: AppColors.dark500,
              ),
            ),
          )
        else
          Container(
            color: AppColors.dark800,
            child: const Icon(
              Icons.play_circle_outline,
              size: 80,
              color: AppColors.dark500,
            ),
          ),

        // Gradient overlay
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.transparent,
                AppColors.dark950.withOpacity(0.7),
              ],
            ),
          ),
        ),

        // Play button overlay
        if (program.isLive)
          Positioned.fill(
            child: Center(
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.liveRed.withOpacity(0.9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow,
                  size: 40,
                  color: Colors.white,
                ),
              ),
            ),
          ),

        // Live indicator
        if (program.isLive)
          Positioned(
            top: 16,
            left: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.liveRed,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle, size: 8, color: Colors.white),
                  SizedBox(width: 6),
                  Text(
                    'LIVE',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),

        // Viewer count
        if (program.isLive)
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.visibility,
                    size: 14,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _formatNumber(program.viewerCount),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
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

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.dark300, size: 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.dark400,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
