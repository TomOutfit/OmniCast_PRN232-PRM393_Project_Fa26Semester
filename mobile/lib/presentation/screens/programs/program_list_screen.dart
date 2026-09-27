// OmniCast - Program List Screen
//
// Lists programs (live + scheduled) for a single category, with infinite
// scroll. Uses ProgramsBloc.LoadProgramsByCategory + LoadMoreProgramsByCategory
// so the same widget can be reused for any of the 19 backend categories.

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
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.18),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                category?.icon ?? ProgramCategories.iconFor(widget.category),
                color: accentColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Text(category?.label ?? widget.category),
          ],
        ),
      ),
      body: BlocBuilder<ProgramsBloc, ProgramsState>(
        builder: (context, state) {
          if (state is ProgramsLoading) {
            return const Center(child: CircularProgressIndicator());
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
              color: AppColors.primary,
              backgroundColor: AppColors.dark800,
              onRefresh: () async {
                _loadFirstPage();
                await Future<void>.delayed(const Duration(milliseconds: 400));
              },
              child: ListView.separated(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 12),
                itemCount: state.programs.length + 1,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/program/${program.id}'),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.dark800,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.dark700, width: 0.5),
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
                          _StatusBadge(
                            label: 'LIVE',
                            color: AppColors.liveRed,
                            dot: true,
                          )
                        else if (program.isScheduled)
                          _StatusBadge(
                            label: 'SẮP PHÁT',
                            color: accentColor,
                            dot: false,
                          )
                        else
                          _StatusBadge(
                            label: 'KẾT THÚC',
                            color: AppColors.dark500,
                            dot: false,
                          ),
                        const Spacer(),
                        Text(
                          _formatTime(program.scheduledAt),
                          style: const TextStyle(
                            color: AppColors.dark400,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      program.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
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
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        if (program.viewerCount > 0) ...[
                          const Icon(
                            Icons.visibility,
                            size: 12,
                            color: AppColors.dark400,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${numFmt.format(program.viewerCount)} đang xem',
                            style: const TextStyle(
                              color: AppColors.dark400,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (program.duration != null) ...[
                          const Icon(
                            Icons.schedule,
                            size: 12,
                            color: AppColors.dark400,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _formatDuration(program.duration!),
                            style: const TextStyle(
                              color: AppColors.dark400,
                              fontSize: 11,
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
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year &&
        dt.month == now.month &&
        dt.day == now.day) {
      return 'Hôm nay ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return dateFmt.format(dt);
  }

  String _formatDuration(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h > 0) return '${h}h${m > 0 ? ' ${m}m' : ''}';
    return '${m}m';
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
        width: 120,
        height: 70,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (program.thumbnailUrl != null)
              CachedNetworkImage(
                imageUrl:
                    AppConstants.resolveAssetUrl(program.thumbnailUrl),
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: AppColors.dark700),
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
              const Positioned(
                top: 6,
                left: 6,
                child: Icon(
                  Icons.play_circle_fill,
                  color: AppColors.liveRed,
                  size: 18,
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
      color: AppColors.dark700,
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.18),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.bold,
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
            '— Đã hết danh sách —',
            style: TextStyle(color: AppColors.dark500, fontSize: 12),
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
            child: CircularProgressIndicator(strokeWidth: 2),
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
          const Icon(Icons.cloud_off, size: 56, color: AppColors.dark500),
          const SizedBox(height: 12),
          Text(
            'Không thể tải chương trình',
            style: TextStyle(
              color: AppColors.dark300,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.dark400, fontSize: 12),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
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
            color: AppColors.dark500,
          ),
          const SizedBox(height: 12),
          const Text(
            'Chưa có chương trình nào',
            style: TextStyle(
              color: AppColors.dark300,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Hãy quay lại sau để xem thêm.',
            style: TextStyle(color: AppColors.dark400, fontSize: 12),
          ),
        ],
      ),
    );
  }
}