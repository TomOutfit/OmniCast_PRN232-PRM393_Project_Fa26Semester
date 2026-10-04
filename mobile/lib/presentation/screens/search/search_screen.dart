// OmniCast - Search Screen
// High-tech Cyberpunk Search Interface with instant live suggestions,
// trending topics, 19 category filter pills, and styled result cards.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/search/search_bloc.dart';
import '../../../logic/channels/channels_bloc.dart';
import '../../../core/constants/program_categories.dart';
import '../../../core/utils/category_utils.dart';
import '../../widgets/channel_logo.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();
  String? _activeCategory;
  List<Map<String, dynamic>> _categories = [{'key': 'ALL', 'label': 'Tất cả'}];

  static const _trendingSearches = [
    'V-League 2026',
    'Thời Sự 19H',
    'Điện Ảnh 4K',
    'Esports Gaming',
    'Tech & AI',
    'Ẩm Thực Việt',
  ];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
    context.read<ChannelsBloc>().add(const LoadCategories());
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _setCategory(String? category) {
    setState(() => _activeCategory = category);
    final query = _searchController.text.trim();
    if (query.isEmpty) return;
    context.read<SearchBloc>().add(
          PerformSearch(query: query, category: category),
        );
  }

  void _triggerSearch(String text) {
    _searchController.text = text;
    context.read<SearchBloc>().add(
          PerformSearch(query: text, category: _activeCategory),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleSpacing: 16,
        title: Container(
          height: 44,
          decoration: BoxDecoration(
            color: const Color(0xFF0E1726),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF1D2F4A)),
          ),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Tìm kiếm kênh, chương trình, VOD...',
              hintStyle: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 12,
              ),
              border: InputBorder.none,
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
                        _activeCategory = null;
                        context.read<SearchBloc>().add(ClearSearch());
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 10,
              ),
            ),
            onChanged: (value) {
              context.read<SearchBloc>().add(SearchQueryChanged(value));
            },
            onSubmitted: (value) {
              if (value.trim().isEmpty) return;
              context.read<SearchBloc>().add(
                    PerformSearch(
                      query: value.trim(),
                      category: _activeCategory,
                    ),
                  );
            },
          ),
        ),
      ),
      body: BlocBuilder<SearchBloc, SearchState>(
        builder: (context, state) {
          return Column(
            children: [
              _CategoryFilterBar(
                activeCategory: _activeCategory,
                onSelect: _setCategory,
              ),
              const Divider(color: Color(0xFF162338), height: 1),
              Expanded(
                child: _buildBody(state),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBody(SearchState state) {
    if (state is SearchInitial) {
      return _buildInitialView();
    }

    if (state is SearchLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
      );
    }

    if (state is SearchSuggestionsLoaded) {
      return _buildSuggestions(state);
    }

    if (state is SearchResultsLoaded) {
      return _buildResults(state);
    }

    if (state is SearchError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
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
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFFEF4444),
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return const SizedBox();
  }

  Widget _buildInitialView() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Trending Section
        const Row(
          children: [
            Icon(
              Icons.trending_up_rounded,
              color: Color(0xFF00E5FF),
              size: 18,
            ),
            SizedBox(width: 8),
            Text(
              'TÌM KIẾM PHỔ BIẾN',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _trendingSearches.map((term) {
            return Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => _triggerSearch(term),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0B1320),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF16253C)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.search_rounded,
                        size: 14,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        term,
                        style: const TextStyle(
                          color: Color(0xFFCBD5E1),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 28),

        // Quick Category Browse
        const Row(
          children: [
            Icon(
              Icons.grid_view_rounded,
              color: Color(0xFF38BDF8),
              size: 18,
            ),
            SizedBox(width: 8),
            Text(
              'CHUYÊN MỤC NỔI BẬT',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 2.2,
          ),
          itemCount: 8,
          itemBuilder: (context, index) {
            final cat = _categories[index % _categories.length];
            final info = getCategoryInfo(cat['key'] as String);
            return Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  _searchController.text = cat['label'] as String;
                  _setCategory(cat['key'] as String);
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF090F1A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF162338)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: info.color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(info.icon, color: info.color, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          cat['label'] as String,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSuggestions(SearchSuggestionsLoaded state) {
    if (state.channels.isEmpty && state.programs.isEmpty) {
      return _buildNoResults('Không tìm thấy gợi ý nào');
    }

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        if (state.channels.isNotEmpty) ...[
          _buildHeaderBadge('KÊNH TRUYỀN HÌNH (${state.channels.length})'),
          ...state.channels.map((ch) {
            final model = ch.toChannelModel();
            final info = getCategoryInfo(ch.category ?? 'ALL');
            return _buildSuggestionItem(
              title: ch.name,
              subtitle: info.label,
              leading: ChannelLogo(channel: model, size: 38),
              onTap: () => _triggerSearch(ch.name),
            );
          }),
        ],
        if (state.programs.isNotEmpty) ...[
          _buildHeaderBadge('CHƯƠNG TRÌNH PHÁT SÓNG (${state.programs.length})'),
          ...state.programs.map((prog) {
            return _buildSuggestionItem(
              title: prog.title,
              subtitle: prog.channelName ?? 'OmniCast',
              leading: _buildProgramThumb(prog.thumbnailUrl),
              onTap: () => _triggerSearch(prog.title),
            );
          }),
        ],
      ],
    );
  }

  Widget _buildResults(SearchResultsLoaded state) {
    final results = state.results;
    if (results.isEmpty) {
      return _buildNoResults('Không tìm thấy kết quả cho "${state.query}"');
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            '${results.totalResults} KẾT QUẢ CHO "${state.query.toUpperCase()}"',
            style: const TextStyle(
              color: Color(0xFF00E5FF),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
            ),
          ),
        ),

        // Channels
        ...results.channels.map((ch) {
          final model = ch.toChannelModel();
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0B1320),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF16253C)),
            ),
            child: Row(
              children: [
                ChannelLogo(channel: model, size: 44),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ch.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        getCategoryInfo(ch.category ?? 'ALL').label,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => context.push('/channel/${ch.id}'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF),
                    foregroundColor: const Color(0xFF070B12),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Xem Kênh',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          );
        }),

        // Live Events
        ...results.liveEvents.map((prog) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0B1320),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF16253C)),
            ),
            child: Row(
              children: [
                _buildProgramThumb(prog.thumbnailUrl),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        prog.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        prog.channelName ?? 'OmniCast Live',
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    Icons.play_circle_fill_rounded,
                    color: Color(0xFF00E5FF),
                    size: 32,
                  ),
                  onPressed: () => context.push('/program/${prog.id}'),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildHeaderBadge(String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 11,
          fontWeight: FontWeight.w800,
          fontFamily: 'monospace',
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildSuggestionItem({
    required String title,
    required String subtitle,
    required Widget leading,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: leading,
      title: Text(
        title,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 11,
        ),
      ),
      trailing: const Icon(
        Icons.north_west_rounded,
        size: 16,
        color: Color(0xFF64748B),
      ),
      onTap: onTap,
    );
  }

  Widget _buildProgramThumb(String? url) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 54,
        height: 38,
        color: const Color(0xFF121E30),
        child: url != null && url.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => const Icon(
                  Icons.live_tv_rounded,
                  size: 20,
                  color: Color(0xFF64748B),
                ),
              )
            : const Icon(
                Icons.live_tv_rounded,
                size: 20,
                color: Color(0xFF64748B),
              ),
      ),
    );
  }

  Widget _buildNoResults(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.search_off_rounded,
              size: 48,
              color: Color(0xFF475569),
            ),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryFilterBar extends StatelessWidget {
  final String? activeCategory;
  final void Function(String?) onSelect;

  const _CategoryFilterBar({
    required this.activeCategory,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          _PillItem(
            label: 'Tất cả',
            selected: activeCategory == null,
            onTap: () => onSelect(null),
          ),
          for (final cat in ProgramCategories.all19) ...[
            const SizedBox(width: 6),
            _PillItem(
              label: cat.label,
              selected: activeCategory == cat.value,
              onTap: () => onSelect(cat.value),
            ),
          ],
        ],
      ),
    );
  }
}

class _PillItem extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PillItem({
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
          color: selected ? const Color(0xFF00E5FF) : const Color(0xFF0E1625),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? const Color(0xFF00E5FF)
                : const Color(0xFF1B2B42),
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
                : const Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ),
    );
  }
}