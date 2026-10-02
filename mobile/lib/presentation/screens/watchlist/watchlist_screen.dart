// OmniCast - Watchlist Screen
// Cyber-dark 3-tab experience: Sắp tới / Đang LIVE / Đã phát
// High-tech cards, instant notification toggle, and GoRouter navigation.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../data/models/watchlist_item_model.dart';
import '../../../logic/watchlist/watchlist_bloc.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    context.read<WatchlistBloc>().add(const LoadWatchlist());
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
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
          'Danh Sách Theo Dõi',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          BlocBuilder<WatchlistBloc, WatchlistState>(
            builder: (context, state) {
              if (state is! WatchlistLoaded || state.pendingSyncCount == 0) {
                return const SizedBox.shrink();
              }
              return Container(
                margin: const EdgeInsets.only(right: 14),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF451A03),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFB45309)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.sync_rounded,
                      size: 14,
                      color: Color(0xFFFBBF24),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${state.pendingSyncCount} chờ đồng bộ',
                      style: const TextStyle(
                        color: Color(0xFFFBBF24),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFF162338), width: 1),
              ),
            ),
            child: BlocBuilder<WatchlistBloc, WatchlistState>(
              builder: (context, state) {
                int upcoming = 0, live = 0, past = 0;
                if (state is WatchlistLoaded) {
                  upcoming = state.buckets.upcoming.length;
                  live = state.buckets.live.length;
                  past = state.buckets.past.length;
                }

                return TabBar(
                  controller: _tabs,
                  indicatorColor: const Color(0xFF00E5FF),
                  indicatorWeight: 3,
                  labelColor: const Color(0xFF00E5FF),
                  unselectedLabelColor: const Color(0xFF64748B),
                  labelStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  tabs: [
                    Tab(text: 'Sắp tới ($upcoming)'),
                    Tab(text: 'LIVE ($live)'),
                    Tab(text: 'Đã phát ($past)'),
                  ],
                );
              },
            ),
          ),
        ),
      ),
      body: BlocBuilder<WatchlistBloc, WatchlistState>(
        builder: (context, state) {
          if (state is WatchlistLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
            );
          }
          if (state is WatchlistError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    size: 48,
                    color: Color(0xFFEF4444),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    state.message,
                    style: const TextStyle(color: Color(0xFFEF4444)),
                  ),
                ],
              ),
            );
          }
          if (state is! WatchlistLoaded) {
            return const SizedBox.shrink();
          }

          if (state.buckets.total == 0) {
            return const _EmptyState();
          }

          return TabBarView(
            controller: _tabs,
            children: [
              _TabList(
                items: state.buckets.upcoming,
                emptyLabel: 'Chưa có chương trình sắp tới nào.',
              ),
              _TabList(
                items: state.buckets.live,
                emptyLabel: 'Hiện không có chương trình đang LIVE nào.',
              ),
              _TabList(
                items: state.buckets.past,
                emptyLabel: 'Chưa có chương trình đã phát nào được lưu.',
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TabList extends StatelessWidget {
  final List<WatchlistItemModel> items;
  final String emptyLabel;

  const _TabList({required this.items, required this.emptyLabel});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.bookmark_outline_rounded,
                size: 64,
                color: Color(0xFF334155),
              ),
              const SizedBox(height: 14),
              Text(
                emptyLabel,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => context.go('/epg'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00E5FF),
                  foregroundColor: const Color(0xFF070B12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: const Icon(Icons.explore_rounded, size: 18),
                label: const Text(
                  'Khám phá Lịch EPG',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) => _WatchlistItemCard(item: items[i]),
    );
  }
}

class _WatchlistItemCard extends StatelessWidget {
  final WatchlistItemModel item;

  const _WatchlistItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isLiveNow = now.isAfter(item.scheduledAt) &&
        now.isBefore(
            item.scheduledAt.add(Duration(minutes: item.durationMinutes)));

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLiveNow
              ? const Color(0xFF991B1B)
              : const Color(0xFF16253C),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Program Thumbnail / Live Icon
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF121E30),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1F304A)),
                ),
                child: Center(
                  child: Icon(
                    isLiveNow
                        ? Icons.live_tv_rounded
                        : Icons.movie_creation_outlined,
                    color: isLiveNow
                        ? const Color(0xFFEF4444)
                        : const Color(0xFF00E5FF),
                    size: 32,
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isLiveNow) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        margin: const EdgeInsets.only(bottom: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF450A0A),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'ĐANG PHÁT TRỰC TIẾP',
                          style: TextStyle(
                            color: Color(0xFFF87171),
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                    Text(
                      item.programTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (item.channelName != null)
                      Text(
                        item.channelName!,
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.schedule_rounded,
                          size: 13,
                          color: Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatDateTime(item.scheduledAt),
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Action Icons
              Column(
                children: [
                  // Play button
                  IconButton(
                    icon: const Icon(
                      Icons.play_circle_fill_rounded,
                      color: Color(0xFF00E5FF),
                      size: 30,
                    ),
                    onPressed: () {
                      context.push('/program/${item.programId}');
                    },
                  ),
                  // Reminder button
                  IconButton(
                    icon: Icon(
                      item.reminderEnabled
                          ? Icons.notifications_active_rounded
                          : Icons.notifications_none_rounded,
                      color: item.reminderEnabled
                          ? const Color(0xFFFBBF24)
                          : const Color(0xFF64748B),
                      size: 20,
                    ),
                    onPressed: () {
                      context.read<WatchlistBloc>().add(
                            ToggleWatchlistReminder(
                              itemId: item.id!,
                              reminderTime: item.reminderEnabled
                                  ? null
                                  : DateTime.now()
                                      .add(const Duration(minutes: 5)),
                            ),
                          );
                    },
                  ),
                  // Remove button
                  IconButton(
                    icon: const Icon(
                      Icons.delete_outline_rounded,
                      color: Color(0xFF475569),
                      size: 18,
                    ),
                    onPressed: () {
                      context.read<WatchlistBloc>().add(
                            RemoveFromWatchlist(item.programId),
                          );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = dateTime.difference(now);

    if (diff.inDays == 0 && diff.inSeconds > -3600 * 4) {
      return 'Hôm nay ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Ngày mai ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else {
      return '${dateTime.day}/${dateTime.month} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: const Color(0xFF0B1320),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF16253C)),
              ),
              child: const Icon(
                Icons.bookmark_add_outlined,
                size: 44,
                color: Color(0xFF00E5FF),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Chưa Có Mục Yêu Thích',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Lưu lại các chương trình hoặc sự kiện trực tiếp để nhận thông báo và xem lại nhanh chóng.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => context.go('/epg'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00E5FF),
                foregroundColor: const Color(0xFF070B12),
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.calendar_month_rounded, size: 20),
              label: const Text(
                'Khám Phá Lịch Phát Sóng EPG',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
