// OmniCast - Home Screen (Modern Minimalist Redesign)
// Clean, high-end streaming layout inspired by modern streaming apps (Apple TV+, Netflix).
// Removes visual clutter, redundant banners, and conflicting filters.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../../logic/recordings/recordings_bloc.dart';
import '../../../logic/auth/auth_bloc.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
import '../../../data/models/recording_model.dart';
import '../../../core/utils/category_utils.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/channel_logo.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/notification_bell.dart';

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
    context.read<ChannelsBloc>().add(const LoadChannels());
    context.read<ChannelsBloc>().add(const LoadCategories());
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
        backgroundColor: const Color(0xFF080B11),
        body: RefreshIndicator(
          onRefresh: _onRefresh,
          color: const Color(0xFF00E5FF),
          backgroundColor: const Color(0xFF0E1422),
          child: CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── MINIMAL SLEEK APP BAR ─────────────────────────────
              SliverAppBar(
                floating: true,
                snap: true,
                backgroundColor: const Color(0xFF080B11),
                surfaceTintColor: Colors.transparent,
                elevation: 0,
                titleSpacing: 16,
                title: Row(
                  children: [
                    const OmniCastBrandLogo(size: 26),
                    const SizedBox(width: 8),
                    const Text(
                      'OmniCast',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFF00E5FF).withValues(alpha: 0.3), width: 0.6),
                      ),
                      child: const Text(
                        'TV',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    tooltip: 'Tìm kiếm',
                    icon: const Icon(Icons.search_rounded, color: Color(0xFFCBD5E1), size: 22),
                    onPressed: () => context.push('/search'),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: NotificationBellAction(),
                  ),
                  BlocBuilder<AuthBloc, AuthState>(
                    builder: (context, authState) {
                      final isStaffOrAdmin = authState is Authenticated && authState.user.isStaffOrAdmin;
                      if (!isStaffOrAdmin) return const SizedBox.shrink();
                      return IconButton(
                        tooltip: 'Live Studio',
                        icon: const Icon(Icons.podcasts_rounded, color: Color(0xFFEF4444), size: 21),
                        onPressed: () => context.push('/studio/live'),
                      );
                    },
                  ),
                  IconButton(
                    tooltip: 'Tài khoản',
                    icon: const Icon(Icons.person_outline_rounded, color: Color(0xFFCBD5E1), size: 22),
                    onPressed: () => context.push('/profile'),
                  ),
                  const SizedBox(width: 6),
                ],
              ),

              // ── SPOTLIGHT FEATURED HERO ───────────────────────────
              SliverToBoxAdapter(
                child: BlocBuilder<ProgramsBloc, ProgramsState>(
                  builder: (context, state) {
                    if (state is ProgramsLoaded && state.programs.isNotEmpty) {
                      final heroEvent = state.programs.first;
                      return _SpotlightHero(event: heroEvent);
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ),

              // ── ĐANG PHÁT TRỰC TIẾP (LIVE NOW RAIL) ───────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                  child: _SectionHeader(
                    title: 'Đang phát sóng',
                    actionLabel: 'Tất cả',
                    onAction: () => context.push('/live'),
                    trailingBadge: const _LiveBadgeCounter(),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<ProgramsBloc, ProgramsState>(
                  builder: (context, state) {
                    if (state is ProgramsLoading) {
                      return const SizedBox(
                        height: 190,
                        child: Center(
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00E5FF)),
                        ),
                      );
                    }
                    if (state is ProgramsLoaded && state.programs.isNotEmpty) {
                      return SizedBox(
                        height: 195,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: state.programs.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final event = state.programs[index];
                            return _LiveRailCard(event: event);
                          },
                        ),
                      );
                    }
                    return _emptyState('Hiện không có luồng phát sóng trực tiếp nào.');
                  },
                ),
              ),

              // ── KÊNH TRUYỀN HÌNH (CHANNELS RAIL) ──────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 10),
                  child: _SectionHeader(
                    title: 'Kênh truyền hình',
                    actionLabel: 'Xem 25 kênh',
                    onAction: () => context.go('/channels'),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<ChannelsBloc, ChannelsState>(
                  builder: (context, state) {
                    if (state is ChannelsLoaded && state.channels.isNotEmpty) {
                      return SizedBox(
                        height: 84,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: state.channels.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 10),
                          itemBuilder: (context, index) {
                            final channel = state.channels[index];
                            return _ChannelPill(channel: channel);
                          },
                        ),
                      );
                    }
                    return const SizedBox(height: 84);
                  },
                ),
              ),

              // ── KHO BẢN GHI VOD & DVR ──────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 10),
                  child: _SectionHeader(
                    title: 'Bản ghi VOD & Catch-up',
                    actionLabel: 'Xem thêm',
                    onAction: () => context.push('/recordings'),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<RecordingsBloc, RecordingsState>(
                  builder: (context, state) {
                    final list = state is RecordingsLoaded
                        ? state.recordings
                        : (state is RecordingsLoading ? state.previous : <RecordingModel>[]);
                    if (list.isNotEmpty) {
                      return SizedBox(
                        height: 185,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: list.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) {
                            final recording = list[index];
                            return _RecordingCard(recording: recording);
                          },
                        ),
                      );
                    }
                    return _emptyState('Chưa có bản ghi nào sẵn sàng.');
                  },
                ),
              ),

              // ── KHÁM PHÁ CHUYÊN MỤC (CATEGORIES) ───────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: _SectionHeader(
                    title: 'Khám phá chuyên mục',
                    actionLabel: 'Tất cả',
                    onAction: () => context.push('/categories'),
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: BlocBuilder<ChannelsBloc, ChannelsState>(
                  builder: (context, state) {
                    if (state is CategoriesLoaded && state.categories.isNotEmpty) {
                      return SizedBox(
                        height: 40,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: state.categories.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final cat = state.categories[index];
                            final info = getCategoryInfo(cat.category);
                            return _CategoryChip(
                              label: info.label,
                              icon: info.icon,
                              onTap: () => context.push(
                                '/category/${Uri.encodeComponent(cat.category)}',
                              ),
                            );
                          },
                        ),
                      );
                    }
                    return const SizedBox(height: 40);
                  },
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyState(String text) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Components & Subwidgets
// ─────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget? trailingBadge;

  const _SectionHeader({
    required this.title,
    this.actionLabel,
    this.onAction,
    this.trailingBadge,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFFF1F5F9),
            fontSize: 15,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.2,
          ),
        ),
        if (trailingBadge != null) ...[
          const SizedBox(width: 8),
          trailingBadge!,
        ],
        const Spacer(),
        if (actionLabel != null && onAction != null)
          InkWell(
            borderRadius: BorderRadius.circular(6),
            onTap: () {
              HapticFeedback.lightImpact();
              onAction!();
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    actionLabel!,
                    style: const TextStyle(
                      color: Color(0xFF00E5FF),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF00E5FF)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _LiveBadgeCounter extends StatelessWidget {
  const _LiveBadgeCounter();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProgramsBloc, ProgramsState>(
      builder: (context, state) {
        final count = (state is ProgramsLoaded) ? state.programs.length : 0;
        if (count == 0) return const SizedBox.shrink();

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
          decoration: BoxDecoration(
            color: const Color(0xFFEF4444).withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.35), width: 0.6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: Color(0xFFEF4444),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '$count',
                style: const TextStyle(
                  color: Color(0xFFF87171),
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SpotlightHero extends StatelessWidget {
  final LiveEventModel event;

  const _SpotlightHero({required this.event});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 6, 16, 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1AFFFFFF), width: 0.8),
      ),
      clipBehavior: Clip.antiAlias,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background image
            if (event.thumbnailUrl != null && event.thumbnailUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: event.thumbnailUrl!,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => const ColoredBox(color: Color(0xFF0F1523)),
                placeholder: (_, __) => const ColoredBox(color: Color(0xFF0F1523)),
              )
            else
              const ColoredBox(color: Color(0xFF0F1523)),

            // Gradient vignette
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.3),
                      Colors.black.withValues(alpha: 0.85),
                    ],
                    stops: const [0.3, 0.65, 1.0],
                  ),
                ),
              ),
            ),

            // Top Badges
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(radius: 2.5, backgroundColor: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'TRỰC TIẾP',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(5),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.5),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.remove_red_eye_outlined, size: 11, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(
                          '${event.viewerCount}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Information & CTA
            Positioned(
              left: 14,
              right: 14,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (event.channel != null) ...[
                    Row(
                      children: [
                        ChannelLogo(channel: event.channel, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          event.channel!.name,
                          style: const TextStyle(
                            color: Color(0xFF00E5FF),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                  ],
                  Text(
                    event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          context.push('/live/${event.id}', extra: event);
                        },
                        icon: const Icon(Icons.play_arrow_rounded, size: 18),
                        label: const Text('Xem ngay'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00E5FF),
                          foregroundColor: const Color(0xFF080B11),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => context.push('/program/${event.id}'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0x33FFFFFF), width: 0.8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                        child: const Text('Chi tiết'),
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

class _LiveRailCard extends StatelessWidget {
  final LiveEventModel event;

  const _LiveRailCard({required this.event});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          HapticFeedback.lightImpact();
          context.push('/live/${event.id}', extra: event);
        },
        child: Container(
          width: 220,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1523),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail 16:9
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (event.thumbnailUrl != null && event.thumbnailUrl!.isNotEmpty)
                      CachedNetworkImage(
                        imageUrl: event.thumbnailUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => const ColoredBox(color: Color(0xFF131B2E)),
                        placeholder: (_, __) => const ColoredBox(color: Color(0xFF131B2E)),
                      )
                    else
                      const ColoredBox(color: Color(0xFF131B2E)),

                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: const Text(
                          'LIVE',
                          style: TextStyle(
                            color: Colors.white,
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
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.remove_red_eye_outlined, size: 9, color: Colors.white),
                            const SizedBox(width: 3),
                            Text(
                              '${event.viewerCount}',
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Title and channel info
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFF1F5F9),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      event.channel?.name ?? 'OmniCast',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
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

class _ChannelPill extends StatelessWidget {
  final ChannelModel channel;

  const _ChannelPill({required this.channel});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          HapticFeedback.lightImpact();
          context.push('/channel/${channel.id}');
        },
        child: Container(
          width: 140,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF0F1523),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: channel.isLive
                  ? const Color(0xFFEF4444).withValues(alpha: 0.35)
                  : const Color(0x14FFFFFF),
              width: 0.8,
            ),
          ),
          child: Row(
            children: [
              ChannelLogo(channel: channel, size: 36, showLiveIndicator: false),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      channel.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      channel.categoryDisplayName,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 9,
                        fontWeight: FontWeight.w500,
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

class _RecordingCard extends StatelessWidget {
  final RecordingModel recording;

  const _RecordingCard({required this.recording});

  @override
  Widget build(BuildContext context) {
    final durationMin = recording.duration > 0 ? recording.duration ~/ 60 : 45;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          HapticFeedback.lightImpact();
          context.push('/recording/${recording.id}');
        },
        child: Container(
          width: 130,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1523),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (recording.thumbnailUrl != null)
                      CachedNetworkImage(
                        imageUrl: recording.thumbnailUrl!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => const ColoredBox(color: Color(0xFF131B2E)),
                        errorWidget: (_, __, ___) => const ColoredBox(color: Color(0xFF131B2E)),
                      )
                    else
                      const ColoredBox(color: Color(0xFF131B2E)),

                    Positioned(
                      bottom: 5,
                      right: 5,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text(
                          '${durationMin}p',
                          style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(7),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      recording.channel?.name ?? 'OmniCast',
                      style: const TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      recording.title,
                      style: const TextStyle(
                        color: Color(0xFFF1F5F9),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
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
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF0F1523),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: const Color(0xFF00E5FF)),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFFCBD5E1),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
