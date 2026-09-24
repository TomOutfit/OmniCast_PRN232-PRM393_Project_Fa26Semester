// OmniCast - Program Detail Screen
// Shows program information, trailer, and related programs

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../data/models/program_model.dart';
import '../../../data/models/channel_model.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../../logic/watchlist/watchlist_bloc.dart';
import '../../../data/models/watchlist_item_model.dart';
import '../../widgets/live_pulse_widget.dart';

class ProgramDetailScreen extends StatefulWidget {
  final String? programId;
  final LiveEventModel? program;

  const ProgramDetailScreen({
    super.key,
    this.programId,
    this.program,
  });

  @override
  State<ProgramDetailScreen> createState() => _ProgramDetailScreenState();
}

class _ProgramDetailScreenState extends State<ProgramDetailScreen> {
  bool _isInWatchlist = false;
  LiveEventModel? _program;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProgramData();
  }

  void _loadProgramData() {
    if (widget.program != null) {
      _program = widget.program;
      setState(() => _isLoading = false);
    } else if (widget.programId != null) {
      context.read<ProgramsBloc>().add(LoadProgramDetails(widget.programId!));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ProgramsBloc, ProgramsState>(
      listener: (context, state) {
        if (state is ProgramDetailsLoaded) {
          setState(() {
            _program = state.program;
            _isLoading = false;
          });
        } else if (state is ProgramsError) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: _isLoading
          ? _buildLoadingState()
          : _program == null
              ? _buildErrorState()
              : _buildContent(),
    );
  }

  Widget _buildLoadingState() {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        backgroundColor: AppColors.dark950,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: const Center(child: CircularProgressIndicator()),
    );
  }

  Widget _buildErrorState() {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        backgroundColor: AppColors.dark950,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            const Text('Không tìm thấy chương trình', style: TextStyle(color: Colors.white)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Quay lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      body: CustomScrollView(
        slivers: [
          // Hero Section with Thumbnail
          _buildHeroSection(),

          // Program Info
          SliverToBoxAdapter(
            child: _buildProgramInfo(),
          ),

          // Action Buttons
          SliverToBoxAdapter(
            child: _buildActionButtons(),
          ),

          // Related Programs
          SliverToBoxAdapter(
            child: _buildRelatedPrograms(),
          ),

          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
      // Bottom Watch Button
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildHeroSection() {
    return SliverAppBar(
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
      actions: [
        IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.share, color: Colors.white, size: 20),
          ),
          onPressed: () {},
        ),
        IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.cast, color: Colors.white, size: 20),
          ),
          onPressed: () {},
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            // Thumbnail
            if (_program!.thumbnailUrl != null)
              CachedNetworkImage(
                imageUrl: _program!.thumbnailUrl!,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: AppColors.dark800,
                ),
                errorWidget: (context, url, error) => _buildPlaceholder(),
              )
            else
              _buildPlaceholder(),

            // Gradient Overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.7),
                    AppColors.dark950,
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
              ),
            ),

            // Play Button
            Center(
              child: GestureDetector(
                onTap: () => _playProgram(),
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.9),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.5),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.play_arrow,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
            ),

            // Live Badge & Status
            Positioned(
              top: 100,
              left: 16,
              child: _program!.isLive
                  ? const LiveBadge()
                  : Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.dark700,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _program!.isScheduled ? 'Sắp phát' : 'Đã kết thúc',
                        style: const TextStyle(
                          color: AppColors.dark400,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppColors.dark800,
      child: const Center(
        child: Icon(
          Icons.tv,
          size: 64,
          color: AppColors.dark600,
        ),
      ),
    );
  }

  Widget _buildProgramInfo() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            _program!.title,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              height: 1.2,
            ),
          ),

          const SizedBox(height: 12),

          // Channel Info
          if (_program!.channel != null)
            GestureDetector(
              onTap: () {
                // Navigate to channel
              },
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.dark700,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: _program!.channel!.logoUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: _program!.channel!.logoUrl!,
                              fit: BoxFit.cover,
                            ),
                          )
                        : const Icon(
                            Icons.tv,
                            color: AppColors.dark500,
                            size: 18,
                          ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _program!.channel!.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.chevron_right,
                    color: AppColors.dark500,
                    size: 20,
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),

          // Stats Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.dark800,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatItem(
                  icon: Icons.visibility,
                  value: _formatCount(_program!.viewerCount),
                  label: 'Đang xem',
                ),
                _StatItem(
                  icon: Icons.thumb_up_outlined,
                  value: _formatCount(_program!.likeCount),
                  label: 'Thích',
                ),
                _StatItem(
                  icon: Icons.comment_outlined,
                  value: _formatCount(_program!.commentCount),
                  label: 'Bình luận',
                ),
                _StatItem(
                  icon: Icons.share_outlined,
                  value: _formatCount(_program!.shareCount),
                  label: 'Chia sẻ',
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Schedule Info
          _InfoSection(
            title: 'Lịch phát',
            child: Row(
              children: [
                const Icon(
                  Icons.schedule,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _formatDateTime(_program!.scheduledAt),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (_program!.duration != null)
                        Text(
                          'Thời lượng: ${_program!.duration} phút',
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

          // Description
          if (_program!.description != null) ...[
            const SizedBox(height: 16),
            _InfoSection(
              title: 'Mô tả',
              child: Text(
                _program!.description!,
                style: const TextStyle(
                  color: AppColors.dark300,
                  height: 1.6,
                ),
              ),
            ),
          ],

          // Tags
          if (_program!.tags.isNotEmpty) ...[
            const SizedBox(height: 16),
            _InfoSection(
              title: 'Tags',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _program!.tags.map((tag) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.dark800,
                      borderRadius: BorderRadius.circular(16),
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
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _toggleWatchlist,
              icon: Icon(
                _isInWatchlist ? Icons.bookmark : Icons.bookmark_outline,
              ),
              label: Text(_isInWatchlist ? 'Đã lưu' : 'Lưu'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                side: BorderSide(
                  color: _isInWatchlist ? AppColors.primary : AppColors.dark600,
                ),
                foregroundColor: _isInWatchlist ? AppColors.primary : Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _setReminder(),
              icon: const Icon(Icons.notifications_outlined),
              label: const Text('Nhắc lịch'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRelatedPrograms() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Chương trình liên quan',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              TextButton(
                onPressed: () {},
                child: const Text('Xem thêm'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 160,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: 5,
              itemBuilder: (context, index) {
                return _RelatedProgramCard();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dark900,
        border: Border(
          top: BorderSide(color: AppColors.dark700.withOpacity(0.5)),
        ),
      ),
      child: SafeArea(
        child: ElevatedButton(
          onPressed: _program!.isLive ? _playProgram : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: _program!.isLive
                ? AppColors.liveRed
                : AppColors.dark700,
            padding: const EdgeInsets.symmetric(vertical: 14),
            disabledBackgroundColor: AppColors.dark700,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _program!.isLive ? Icons.play_arrow : Icons.schedule,
                color: Colors.white,
              ),
              const SizedBox(width: 8),
              Text(
                _program!.isLive
                    ? 'Xem ngay'
                    : _program!.isScheduled
                        ? 'Sắp phát sóng'
                        : 'Đã kết thúc',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _playProgram() {
    // Navigate to video player
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang mở trình phát...'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _toggleWatchlist() {
    if (_isInWatchlist) {
      // Remove from watchlist
      context.read<WatchlistBloc>().add(
            RemoveFromWatchlist(0), // Would use actual ID
          );
    } else {
      // Add to watchlist
      final item = WatchlistItemModel(
        programId: _program!.id,
        programTitle: _program!.title,
        thumbnailUrl: _program!.thumbnailUrl,
        channelId: _program!.channelId,
        channelName: _program!.channel?.name,
        scheduledAt: _program!.scheduledAt,
        duration: _program!.duration,
        reminderEnabled: false,
        addedAt: DateTime.now(),
      );
      context.read<WatchlistBloc>().add(AddToWatchlist(item));
    }

    setState(() {
      _isInWatchlist = !_isInWatchlist;
    });
  }

  void _setReminder() {
    // Set reminder for 15 minutes before
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã đặt nhắc trước 15 phút'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }

  String _formatDateTime(DateTime dateTime) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final hour = dateTime.hour.toString().padLeft(2, '0');
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '${dateTime.day} ${months[dateTime.month - 1]} ${dateTime.year}, $hour:$minute';
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppColors.dark400),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.dark500,
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}

class _InfoSection extends StatelessWidget {
  final String title;
  final Widget child;

  const _InfoSection({
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.dark400,
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _RelatedProgramCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.dark700,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(12),
              ),
            ),
            child: const Center(
              child: Icon(
                Icons.play_circle_outline,
                color: AppColors.dark500,
                size: 32,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Program Title',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Channel Name',
                  style: const TextStyle(
                    color: AppColors.dark500,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
