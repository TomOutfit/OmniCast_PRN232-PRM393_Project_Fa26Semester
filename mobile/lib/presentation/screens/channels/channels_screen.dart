// OmniCast - Channels Screen
// Faithfully ports the Next.js frontend /channels page to Flutter with
// Cyber-dark styling, High-Bitrate Broadcast Network banner, 19 category
// filter chips, Live Now status cards, and Quick View bottom sheet.

import 'dart:async';
import 'package:flutter/material.dart';
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

class _ChannelsScreenState extends State<ChannelsScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;
  String _searchQuery = '';
  String _selectedCategoryKey = 'ALL';

  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  static const _categories = [
    {'key': 'ALL', 'label': 'Tất Cả (25 Kênh)'},
    {'key': 'SPORTS', 'label': 'Thể Thao'},
    {'key': 'CINE', 'label': 'Điện Ảnh 4K'},
    {'key': 'DRAMA', 'label': 'Phim Truyện'},
    {'key': 'SHOW', 'label': 'Show & Reality'},
    {'key': 'NEWS', 'label': 'Tin Tức 24/7'},
    {'key': 'MUSIC', 'label': 'Âm Nhạc'},
    {'key': 'KIDS', 'label': 'Thiếu Nhi'},
    {'key': 'TECH', 'label': 'Công Nghệ & AI'},
    {'key': 'FOOD', 'label': 'Ẩm Thực'},
    {'key': 'DOCUMENTARY', 'label': 'Khám Phá'},
    {'key': 'GAMING', 'label': 'Esports & Gaming'},
    {'key': 'PODCAST', 'label': 'Podcast & Audio'},
    {'key': 'EDUCATION', 'label': 'Giáo Dục'},
    {'key': 'LIFESTYLE', 'label': 'Đời Sống & Fashion'},
    {'key': 'TRAVEL', 'label': 'Du Lịch'},
    {'key': 'ART', 'label': 'Nghệ Thuật'},
    {'key': 'BUSINESS', 'label': 'Kinh Doanh'},
    {'key': 'HEALTH', 'label': 'Sức Khỏe'},
  ];

  static const Map<String, String> _categoryLabels = {
    'SPORTS': 'Thể thao',
    'SHOW': 'Show',
    'ENTERTAINMENT': 'Giải trí',
    'CINE': 'Điện ảnh',
    'DRAMA': 'Phim truyện',
    'NEWS': 'Tin tức',
    'MUSIC': 'Âm nhạc',
    'KIDS': 'Thiếu nhi',
    'TECH': 'Công nghệ',
    'FOOD': 'Ẩm thực',
    'DOCUMENTARY': 'Khám phá',
    'EDUCATION': 'Giáo dục',
    'GAMING': 'Trò chơi',
    'PODCAST': 'Podcast',
    'LIFESTYLE': 'Phong cách sống',
    'TRAVEL': 'Du lịch',
    'ART': 'Nghệ thuật',
    'BUSINESS': 'Kinh doanh',
    'HEALTH': 'Sức khỏe',
  };

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _loadData();
  }

  @override
  void dispose() {
    _pulseController.dispose();
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
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
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
      backgroundColor: const Color(0xFF070B12),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            _loadData();
            await Future.delayed(const Duration(milliseconds: 600));
          },
          color: const Color(0xFF00E5FF),
          backgroundColor: const Color(0xFF0B1320),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── PAGE HEADER / BROADCAST NETWORK BANNER ──────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF090F1A),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF162338)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x66000000),
                          blurRadius: 16,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Tag with animated pulsing cyan dot
                        Row(
                          children: [
                            AnimatedBuilder(
                              animation: _pulseAnimation,
                              builder: (context, child) {
                                return Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF00E5FF)
                                        .withValues(alpha: _pulseAnimation.value),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF00E5FF)
                                            .withValues(
                                                alpha: _pulseAnimation.value * 0.8),
                                        blurRadius: 8,
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'BROADCAST NETWORK // 25 HIGH-BITRATE CHANNELS',
                              style: TextStyle(
                                color: Color(0xFF00E5FF),
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 8),

                        const Text(
                          'Danh Sách Kênh Truyền Hình',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.4,
                          ),
                        ),

                        const SizedBox(height: 4),

                        const Text(
                          'Hệ thống kênh độc quyền 24/7 độ trễ siêu thấp, chuẩn HEVC 2160p60 & xem lại 7 ngày.',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),

                        const SizedBox(height: 14),

                        // Search Input
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF0E1726),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF1D2F4A)),
                          ),
                          child: TextField(
                            controller: _searchController,
                            onChanged: _onSearchChanged,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Tìm kiếm kênh hoặc chương trình...',
                              hintStyle: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 12,
                              ),
                              prefixIcon: const Icon(
                                Icons.search_rounded,
                                color: Color(0xFF94A3B8),
                                size: 20,
                              ),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(
                                        Icons.clear_rounded,
                                        color: Color(0xFF94A3B8),
                                        size: 18,
                                      ),
                                      onPressed: () {
                                        _searchController.clear();
                                        _onSearchChanged('');
                                      },
                                    )
                                  : null,
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── CATEGORY FILTER BAR ─────────────────────────────────
              SliverToBoxAdapter(
                child: Container(
                  height: 44,
                  margin: const EdgeInsets.only(bottom: 8),
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
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF00E5FF)
                                : const Color(0xFF0E1625),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFF00E5FF)
                                  : const Color(0xFF1B2B42),
                            ),
                            boxShadow: isSelected
                                ? const [
                                    BoxShadow(
                                      color: Color(0x6600E5FF),
                                      blurRadius: 10,
                                      offset: Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            cat['label']!,
                            style: TextStyle(
                              color: isSelected
                                  ? const Color(0xFF070B12)
                                  : const Color(0xFFCBD5E1),
                              fontSize: 12,
                              fontWeight: isSelected
                                  ? FontWeight.w900
                                  : FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              // ── CHANNELS LIST / GRID ────────────────────────────────
              BlocBuilder<ChannelsBloc, ChannelsState>(
                builder: (context, channelState) {
                  return BlocBuilder<ProgramsBloc, ProgramsState>(
                    builder: (context, programState) {
                      // Build a live map by channelId
                      final liveMap = <String, LiveEventModel>{};
                      if (programState is ProgramsLoaded) {
                        for (final event in programState.programs) {
                          liveMap[event.channelId] = event;
                        }
                      }

                      if (channelState is ChannelsLoading) {
                        return SliverPadding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) => _buildSkeletonCard(),
                              childCount: 4,
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
                                (c.currentProgram
                                        ?.toLowerCase()
                                        .contains(q) ??
                                    false);
                          }).toList();
                        }

                        if (list.isEmpty) {
                          return SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 40,
                                  horizontal: 20,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF090F1A),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: const Color(0xFF162338),
                                  ),
                                ),
                                child: const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.tv_off_rounded,
                                      size: 48,
                                      color: Color(0xFF475569),
                                    ),
                                    SizedBox(height: 12),
                                    Text(
                                      'Không tìm thấy kênh nào',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc thể loại.',
                                      style: TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 12,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }

                        return SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final channel = list[index];
                                final liveEvent = liveMap[channel.id];
                                return _buildCyberChannelCard(
                                  channel: channel,
                                  liveEvent: liveEvent,
                                  index: index,
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
                                  const Icon(
                                    Icons.error_outline_rounded,
                                    size: 48,
                                    color: Color(0xFFEF4444),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    channelState.message,
                                    style: const TextStyle(
                                      color: Color(0xFFEF4444),
                                      fontSize: 13,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: _loadData,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF00E5FF),
                                      foregroundColor: const Color(0xFF070B12),
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

  Widget _buildCyberChannelCard({
    required ChannelModel channel,
    required LiveEventModel? liveEvent,
    required int index,
  }) {
    final channelNumStr = 'CH #${(index + 1).toString().padLeft(3, '0')}';
    final categoryDisplayName =
        _categoryLabels[channel.category.toUpperCase()] ??
            channel.categoryDisplayName;
    final currentProgramTitle = liveEvent?.title ??
        channel.currentProgram ??
        '${channel.name} — Chương trình đặc biệt';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF16253C)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x40000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Logo + Number + Name + Category + Live badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo container
                  Container(
                    width: 48,
                    height: 48,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121E30),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1F304A)),
                    ),
                    child: ChannelLogo(
                      channel: channel,
                      size: 42,
                      showLiveIndicator: channel.isLive,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Channel Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          channelNumStr,
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          channel.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          categoryDisplayName.toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFF00E5FF),
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Badges: Tier (VIP/FREE) + LIVE
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: ChannelTiers.isPremium(channel.slug)
                              ? const Color(0xFFEAB308).withValues(alpha: 0.15)
                              : const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: ChannelTiers.isPremium(channel.slug)
                                ? const Color(0xFFFACC15).withValues(alpha: 0.5)
                                : const Color(0xFF34D399).withValues(alpha: 0.5),
                          ),
                        ),
                        child: Text(
                          ChannelTiers.isPremium(channel.slug) ? 'VIP 4K' : 'FREE',
                          style: TextStyle(
                            color: ChannelTiers.isPremium(channel.slug)
                                ? const Color(0xFFFDE047)
                                : const Color(0xFF6EE7B7),
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 5),
                      // LIVE badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF450A0A),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF991B1B)),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x33EF4444),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            AnimatedBuilder(
                              animation: _pulseAnimation,
                              builder: (context, _) {
                                return Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444)
                                        .withValues(alpha: _pulseAnimation.value),
                                    shape: BoxShape.circle,
                                  ),
                                );
                              },
                            ),
                            const SizedBox(width: 5),
                            const Text(
                              'LIVE',
                              style: TextStyle(
                                color: Color(0xFFF87171),
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Current Broadcasting Box (ON-AIR 4K)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF070E1A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF142236)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Đang phát:',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'ON-AIR 4K',
                          style: TextStyle(
                            color: Color(0xFFFBBF24),
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currentProgramTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    // Realistic Cyan Neon Progress Bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: Container(
                        height: 3,
                        color: const Color(0xFF162338),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: 0.65,
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Color(0xFF00E5FF),
                              boxShadow: [
                                BoxShadow(
                                  color: Color(0xFF00E5FF),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Actions: Xem Trực Tiếp button & Info button
              Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF00E5FF), Color(0xFF2563EB)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x4D00E5FF),
                            blurRadius: 8,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(10),
                          onTap: () {
                            context.push('/channel/${channel.id}');
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 9),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.play_arrow_rounded,
                                  color: Color(0xFF070B12),
                                  size: 18,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Xem Trực Tiếp',
                                  style: TextStyle(
                                    color: Color(0xFF070B12),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF101B2C),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF1E3250)),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () {
                          ChannelQuickViewSheet.show(context, channel);
                        },
                        child: const Padding(
                          padding: EdgeInsets.all(9),
                          child: Icon(
                            Icons.info_outline_rounded,
                            color: Color(0xFF94A3B8),
                            size: 18,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeletonCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      height: 160,
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF16253C)),
      ),
    );
  }
}
