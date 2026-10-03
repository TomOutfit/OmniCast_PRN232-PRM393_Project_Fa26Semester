// OmniCast - Home Screen
// Inspired by the Next.js OmniCastHomeExperience:
// Broadcast Network 4K Bar, 25-Channel Quick Strip, Hero Live Carousel,
// Up-Next countdown strip, Featured Channels, and 19-Category Grid.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../../logic/recordings/recordings_bloc.dart';
import '../../../core/constants/program_categories.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
import '../../../data/models/recording_model.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/channel_logo.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/hero_program_card.dart';
import '../../widgets/up_next_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _loadData();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadData() {
    context.read<ChannelsBloc>().add(const LoadChannels());
    context.read<ProgramsBloc>().add(LoadLiveNow());
    context.read<RecordingsBloc>().add(const LoadRecordings(limit: 10));
  }

  Future<void> _onRefresh() async {
    _loadData();
    await Future.delayed(const Duration(milliseconds: 600));
  }

  @override
  Widget build(BuildContext context) {
    return OfflineBanner(
      child: Scaffold(
        backgroundColor: const Color(0xFF070B12),
        body: RefreshIndicator(
          onRefresh: _onRefresh,
          color: const Color(0xFF00E5FF),
          backgroundColor: const Color(0xFF090F1A),
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── CYBER APP BAR ──────────────────────────────────────
              SliverAppBar(
                floating: true,
                snap: true,
                backgroundColor: const Color(0xFF090F1A),
                surfaceTintColor: Colors.transparent,
                title: Row(
                  children: [
                    const OmniCastBrandLogo(size: 32),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'OmniCast',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.4,
                          ),
                        ),
                        Row(
                          children: [
                            AnimatedBuilder(
                              animation: _pulseAnimation,
                              builder: (context, _) => Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00E5FF).withValues(
                                    alpha: _pulseAnimation.value,
                                  ),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            const SizedBox(width: 5),
                            const Text(
                              'BROADCAST 4K UHD',
                              style: TextStyle(
                                color: Color(0xFF00E5FF),
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'monospace',
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    icon: const Icon(
                      Icons.search_rounded,
                      color: Color(0xFFCBD5E1),
                    ),
                    onPressed: () => context.push('/search'),
                  ),
                  IconButton(
                    icon: const Icon(
                      Icons.person_outline_rounded,
                      color: Color(0xFFCBD5E1),
                    ),
                    onPressed: () => context.push('/profile'),
                  ),
                  const SizedBox(width: 4),
                ],
              ),

              // ── VTVGo-STYLE 25 CHANNELS HORIZONTAL STRIP ───────────
              SliverToBoxAdapter(
                child: Container(
                  height: 60,
                  margin: const EdgeInsets.only(top: 8, bottom: 4),
                  child: BlocBuilder<ChannelsBloc, ChannelsState>(
                    builder: (context, state) {
                      final channels =
                          state is ChannelsLoaded ? state.channels : [];
                      if (channels.isEmpty) return const SizedBox.shrink();

                      return ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: channels.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final ch = channels[index];
                          final numStr =
                              (index + 1).toString().padLeft(2, '0');

                          return Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () => context.push('/channel/${ch.id}'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0B1320),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: ch.isLive
                                        ? const Color(0xFF991B1B)
                                        : const Color(0xFF16253C),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    ChannelLogo(
                                      channel: ch,
                                      size: 32,
                                      showLiveIndicator: false,
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'CH #$numStr',
                                          style: const TextStyle(
                                            color: Color(0xFF64748B),
                                            fontSize: 9,
                                            fontFamily: 'monospace',
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          ch.name,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (ch.isLive) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        width: 6,
                                        height: 6,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFEF4444),
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ),

              // ── HERO: LIVE NOW SECTION ─────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.radio_button_checked,
                    iconColor: const Color(0xFFEF4444),
                    title: 'ĐANG PHÁT TRỰC TIẾP',
                    trailing: _LiveCountBadge(),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<ProgramsBloc, ProgramsState>(
                  builder: (context, state) {
                    if (state is ProgramsLoading) {
                      return const _LoadingRail(height: 320);
                    }
                    if (state is ProgramsLoaded && state.isLiveNow) {
                      if (state.programs.isEmpty) {
                        return _emptyState(
                          icon: Icons.tv_off_rounded,
                          text: 'Hiện không có chương trình nào đang phát.',
                        );
                      }
                      return _liveRail(state.programs);
                    }
                    return const SizedBox(height: 320);
                  },
                ),
              ),

              // ── SẮP CHIẾU (UP NEXT) ────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.schedule_rounded,
                    iconColor: const Color(0xFF00E5FF),
                    title: 'SẮP CHIẾU TIẾP THEO',
                    trailing: TextButton.icon(
                      onPressed: () => context.go('/epg'),
                      icon: const Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: Color(0xFF00E5FF),
                      ),
                      label: const Text(
                        'Xem EPG',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<ProgramsBloc, ProgramsState>(
                  builder: (context, state) {
                    final upcoming = <LiveEventModel>[];
                    if (state is ProgramsLoaded) {
                      upcoming.addAll(
                        state.liveEvents.where(
                          (p) =>
                              p.isScheduled &&
                              p.scheduledAt.isAfter(DateTime.now()),
                        ),
                      );
                      upcoming.sort(
                        (a, b) => a.scheduledAt.compareTo(b.scheduledAt),
                      );
                    }
                    if (upcoming.isEmpty) {
                      return _emptyState(
                        icon: Icons.event_available_rounded,
                        text: 'Tất cả chương trình đều đã lên sóng.',
                      );
                    }
                    return _upNextRail(upcoming.take(10).toList());
                  },
                ),
              ),

              // ── KÊNH NỔI BẬT (FEATURED CHANNELS) ────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.star_rounded,
                    iconColor: const Color(0xFFFBBF24),
                    title: 'KÊNH TRUYỀN HÌNH NỔI BẬT',
                    trailing: TextButton.icon(
                      onPressed: () => context.go('/channels'),
                      icon: const Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: Color(0xFF00E5FF),
                      ),
                      label: const Text(
                        'Xem 25 Kênh',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: BlocBuilder<ChannelsBloc, ChannelsState>(
                  builder: (context, state) {
                    if (state is ChannelsLoading) {
                      return const SliverToBoxAdapter(
                        child: SizedBox(
                          height: 180,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFF00E5FF),
                            ),
                          ),
                        ),
                      );
                    }
                    if (state is ChannelsLoaded) {
                      final list = state.channels.take(8).toList();
                      return SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.6,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final channel = list[index];
                            return _FeaturedChannelCard(channel: channel);
                          },
                          childCount: list.length,
                        ),
                      );
                    }
                    return const SliverToBoxAdapter(child: SizedBox());
                  },
                ),
              ),

              // ── KHO BẢN GHI CLOUD DVR & VOD ─────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.video_library_rounded,
                    iconColor: const Color(0xFF38BDF8),
                    title: 'KHO BẢN GHI CLOUD DVR & VOD',
                    trailing: TextButton.icon(
                      onPressed: () => context.push('/recordings'),
                      icon: const Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: Color(0xFF00E5FF),
                      ),
                      label: const Text(
                        'Xem tất cả',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<RecordingsBloc, RecordingsState>(
                  builder: (context, state) {
                    if (state is RecordingsLoading && state.previous.isEmpty) {
                      return const _LoadingRail(height: 200);
                    }
                    final list = state is RecordingsLoaded
                        ? state.recordings
                        : (state is RecordingsLoading ? state.previous : <RecordingModel>[]);
                    if (list.isEmpty) {
                      return _emptyState(
                        icon: Icons.video_library_outlined,
                        text: 'Chưa có bản ghi nào sẵn sàng.',
                      );
                    }
                    return _recordingsRail(list.take(8).toList());
                  },
                ),
              ),

              // ── LỊCH KHUNG GIỜ VÀNG EPG PREVIEW BANNER ──────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _buildEpgPrimeTimeBanner(context),
                ),
              ),

              // ── DANH MỤC TRUYỀN HÌNH (19 CATEGORIES) ───────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 28, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.layers_rounded,
                    iconColor: const Color(0xFF38BDF8),
                    title: '19 CHUYÊN MỤC ĐẶC SẮC',
                    trailing: TextButton(
                      onPressed: () => context.push('/categories'),
                      child: const Text(
                        'Tất cả',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.9,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final cat = ProgramCategories.all19[index];
                      return _CategoryTile(
                        label: cat.label,
                        icon: cat.icon,
                        color: cat.color,
                        onTap: () => context.push(
                          '/category/${Uri.encodeComponent(cat.value)}',
                        ),
                      );
                    },
                    childCount: ProgramCategories.all19.length,
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionHeader({
    required String title,
    IconData? icon,
    Color? iconColor,
    Widget? trailing,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, color: iconColor ?? const Color(0xFF00E5FF), size: 16),
          const SizedBox(width: 8),
        ],
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.6,
          ),
        ),
        const Spacer(),
        if (trailing != null) trailing,
      ],
    );
  }

  Widget _liveRail(List<LiveEventModel> programs) {
    return SizedBox(
      height: 320,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: programs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, index) {
          final p = programs[index];
          return SizedBox(
            width: 290,
            child: HeroProgramCard(
              program: HeroProgramData(
                id: p.id,
                title: p.title,
                startTime: p.scheduledAt,
                endTime: p.endTime,
                isLive: p.isLive,
                thumbnailUrl: p.thumbnailUrl,
                category: (p.tags.isNotEmpty ? p.tags.first : null),
                channelName: p.channel?.name,
                channelLogo: p.channel,
                viewerCount: p.viewerCount,
              ),
              onTap: () => context.push('/program/${p.id}'),
            ),
          );
        },
      ),
    );
  }

  Widget _upNextRail(List<LiveEventModel> upcoming) {
    return SizedBox(
      height: 140,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: upcoming.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final p = upcoming[index];
          final start = p.scheduledAt;
          final minutes = start.difference(DateTime.now()).inMinutes;
          final countdown = minutes < 60
              ? '$minutes phút nữa'
              : '${minutes ~/ 60} giờ nữa';
          return UpNextCard(
            data: UpNextData(
              id: p.id,
              title: p.title,
              startTime: start,
              channelName: p.channel?.name ?? 'Kênh',
              channel: p.channel,
              startLabel:
                  '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}',
              countdownLabel: countdown,
            ),
            onTap: () => context.push('/program/${p.id}'),
          );
        },
      ),
    );
  }

  Widget _emptyState({required IconData icon, required String text}) {
    return Container(
      height: 140,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF090F1A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF162338)),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: const Color(0xFF475569), size: 32),
            const SizedBox(height: 8),
            Text(
              text,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recordingsRail(List<RecordingModel> recordings) {
    return SizedBox(
      height: 205,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: recordings.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = recordings[index];
          return _RecordingRailCard(recording: item);
        },
      ),
    );
  }

  Widget _buildEpgPrimeTimeBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF09111F), Color(0xFF0D1B30), Color(0xFF09111F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1E3A5F)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.calendar_month_rounded, color: Color(0xFF00E5FF), size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'LỊCH PHÁT SÓNG ĐIỆN TỬ & CATCH-UP 7 NGÀY',
                  style: TextStyle(
                    color: Color(0xFF00E5FF),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Khung Giờ Vàng Toàn Hệ Thống',
            style: TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Lịch phát sóng đồng bộ trực tiếp từ Backend API với thời lượng linh hoạt tự do theo từng chương trình phát sóng.',
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 11,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => context.go('/epg'),
              icon: const Icon(Icons.calendar_today_rounded, size: 16),
              label: const Text(
                'Xem Lịch Phát Sóng EPG',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00E5FF),
                foregroundColor: const Color(0xFF070B12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingRail extends StatelessWidget {
  final double height;
  const _LoadingRail({required this.height});
  @override
  Widget build(BuildContext context) => SizedBox(
        height: height,
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
        ),
      );
}

class _LiveCountBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProgramsBloc, ProgramsState>(
      builder: (context, state) {
        final count = (state is ProgramsLoaded && state.isLiveNow)
            ? state.programs.length
            : 0;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: const Color(0xFF450A0A),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xFF991B1B)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircleAvatar(
                radius: 3,
                backgroundColor: Color(0xFFEF4444),
              ),
              const SizedBox(width: 5),
              Text(
                '$count TRỰC TIẾP',
                style: const TextStyle(
                  color: Color(0xFFF87171),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _FeaturedChannelCard extends StatelessWidget {
  final ChannelModel channel;

  const _FeaturedChannelCard({required this.channel});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/channel/${channel.id}'),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: channel.isLive
                  ? const Color(0xFF991B1B)
                  : const Color(0xFF16253C),
            ),
          ),
          child: Row(
            children: [
              ChannelLogo(
                channel: channel,
                size: 42,
                showLiveIndicator: false,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      channel.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      channel.categoryDisplayName.toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (channel.isLive)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF450A0A),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'LIVE',
                    style: TextStyle(
                      color: Color(0xFFF87171),
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _CategoryTile({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF16253C)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFFCBD5E1),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecordingRailCard extends StatelessWidget {
  final RecordingModel recording;

  const _RecordingRailCard({required this.recording});

  @override
  Widget build(BuildContext context) {
    final qualityStr = recording.quality ?? 'HD';
    final durationMin = recording.duration > 0 ? recording.duration ~/ 60 : 45;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/recording/${recording.id}'),
        child: Container(
          width: 140,
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF16253C)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Poster / Thumbnail
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (recording.thumbnailUrl != null)
                      CachedNetworkImage(
                        imageUrl: recording.thumbnailUrl!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) =>
                            const ColoredBox(color: Color(0xFF121E30)),
                        errorWidget: (_, __, ___) =>
                            const ColoredBox(color: Color(0xFF121E30)),
                      )
                    else
                      const ColoredBox(color: Color(0xFF121E30)),
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00E5FF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          qualityStr,
                          style: const TextStyle(
                            color: Color(0xFF070B12),
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 1.5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '${durationMin}p',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ),
                    Center(
                      child: Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.play_arrow_rounded,
                          color: Color(0xFF00E5FF),
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Meta
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      recording.channel?.name ?? 'OmniCast',
                      style: const TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      recording.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}