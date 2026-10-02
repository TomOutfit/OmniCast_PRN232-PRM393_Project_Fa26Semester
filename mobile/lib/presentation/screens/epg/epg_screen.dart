// OmniCast - EPG Screen with Cyber-Dark Timeline View
// 24/7 Schedule Density with Live Indicators, Replays, and Channel Grouping

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/epg/epg_bloc.dart';
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
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Lịch Phát Sóng EPG',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.calendar_month_rounded,
              color: Color(0xFF00E5FF),
            ),
            tooltip: 'Chọn ngày',
            onPressed: () => _showDatePicker(context),
          ),
          const SizedBox(width: 4),
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
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
                  );
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
          Icon(
            Icons.event_busy_rounded,
            size: 56,
            color: Color(0xFF334155),
          ),
          SizedBox(height: 14),
          Text(
            'Không có chương trình nào trong ngày',
            style: TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 6),
          Text(
            'Thử chọn một ngày khác trong thanh chọn lịch.',
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
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
          const Icon(
            Icons.error_outline_rounded,
            size: 52,
            color: Color(0xFFEF4444),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(color: Color(0xFFEF4444)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<EpgBloc>().add(LoadEpgSchedule(date: DateTime.now()));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: const Color(0xFF070B12),
            ),
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
              primary: Color(0xFF00E5FF),
              surface: Color(0xFF090F1A),
            ),
          ),
          child: child!,
        );
      },
    );

    if (!mounted || picked == null) return;
    this.context.read<EpgBloc>().add(ChangeEpgDate(picked));
  }
}

class _DateSelector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF090F1A),
        border: Border(
          bottom: BorderSide(color: Color(0xFF162338), width: 1),
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
                    duration: const Duration(milliseconds: 180),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF00E5FF)
                          : const Color(0xFF0B1320),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF00E5FF)
                            : (isToday
                                ? const Color(0xFF00E5FF).withValues(alpha: 0.5)
                                : const Color(0xFF16253C)),
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
                    child: Column(
                      children: [
                        Text(
                          _getDayName(date),
                          style: TextStyle(
                            color: isSelected
                                ? const Color(0xFF070B12)
                                : const Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: isSelected
                                ? FontWeight.w900
                                : FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${date.day}',
                          style: TextStyle(
                            color: isSelected
                                ? const Color(0xFF070B12)
                                : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                        if (isToday)
                          Container(
                            margin: const EdgeInsets.only(top: 3),
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF070B12)
                                  : const Color(0xFF00E5FF),
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
      decoration: const BoxDecoration(
        color: Color(0xFF070E1A),
        border: Border(
          bottom: BorderSide(color: Color(0xFF142236), width: 1),
        ),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 80,
            child: Text(
              'GIỜ PHÁT',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 10,
                fontWeight: FontWeight.w800,
                fontFamily: 'monospace',
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(24, (index) {
                  return Container(
                    width: 58,
                    alignment: Alignment.center,
                    child: Text(
                      '${index.toString().padLeft(2, '0')}:00',
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 10,
                        fontFamily: 'monospace',
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
  String? _channelFilter;
  bool _hideFiller = false;

  @override
  Widget build(BuildContext context) {
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
    final totalChannels = groups.length;

    if (visibleEvents.isEmpty) {
      return _buildFilteredEmpty();
    }

    return Column(
      children: [
        // 24/7 Coverage Banner
        Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          decoration: const BoxDecoration(
            color: Color(0xFF090F1A),
            border: Border(
              bottom: BorderSide(color: Color(0xFF162338), width: 1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.cell_tower_rounded,
                    size: 15,
                    color: Color(0xFF00E5FF),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'LỊCH PHÁT SÓNG TOÀN DIỆN // $totalChannels KÊNH',
                      style: const TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => setState(() => _hideFiller = !_hideFiller),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _hideFiller
                            ? const Color(0xFF00E5FF).withValues(alpha: 0.2)
                            : const Color(0xFF0B1320),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _hideFiller
                              ? const Color(0xFF00E5FF)
                              : const Color(0xFF16253C),
                        ),
                      ),
                      child: Text(
                        _hideFiller ? 'Hiện tất cả' : 'Chỉ chương trình chính',
                        style: TextStyle(
                          color: _hideFiller
                              ? const Color(0xFF00E5FF)
                              : const Color(0xFF94A3B8),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '$totalReal chương trình thực · $totalReplay phát lại replay',
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 8),
              // Channel Filter Chips
              SizedBox(
                height: 32,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _FilterChip(
                      label: 'Tất cả kênh',
                      selected: _channelFilter == null,
                      onTap: () => setState(() => _channelFilter = null),
                    ),
                    for (final id in sortedGroupIds)
                      _FilterChip(
                        label: groups[id]!.channel?.name ?? 'Kênh',
                        leading: groups[id]!.channel == null
                            ? null
                            : ChannelLogo(
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

        // Event List
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
          const Icon(
            Icons.filter_alt_off_rounded,
            size: 52,
            color: Color(0xFF475569),
          ),
          const SizedBox(height: 12),
          const Text(
            'Không có kết quả với bộ lọc hiện tại',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => setState(() {
              _channelFilter = null;
              _hideFiller = false;
            }),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: const Color(0xFF070B12),
            ),
            child: const Text('Đặt lại bộ lọc'),
          ),
        ],
      ),
    );
  }

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
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF00E5FF) : const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? const Color(0xFF00E5FF)
                  : const Color(0xFF16253C),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leading != null) ...[
                leading!,
                const SizedBox(width: 5),
              ],
              Text(
                label,
                style: TextStyle(
                  color: selected
                      ? const Color(0xFF070B12)
                      : const Color(0xFFCBD5E1),
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Row(
            children: [
              if (group.channel != null)
                ChannelLogo(
                  channel: group.channel!,
                  size: 26,
                ),
              const SizedBox(width: 8),
              Text(
                group.channel?.name ?? 'Kênh',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '($realCount chương trình)',
                style: const TextStyle(
                  color: Color(0xFF64748B),
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
        const SizedBox(height: 12),
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
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isLive
                ? const Color(0xFF991B1B)
                : const Color(0xFF16253C),
          ),
        ),
        child: Row(
          children: [
            // Time Column
            Container(
              width: 72,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              decoration: BoxDecoration(
                color: isLive
                    ? const Color(0xFF450A0A)
                    : const Color(0xFF070E1A),
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(14),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _formatTime(event.scheduledAt),
                    style: TextStyle(
                      color: isLive ? const Color(0xFFF87171) : Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                      fontFamily: 'monospace',
                    ),
                  ),
                  if (event.duration != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      _formatDuration(event.duration!),
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 10,
                      ),
                    ),
                  ],
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
                          const SizedBox(width: 6),
                        ],
                        if (isFiller) ...[
                          _FillerBadge(fillerKind: event.fillerKind),
                          const SizedBox(width: 6),
                        ],
                        if (isUpcoming) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF083344),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'SẮP PHÁT',
                              style: TextStyle(
                                color: Color(0xFF00E5FF),
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                        ],
                        if (isPast) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'ĐÃ PHÁT',
                              style: TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                        ],
                        Expanded(
                          child: Text(
                            event.title,
                            style: TextStyle(
                              color: isPast
                                  ? const Color(0xFF94A3B8)
                                  : Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (event.channel != null)
                      Text(
                        event.channel!.name,
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  ],
                ),
              ),
            ),
            IconButton(
              icon: Icon(
                isLive
                    ? Icons.play_circle_fill_rounded
                    : Icons.chevron_right_rounded,
                color: isLive ? const Color(0xFFEF4444) : const Color(0xFF64748B),
                size: isLive ? 28 : 22,
              ),
              onPressed: () {
                if (!isFiller) {
                  context.push('/program/${event.id}');
                }
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

  String _formatDuration(int minutes) {
    if (minutes < 60) return '$minutes p';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '${h}h';
    return '${h}h ${m}p';
  }
}

class _LiveBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF450A0A),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: const Color(0xFF991B1B)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(radius: 2.5, backgroundColor: Color(0xFFEF4444)),
          SizedBox(width: 4),
          Text(
            'LIVE',
            style: TextStyle(
              color: Color(0xFFF87171),
              fontSize: 9,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _FillerBadge extends StatelessWidget {
  final String? fillerKind;

  const _FillerBadge({this.fillerKind});

  @override
  Widget build(BuildContext context) {
    final isReplay = fillerKind == 'recording-replay';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isReplay ? const Color(0xFF1E1B4B) : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: isReplay ? const Color(0xFF4338CA) : const Color(0xFF334155),
        ),
      ),
      child: Text(
        isReplay ? 'REPLAY' : 'ON-AIR',
        style: TextStyle(
          color: isReplay ? const Color(0xFFA5B4FC) : const Color(0xFF94A3B8),
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
