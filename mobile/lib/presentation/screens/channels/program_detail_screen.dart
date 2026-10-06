// OmniCast - Program Detail Screen
// Now-Playing Hero treatment: full-bleed player with floating controls,
// rich metadata, action rail, and inline social.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/programs/programs_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/share_helper.dart';
import '../../../data/models/program_model.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/watchlist_item_model.dart';
import '../../../logic/watchlist/watchlist_bloc.dart';
import '../../widgets/omni_player.dart';
import '../../widgets/channel_logo.dart';
import '../../widgets/social/comments_section.dart';
import '../../widgets/social/reactions_bar.dart';
import '../../widgets/save_to_watchlist_button.dart';
import '../../widgets/live_pulse_widget.dart';
import '../../../core/constants/channel_tiers.dart';

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
  bool _playerStarted = false;
  bool _viewBumped = false;

  @override
  void initState() {
    super.initState();
    context.read<ProgramsBloc>().add(LoadProgramDetails(widget.programId));
  }

  Future<void> _refresh() async {
    context.read<ProgramsBloc>().add(LoadProgramDetails(widget.programId));
    await Future<void>.delayed(const Duration(milliseconds: 300));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.surfaceRaised,
        onRefresh: _refresh,
        child: BlocBuilder<ProgramsBloc, ProgramsState>(
          builder: (context, state) {
            if (state is ProgramsLoading) {
              return const _DetailLoading();
            }

            if (state is ProgramDetailsLoaded) {
              final program = state.program;
              if (!_playerStarted) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted) setState(() => _playerStarted = true);
                });
              }
              if (!_viewBumped) {
                _viewBumped = true;
                _bumpView(program);
              }
              return CustomScrollView(
                slivers: [
                  SliverAppBar(
                    expandedHeight: 260,
                    pinned: true,
                    backgroundColor: AppColors.bg,
                    surfaceTintColor: Colors.transparent,
                    leading: _roundIconButton(
                      icon: Icons.arrow_back,
                      onTap: () => context.pop(),
                    ),
                    actions: [
                      _roundIconButton(
                        icon: Icons.ios_share_outlined,
                        onTap: () {
                          ShareHelper.shareLiveEvent(program);
                          context
                              .read<ProgramsBloc>()
                              .repository
                              .bumpLiveEventShare(program.id)
                              .catchError((_) => null);
                        },
                      ),
                      const SizedBox(width: 8),
                      SaveToWatchlistButton(
                        programId: program.id,
                        channelId: program.channelId,
                        program: program,
                      ),
                      const SizedBox(width: 12),
                    ],
                    flexibleSpace: FlexibleSpaceBar(
                      background: _VideoPlayer(
                        program: program,
                        started: _playerStarted,
                        onStart: () => setState(() => _playerStarted = true),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (program.isLive) ...[
                            const Row(
                              children: [
                                LiveBadge(),
                                SizedBox(width: 8),
                                Text(
                                  'ĐANG TRỰC TIẾP',
                                  style: TextStyle(
                                    color: AppColors.live,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 11,
                                    letterSpacing: 1.4,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                          ],
                          Text(
                            program.title,
                            style: theme.textTheme.headlineLarge,
                          ),
                          const SizedBox(height: 10),
                          _MetaRow(program: program),
                          const SizedBox(height: 16),
                          _LiveProgressBar(program: program),
                          const SizedBox(height: 16),
                          _PrimaryActionButton(program: program),
                          if (program.channel != null) ...[
                            const SizedBox(height: 16),
                            _ChannelCard(
                              program: program,
                              onTap: () => context
                                  .push('/channel/${program.channel!.id}'),
                            ),
                          ],
                          const SizedBox(height: 16),
                          _SourcePills(program: program),
                          if (program.description != null) ...[
                            const SizedBox(height: 24),
                            Text(
                              'Mô tả',
                              style: theme.textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              program.description!,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                height: 1.55,
                              ),
                            ),
                          ],
                          if (program.tags.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            Text(
                              'Tags',
                              style: theme.textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: program.tags
                                  .map((t) => _TagPill(label: t))
                                  .toList(),
                            ),
                          ],
                          const SizedBox(height: 24),
                          ReactionsBar(
                            targetId: program.id,
                            kind: 'liveEvent',
                          ),
                          const SizedBox(height: 24),
                          CommentsSection(
                            targetId: program.id,
                            kind: 'liveEvent',
                          ),
                          const SizedBox(height: 100),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }

            if (state is ProgramsError) {
              return _DetailError(message: state.message);
            }

            return const SizedBox();
          },
        ),
      ),
    );
  }

  Widget _roundIconButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Material(
        color: Colors.black.withValues(alpha: 0.45),
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: 36,
            height: 36,
            child: Icon(icon, color: Colors.white, size: 20),
          ),
        ),
      ),
    );
  }

  Future<void> _bumpView(LiveEventModel program) async {
    try {
      final repo = context.read<ProgramsBloc>().repository;
      await repo.bumpLiveEventView(program.id);
    } catch (_) {/* best effort */}
  }
}

/* ────────────────────────────────────────────────────────────────────── */

class _DetailLoading extends StatelessWidget {
  const _DetailLoading();
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator());
}

class _DetailError extends StatelessWidget {
  final String message;
  const _DetailError({required this.message});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: AppColors.error)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final state = context.read<ProgramsBloc>().state;
              if (state is ProgramsError) {
                context.read<ProgramsBloc>().add(LoadProgramDetails(message));
              }
            },
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  final LiveEventModel program;
  const _MetaRow({required this.program});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        if (program.isLive)
          _metaPill(
            theme,
            icon: Icons.visibility_outlined,
            label: '${_formatCount(program.viewerCount)} đang xem',
          ),
        _metaPill(
          theme,
          icon: Icons.schedule,
          label: _scheduleLabel(program),
        ),
        if (program.duration != null)
          _metaPill(
            theme,
            icon: Icons.timer_outlined,
            label: _formatDuration(program.duration!),
          ),
      ],
    );
  }

  Widget _metaPill(ThemeData t, {required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppColors.rPill),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.textDim),
          const SizedBox(width: 5),
          Text(label, style: t.textTheme.bodySmall),
        ],
      ),
    );
  }

  String _scheduleLabel(LiveEventModel program) {
    if (program.isLive) return 'Đang phát';
    final now = DateTime.now();
    final diff = program.scheduledAt.difference(now);
    if (diff.inDays == 0) {
      return 'Hôm nay ${_hhmm(program.scheduledAt)}';
    } else if (diff.inDays == 1) {
      return 'Ngày mai ${_hhmm(program.scheduledAt)}';
    } else if (diff.inDays == -1) {
      return 'Hôm qua ${_hhmm(program.scheduledAt)}';
    }
    return '${program.scheduledAt.day}/${program.scheduledAt.month}/${program.scheduledAt.year} ${_hhmm(program.scheduledAt)}';
  }

  String _hhmm(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _formatCount(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }

  String _formatDuration(int raw) {
    final minutes = raw > 1440 ? (raw / 60).round() : raw;
    if (minutes < 60) return '$minutes phút';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '${h}h';
    return '${h}h ${m}p';
  }
}

class _LiveProgressBar extends StatelessWidget {
  final LiveEventModel program;
  const _LiveProgressBar({required this.program});

  @override
  Widget build(BuildContext context) {
    if (!program.isLive) return const SizedBox.shrink();
    final start = program.scheduledAt;
    final end = program.endTime;
    final total = end.difference(start).inSeconds.clamp(1, 1 << 31);
    final elapsed = DateTime.now().difference(start).inSeconds.clamp(0, total);
    final pct = (elapsed / total).clamp(0.0, 1.0);
    final remaining = ((total - elapsed) / 60).round();
    final remainingStr =
        remaining >= 60 ? '${remaining ~/ 60}h ${remaining % 60}\'' : '$remaining\'';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: SizedBox(
              height: 5,
              child: Stack(
                children: [
                  Container(color: AppColors.surfaceRaised),
                  FractionallySizedBox(
                    widthFactor: pct,
                    child: Container(
                      decoration: const BoxDecoration(
                        color: AppColors.live,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.liveGlow,
                            blurRadius: 8,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(_hhmm(start), style: Theme.of(context).textTheme.bodySmall),
              const Spacer(),
              Text(
                'Còn $remainingStr',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.live,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const Spacer(),
              Text(_hhmm(end), style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ],
      ),
    );
  }

  String _hhmm(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

class _PrimaryActionButton extends StatelessWidget {
  final LiveEventModel program;
  const _PrimaryActionButton({required this.program});

  @override
  Widget build(BuildContext context) {
    final isLive = program.isLive;
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () {
              if (isLive) {
                // start player via parent
              } else {
                _scheduleReminder(context);
              }
            },
            icon: Icon(isLive ? Icons.play_arrow_rounded : Icons.notifications_outlined),
            label: Text(isLive ? 'Xem ngay' : 'Nhắc tôi'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: isLive ? AppColors.live : AppColors.primary,
              textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(width: 8),
        _IconAction(
          icon: Icons.thumb_up_outlined,
          label: _formatCount(program.likeCount),
          onTap: () => _toggleReaction(context),
        ),
        const SizedBox(width: 8),
        _IconAction(
          icon: Icons.ios_share_outlined,
          label: 'Chia sẻ',
          onTap: () {
            ShareHelper.shareLiveEvent(program);
            context
                .read<ProgramsBloc>()
                .repository
                .bumpLiveEventShare(program.id)
                .catchError((_) => null);
          },
        ),
      ],
    );
  }

  void _scheduleReminder(BuildContext context) {
    final program = this.program;
    final watchlistItem = WatchlistItemModel(
      programId: program.id,
      programTitle: program.title,
      thumbnailUrl: program.thumbnailUrl,
      channelId: program.channelId,
      channelName: program.channel?.name,
      scheduledAt: program.scheduledAt,
      duration: program.duration,
      reminderEnabled: true,
      addedAt: DateTime.now(),
    );
    context.read<WatchlistBloc>().add(AddToWatchlist(
          item: watchlistItem,
          programId: program.id,
          channelId: program.channelId,
          scheduleReminder: true,
        ));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Sẽ nhắc bạn trước khi ${program.title} bắt đầu'),
      ),
    );
  }

  Future<void> _toggleReaction(BuildContext context) async {
    try {
      final repo = context.read<ProgramsBloc>().repository;
      await repo.toggleLiveEventReaction(program.id);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã thả cảm xúc')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Không thể thả cảm xúc: $e')),
      );
    }
  }

  String _formatCount(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }
}

class _IconAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _IconAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceRaised,
      borderRadius: BorderRadius.circular(AppColors.rMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(AppColors.rMd),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: AppColors.textDim),
              const SizedBox(height: 2),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChannelCard extends StatelessWidget {
  final LiveEventModel program;
  final VoidCallback onTap;
  const _ChannelCard({required this.program, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final channel = program.channel;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppColors.rMd),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppColors.rMd),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            ChannelLogo(channel: channel!, size: 44),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    channel.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    'Xem kênh',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textFaint),
          ],
        ),
      ),
    );
  }
}

class _SourcePills extends StatelessWidget {
  final LiveEventModel program;
  const _SourcePills({required this.program});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _SourcePill(
          icon: Icons.cloud_outlined,
          label: _sourceLabel(program.contentSource),
        ),
        if (program.externalPlatform != null)
          _SourcePill(
            icon: Icons.link,
            label: program.externalPlatform!,
          ),
      ],
    );
  }

  String _sourceLabel(String source) {
    switch (source.toUpperCase()) {
      case 'EXTERNAL':
        return 'Nguồn ngoài';
      case 'UPLOADED':
        return 'Tải lên';
      case 'GENERATED':
        return 'Tự động';
      default:
        return source;
    }
  }
}

class _SourcePill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SourcePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppColors.rPill),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.textDim),
          const SizedBox(width: 5),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _TagPill extends StatelessWidget {
  final String label;
  const _TagPill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppColors.rPill),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Text(
        '#$label',
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/* ── Video player (unchanged behaviour, polished visuals) ────────────── */

class _VideoPlayer extends StatefulWidget {
  final LiveEventModel program;
  final bool started;
  final VoidCallback? onStart;

  const _VideoPlayer({
    required this.program,
    this.started = false,
    this.onStart,
  });

  @override
  State<_VideoPlayer> createState() => _VideoPlayerState();
}

class _VideoPlayerState extends State<_VideoPlayer> {
  String? get _streamUrl {
    if (widget.program.streamUrl != null && widget.program.streamUrl!.isNotEmpty) {
      return widget.program.streamUrl;
    }
    if (widget.program.externalUrl != null && widget.program.externalUrl!.isNotEmpty) {
      return widget.program.externalUrl;
    }
    final slug = widget.program.channel?.slug ?? '';
    return ChannelModel.resolveDefaultStream(slug);
  }

  @override
  Widget build(BuildContext context) {
    final streamUrl = _streamUrl;
    if (streamUrl != null && widget.started) {
      final offset = ChannelTiers.calculateLiveSeekOffset(
        scheduledAt: widget.program.scheduledAt,
        durationMinutes: widget.program.duration,
      );
      final isPremium = ChannelTiers.isPremium(widget.program.channel?.slug);

      return OmniPlayer(
        url: streamUrl,
        posterUrl: AppConstants.resolveAssetUrl(widget.program.thumbnailUrl),
        autoPlay: widget.program.isLive,
        initialSeekSeconds: offset,
        isPremium: isPremium,
        channelName: widget.program.channel?.name ?? widget.program.title,
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        if (widget.program.thumbnailUrl != null)
          CachedNetworkImage(
            imageUrl: AppConstants.resolveAssetUrl(widget.program.thumbnailUrl),
            fit: BoxFit.cover,
            errorWidget: (_, __, ___) => _placeholder(),
          )
        else
          _placeholder(),

        // Top-to-bottom darken for overlay readability
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x66000000), Colors.transparent, Color(0xAA000000)],
            ),
          ),
        ),

        Positioned.fill(
          child: Center(
            child: GestureDetector(
              onTap: streamUrl == null ? null : () => widget.onStart?.call(),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: streamUrl == null
                      ? AppColors.textMuted.withValues(alpha: 0.6)
                      : AppColors.live,
                  shape: BoxShape.circle,
                  boxShadow: streamUrl == null
                      ? null
                      : const [
                          BoxShadow(
                            color: AppColors.liveGlow,
                            blurRadius: 24,
                            spreadRadius: 4,
                          ),
                        ],
                ),
                child: Icon(
                  streamUrl == null
                      ? Icons.notifications_active
                      : Icons.play_arrow_rounded,
                  size: 40,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),

        if (widget.program.isLive)
          const Positioned(
            top: 16,
            left: 16,
            child: LiveBadge(),
          ),

        if (widget.program.isLive)
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(AppColors.rPill),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.visibility_outlined, size: 14, color: Colors.white),
                  const SizedBox(width: 6),
                  Text(
                    _formatNumber(widget.program.viewerCount),
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

  Widget _placeholder() => Container(
        color: AppColors.surface,
        child: const Center(
          child: Icon(
            Icons.play_circle_outline,
            size: 80,
            color: AppColors.textMuted,
          ),
        ),
      );

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }
}