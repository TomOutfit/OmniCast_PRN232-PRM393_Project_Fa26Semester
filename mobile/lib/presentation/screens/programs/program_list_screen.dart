// OmniCast - Program List Screen
//
// Lists programs (live + scheduled) for a single category, with infinite
// scroll. Uses ProgramsBloc.LoadProgramsByCategory + LoadMoreProgramsByCategory
// Cyber-Dark Broadcast System styling with telemetry badges and HEVC cards.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/constants/program_categories.dart';
import '../../../data/models/program_model.dart';
import '../../../logic/programs/programs_bloc.dart';

class ProgramListScreen extends StatefulWidget {
  final String category;
  final String? channelId;

  const ProgramListScreen({
    super.key,
    required this.category,
    this.channelId,
  });

  @override
  State<ProgramListScreen> createState() => _ProgramListScreenState();
}

class _ProgramListScreenState extends State<ProgramListScreen> {
  late final ScrollController _scrollController;
  final NumberFormat _numFmt = NumberFormat.compact(locale: 'vi_VN');
  final DateFormat _dateFmt = DateFormat('EEE, dd/MM', 'vi');

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFirstPage();
    });
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _loadFirstPage() {
    context.read<ProgramsBloc>().add(
          LoadProgramsByCategory(
            category: widget.category,
            channelId: widget.channelId,
          ),
        );
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final pos = _scrollController.position;
    if (pos.pixels >= pos.maxScrollExtent - 320) {
      context.read<ProgramsBloc>().add(
            LoadMoreProgramsByCategory(category: widget.category),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final category = ProgramCategories.byValue[widget.category];
    final accentColor =
        category?.color ?? ProgramCategories.colorFor(widget.category);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: accentColor.withValues(alpha: 0.5),
                  width: 1,
                ),
              ),
              child: Icon(
                category?.icon ?? ProgramCategories.iconFor(widget.category),
                color: accentColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category?.label ?? widget.category,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Outfit',
                    ),
                  ),
                  const Text(
                    'CHUYÊN MỤC PHÁT SÓNG // 2160p HEVC',
                    style: TextStyle(
                      color: Color(0xFF00E5FF),
                      fontSize: 9,
                      fontFamily: 'JetBrainsMono',
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: BlocBuilder<ProgramsBloc, ProgramsState>(
        builder: (context, state) {
          if (state is ProgramsLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
            );
          }
          if (state is ProgramsError) {
            return _ErrorView(
              message: state.message,
              onRetry: _loadFirstPage,
            );
          }
          if (state is ProgramsCategoryLoaded) {
            if (state.programs.isEmpty) {
              return _EmptyView(category: widget.category);
            }
            return RefreshIndicator(
              color: const Color(0xFF00E5FF),
              backgroundColor: const Color(0xFF0B1320),
              onRefresh: () async {
                _loadFirstPage();
                await Future<void>.delayed(const Duration(milliseconds: 400));
              },
              child: ListView.separated(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                itemCount: state.programs.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  if (index >= state.programs.length) {
                    return _FooterLoader(
                      isLoading: state.isLoadingMore,
                      hasMore: state.hasMore,
                    );
                  }
                  final program = state.programs[index];
                  return _ProgramListItem(
                    program: program,
                    numFmt: _numFmt,
                    dateFmt: _dateFmt,
                    accentColor: accentColor,
                  );
                },
              ),
            );
          }
          return const SizedBox();
        },
      ),
    );
  }
}

class _ProgramListItem extends StatelessWidget {
  final LiveEventModel program;
  final NumberFormat numFmt;
  final DateFormat dateFmt;
  final Color accentColor;

  const _ProgramListItem({
    required this.program,
    required this.numFmt,
    required this.dateFmt,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/program/${program.id}'),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: program.isLive
                ? const Color(0xFF00E5FF).withValues(alpha: 0.5)
                : const Color(0x1F00E5FF),
            width: program.isLive ? 1.2 : 0.8,
          ),
          boxShadow: [
            if (program.isLive)
              BoxShadow(
                color: const Color(0xFF00E5FF).withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Thumbnail(program: program, accentColor: accentColor),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (program.isLive)
                        const _StatusBadge(
                          label: 'LIVE',
                          color: Color(0xFFFF2A55),
                          dot: true,
                        )
                      else if (program.isScheduled)
                        const _StatusBadge(
                          label: 'SẮP PHÁT',
                          color: Color(0xFF00E5FF),
                          dot: false,
                        )
                      else
                        const _StatusBadge(
                          label: 'KẾT THÚC',
                          color: Color(0xFF64748B),
                          dot: false,
                        ),
                      const Spacer(),
                      Text(
                        _formatTime(program.scheduledAt),
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                          fontFamily: 'JetBrainsMono',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    program.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Outfit',
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  if (program.channel != null)
                    Row(
                      children: [
                        const Icon(Icons.tv_rounded, size: 12, color: Color(0xFF00E5FF)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            program.channel!.name,
                            style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontFamily: 'JetBrainsMono',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (program.viewerCount > 0) ...[
                        const Icon(
                          Icons.visibility_rounded,
                          size: 12,
                          color: Color(0xFF00E5FF),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${numFmt.format(program.viewerCount)} xem',
                          style: const TextStyle(
                            color: Color(0xFF00E5FF),
                            fontSize: 10,
                            fontFamily: 'JetBrainsMono',
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 10),
                      ],
                      if (program.duration != null) ...[
                        const Icon(
                          Icons.schedule_rounded,
                          size: 12,
                          color: Color(0xFF64748B),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatDuration(program.duration!),
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 10,
                            fontFamily: 'JetBrainsMono',
                          ),
                        ),
                      ],
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

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year &&
        dt.month == now.month &&
        dt.day == now.day) {
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return dateFmt.format(dt);
  }

  String _formatDuration(int raw) {
    final minutes = raw > 1440 ? (raw / 60).round() : raw;
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h > 0) return '${h}h${m > 0 ? ' ${m}p' : ''}';
    return '${m}p';
  }
}

class _Thumbnail extends StatelessWidget {
  final LiveEventModel program;
  final Color accentColor;

  const _Thumbnail({required this.program, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 110,
        height: 76,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (program.thumbnailUrl != null)
              CachedNetworkImage(
                imageUrl:
                    AppConstants.resolveAssetUrl(program.thumbnailUrl),
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: const Color(0xFF0F172A)),
                errorWidget: (_, __, ___) => _PlaceholderThumb(
                  icon: ProgramCategories.iconFor(
                    _guessCategoryFromTags(program.tags),
                  ),
                  color: accentColor,
                ),
              )
            else
              _PlaceholderThumb(
                icon: ProgramCategories.iconFor(
                  _guessCategoryFromTags(program.tags),
                ),
                color: accentColor,
              ),
            if (program.isLive)
              Positioned(
                bottom: 4,
                left: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF2A55),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.fiber_manual_record, color: Colors.white, size: 8),
                      SizedBox(width: 3),
                      Text(
                        'LIVE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'JetBrainsMono',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String? _guessCategoryFromTags(List<String> tags) {
    for (final tag in tags) {
      final upper = tag.toUpperCase();
      if (ProgramCategories.byValue.containsKey(upper)) {
        return upper;
      }
    }
    return null;
  }
}

class _PlaceholderThumb extends StatelessWidget {
  final IconData icon;
  final Color color;

  const _PlaceholderThumb({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0F172A),
      child: Icon(icon, color: color, size: 28),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final bool dot;

  const _StatusBadge({
    required this.label,
    required this.color,
    required this.dot,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              fontFamily: 'JetBrainsMono',
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _FooterLoader extends StatelessWidget {
  final bool isLoading;
  final bool hasMore;

  const _FooterLoader({required this.isLoading, required this.hasMore});

  @override
  Widget build(BuildContext context) {
    if (!isLoading && !hasMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Text(
            '— HẾT DANH SÁCH CHƯƠNG TRÌNH —',
            style: TextStyle(
              color: Color(0xFF64748B),
              fontSize: 10,
              fontFamily: 'JetBrainsMono',
              letterSpacing: 1.1,
            ),
          ),
        ),
      );
    }
    if (isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Color(0xFF00E5FF),
            ),
          ),
        ),
      );
    }
    return const SizedBox(height: 16);
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 56, color: Color(0xFF64748B)),
          const SizedBox(height: 12),
          const Text(
            'Không thể tải chương trình',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
            ),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final String category;

  const _EmptyView({required this.category});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            ProgramCategories.iconFor(category),
            size: 56,
            color: const Color(0xFF64748B),
          ),
          const SizedBox(height: 12),
          const Text(
            'Chưa có chương trình nào',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Hãy quay lại sau để xem thêm.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
          ),
        ],
      ),
    );
  }
}