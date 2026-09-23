// OmniCast - Search Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../logic/search/search_bloc.dart';
import '../../../core/theme/app_theme.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
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
          ),
          onChanged: (value) {
            context.read<SearchBloc>().add(SearchQueryChanged(value));
          },
          onSubmitted: (value) {
            context.read<SearchBloc>().add(PerformSearch(query: value));
          },
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                context.read<SearchBloc>().add(ClearSearch());
              },
            ),
        ],
      ),
      body: BlocBuilder<SearchBloc, SearchState>(
        builder: (context, state) {
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
              child: Text(
                state.message,
                style: const TextStyle(color: AppColors.error),
              ),
            );
          }

          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildInitialState() {
    return Padding(
      padding: const EdgeInsets.all(24),
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
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _SearchChip(label: 'Thể thao'),
              _SearchChip(label: 'Phim mới'),
              _SearchChip(label: 'Tin tức'),
              _SearchChip(label: 'Âm nhạc'),
              _SearchChip(label: 'Show truyền hình'),
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
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Kênh',
              style: TextStyle(
                color: AppColors.dark400,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...state.channels.map((channel) => ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.dark700,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.tv, color: AppColors.dark500),
                ),
                title: Text(
                  channel.name,
                  style: const TextStyle(color: Colors.white),
                ),
                subtitle: Text(
                  channel.category ?? '',
                  style: const TextStyle(color: AppColors.dark400),
                ),
                onTap: () {
                  _searchController.text = channel.name;
                  context.read<SearchBloc>().add(
                        PerformSearch(query: channel.name),
                      );
                },
              )),
        ],
        if (state.programs.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Chương trình',
              style: TextStyle(
                color: AppColors.dark400,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ...state.programs.map((program) => ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.dark700,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.play_circle, color: AppColors.dark500),
                ),
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
                        PerformSearch(query: program.title),
                      );
                },
              )),
        ],
      ],
    );
  }

  Widget _buildResults(SearchResultsLoaded state) {
    final results = state.results;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            '${results.totalResults} kết quả cho "${state.query}"',
            style: const TextStyle(color: AppColors.dark400),
          ),
        ),
        ...results.channels.map((channel) => ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.dark700,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.tv, color: AppColors.dark500),
              ),
              title: Text(
                channel.name,
                style: const TextStyle(color: Colors.white),
              ),
              subtitle: Text(
                channel.category ?? '',
                style: const TextStyle(color: AppColors.dark400),
              ),
              trailing: const Icon(Icons.chevron_right, color: AppColors.dark500),
              onTap: () {},
            )),
        ...results.liveEvents.map((program) => ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.dark700,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.play_circle, color: AppColors.dark500),
              ),
              title: Text(
                program.title,
                style: const TextStyle(color: Colors.white),
              ),
              subtitle: Text(
                program.channelName ?? '',
                style: const TextStyle(color: AppColors.dark400),
              ),
              trailing: const Icon(Icons.chevron_right, color: AppColors.dark500),
              onTap: () {},
            )),
      ],
    );
  }
}

class _SearchChip extends StatelessWidget {
  final String label;

  const _SearchChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        context.read<SearchBloc>().add(PerformSearch(query: label));
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.dark700),
        ),
        child: Text(
          label,
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
