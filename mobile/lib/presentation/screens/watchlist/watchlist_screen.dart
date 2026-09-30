// OmniCast - Watchlist Screen (3-tab: Sắp tới / Đang LIVE / Đã phát)

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
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
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('Danh sách yêu thích'),
        backgroundColor: AppColors.dark950,
        actions: [
          BlocBuilder<WatchlistBloc, WatchlistState>(
            builder: (context, state) {
              if (state is! WatchlistLoaded || state.pendingSyncCount == 0) {
                return const SizedBox.shrink();
              }
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Center(
                  child: Chip(
                    label: Text(
                      '${state.pendingSyncCount} chờ đồng bộ',
                      style: const TextStyle(fontSize: 11),
                    ),
                    backgroundColor:
                        AppColors.warning.withValues(alpha: 0.2),
                    side: const BorderSide(
                        color: AppColors.warning, width: 1),
                  ),
                ),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
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
                indicatorColor: AppColors.primary,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.dark400,
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
      body: BlocBuilder<WatchlistBloc, WatchlistState>(
        builder: (context, state) {
          if (state is WatchlistLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is WatchlistError) {
            return Center(
              child: Text(
                state.message,
                style: const TextStyle(color: AppColors.error),
              ),
            );
          }
          if (state is! WatchlistLoaded) {
            return const SizedBox.shrink();
          }

          if (state.buckets.total == 0) {
            return _EmptyState();
          }

          return TabBarView(
            controller: _tabs,
            children: [
              _TabList(items: state.buckets.upcoming, emptyLabel: 'Chưa có chương trình sắp tới'),
              _TabList(items: state.buckets.live, emptyLabel: 'Hiện không có chương trình đang LIVE'),
              _TabList(items: state.buckets.past, emptyLabel: 'Chưa xem chương trình nào'),
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.bookmark_outline,
              size: 64,
              color: AppColors.dark600,
            ),
            const SizedBox(height: 12),
            Text(
              emptyLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.dark400),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pushNamed('/epg'),
              icon: const Icon(Icons.explore),
              label: const Text('Khám phá EPG'),
            ),
          ],
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 100,
            height: 80,
            decoration: const BoxDecoration(
              color: AppColors.dark700,
              borderRadius: BorderRadius.horizontal(
                left: Radius.circular(12),
              ),
            ),
            child: const Icon(
              Icons.play_circle_outline,
              color: AppColors.dark500,
              size: 40,
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.programTitle,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  if (item.channelName != null)
                    Text(
                      item.channelName!,
                      style: const TextStyle(
                        color: AppColors.dark400,
                        fontSize: 12,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.schedule,
                        size: 14,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDateTime(item.scheduledAt),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Column(
            children: [
              IconButton(
                icon: Icon(
                  item.reminderEnabled
                      ? Icons.notifications_active
                      : Icons.notifications_outlined,
                  color: item.reminderEnabled
                      ? AppColors.accentGold
                      : AppColors.dark500,
                ),
                onPressed: () {
                  context.read<WatchlistBloc>().add(
                        ToggleWatchlistReminder(
                          itemId: item.id!,
                          reminderTime: item.reminderEnabled
                              ? null
                              : DateTime.now().add(const Duration(minutes: 5)),
                        ),
                      );
                },
              ),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline,
                  color: AppColors.dark500,
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
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.bookmark_outline,
            size: 80,
            color: AppColors.dark600,
          ),
          const SizedBox(height: 16),
          const Text(
            'Chưa có mục nào',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Lưu các chương trình yêu thích để xem sau, đồng bộ giữa Mobile và Web.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.dark400, fontSize: 14),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => Navigator.of(context).pushNamed('/epg'),
            icon: const Icon(Icons.explore),
            label: const Text('Khám phá EPG'),
          ),
        ],
      ),
    );
  }
}
