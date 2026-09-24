// OmniCast - EPG Screen with Timeline View

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/epg/epg_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/program_model.dart';
import '../../widgets/channel_logo.dart';

class EpgScreen extends StatefulWidget {
  const EpgScreen({super.key});

  @override
  State<EpgScreen> createState() => _EpgScreenState();
}

class _EpgScreenState extends State<EpgScreen> {
  @override
  void initState() {
    super.initState();
    context.read<EpgBloc>().add(LoadEpgSchedule(date: DateTime.now()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('Lịch phát sóng'),
        backgroundColor: AppColors.dark950,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () => _showDatePicker(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Date Selector
          _DateSelector(),
          
          // Timeline View Header
          _TimelineHeader(),
          
          // EPG Content
          Expanded(
            child: BlocBuilder<EpgBloc, EpgState>(
              builder: (context, state) {
                if (state is EpgLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is EpgLoaded) {
                  if (state.events.isEmpty) {
                    return _buildEmptyState();
                  }

                  return _EpgTimelineList(
                    events: state.events,
                    selectedDate: state.selectedDate,
                  );
                }

                if (state is EpgError) {
                  return _buildErrorState(state.message);
                }

                return const SizedBox();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_busy, size: 64, color: AppColors.dark500),
          SizedBox(height: 16),
          Text(
            'Không có chương trình nào',
            style: TextStyle(
              color: AppColors.dark400,
              fontSize: 16,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Thử chọn ngày khác',
            style: TextStyle(
              color: AppColors.dark600,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<EpgBloc>().add(LoadEpgSchedule(date: DateTime.now()));
            },
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }

  void _showDatePicker(BuildContext context) async {
    final currentState = context.read<EpgBloc>().state;
    DateTime initialDate = DateTime.now();
    if (currentState is EpgLoaded) {
      initialDate = currentState.selectedDate;
    }

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              surface: AppColors.dark800,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && mounted) {
      context.read<EpgBloc>().add(ChangeEpgDate(picked));
    }
  }
}

class _DateSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.dark900,
        border: Border(
          bottom: BorderSide(color: AppColors.dark700.withOpacity(0.5)),
        ),
      ),
      child: BlocBuilder<EpgBloc, EpgState>(
        builder: (context, state) {
          DateTime selectedDate = DateTime.now();
          if (state is EpgLoaded) {
            selectedDate = state.selectedDate;
          }

          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: List.generate(7, (index) {
                final date = DateTime.now().add(Duration(days: index - 3));
                final isSelected = _isSameDay(date, selectedDate);
                final isToday = _isSameDay(date, DateTime.now());

                return GestureDetector(
                  onTap: () {
                    context.read<EpgBloc>().add(ChangeEpgDate(date));
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : AppColors.dark800,
                      borderRadius: BorderRadius.circular(12),
                      border: isToday && !isSelected
                          ? Border.all(color: AppColors.primary.withOpacity(0.5))
                          : null,
                    ),
                    child: Column(
                      children: [
                        Text(
                          _getDayName(date),
                          style: TextStyle(
                            color: isSelected ? Colors.white : AppColors.dark400,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${date.day}',
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (isToday)
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          );
        },
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.day == b.day && a.month == b.month && a.year == b.year;
  }

  String _getDayName(DateTime date) {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return days[date.weekday - 1];
  }
}

class _TimelineHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        border: Border(
          bottom: BorderSide(color: AppColors.dark700.withOpacity(0.5)),
        ),
      ),
      child: Row(
        children: [
          const SizedBox(width: 80),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(24, (index) {
                  return Container(
                    width: 60,
                    alignment: Alignment.center,
                    child: Text(
                      '${index.toString().padLeft(2, '0')}:00',
                      style: const TextStyle(
                        color: AppColors.dark400,
                        fontSize: 11,
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EpgTimelineList extends StatelessWidget {
  final List<LiveEventModel> events;
  final DateTime selectedDate;

  const _EpgTimelineList({
    required this.events,
    required this.selectedDate,
  });

  @override
  Widget build(BuildContext context) {
    // Group events by channel
    final eventsByChannel = _groupEventsByChannel(events);

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        return _EpgEventCard(
          event: event,
          selectedDate: selectedDate,
        );
      },
    );
  }

  Map<String?, List<LiveEventModel>> _groupEventsByChannel(
    List<LiveEventModel> events,
  ) {
    final grouped = <String?, List<LiveEventModel>>{};
    for (final event in events) {
      final channelName = event.channel?.name ?? 'Unknown';
      grouped.putIfAbsent(channelName, () => []).add(event);
    }
    return grouped;
  }
}

class _EpgEventCard extends StatelessWidget {
  final LiveEventModel event;
  final DateTime selectedDate;

  const _EpgEventCard({
    required this.event,
    required this.selectedDate,
  });

  @override
  Widget build(BuildContext context) {
    final isLive = event.isLive;
    final isUpcoming = event.isScheduled;
    final isPast = event.hasEnded;

    return GestureDetector(
      onTap: () {
        context.push('/program/${event.id}');
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: isLive
              ? Border.all(color: AppColors.liveRed.withOpacity(0.5))
              : isPast
                  ? Border.all(color: AppColors.dark700.withOpacity(0.3))
                  : null,
        ),
        child: Row(
          children: [
            // Time Column
            Container(
              width: 80,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isLive
                    ? AppColors.liveRed
                    : isPast
                        ? AppColors.dark700.withOpacity(0.5)
                        : AppColors.dark700,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(12),
                ),
              ),
              child: Column(
                children: [
                  Text(
                    _formatTime(event.scheduledAt),
                    style: TextStyle(
                      color: isPast ? AppColors.dark500 : Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  if (event.duration != null)
                    Text(
                      '${event.duration}p',
                      style: TextStyle(
                        color: isPast ? AppColors.dark600 : Colors.white70,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (isLive) ...[
                          _LiveBadge(),
                          const SizedBox(width: 8),
                        ],
                        if (isPast)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.dark600,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Đã kết thúc',
                              style: TextStyle(
                                color: AppColors.dark400,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        if (isUpcoming)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Sắp phát',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        Expanded(
                          child: Text(
                            event.title,
                            style: TextStyle(
                              color: isPast ? AppColors.dark400 : Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (event.channel != null) ...[
                          ChannelLogoCompact(
                            channel: event.channel!,
                            size: 20,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            event.channel!.name,
                            style: TextStyle(
                              color: isPast ? AppColors.dark600 : AppColors.dark400,
                              fontSize: 12,
                            ),
                          ),
                        ],
                        const Spacer(),
                        if (event.viewerCount > 0) ...[
                          Icon(
                            Icons.visibility,
                            size: 12,
                            color: isPast ? AppColors.dark600 : AppColors.dark400,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${_formatNumber(event.viewerCount)}',
                            style: TextStyle(
                              color: isPast ? AppColors.dark600 : AppColors.dark400,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
            // Actions
            IconButton(
              icon: Icon(
                isPast ? Icons.replay : Icons.bookmark_outline,
                color: AppColors.dark500,
              ),
              onPressed: () {
                // Add to watchlist or replay
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }
}

class _LiveBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.liveRed,
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 6, color: Colors.white),
          SizedBox(width: 4),
          Text(
            'LIVE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
