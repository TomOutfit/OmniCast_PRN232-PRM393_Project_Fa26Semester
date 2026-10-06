// OmniCast - VOD / Recordings Library Screen
// Cyber-Dark VOD Experience with Featured Carousel, Category Pills,
// Search Bar, and Infinite-Scroll 4K VOD Grid.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../logic/recordings/recordings_bloc.dart';
import '../../../logic/channels/channels_bloc.dart';
import '../../../core/utils/category_utils.dart';
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
  List<Map<String, dynamic>> _categories = [{'key': 'ALL', 'label': 'Tất cả'}];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<RecordingsBloc>().add(const LoadRecordings(limit: 24));
    context.read<ChannelsBloc>().add(const LoadCategories());
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
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Thư Viện VOD & Bản Ghi',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear_rounded, color: Color(0xFF94A3B8)),
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
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0E1726),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1D2F4A)),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Tìm kiếm bản ghi VOD, catch-up...',
                  hintStyle: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                  ),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: Color(0xFF00E5FF),
                    size: 20,
                  ),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(
                            Icons.clear_rounded,
                            color: Color(0xFF94A3B8),
                            size: 18,
                          ),
                          onPressed: () {
                            _searchController.clear();
                            _onSearch('');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                ),
                onChanged: _onSearch,
                onSubmitted: _onSearch,
              ),
            ),
          ),

          // Category filter chips
          BlocBuilder<ChannelsBloc, ChannelsState>(
            builder: (context, channelsState) {
              if (channelsState is CategoriesLoaded) {
                _categories = [
                  {'key': 'ALL', 'label': 'Tất cả'},
                  ...channelsState.categories.map((c) {
                    final info = getCategoryInfo(c.category);
                    return {'key': c.category, 'label': info.label};
                  }),
                ];
              }
              return SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    final key = cat['key'] as String;
                    final selected = _selectedCategory == (key == 'ALL' ? null : key);
                    return _VodFilterChip(
                      label: cat['label'] as String,
                      selected: selected,
                      onTap: () => _onCategoryChanged(key == 'ALL' ? null : key),
                    );
                  },
                ),
              );
            },
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
                        '${state.total} BẢN GHI${_selectedCategory != null ? ' // ${getCategoryInfo(_selectedCategory!).label.toUpperCase()}' : ''}',
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'monospace',
                        ),
                      ),
                      if (state.totalPages > 1)
                        Text(
                          'Trang ${state.page}/${state.totalPages}',
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),

          const SizedBox(height: 6),

          // Grid
          Expanded(
            child: BlocBuilder<RecordingsBloc, RecordingsState>(
              builder: (context, state) {
                if (state is RecordingsLoading && state.previous.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
                  );
                }

                if (state is RecordingsError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 52,
                          color: Color(0xFFEF4444),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          state.message,
                          style: const TextStyle(color: Color(0xFFEF4444)),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => context
                              .read<RecordingsBloc>()
                              .add(const LoadRecordings()),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00E5FF),
                            foregroundColor: const Color(0xFF070B12),
                          ),
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
                        const Icon(
                          Icons.video_library_outlined,
                          size: 56,
                          color: Color(0xFF334155),
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'Không tìm thấy bản ghi VOD phù hợp',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
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
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                  color: Color(0xFF00E5FF),
                                ),
                                foregroundColor: const Color(0xFF00E5FF),
                              ),
                              child: const Text('Xóa bộ lọc'),
                            ),
                          ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _onRefresh,
                  color: const Color(0xFF00E5FF),
                  backgroundColor: const Color(0xFF090F1A),
                  child: GridView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: recordings.length +
                        ((state is RecordingsLoaded && state.isLoadingMore)
                            ? 1
                            : 0),
                    itemBuilder: (context, index) {
                      if (index >= recordings.length) {
                        return const Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Color(0xFF00E5FF),
                            ),
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

class _VodFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _VodFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF00E5FF) : const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? const Color(0xFF00E5FF)
                : const Color(0xFF16253C),
          ),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x6600E5FF),
                    blurRadius: 8,
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: selected
                ? const Color(0xFF070B12)
                : const Color(0xFFCBD5E1),
            fontSize: 11,
            fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _FeaturedStrip extends StatelessWidget {
  final List<RecordingModel> recordings;

  const _FeaturedStrip({required this.recordings});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              Icon(Icons.stars_rounded, color: Color(0xFFFBBF24), size: 18),
              SizedBox(width: 6),
              Text(
                'BẢN GHI NỔI BẬT',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.6,
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
            itemCount: recordings.length.clamp(0, 4),
            itemBuilder: (context, index) {
              return _FeaturedCard(recording: recordings[index]);
            },
          ),
        ),
        const Divider(color: Color(0xFF162338), height: 1),
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
        width: 270,
        margin: const EdgeInsets.only(right: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF16253C)),
        ),
        child: Row(
          children: [
            // Thumbnail
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(14),
                  ),
                  child: SizedBox(
                    width: 100,
                    height: 120,
                    child: recording.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: recording.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const ColoredBox(color: Color(0xFF121E30)),
                            errorWidget: (_, __, ___) =>
                                const ColoredBox(color: Color(0xFF121E30)),
                          )
                        : const ColoredBox(
                            color: Color(0xFF121E30),
                            child: Icon(
                              Icons.play_circle_outline,
                              size: 36,
                              color: Color(0xFF00E5FF),
                            ),
                          ),
                  ),
                ),
                Positioned.fill(
                  child: ColoredBox(
                    color: Colors.black.withValues(alpha: 0.3),
                    child: const Icon(
                      Icons.play_circle_fill_rounded,
                      size: 32,
                      color: Color(0xFF00E5FF),
                    ),
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
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (recording.channel != null)
                      Text(
                        recording.channel!.name,
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 4),
                    if (recording.duration > 0)
                      Text(
                        recording.formattedDuration,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                          fontFamily: 'monospace',
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

class _RecordingCard extends StatelessWidget {
  final RecordingModel recording;

  const _RecordingCard({required this.recording});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/recording/${recording.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF16253C)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(14),
                    ),
                    child: recording.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: recording.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const ColoredBox(color: Color(0xFF121E30)),
                            errorWidget: (_, __, ___) =>
                                const ColoredBox(color: Color(0xFF121E30)),
                          )
                        : const ColoredBox(
                            color: Color(0xFF121E30),
                            child: Icon(
                              Icons.play_circle_outline,
                              size: 36,
                              color: Color(0xFF00E5FF),
                            ),
                          ),
                  ),
                  // Duration badge
                  if (recording.duration > 0)
                    Positioned(
                      bottom: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          recording.formattedDuration,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ),
                  // 4K Badge
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: const Color(0xFF00E5FF).withValues(alpha: 0.6),
                        ),
                      ),
                      child: const Text(
                        '4K UHD',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'monospace',
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
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    if (recording.channel != null) ...[
                      Text(
                        recording.channel!.name,
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                    ],
                    Row(
                      children: [
                        const Icon(
                          Icons.visibility_rounded,
                          size: 11,
                          color: Color(0xFF64748B),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          _formatCount(recording.viewCount),
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 10,
                          ),
                        ),
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
