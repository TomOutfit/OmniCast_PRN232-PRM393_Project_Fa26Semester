// OmniCast - Channel Detail Screen
// Shows channel information, live stream, and program schedule

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/channel_logo_helper.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
import '../../../logic/channels/channels_bloc.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../widgets/live_pulse_widget.dart';

class ChannelDetailScreen extends StatefulWidget {
  final String? channelId;
  final ChannelModel? channel;

  const ChannelDetailScreen({
    super.key,
    this.channelId,
    this.channel,
  });

  @override
  State<ChannelDetailScreen> createState() => _ChannelDetailScreenState();
}

class _ChannelDetailScreenState extends State<ChannelDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  ChannelModel? _channel;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadChannelData();
  }

  void _loadChannelData() {
    if (widget.channel != null) {
      _channel = widget.channel;
      setState(() => _isLoading = false);
      context.read<ProgramsBloc>().add(LoadChannelPrograms(widget.channel!.id));
    } else if (widget.channelId != null) {
      // Just set loading state, BLoC listener will handle the rest
      setState(() => _isLoading = true);
      context.read<ChannelsBloc>().add(LoadChannelDetails(widget.channelId!));
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ChannelsBloc, ChannelsState>(
      listener: (context, state) {
        if (state is ChannelDetailsLoaded) {
          setState(() {
            _channel = state.channel;
            _isLoading = false;
          });
          context.read<ProgramsBloc>().add(LoadChannelPrograms(state.channel.id));
        } else if (state is ChannelsError) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: _isLoading
          ? _buildLoadingState()
          : _channel == null
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
            const Text('Không tìm thấy kênh', style: TextStyle(color: Colors.white)),
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
          // App Bar with Channel Banner
          _buildAppBar(),

          // Channel Info
          SliverToBoxAdapter(
            child: _buildChannelInfo(),
          ),

          // Tab Bar
          SliverPersistentHeader(
            pinned: true,
            delegate: _SliverTabBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.dark400,
                indicatorColor: AppColors.primary,
                tabs: const [
                  Tab(text: 'Lịch phát'),
                  Tab(text: 'Giới thiệu'),
                  Tab(text: 'Tương tác'),
                ],
              ),
            ),
          ),

          // Tab Content
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildScheduleTab(),
                _buildAboutTab(),
                _buildInteractionTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 200,
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
            child: const Icon(Icons.notifications_outlined, color: Colors.white, size: 20),
          ),
          onPressed: () {},
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            // Banner Image
            if (_channel!.bannerUrl != null)
              CachedNetworkImage(
                imageUrl: _channel!.bannerUrl!,
                fit: BoxFit.cover,
              )
            else
              Container(
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
              ),
            // Gradient Overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    AppColors.dark950.withOpacity(0.8),
                    AppColors.dark950,
                  ],
                ),
              ),
            ),
            // Channel Logo & Live Status
            Positioned(
              left: 16,
              bottom: 16,
              child: Row(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(ChannelLogoHelper.getFallbackColor(_channel!.category)),
                              Color(ChannelLogoHelper.getFallbackColor(_channel!.category)).withOpacity(0.7),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.2),
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: _channel!.logoUrl != null
                              ? CachedNetworkImage(
                                  imageUrl: _channel!.logoUrl!,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Center(
                                    child: Text(
                                      ChannelLogoHelper.getInitial(_channel!.name),
                                      style: const TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                )
                              : Center(
                                  child: Text(
                                    ChannelLogoHelper.getInitial(_channel!.name),
                                    style: const TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                        ),
                      ),
                      if (_channel!.isLive)
                        Positioned(
                          bottom: -4,
                          right: -4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.liveRed,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'LIVE',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  if (_channel!.isLive)
                    LiveBadge()
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.dark700,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'Offline',
                        style: TextStyle(
                          color: AppColors.dark400,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
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

  Widget _buildChannelInfo() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Channel Name & Verified Badge
          Row(
            children: [
              Expanded(
                child: Text(
                  _channel!.name,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              if (_channel!.isVerified)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.verified,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
            ],
          ),

          // Category & Tagline
          if (_channel!.tagline != null) ...[
            const SizedBox(height: 4),
            Text(
              _channel!.tagline!,
              style: const TextStyle(
                color: AppColors.dark400,
                fontSize: 14,
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Category Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _channel!.categoryDisplayName,
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Stats Row
          Row(
            children: [
              _StatItem(
                icon: Icons.visibility,
                value: _formatCount(_channel!.totalViews),
                label: 'Lượt xem',
              ),
              const SizedBox(width: 24),
              _StatItem(
                icon: Icons.people,
                value: _formatCount(_channel!.subscriberCount),
                label: 'Người đăng ký',
              ),
              const SizedBox(width: 24),
              _StatItem(
                icon: Icons.play_circle,
                value: _formatCount(_channel!.totalVideos),
                label: 'Video',
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.notifications_active),
                  label: const Text('Theo dõi'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.dark800,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: IconButton(
                  icon: const Icon(Icons.share),
                  onPressed: () {},
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleTab() {
    return BlocBuilder<ProgramsBloc, ProgramsState>(
      builder: (context, state) {
        if (state is ProgramsLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is ProgramsLoaded) {
          if (state.liveEvents.isEmpty) {
            return _buildEmptyState(
              icon: Icons.schedule,
              title: 'Chưa có lịch phát',
              subtitle: 'Kênh này chưa có chương trình nào được lên lịch',
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: state.liveEvents.length,
            itemBuilder: (context, index) {
              final event = state.liveEvents[index];
              return _ScheduleCard(event: event);
            },
          );
        }

        return const SizedBox();
      },
    );
  }

  Widget _buildAboutTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Giới thiệu',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _channel!.description ?? 'Không có mô tả',
            style: const TextStyle(
              color: AppColors.dark300,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 24),
          _InfoRow(label: 'Ngôn ngữ', value: _channel!.language.toUpperCase()),
          _InfoRow(label: 'Khu vực', value: _channel!.region ?? 'Toàn cầu'),
          _InfoRow(
            label: 'Ngày tạo',
            value: _formatDate(_channel!.createdAt),
          ),
          _InfoRow(label: 'Trạng thái', value: _channel!.isActive ? 'Hoạt động' : 'Không hoạt động'),
        ],
      ),
    );
  }

  Widget _buildInteractionTab() {
    return _buildEmptyState(
      icon: Icons.forum,
      title: 'Chưa có bình luận',
      subtitle: 'Hãy là người đầu tiên bình luận',
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: AppColors.dark600),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(
              color: AppColors.dark400,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ],
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

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
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
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: AppColors.dark400),
            const SizedBox(width: 4),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.dark500,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  final LiveEventModel event;

  const _ScheduleCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final isLive = event.isLive;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
        border: isLive
            ? Border.all(color: AppColors.liveRed.withOpacity(0.5))
            : null,
      ),
      child: Row(
        children: [
          // Time
          Container(
            width: 70,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isLive ? AppColors.liveRed : AppColors.dark700,
              borderRadius: const BorderRadius.horizontal(
                left: Radius.circular(12),
              ),
            ),
            child: Column(
              children: [
                Text(
                  _formatTime(event.scheduledAt),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                if (event.duration != null)
                  Text(
                    '${event.duration}p',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (isLive) ...[
                        const LiveBadge(compact: true),
                        const SizedBox(width: 8),
                      ],
                      Expanded(
                        child: Text(
                          event.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (event.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      event.description!,
                      style: const TextStyle(
                        color: AppColors.dark400,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ),
          // Action
          IconButton(
            icon: Icon(
              isLive ? Icons.play_circle_filled : Icons.bookmark_outline,
              color: isLive ? AppColors.liveRed : AppColors.dark500,
            ),
            onPressed: () {
              if (isLive) {
                // Watch live
              } else {
                // Add to watchlist
              }
            },
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.dark400,
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _SliverTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _SliverTabBarDelegate(this.tabBar);

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.dark950,
      child: tabBar,
    );
  }

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) {
    return false;
  }
}
