// OmniCast - Channels Screen (Modern Minimalist Redesign)
// Clean, high-end channel list layout without cluttered marketing banners.
// Features instant search, category pills, live status indicators, and quick-view actions.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
import '../../../logic/channels/channels_bloc.dart';
import '../../../logic/programs/programs_bloc.dart';
import '../../widgets/channel_logo.dart';
import 'channel_quick_view_sheet.dart';
import '../../../core/constants/channel_tiers.dart';

class ChannelsScreen extends StatefulWidget {
  const ChannelsScreen({super.key});

  @override
  State<ChannelsScreen> createState() => _ChannelsScreenState();
}

class _ChannelsScreenState extends State<ChannelsScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;
  String _searchQuery = '';
  String _selectedCategoryKey = 'ALL';

  static const _categories = [
    {'key': 'ALL', 'label': 'Tất cả (25)'},
    {'key': 'SPORTS', 'label': 'Thể thao'},
    {'key': 'CINE', 'label': 'Điện ảnh'},
    {'key': 'DRAMA', 'label': 'Phim truyện'},
    {'key': 'SHOW', 'label': 'Show & Reality'},
    {'key': 'NEWS', 'label': 'Tin tức'},
    {'key': 'MUSIC', 'label': 'Âm nhạc'},
    {'key': 'KIDS', 'label': 'Thiếu nhi'},
    {'key': 'TECH', 'label': 'Công nghệ'},
    {'key': 'FOOD', 'label': 'Ẩm thực'},
    {'key': 'DOCUMENTARY', 'label': 'Khám phá'},
    {'key': 'GAMING', 'label': 'Gaming'},
    {'key': 'PODCAST', 'label': 'Podcast'},
    {'key': 'EDUCATION', 'label': 'Giáo dục'},
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _loadData() {
    final cat = _selectedCategoryKey == 'ALL' ? null : _selectedCategoryKey;
    context.read<ChannelsBloc>().add(LoadChannels(
          category: cat,
          search: _searchQuery.isEmpty ? null : _searchQuery,
        ));
    context.read<ProgramsBloc>().add(LoadLiveNow());
  }

  void _onCategorySelected(String key) {
    if (_selectedCategoryKey == key) return;
    HapticFeedback.selectionClick();
    setState(() => _selectedCategoryKey = key);
    final cat = key == 'ALL' ? null : key;
    context.read<ChannelsBloc>().add(LoadChannels(
          category: cat,
          search: _searchQuery.isEmpty ? null : _searchQuery,
        ));
  }

  void _onSearchChanged(String query) {
    setState(() => _searchQuery = query.trim());
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      final cat = _selectedCategoryKey == 'ALL' ? null : _selectedCategoryKey;
      context.read<ChannelsBloc>().add(LoadChannels(
            category: cat,
            search: _searchQuery.isEmpty ? null : _searchQuery,
          ));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080B11),
      appBar: AppBar(
        backgroundColor: const Color(0xFF080B11),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleSpacing: 16,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kênh truyền hình',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.3,
              ),
            ),
            Text(
              '25 kênh phát sóng trực tiếp 24/7',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: () async {
            _loadData();
            await Future.delayed(const Duration(milliseconds: 500));
          },
          color: const Color(0xFF00E5FF),
          backgroundColor: const Color(0xFF0F1523),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── SEARCH BAR ───────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F1523),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Tìm kiếm tên kênh hoặc chương trình...',
                        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 19),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, color: Color(0xFF94A3B8), size: 17),
                                onPressed: () {
                                  _searchController.clear();
                                  _onSearchChanged('');
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                  ),
                ),
              ),

              // ── CATEGORY FILTER BAR ─────────────────────────────
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final cat = _categories[index];
                      final isSelected = _selectedCategoryKey == cat['key'];

                      return GestureDetector(
                        onTap: () => _onCategorySelected(cat['key']!),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF00E5FF) : const Color(0xFF0F1523),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF00E5FF) : const Color(0x14FFFFFF),
                              width: 0.8,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            cat['label']!,
                            style: TextStyle(
                              color: isSelected ? const Color(0xFF080B11) : const Color(0xFFCBD5E1),
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 12)),

              // ── CHANNELS LIST ────────────────────────────────────
              BlocBuilder<ChannelsBloc, ChannelsState>(
                builder: (context, channelState) {
                  return BlocBuilder<ProgramsBloc, ProgramsState>(
                    builder: (context, programState) {
                      final liveMap = <String, LiveEventModel>{};
                      if (programState is ProgramsLoaded) {
                        for (final event in programState.programs) {
                          liveMap[event.channelId] = event;
                        }
                      }

                      if (channelState is ChannelsLoading) {
                        return SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) => _buildSkeletonCard(),
                              childCount: 5,
                            ),
                          ),
                        );
                      }

                      if (channelState is ChannelsLoaded) {
                        var list = channelState.channels;
                        if (_searchQuery.isNotEmpty) {
                          final q = _searchQuery.toLowerCase();
                          list = list.where((c) {
                            return c.name.toLowerCase().contains(q) ||
                                c.category.toLowerCase().contains(q) ||
                                (c.currentProgram?.toLowerCase().contains(q) ?? false);
                          }).toList();
                        }

                        if (list.isEmpty) {
                          return const SliverToBoxAdapter(
                            child: Padding(
                              padding: EdgeInsets.all(32),
                              child: Center(
                                child: Column(
                                  children: [
                                    Icon(Icons.tv_off_rounded, size: 40, color: Color(0xFF475569)),
                                    SizedBox(height: 10),
                                    Text(
                                      'Không tìm thấy kênh phù hợp',
                                      style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Thử tìm từ khóa khác hoặc xóa bộ lọc thể loại.',
                                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }

                        return SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final channel = list[index];
                                final liveEvent = liveMap[channel.id];
                                return _ModernChannelCard(
                                  channel: channel,
                                  liveEvent: liveEvent,
                                );
                              },
                              childCount: list.length,
                            ),
                          ),
                        );
                      }

                      if (channelState is ChannelsError) {
                        return SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Center(
                              child: Column(
                                children: [
                                  const Icon(Icons.error_outline_rounded, size: 40, color: Color(0xFFEF4444)),
                                  const SizedBox(height: 10),
                                  Text(channelState.message, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
                                  const SizedBox(height: 14),
                                  ElevatedButton(
                                    onPressed: _loadData,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF00E5FF),
                                      foregroundColor: const Color(0xFF080B11),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text('Thử lại'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }

                      return const SliverToBoxAdapter(child: SizedBox());
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeletonCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      height: 76,
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
      ),
    );
  }
}

class _ModernChannelCard extends StatelessWidget {
  final ChannelModel channel;
  final LiveEventModel? liveEvent;

  const _ModernChannelCard({
    required this.channel,
    required this.liveEvent,
  });

  @override
  Widget build(BuildContext context) {
    final currentProgram = liveEvent?.title ?? channel.currentProgram ?? 'Đang phát sóng chương trình đặc biệt';
    final isPremium = ChannelTiers.isPremium(channel.slug);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            HapticFeedback.lightImpact();
            context.push('/channel/${channel.id}');
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Channel Logo
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFF131B2E),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: ChannelLogo(
                    channel: channel,
                    size: 38,
                    showLiveIndicator: false,
                  ),
                ),
                const SizedBox(width: 12),

                // Channel Info & Currently Airing
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              channel.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (isPremium)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'VIP',
                                style: TextStyle(
                                  color: Color(0xFFFBBF24),
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          if (channel.isLive) ...[
                            Container(
                              width: 5,
                              height: 5,
                              margin: const EdgeInsets.only(right: 5),
                              decoration: const BoxDecoration(
                                color: Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                          Expanded(
                            child: Text(
                              currentProgram,
                              style: TextStyle(
                                color: channel.isLive ? const Color(0xFFCBD5E1) : const Color(0xFF64748B),
                                fontSize: 11,
                                fontWeight: channel.isLive ? FontWeight.w600 : FontWeight.w400,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Action icon
                IconButton(
                  icon: const Icon(Icons.info_outline_rounded, color: Color(0xFF64748B), size: 19),
                  tooltip: 'Chi tiết kênh',
                  onPressed: () => ChannelQuickViewSheet.show(context, channel),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    color: Color(0xFF00E5FF),
                    size: 20,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
