// OmniCast - Watchlist Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../logic/watchlist/watchlist_bloc.dart';
import '../../../core/theme/app_theme.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> {
  @override
  void initState() {
    super.initState();
    context.read<WatchlistBloc>().add(LoadWatchlist());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('Danh sách yêu thích'),
        backgroundColor: AppColors.dark950,
      ),
      body: BlocBuilder<WatchlistBloc, WatchlistState>(
        builder: (context, state) {
          if (state is WatchlistLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is WatchlistLoaded) {
            if (state.items.isEmpty) {
              return _buildEmptyState();
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.items.length,
              itemBuilder: (context, index) {
                final item = state.items[index];
                return _WatchlistItemCard(item: item);
              },
            );
          }

          if (state is WatchlistError) {
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
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
          const Text(
            'Lưu các chương trình yêu thích để xem later',
            style: TextStyle(
              color: AppColors.dark400,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _WatchlistItemCard extends StatelessWidget {
  final dynamic item;

  const _WatchlistItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final isUpcoming = item.isUpcoming;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Thumbnail
          Container(
            width: 100,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.dark700,
              borderRadius: const BorderRadius.horizontal(
                left: Radius.circular(12),
              ),
            ),
            child: const Icon(
              Icons.play_circle_outline,
              color: AppColors.dark500,
              size: 40,
            ),
          ),
          // Content
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
                      Icon(
                        Icons.schedule,
                        size: 14,
                        color: isUpcoming ? AppColors.primary : AppColors.dark500,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDateTime(item.scheduledAt),
                        style: TextStyle(
                          color: isUpcoming ? AppColors.primary : AppColors.dark500,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Actions
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
                  // Toggle reminder
                },
              ),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline,
                  color: AppColors.dark500,
                ),
                onPressed: () {
                  context.read<WatchlistBloc>().add(
                        RemoveFromWatchlist(item.id!),
                      );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = dateTime.difference(now);

    if (diff.inDays == 0) {
      return 'Hôm nay ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Ngày mai ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } else {
      return '${dateTime.day}/${dateTime.month} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}
