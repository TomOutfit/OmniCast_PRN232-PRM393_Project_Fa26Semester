// OmniCast - Search Screen
//
// Multi-source search UI: type to get channel & program suggestions;
// submit a query to get full results. Supports a category filter pill
// bar so the user can narrow results to a single LiveCategory.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/search/search_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/constants/program_categories.dart';
import '../../../data/models/search_result_model.dart';
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

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
    _searchController.addListener(() => setState(() {}));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        backgroundColor: AppColors.dark950,
        title: TextField(
          controller: _searchController,
          focusNode: _focusNode,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Tìm kiếm kênh, chương trình...',
            hintStyle: const TextStyle(color: AppColors.dark500),
            border: InputBorder.none,
            filled: false,
            prefixIcon: const Icon(Icons.search, color: AppColors.dark500),
          ),
          onChanged: (value) {
            context.read<SearchBloc>().add(SearchQueryChanged(value));
          },
          onSubmitted: (value) {
            if (value.trim().isEmpty) return;
            context.read<SearchBloc>().add(
                  PerformSearch(query: value.trim(), category: _activeCategory),
                );
          },
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                _activeCategory = null;
                context.read<SearchBloc>().add(ClearSearch());
              },
            ),
        ],
      ),
      body: BlocBuilder<SearchBloc, SearchState>(
        builder: (context, state) {
          return Column(
            children: [
              _CategoryFilter(
                activeCategory: _activeCategory,
                onSelect: _setCategory,
              ),
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
      return _buildInitialState();
    }

    if (state is SearchLoading) {
      return const Center(child: CircularProgressIndicator());
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
              const Icon(Icons.error_outline, size: 56, color: AppColors.error),
              const SizedBox(height: 12),
              Text(
                state.message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.error, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return const SizedBox();
  }

  Widget _buildInitialState() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tìm kiếm nhanh',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final cat in ProgramCategories.all19.take(8))
                _SearchChip(
                  label: cat.label,
                  icon: cat.icon,
                  color: cat.color,
                  onTap: () {
                    _searchController.text = cat.label;
                    _setCategory(cat.value);
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestions(SearchSuggestionsLoaded state) {
    if (state.channels.isEmpty && state.programs.isEmpty) {
      return const Center(
        child: Text(
          'Không tìm thấy kết quả',
          style: TextStyle(color: AppColors.dark400),
        ),
      );
    }

    return ListView(
      children: [
        if (state.channels.isNotEmpty) ...[
          const _SectionLabel(label: 'Kênh'),
          ...state.channels.map(
            (channel) => ListTile(
              leading: ChannelLogoCompact(channel: channel.toChannelModel(), size: 48),
              title: Text(
                channel.name,
                style: const TextStyle(color: Colors.white),
              ),
              subtitle: Text(
                ProgramCategories.labelFor(channel.category),
                style: const TextStyle(color: AppColors.dark400),
              ),
              onTap: () {
                _searchController.text = channel.name;
                context.read<SearchBloc>().add(
                      PerformSearch(
                        query: channel.name,
                        category: _activeCategory,
                      ),
                    );
              },
            ),
          ),
        ],
        if (state.programs.isNotEmpty) ...[
          const _SectionLabel(label: 'Chương trình'),
          ...state.programs.map(
            (program) => ListTile(
              leading: _SuggestionThumb(program: program),
              title: Text(
                program.title,
                style: const TextStyle(color: Colors.white),
              ),
              subtitle: Text(
                program.channelName ?? '',
                style: const TextStyle(color: AppColors.dark400),
              ),
              onTap: () {
                _searchController.text = program.title;
                context.read<SearchBloc>().add(
                      PerformSearch(
                        query: program.title,
                        category: _activeCategory,
                      ),
                    );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildResults(SearchResultsLoaded state) {
    final results = state.results;
    if (results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.search_off, size: 56, color: AppColors.dark500),
              const SizedBox(height: 12),
              Text(
                'Không có kết quả cho "${state.query}"',
                style: const TextStyle(color: AppColors.dark300, fontSize: 14),
              ),
              if (state.category != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'trong ${ProgramCategories.labelFor(state.category)}',
                    style: const TextStyle(
                      color: AppColors.dark400,
                      fontSize: 12,
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Text(
            '${results.totalResults} kết quả cho "${state.query}"'
            '${state.category != null ? ' • ${ProgramCategories.labelFor(state.category)}' : ''}',
            style: const TextStyle(color: AppColors.dark400, fontSize: 12),
          ),
        ),
        ...results.channels.map(
          (channel) => ListTile(
            leading: ChannelLogoCompact(channel: channel.toChannelModel(), size: 48),
            title: Text(
              channel.name,
              style: const TextStyle(color: Colors.white),
            ),
            subtitle: Text(
              ProgramCategories.labelFor(channel.category),
              style: const TextStyle(color: AppColors.dark400),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppColors.dark500),
            onTap: () => context.push('/channel/${channel.id}'),
          ),
        ),
        ...results.liveEvents.map(
          (program) => ListTile(
            leading: _SuggestionThumb(program: program),
            title: Text(
              program.title,
              style: const TextStyle(color: Colors.white),
            ),
            subtitle: Text(
              program.channelName ?? '',
              style: const TextStyle(color: AppColors.dark400),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppColors.dark500),
            onTap: () => context.push('/program/${program.id}'),
          ),
        ),
      ],
    );
  }
}

// ============================================================
// Sub-widgets
// ============================================================

class _CategoryFilter extends StatelessWidget {
  final String? activeCategory;
  final void Function(String?) onSelect;

  const _CategoryFilter({required this.activeCategory, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          _Pill(
            label: 'Tất cả',
            icon: Icons.apps_rounded,
            color: AppColors.primary,
            selected: activeCategory == null,
            onTap: () => onSelect(null),
          ),
          for (final cat in ProgramCategories.all19) ...[
            const SizedBox(width: 6),
            _Pill(
              label: cat.label,
              icon: cat.icon,
              color: cat.color,
              selected: activeCategory == cat.value,
              onTap: () => onSelect(cat.value),
            ),
          ],
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _Pill({
    required this.label,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.22) : AppColors.dark800,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : AppColors.dark700,
            width: selected ? 1 : 0.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: selected ? color : AppColors.dark400,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: selected ? color : AppColors.dark300,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuggestionThumb extends StatelessWidget {
  final ProgramSuggestion program;

  const _SuggestionThumb({required this.program});

  @override
  Widget build(BuildContext context) {
    if (program.thumbnailUrl == null || program.thumbnailUrl!.isEmpty) {
      return Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.dark700,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.play_circle, color: AppColors.dark500),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 48,
        height: 48,
        child: CachedNetworkImage(
          imageUrl: AppConstants.resolveAssetUrl(program.thumbnailUrl),
          fit: BoxFit.cover,
          errorWidget: (_, __, ___) => Container(
            color: AppColors.dark700,
            child: const Icon(Icons.play_circle, color: AppColors.dark500),
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;

  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.dark400,
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

class _SearchChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _SearchChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}