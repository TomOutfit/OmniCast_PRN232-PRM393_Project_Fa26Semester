// OmniCast - Home Screen
// Now-Playing Hero entry — LIVE carousel + Up-Next strip + featured channels

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/program_categories.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
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
    final tt = Theme.of(context);
    return OfflineBanner(
      child: Scaffold(
        body: RefreshIndicator(
          onRefresh: _onRefresh,
          color: AppColors.primary,
          backgroundColor: AppColors.surfaceRaised,
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverAppBar(
                floating: true,
                snap: true,
                backgroundColor: AppColors.bg,
                surfaceTintColor: Colors.transparent,
                title: Row(
                  children: [
                    const OmniCastBrandLogo(size: 30),
                    const SizedBox(width: 10),
                    Text('OmniCast', style: tt.textTheme.titleLarge),
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

              // ── HERO: LIVE NOW ─────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.radio_button_checked,
                    iconColor: AppColors.live,
                    title: 'ĐANG PHÁT NGAY BÂY GIỜ',
                    trailing: _LiveCount(),
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
                          icon: Icons.radio_button_unchecked,
                          text: 'Hiện không có chương trình nào đang phát.',
                        );
                      }
                      return _liveRail(state.programs);
                    }
                    return const SizedBox(height: 320);
                  },
                ),
              ),

              // ── UP NEXT ─────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _sectionHeader(
                    icon: Icons.schedule_rounded,
                    iconColor: AppColors.primary,
                    title: 'SẮP CHIẾU',
                    trailing: TextButton(
                      onPressed: () => context.go('/epg'),
                      child: const Text('Xem EPG'),
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
                        icon: Icons.event_outlined,
                        text: 'Xem lịch đầy đủ trong EPG.',
                      );
                    }
                    return _upNextRail(upcoming.take(10).toList());
                  },
                ),
              ),

              // ── FEATURED CHANNELS ──────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _sectionHeader(
                    title: 'KÊNH NỔI BẬT',
                    trailing: TextButton(
                      onPressed: () => context.go('/channels'),
                      child: const Text('Xem tất cả'),
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
                          height: 200,
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      );
                    }
                    if (state is ChannelsLoaded) {
                      final channelCount = state.channels.length.clamp(0, 25);
                      return SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 0.82,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final channel = state.channels[index];
                            return _ChannelCard(
                              channel: channel,
                              onTap: () =>
                                  context.push('/channel/${channel.id}'),
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

              // ── CATEGORIES ─────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _sectionHeader(
                    title: 'DANH MỤC',
                    trailing: TextButton(
                      onPressed: () => context.push('/categories'),
                      child: const Text('Xem tất cả'),
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                sliver: SliverGrid(
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.95,
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
          Icon(icon, color: iconColor ?? AppColors.primary, size: 14),
          const SizedBox(width: 8),
        ],
        Text(
          title,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                letterSpacing: 1.2,
                fontWeight: FontWeight.w700,
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
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final p = programs[index];
          return SizedBox(
            width: 280,
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
      height: 160,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.rLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.textMuted, size: 28),
            const SizedBox(height: 8),
            Text(text, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
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
        child: const Center(child: CircularProgressIndicator()),
      );
}

class _LiveCount extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProgramsBloc, ProgramsState>(
      builder: (context, state) {
        final count = (state is ProgramsLoaded && state.isLiveNow)
            ? state.programs.length
            : 0;
        return _CountPill(count: count, label: 'live');
      },
    );
  }
}

class _CountPill extends StatelessWidget {
  final int? count;
  final String? label;
  const _CountPill({this.count, this.label});
  @override
  Widget build(BuildContext context) {
    if (count == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$count ${label ?? ''}',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppColors.textDim,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
      ),
    );
  }
}

class _ChannelCard extends StatelessWidget {
  final ChannelModel channel;
  final VoidCallback onTap;

  const _ChannelCard({required this.channel, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppColors.rMd),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppColors.rMd),
            border: Border.all(
              color: channel.isLive
                  ? AppColors.live.withValues(alpha: 0.45)
                  : AppColors.border,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Hero(
                tag: 'channel_logo_${channel.id}',
                child: ChannelLogo(
                  channel: channel,
                  size: 50,
                  showLiveIndicator: channel.isLive,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                channel.name,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppColors.text,
                    ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
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
        borderRadius: BorderRadius.circular(AppColors.rLg),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppColors.rLg),
            border: Border.all(color: AppColors.border, width: 0.5),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelMedium,
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