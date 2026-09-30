// OmniCast - EPG Screen with Timeline View

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/epg/epg_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/program_model.dart';
import '../../widgets/channel_logo.dart' hide ChannelInfo;

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

class _EpgTimelineList extends StatefulWidget {
  final List<LiveEventModel> events;
  final DateTime selectedDate;

  const _EpgTimelineList({
    required this.events,
    required this.selectedDate,
  });

  @override
  State<_EpgTimelineList> createState() => _EpgTimelineListState();
}

class _EpgTimelineListState extends State<_EpgTimelineList> {
  /// When null, all channels are shown grouped together.
  String? _channelFilter;

  /// When true, only real programmes (isFiller == false) are surfaced.
  /// Useful when the user wants a clean view of the day.
  bool _hideFiller = false;

  @override
  Widget build(BuildContext context) {
    // Group events by channel, then sort each group chronologically by
    // `scheduledAt` so the day reads 00:00 → 23:59 left-to-right. Real
    // events with the same start time float to the top of their group.
    final groups = <String, _EpgChannelGroup>{};
    for (final e in widget.events) {
      final channelId = e.channelId;
      final group = groups.putIfAbsent(
        channelId,
        () => _EpgChannelGroup(
          channel: e.channel,
          events: [],
        ),
      );
      group.events.add(e);
    }
    for (final g in groups.values) {
      g.events.sort((a, b) {
        final byTime = a.scheduledAt.compareTo(b.scheduledAt);
        if (byTime != 0) return byTime;
        // Tie-break: real event first, then replay, then on-air branding.
        return _fillerPriority(a) - _fillerPriority(b);
      });
    }
    final sortedGroupIds = groups.keys.toList()
      ..sort((a, b) => (groups[a]!.channel?.name ?? a)
          .compareTo(groups[b]!.channel?.name ?? b));

    final visibleEvents = _hideFiller
        ? widget.events.where((e) => !e.isFiller).toList()
        : widget.events;
    final totalReal = visibleEvents.where((e) => !e.isFiller).length;
    final totalReplay = visibleEvents
        .where((e) => e.fillerKind == 'recording-replay')
        .length;
    final totalOnAir = visibleEvents
        .where((e) => e.fillerKind == 'channel-branding')
        .length;
    final totalChannels = groups.length;

    // If the filter strips every event out, surface an inline empty
    // state so the user knows nothing matches — rather than a blank screen.
    if (visibleEvents.isEmpty) {
      return _buildFilteredEmpty();
    }

    return Column(
      children: [
        // 24/7 coverage banner + filter toggle
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          color: AppColors.dark900,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.event_available,
                    size: 14,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Lịch phát sóng 24/7 — mỗi ngày đều được lấp đầy với chương trình thực, replay từ VOD và khung quảng bá kênh.',
                      style: TextStyle(
                        color: AppColors.dark300.withOpacity(0.9),
                        fontSize: 11,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    '$totalChannels kênh · $totalReal chương trình thực',
                    style: const TextStyle(
                      color: AppColors.dark300,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (totalReplay > 0)
                    Text(
                      '· $totalReplay replay',
                      style: const TextStyle(
                        color: AppColors.dark500,
                        fontSize: 12,
                      ),
                    ),
                  if (totalOnAir > 0) ...[
                    const SizedBox(width: 8),
                    Text(
                      '· $totalOnAir on-air',
                      style: const TextStyle(
                        color: AppColors.dark500,
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() => _hideFiller = !_hideFiller),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _hideFiller
                            ? AppColors.primary.withOpacity(0.2)
                            : AppColors.dark800,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _hideFiller
                              ? AppColors.primary.withOpacity(0.5)
                              : AppColors.dark700.withOpacity(0.5),
                        ),
                      ),
                      child: Text(
                        _hideFiller
                            ? 'Hiện tất cả khung giờ'
                            : 'Chỉ chương trình thực',
                        style: TextStyle(
                          color: _hideFiller
                              ? AppColors.primary
                              : AppColors.dark300,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 36,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _FilterChip(
                      label: 'Tất cả',
                      selected: _channelFilter == null,
                      onTap: () => setState(() => _channelFilter = null),
                    ),
                    for (final id in sortedGroupIds)
                      _FilterChip(
                        label: groups[id]!.channel?.name ?? 'Kênh',
                        leading: groups[id]!.channel == null
                            ? null
                            : ChannelLogoCompact(
                                channel: groups[id]!.channel!,
                                size: 18,
                              ),
                        selected: _channelFilter == id,
                        onTap: () => setState(() => _channelFilter = id),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: sortedGroupIds.length,
            itemBuilder: (context, idx) {
              final id = sortedGroupIds[idx];
              if (_channelFilter != null && _channelFilter != id) {
                return const SizedBox.shrink();
              }
              final group = groups[id]!;
              final visibleGroupEvents = _hideFiller
                  ? group.events.where((e) => !e.isFiller).toList()
                  : group.events;
              if (visibleGroupEvents.isEmpty) {
                return const SizedBox.shrink();
              }
              return _EpgChannelSection(
                group: _EpgChannelGroup(
                  channel: group.channel,
                  events: visibleGroupEvents,
                ),
                selectedDate: widget.selectedDate,
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFilteredEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.filter_alt_off,
              size: 56, color: AppColors.dark500.withOpacity(0.7)),
          const SizedBox(height: 12),
          Text(
            _hideFiller
                ? 'Ngày này chưa có chương trình thực nào'
                : 'Bộ lọc hiện tại không có kết quả',
            style: const TextStyle(
              color: AppColors.dark400,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: () => setState(() {
              _channelFilter = null;
              _hideFiller = false;
            }),
            icon: const Icon(Icons.refresh, size: 14),
            label: const Text('Đặt lại bộ lọc'),
          ),
        ],
      ),
    );
  }

  /// Smaller sort key = renders earlier when two events start at the
  /// same wall-clock time. Real events beat replays, replays beat the
  /// static "on-air" branding slot.
  int _fillerPriority(LiveEventModel e) {
    if (!e.isFiller) return 0;
    if (e.fillerKind == 'recording-replay') return 1;
    return 2;
  }
}

class _EpgChannelGroup {
  final ChannelInfo? channel;
  final List<LiveEventModel> events;
  _EpgChannelGroup({required this.channel, required this.events});
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget? leading;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : AppColors.dark800,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected
                  ? AppColors.primary
                  : AppColors.dark700.withOpacity(0.5),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leading != null) ...[
                leading!,
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.white : AppColors.dark300,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EpgChannelSection extends StatelessWidget {
  final _EpgChannelGroup group;
  final DateTime selectedDate;

  const _EpgChannelSection({
    required this.group,
    required this.selectedDate,
  });

  @override
  Widget build(BuildContext context) {
    final realCount = group.events.where((e) => !e.isFiller).length;
    final fillerCount = group.events.where((e) => e.isFiller).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Row(
            children: [
              if (group.channel != null)
                ChannelLogoCompact(
                  channel: group.channel!,
                  size: 24,
                ),
              const SizedBox(width: 8),
              Text(
                group.channel?.name ?? 'Kênh',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '$realCount thực · $fillerCount replay',
                style: const TextStyle(
                  color: AppColors.dark500,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
        for (final event in group.events)
          _EpgEventCard(
            event: event,
            selectedDate: selectedDate,
          ),
        const SizedBox(height: 16),
      ],
    );
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
    final isFiller = event.isFiller;

    return GestureDetector(
      onTap: () {
        if (isFiller && event.sourceRecordingId != null) {
          context.push('/recording/${event.sourceRecordingId}');
        } else if (!isFiller) {
          context.push('/program/${event.id}');
        }
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
                  : isFiller
                      ? Border.all(
                          color: AppColors.dark700.withOpacity(0.4),
                          style: BorderStyle.solid,
                        )
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
                        : isFiller
                            ? AppColors.dark700.withOpacity(0.3)
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
                      color: isPast
                          ? AppColors.dark500
                          : (isFiller ? AppColors.dark300 : Colors.white),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  if (event.duration != null)
                    Text(
                      _formatDuration(event.duration!),
                      style: TextStyle(
                        color: isPast
                            ? AppColors.dark600
                            : (isFiller
                                ? AppColors.dark500
                                : Colors.white70),
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
                        if (isFiller)
                          _FillerBadge(
                            fillerKind: event.fillerKind,
                          ),
                        if (isFiller) const SizedBox(width: 8),
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

  /// Render a minute count in a compact, human-friendly form.
  ///  - 75  -> "1h 15p"
  ///  - 60  -> "1h"
  ///  - 30  -> "30 phút"
  ///  - 150 -> "2h 30p"
  String _formatDuration(int minutes) {
    if (minutes < 60) return '$minutes phút';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '${h}h';
    return '${h}h ${m}p';
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

/// Pill that distinguishes the two kinds of filler slots returned by the
/// backend's `/programs/epg/day` endpoint:
///
///  - `recording-replay` → blue-tinted "Replay" badge (replays a real
///    previously-published recording so the grid is dense 24/7).
///  - `channel-branding` → neutral "On Air" badge (channel has zero
///    recordings, so this is a static branded placeholder).
class _FillerBadge extends StatelessWidget {
  final String? fillerKind;

  const _FillerBadge({this.fillerKind});

  @override
  Widget build(BuildContext context) {
    final isReplay = fillerKind == 'recording-replay';
    final color = isReplay
        ? AppColors.accentCyan
        : AppColors.dark500;
    final bg = isReplay
        ? AppColors.accentCyan.withOpacity(0.15)
        : AppColors.dark700.withOpacity(0.5);
    final border = isReplay
        ? AppColors.accentCyan.withOpacity(0.4)
        : AppColors.dark500.withOpacity(0.3);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isReplay ? Icons.replay : Icons.auto_awesome,
            size: 10,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            isReplay ? 'REPLAY' : 'ON AIR',
            style: TextStyle(
              color: isReplay ? AppColors.accentCyan : AppColors.dark300,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );
  }
}
