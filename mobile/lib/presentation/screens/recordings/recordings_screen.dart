// OmniCast - VOD / Recordings Library Screen
//
// Mobile counterpart of the Frontend `/recordings` page. Shows a featured
// strip, category filter chips, search bar and an infinite-scroll grid of
// VOD recordings.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../logic/recordings/recordings_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/program_categories.dart';
import '../../../data/models/recording_model.dart';

class RecordingsScreen extends StatefulWidget {
  const RecordingsScreen({super.key});

  @override
  State<RecordingsScreen> createState() => _RecordingsScreenState();
}

class _RecordingsScreenState extends State<RecordingsScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<RecordingsBloc>().add(const LoadRecordings(limit: 24));
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final max = _scrollController.position.maxScrollExtent;
    final current = _scrollController.position.pixels;
    if (max - current <= 300) {
      // Load more when within 300px of bottom.
      final bloc = context.read<RecordingsBloc>();
      final state = bloc.state;
      if (state is RecordingsLoaded && state.hasMore && !state.isLoadingMore) {
        bloc.add(LoadMoreRecordings(
          category: _selectedCategory,
          search: _searchController.text.trim().isEmpty
              ? null
              : _searchController.text.trim(),
        ));
      }
    }
  }

  Future<void> _onRefresh() async {
    context.read<RecordingsBloc>().add(RefreshRecordings());
    await Future.delayed(const Duration(milliseconds: 600));
  }

  void _onCategoryChanged(String? category) {
    setState(() => _selectedCategory = category);
    context.read<RecordingsBloc>().add(LoadRecordings(
          category: category,
          search: _searchController.text.trim().isEmpty
              ? null
              : _searchController.text.trim(),
          page: 1,
        ));
  }

  void _onSearch(String value) {
    context.read<RecordingsBloc>().add(LoadRecordings(
          category: _selectedCategory,
          search: value.trim().isEmpty ? null : value.trim(),
          page: 1,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('Thư viện VOD'),
        backgroundColor: AppColors.dark950,
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                _onSearch('');
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Featured strip
          BlocBuilder<RecordingsBloc, RecordingsState>(
            buildWhen: (prev, cur) =>
                cur is RecordingsLoaded && cur.featured.isNotEmpty,
            builder: (context, state) {
              if (state is RecordingsLoaded && state.featured.isNotEmpty) {
                return _FeaturedStrip(recordings: state.featured);
              }
              return const SizedBox.shrink();
            },
          ),

          // Search bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Tìm kiếm VOD...',
                prefixIcon: const Icon(Icons.search, color: AppColors.dark500),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppColors.dark500),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
              ),
              onChanged: _onSearch,
              onSubmitted: _onSearch,
            ),
          ),

          // Category filter chips
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: ProgramCategories.all19.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  final selected = _selectedCategory == null;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: const Text('Tất cả'),
                      selected: selected,
                      onSelected: (_) => _onCategoryChanged(null),
                      selectedColor: AppColors.primary.withOpacity(0.2),
                      checkmarkColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: selected ? AppColors.primary : AppColors.dark300,
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  );
                }
                final cat = ProgramCategories.all19[index - 1];
                final selected = _selectedCategory == cat.value;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(cat.label),
                    selected: selected,
                    onSelected: (_) => _onCategoryChanged(cat.value),
                    selectedColor: cat.color.withOpacity(0.2),
                    checkmarkColor: cat.color,
                    labelStyle: TextStyle(
                      color: selected ? cat.color : AppColors.dark300,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Results count
          BlocBuilder<RecordingsBloc, RecordingsState>(
            builder: (context, state) {
              if (state is RecordingsLoaded) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${state.total} kết quả${_selectedCategory != null ? ' cho ${ProgramCategories.labelFor(_selectedCategory)}' : ''}',
                        style: const TextStyle(
                          color: AppColors.dark400,
                          fontSize: 12,
                        ),
                      ),
                      if (state.totalPages > 1)
                        Text(
                          'Trang ${state.page}/${state.totalPages}',
                          style: const TextStyle(
                            color: AppColors.dark500,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),

          const SizedBox(height: 8),

          // Grid
          Expanded(
            child: BlocBuilder<RecordingsBloc, RecordingsState>(
              builder: (context, state) {
                if (state is RecordingsLoading && state.previous.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is RecordingsError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 64, color: AppColors.error),
                        const SizedBox(height: 16),
                        Text(state.message,
                            style: const TextStyle(color: AppColors.error)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => context
                              .read<RecordingsBloc>()
                              .add(const LoadRecordings()),
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  );
                }

                final recordings = state is RecordingsLoaded
                    ? state.recordings
                    : state is RecordingsLoading
                        ? state.previous
                        : <RecordingModel>[];

                if (recordings.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.video_library_outlined,
                            size: 64, color: AppColors.dark600),
                        const SizedBox(height: 16),
                        const Text('Không tìm thấy VOD phù hợp',
                            style:
                                TextStyle(color: AppColors.dark400, fontSize: 16)),
                        const SizedBox(height: 8),
                        Text(
                          'Thử đổi bộ lọc hoặc từ khóa khác.',
                          style: TextStyle(
                              color: AppColors.dark500, fontSize: 14),
                        ),
                        if (_selectedCategory != null ||
                            _searchController.text.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: OutlinedButton(
                              onPressed: () {
                                _searchController.clear();
                                _onCategoryChanged(null);
                              },
                              child: const Text('Xóa bộ lọc'),
                            ),
                          ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _onRefresh,
                  color: AppColors.primary,
                  backgroundColor: AppColors.dark800,
                  child: GridView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.68,
                    ),
                    itemCount: recordings.length +
                        ((state is RecordingsLoaded && state.isLoadingMore) ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= recordings.length) {
                        return const Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        );
                      }
                      return _RecordingCard(recording: recordings[index]);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// FEATURED STRIP
// ============================================================

class _FeaturedStrip extends StatelessWidget {
  final List<RecordingModel> recordings;

  const _FeaturedStrip({required this.recordings});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Icon(Icons.trending_up, color: AppColors.accentGold, size: 20),
              const SizedBox(width: 6),
              const Text(
                'Nội dung nổi bật',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: recordings.length.clamp(0, 3),
            itemBuilder: (context, index) {
              return _FeaturedCard(recording: recordings[index]);
            },
          ),
        ),
        const Divider(color: AppColors.dark800, height: 1),
      ],
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  final RecordingModel recording;

  const _FeaturedCard({required this.recording});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/recording/${recording.id}'),
      child: Container(
        width: 280,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.dark700),
        ),
        child: Row(
          children: [
            // Thumbnail
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(12),
                  ),
                  child: SizedBox(
                    width: 110,
                    height: 120,
                    child: recording.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: recording.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const ColoredBox(color: AppColors.dark700),
                            errorWidget: (_, __, ___) =>
                                const ColoredBox(color: AppColors.dark700),
                          )
                        : const ColoredBox(
                            color: AppColors.dark700,
                            child: Icon(Icons.play_circle_outline,
                                size: 40, color: AppColors.dark500),
                          ),
                  ),
                ),
                // Play overlay
                Positioned.fill(
                  child: ColoredBox(
                    color: Colors.black.withOpacity(0.3),
                    child: const Icon(Icons.play_circle_fill,
                        size: 36, color: Colors.white),
                  ),
                ),
              ],
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      recording.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (recording.channel != null)
                      Text(
                        recording.channel!.name,
                        style: const TextStyle(
                          color: AppColors.dark400,
                          fontSize: 11,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 4),
                    if (recording.duration > 0)
                      Text(
                        recording.formattedDuration,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 11,
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
}

// ============================================================
// RECORDING GRID CARD
// ============================================================

class _RecordingCard extends StatelessWidget {
  final RecordingModel recording;

  const _RecordingCard({required this.recording});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/recording/${recording.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.dark700),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail + badges
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(12)),
                    child: recording.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: recording.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const ColoredBox(color: AppColors.dark700),
                            errorWidget: (_, __, ___) => const ColoredBox(
                              color: AppColors.dark700,
                              child: Icon(Icons.play_circle_outline,
                                  size: 40, color: AppColors.dark500),
                            ),
                          )
                        : const ColoredBox(
                            color: AppColors.dark700,
                            child: Icon(Icons.play_circle_outline,
                                size: 40, color: AppColors.dark500),
                          ),
                  ),
                  // Duration badge
                  if (recording.duration > 0)
                    Positioned(
                      bottom: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          recording.formattedDuration,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  // Featured badge
                  if (recording.isFeatured)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.accentGold.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.trending_up,
                                size: 10, color: Colors.black),
                            const SizedBox(width: 3),
                            const Text(
                              'Nổi bật',
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  // Age restriction badge
                  if (recording.isAgeRestricted)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          '18+',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      recording.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    // Channel row
                    if (recording.channel != null) ...[
                      Row(
                        children: [
                          if (recording.channel!.logoUrl != null)
                            ClipOval(
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CachedNetworkImage(
                                  imageUrl: recording.channel!.logoUrl!,
                                  fit: BoxFit.cover,
                                  placeholder: (_, __) =>
                                      const ColoredBox(color: AppColors.dark700),
                                  errorWidget: (_, __, ___) =>
                                      const ColoredBox(color: AppColors.dark700),
                                ),
                              ),
                            ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              recording.channel!.name,
                              style: const TextStyle(
                                color: AppColors.dark400,
                                fontSize: 10,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                    ],
                    // Stats row
                    Row(
                      children: [
                        const Icon(Icons.visibility,
                            size: 11, color: AppColors.dark500),
                        const SizedBox(width: 3),
                        Text(
                          _formatCount(recording.viewCount),
                          style: const TextStyle(
                            color: AppColors.dark500,
                            fontSize: 10,
                          ),
                        ),
                        if (recording.category != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.dark700,
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Text(
                              ProgramCategories.labelFor(recording.category),
                              style: const TextStyle(
                                color: AppColors.dark300,
                                fontSize: 9,
                              ),
                            ),
                          ),
                        ],
                      ],
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

  static String _formatCount(int count) {
    if (count >= 1000000) return '${(count / 1000000).toStringAsFixed(1)}M';
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(0)}K';
    return count.toString();
  }
}
