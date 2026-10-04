// OmniCast – EPG Screen (VTVGo-Style Synchronized Timeline)
// ─────────────────────────────────────────────────────────────
// Layout mirrors the real VTVGo EPG grid:
//  • Sticky left channel column (logo + name)
//  • Single horizontally-scrollable 24-hour ruler + channel rows, all in sync
//  • Programme cards sized by actual duration (4 px / minute → 15p = 60px, 90p = 360px)
//  • Red "LIVE NOW" vertical line + pulsing dot at current time
//  • Auto-scrolls to current time on load for today's date

import 'dart:async';
import 'dart:math' show max;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/epg/epg_bloc.dart';
import '../../../logic/channels/channels_bloc.dart';
import '../../../data/models/program_model.dart';
import '../../../core/utils/channel_logo_helper.dart';
import '../../../core/utils/category_utils.dart';
import '../../widgets/channel_logo.dart' hide ChannelInfo;

// ─── Layout constants (matches frontend MINUTE_WIDTH = 4) ───
const double kMinuteWidth = 4.0;   // px per minute
const double kHourWidth   = 240.0; // = 60 * kMinuteWidth
const double kRowHeight   = 72.0;  // channel row height
const double kRulerHeight = 40.0;  // time-ruler header height
const double kChannelW    = 100.0; // sticky left column width

// ─── Utility helpers ───────────────────────────────────────
String _hhmm(DateTime dt) =>
    '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

int _minutesFromMidnight(DateTime dt) => dt.hour * 60 + dt.minute;

String _fmtDuration(int minutes) {
  if (minutes < 60) return '${minutes}p';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return m == 0 ? '${h}h' : '${h}h${m}p';
}

bool _isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

String _getDayLabel(DateTime date) {
  final now = DateTime.now();
  if (_isSameDay(date, now)) return 'Hôm nay';
  if (_isSameDay(date, now.subtract(const Duration(days: 1)))) return 'Hôm qua';
  if (_isSameDay(date, now.add(const Duration(days: 1)))) return 'Ngày mai';
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return days[date.weekday - 1];
}

// ─── Root screen ──────────────────────────────────────────
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

  void _showDatePicker(BuildContext ctx) async {
    final currentState = ctx.read<EpgBloc>().state;
    DateTime initial = DateTime.now();
    if (currentState is EpgLoaded) initial = currentState.selectedDate;

    final picked = await showDatePicker(
      context: ctx,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 14)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF00E5FF),
            surface: Color(0xFF090F1A),
          ),
        ),
        child: child!,
      ),
    );
    if (!mounted || picked == null) return;
    context.read<EpgBloc>().add(ChangeEpgDate(picked));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(right: 8),
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                shape: BoxShape.circle,
              ),
            ),
            const Text(
              'Lịch Phát Sóng',
              style: TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month_rounded, color: Color(0xFF00E5FF)),
            tooltip: 'Chọn ngày',
            onPressed: () => _showDatePicker(context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          _DateCarousel(),
          Expanded(
            child: BlocBuilder<EpgBloc, EpgState>(
              builder: (ctx, state) {
                if (state is EpgLoading) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
                  );
                }
                if (state is EpgLoaded) {
                  if (state.events.isEmpty) return _buildEmpty();
                  return _EpgTimelineGrid(
                    events: state.events,
                    selectedDate: state.selectedDate,
                    isOffline: state.isOfflineMode,
                    lastFetchedAt: state.lastFetchedAt,
                  );
                }
                if (state is EpgError) return _buildError(state.message, ctx);
                return const SizedBox();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() => const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy_rounded, size: 56, color: Color(0xFF334155)),
            SizedBox(height: 14),
            Text(
              'Không có chương trình nào trong ngày',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 6),
            Text(
              'Thử chọn một ngày khác.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
        ),
      );

  Widget _buildError(String msg, BuildContext ctx) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 52, color: Color(0xFFEF4444)),
            const SizedBox(height: 12),
            Text(msg, style: const TextStyle(color: Color(0xFFEF4444)), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ctx.read<EpgBloc>().add(LoadEpgSchedule(date: DateTime.now())),
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

// ─── 7-Day Date Carousel ──────────────────────────────────
class _DateCarousel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF090F1A),
        border: Border(bottom: BorderSide(color: Color(0xFF162338))),
      ),
      child: BlocBuilder<EpgBloc, EpgState>(
        builder: (ctx, state) {
          DateTime selected = DateTime.now();
          if (state is EpgLoaded) selected = state.selectedDate;
          final today = DateTime.now();
          final isNotToday = !_isSameDay(selected, today);

          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                for (int i = 0; i < 7; i++) ...[
                  () {
                    final date = today.add(Duration(days: i - 3));
                    final isSel = _isSameDay(date, selected);
                    final isTod = _isSameDay(date, today);
                    return GestureDetector(
                      onTap: () => ctx.read<EpgBloc>().add(ChangeEpgDate(date)),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSel ? const Color(0xFF00E5FF) : const Color(0xFF0B1320),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSel
                                ? const Color(0xFF00E5FF)
                                : isTod
                                    ? const Color(0xFF00E5FF).withValues(alpha: 0.4)
                                    : const Color(0xFF16253C),
                          ),
                          boxShadow: isSel
                              ? [const BoxShadow(color: Color(0x5500E5FF), blurRadius: 10, offset: Offset(0, 2))]
                              : null,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _getDayLabel(date),
                              style: TextStyle(
                                color: isSel
                                    ? const Color(0xFF070B12)
                                    : isTod
                                        ? const Color(0xFF00E5FF)
                                        : const Color(0xFF94A3B8),
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}',
                              style: TextStyle(
                                color: isSel ? const Color(0xFF070B12) : Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                              ),
                            ),
                            if (isTod)
                              Container(
                                margin: const EdgeInsets.only(top: 3),
                                width: 4,
                                height: 4,
                                decoration: BoxDecoration(
                                  color: isSel ? const Color(0xFF070B12) : const Color(0xFF00E5FF),
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }(),
                ],
                if (isNotToday) ...[
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => ctx.read<EpgBloc>().add(ChangeEpgDate(today)),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF083344),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF00E5FF).withValues(alpha: 0.4)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.replay_rounded, size: 14, color: Color(0xFF00E5FF)),
                          SizedBox(width: 4),
                          Text(
                            'Hôm Nay',
                            style: TextStyle(color: Color(0xFF00E5FF), fontSize: 11, fontWeight: FontWeight.w900),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

// ─── Main Timeline Grid ───────────────────────────────────
class _EpgTimelineGrid extends StatefulWidget {
  final List<LiveEventModel> events;
  final DateTime selectedDate;
  final bool isOffline;
  final DateTime? lastFetchedAt;

  const _EpgTimelineGrid({
    required this.events,
    required this.selectedDate,
    required this.isOffline,
    this.lastFetchedAt,
  });

  @override
  State<_EpgTimelineGrid> createState() => _EpgTimelineGridState();
}

class _EpgTimelineGridState extends State<_EpgTimelineGrid> {
  late int _nowMinutes;
  Timer? _nowTimer;
  String _searchQuery = '';
  String _categoryFilter = 'ALL';
  final TextEditingController _searchCtrl = TextEditingController();
  List<Map<String, String>> _categories = [{'key': 'ALL', 'label': 'Tất Cả'}];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _nowMinutes = now.hour * 60 + now.minute;
    // Load categories from API
    context.read<ChannelsBloc>().add(const LoadCategories());
    // Periodic ticker to continuously move live indicator and program statuses in real time
    _nowTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) {
        final current = DateTime.now();
        final mins = current.hour * 60 + current.minute;
        if (mins != _nowMinutes) {
          setState(() {
            _nowMinutes = mins;
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _nowTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  // Group events by channel, sorted by scheduledAt
  Map<String, _ChannelGroup> _buildGroups(List<LiveEventModel> events) {
    final groups = <String, _ChannelGroup>{};
    for (final e in events) {
      final g = groups.putIfAbsent(
        e.channelId,
        () => _ChannelGroup(channel: e.channel, events: []),
      );
      g.events.add(e);
    }
    for (final g in groups.values) {
      g.events.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    }
    return groups;
  }

  @override
  Widget build(BuildContext context) {
    // ── Filter events ──
    final filtered = widget.events.where((e) {
      if (_categoryFilter != 'ALL') {
        final cat = e.channel?.category?.toUpperCase() ?? '';
        final tags = e.tags.map((t) => t.toUpperCase()).toList();
        if (cat != _categoryFilter && !tags.contains(_categoryFilter)) return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        if (!e.title.toLowerCase().contains(q) &&
            !(e.channel?.name.toLowerCase().contains(q) ?? false)) { return false; }
      }
      return true;
    }).toList();

    final groups = _buildGroups(filtered);
    final sortedIds = groups.keys.toList()
      ..sort((a, b) {
        final slugA = groups[a]!.channel?.slug ?? '';
        final slugB = groups[b]!.channel?.slug ?? '';
        final normA = ChannelLogoHelper.normalizeSlug(slugA) ?? slugA;
        final normB = ChannelLogoHelper.normalizeSlug(slugB) ?? slugB;
        final cmp = normA.compareTo(normB);
        if (cmp != 0) return cmp;
        return (groups[a]!.channel?.name ?? '').compareTo(groups[b]!.channel?.name ?? '');
      });

    final isToday = _isSameDay(widget.selectedDate, DateTime.now());
    const totalCanvasWidth = 24 * kHourWidth; // 5760px

    return Column(
      children: [
        // Offline banner
        if (widget.isOffline)
          _OfflineBanner(lastFetchedAt: widget.lastFetchedAt),

        // Category chips
        BlocBuilder<ChannelsBloc, ChannelsState>(
          builder: (context, channelsState) {
            // Update categories when loaded from API
            if (channelsState is CategoriesLoaded) {
              _categories = [
                {'key': 'ALL', 'label': 'Tất Cả'},
                ...channelsState.categories.map((c) {
                  final info = getCategoryInfo(c.category);
                  return {'key': c.category, 'label': info.label};
                }),
              ];
            }
            return _CategoryBar(
              categories: _categories,
              selected: _categoryFilter,
              onSelect: (k) => setState(() => _categoryFilter = k),
            );
          },
        ),

        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
          child: Container(
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF0B1320),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF16253C)),
            ),
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              onChanged: (v) => setState(() => _searchQuery = v.trim()),
              decoration: InputDecoration(
                hintText: 'Tìm chương trình...',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF64748B)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close, size: 14, color: Color(0xFF64748B)),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
        ),

        // Legend row
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 2, 12, 6),
          child: Row(
            children: [
              const _LegendDot(color: Color(0xFFEF4444), label: 'Đang phát'),
              const SizedBox(width: 12),
              const _LegendDot(color: Color(0xFF00E5FF), label: 'Catch-up'),
              const SizedBox(width: 12),
              const _LegendDot(color: Color(0xFF475569), label: 'Sắp phát'),
              const Spacer(),
              Text(
                '${groups.length} kênh · ${filtered.length} CT',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
            ],
          ),
        ),

        // ── THE SYNCHRONIZED TIMELINE GRID ──
        Expanded(
          child: sortedIds.isEmpty
              ? _buildEmptyFilter()
              : _SyncTimelineGrid(
                  sortedIds: sortedIds,
                  groups: groups,
                  totalCanvasWidth: totalCanvasWidth,
                  isToday: isToday,
                  nowMinutes: _nowMinutes,
                  selectedDate: widget.selectedDate,
                ),
        ),
      ],
    );
  }

  Widget _buildEmptyFilter() => const Center(
        child: Text(
          'Không có kết quả',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
        ),
      );
}

// ─── Synchronized Timeline Grid ──────────────────────────
/// Sticky top time ruler + sticky left channel column + 2-way synchronized scrolling
class _SyncTimelineGrid extends StatefulWidget {
  final List<String> sortedIds;
  final Map<String, _ChannelGroup> groups;
  final double totalCanvasWidth;
  final bool isToday;
  final int nowMinutes;
  final DateTime selectedDate;

  const _SyncTimelineGrid({
    required this.sortedIds,
    required this.groups,
    required this.totalCanvasWidth,
    required this.isToday,
    required this.nowMinutes,
    required this.selectedDate,
  });

  @override
  State<_SyncTimelineGrid> createState() => _SyncTimelineGridState();
}

class _SyncTimelineGridState extends State<_SyncTimelineGrid> {
  final ScrollController _contentHScroll = ScrollController();
  final ScrollController _rulerScroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _contentHScroll.addListener(_syncScroll);

    // Auto-scroll to current time on open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.isToday && _contentHScroll.hasClients) {
        final targetOffset = max(0.0, widget.nowMinutes * kMinuteWidth - kHourWidth);
        _contentHScroll.animateTo(
          targetOffset,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _syncScroll() {
    if (_rulerScroll.hasClients && _contentHScroll.hasClients) {
      if (_rulerScroll.offset != _contentHScroll.offset) {
        _rulerScroll.jumpTo(_contentHScroll.offset);
      }
    }
  }

  void _jumpToNow() {
    if (_contentHScroll.hasClients) {
      final screenWidth = MediaQuery.of(context).size.width;
      final target = max(0.0, widget.nowMinutes * kMinuteWidth - (screenWidth - kChannelW) / 2);
      _contentHScroll.animateTo(
        target,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _jumpToMinute(int minute) {
    if (_contentHScroll.hasClients) {
      final target = max(0.0, minute * kMinuteWidth - 40);
      _contentHScroll.animateTo(
        target,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _scrollDelta(double delta) {
    if (_contentHScroll.hasClients) {
      final newOffset = (_contentHScroll.offset + delta).clamp(0.0, widget.totalCanvasWidth);
      _contentHScroll.animateTo(
        newOffset,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  void dispose() {
    _contentHScroll.removeListener(_syncScroll);
    _contentHScroll.dispose();
    _rulerScroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final liveLeft = widget.nowMinutes * kMinuteWidth;

    return Column(
      children: [
        // ── TOP QUICK NAVIGATION BAR (Flexible broadcast slot jumping) ──
        Container(
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: const BoxDecoration(
            color: Color(0xFF090F1A),
            border: Border(bottom: BorderSide(color: Color(0xFF131F32))),
          ),
          child: Row(
            children: [
              // Scroll -2h button
              _NavIconButton(
                icon: Icons.chevron_left_rounded,
                tooltip: 'Lùi 2 giờ',
                onPressed: () => _scrollDelta(-2 * kHourWidth),
              ),
              const SizedBox(width: 4),
              // Daypart quick-jump chips
              Expanded(
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    if (widget.isToday)
                      _QuickJumpChip(
                        label: 'BÂY GIỜ',
                        icon: Icons.fiber_manual_record_rounded,
                        iconColor: const Color(0xFFEF4444),
                        isActive: true,
                        onTap: _jumpToNow,
                      ),
                    _QuickJumpChip(
                      label: '06:00 Sáng',
                      onTap: () => _jumpToMinute(360),
                    ),
                    _QuickJumpChip(
                      label: '11:30 Trưa',
                      onTap: () => _jumpToMinute(690),
                    ),
                    _QuickJumpChip(
                      label: '14:00 Chiều',
                      onTap: () => _jumpToMinute(840),
                    ),
                    _QuickJumpChip(
                      label: '19:00 Thời Sự',
                      onTap: () => _jumpToMinute(1140),
                    ),
                    _QuickJumpChip(
                      label: '20:00 Giờ Vàng',
                      onTap: () => _jumpToMinute(1200),
                    ),
                    _QuickJumpChip(
                      label: '22:30 Đêm',
                      onTap: () => _jumpToMinute(1350),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              // Scroll +2h button
              _NavIconButton(
                icon: Icons.chevron_right_rounded,
                tooltip: 'Tiến 2 giờ',
                onPressed: () => _scrollDelta(2 * kHourWidth),
              ),
            ],
          ),
        ),

        // ── TOP RULER BAR (Sticky Header with :00, :30 and 15m ticks) ──
        Container(
          height: kRulerHeight,
          decoration: const BoxDecoration(
            color: Color(0xFF070C16),
            border: Border(bottom: BorderSide(color: Color(0xFF16253C))),
          ),
          child: Row(
            children: [
              // Top-left 24H corner cell
              Container(
                width: kChannelW,
                height: kRulerHeight,
                decoration: const BoxDecoration(
                  border: Border(right: BorderSide(color: Color(0xFF16253C))),
                ),
                child: const Center(
                  child: Text(
                    '24H',
                    style: TextStyle(
                      color: Color(0xFF00E5FF),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ),
              // Top horizontal ruler
              Expanded(
                child: SingleChildScrollView(
                  controller: _rulerScroll,
                  scrollDirection: Axis.horizontal,
                  physics: const NeverScrollableScrollPhysics(),
                  child: SizedBox(
                    width: widget.totalCanvasWidth,
                    height: kRulerHeight,
                    child: Stack(
                      children: [
                        // Ruler hours & ticks with both :00 and :30 markers
                        ...List.generate(24, (h) {
                          return Positioned(
                            left: h * kHourWidth,
                            top: 0,
                            bottom: 0,
                            child: SizedBox(
                              width: kHourWidth,
                              child: Stack(
                                children: [
                                  // :00 label
                                  Positioned(
                                    left: 4,
                                    top: 4,
                                    child: Text(
                                      '${h.toString().padLeft(2, '0')}:00',
                                      style: const TextStyle(
                                        color: Color(0xFFCBD5E1),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ),
                                  // :30 label
                                  Positioned(
                                    left: kHourWidth / 2 + 4,
                                    top: 4,
                                    child: Text(
                                      '${h.toString().padLeft(2, '0')}:30',
                                      style: const TextStyle(
                                        color: Color(0xFF64748B),
                                        fontSize: 9,
                                        fontWeight: FontWeight.w600,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ),
                                  // Ticks at 0m, 15m, 30m, 45m
                                  Positioned(
                                    left: 0,
                                    bottom: 0,
                                    right: 0,
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Container(width: 1.5, height: 9, color: const Color(0xFF475569)),
                                        const SizedBox(width: kHourWidth / 4 - 2),
                                        Container(width: 1, height: 4, color: const Color(0xFF1E293B)),
                                        const SizedBox(width: kHourWidth / 4 - 2),
                                        Container(width: 1.5, height: 7, color: const Color(0xFF334155)),
                                        const SizedBox(width: kHourWidth / 4 - 2),
                                        Container(width: 1, height: 4, color: const Color(0xFF1E293B)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                        // Pulsing red dot + real-time clock badge on ruler for current live time
                        if (widget.isToday) ...[
                          Positioned(
                            left: (liveLeft - 18).clamp(0.0, widget.totalCanvasWidth - 40),
                            top: 2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444),
                                borderRadius: BorderRadius.circular(4),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFEF4444).withValues(alpha: 0.5),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                              child: Text(
                                _hhmm(DateTime.now()),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            left: liveLeft - 6,
                            bottom: 2,
                            child: _LiveDot(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // ── BODY: VERTICAL SCROLL (Sticky Channels on left, horizontal rows on right) ──
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.vertical,
            physics: const AlwaysScrollableScrollPhysics(),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Sticky Left Channel Column
                Container(
                  width: kChannelW,
                  color: const Color(0xFF090F1A),
                  child: Column(
                    children: widget.sortedIds.map((id) {
                      final group = widget.groups[id]!;
                      return _ChannelCell(group: group);
                    }).toList(),
                  ),
                ),

                // Horizontally Scrollable Timeline Grid
                Expanded(
                  child: SingleChildScrollView(
                    controller: _contentHScroll,
                    scrollDirection: Axis.horizontal,
                    physics: const ClampingScrollPhysics(),
                    child: SizedBox(
                      width: widget.totalCanvasWidth,
                      height: widget.sortedIds.length * kRowHeight,
                      child: Stack(
                        children: [
                          // Hour verticals
                          ...List.generate(25, (h) => Positioned(
                            left: h * kHourWidth,
                            top: 0,
                            bottom: 0,
                            child: Container(width: 1, color: const Color(0xFF131F32).withValues(alpha: 0.8)),
                          )),
                          // Half-hour dashed lines
                          ...List.generate(24, (h) => Positioned(
                            left: h * kHourWidth + kHourWidth / 2,
                            top: 0,
                            bottom: 0,
                            child: Container(width: 1, color: const Color(0xFF131F32).withValues(alpha: 0.4)),
                          )),
                          // Channel program rows
                          ...widget.sortedIds.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final id = entry.value;
                            final group = widget.groups[id]!;
                            return Positioned(
                              top: idx * kRowHeight,
                              left: 0,
                              height: kRowHeight,
                              width: widget.totalCanvasWidth,
                              child: _TimelineRow(
                                group: group,
                                selectedDate: widget.selectedDate,
                                nowMinutes: widget.nowMinutes,
                                isToday: widget.isToday,
                              ),
                            );
                          }),
                          // LIVE NOW red vertical bar spanning entire grid height
                          if (widget.isToday)
                            Positioned(
                              left: liveLeft - 1,
                              top: 0,
                              bottom: 0,
                              child: SizedBox(
                                width: 2,
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFFEF4444).withValues(alpha: 0.5),
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Sticky channel cell ──────────────────────────────────
class _ChannelCell extends StatelessWidget {
  final _ChannelGroup group;
  const _ChannelCell({required this.group});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        final slug = group.channel?.slug;
        if (slug != null) context.push('/channels/$slug');
      },
      child: Container(
        height: kRowHeight,
        decoration: const BoxDecoration(
          color: Color(0xFF090F1A),
          border: Border(
            right: BorderSide(color: Color(0xFF16253C)),
            bottom: BorderSide(color: Color(0xFF0E1A2B)),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (group.channel != null)
              ChannelLogo(channel: group.channel!, size: 28)
            else
              const Icon(Icons.tv_rounded, color: Color(0xFF334155), size: 24),
            const SizedBox(height: 4),
            Text(
              group.channel?.name ?? 'Kênh',
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 9,
                fontWeight: FontWeight.w700,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Single channel timeline row ─────────────────────────
class _TimelineRow extends StatelessWidget {
  final _ChannelGroup group;
  final DateTime selectedDate;
  final int nowMinutes;
  final bool isToday;

  const _TimelineRow({
    required this.group,
    required this.selectedDate,
    required this.nowMinutes,
    required this.isToday,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFF0E1A2B))),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: group.events.map((e) => _ProgramCard(
          event: e,
          nowMinutes: nowMinutes,
          isToday: isToday,
          selectedDate: selectedDate,
        )).toList(),
      ),
    );
  }
}

// ─── Program card ─────────────────────────────────────────
class _ProgramCard extends StatelessWidget {
  final LiveEventModel event;
  final int nowMinutes;
  final bool isToday;
  final DateTime selectedDate;

  const _ProgramCard({
    required this.event,
    required this.nowMinutes,
    required this.isToday,
    required this.selectedDate,
  });

  @override
  Widget build(BuildContext context) {
    final startMin = _minutesFromMidnight(event.scheduledAt);
    final durMin   = event.durationMinutes.clamp(10, 240);
    final endMin   = startMin + durMin;

    final left  = startMin * kMinuteWidth;
    final width = max(48.0, durMin * kMinuteWidth - 2);

    // Determine status
    final bool isLive;
    final bool isPast;
    final bool isFiller = event.isFiller;
    if (!isToday) {
      isLive = false;
      isPast = selectedDate.isBefore(DateTime.now());
    } else {
      isLive = nowMinutes >= startMin && nowMinutes < endMin;
      isPast = nowMinutes >= endMin;
    }

    // Card colors
    final Color cardBg;
    final Color cardBorder;
    if (isLive) {
      cardBg = const Color(0xFF2A0A0A);
      cardBorder = const Color(0xFFEF4444);
    } else if (isPast) {
      cardBg = const Color(0xFF0A1220);
      cardBorder = const Color(0xFF1A2A3E);
    } else {
      cardBg = const Color(0xFF0D1828);
      cardBorder = const Color(0xFF1E2F44);
    }

    return Positioned(
      left: left,
      top: 3,
      bottom: 3,
      width: width,
      child: GestureDetector(
        onTap: () {
          if (isFiller && event.sourceRecordingId != null) {
            context.push('/recording/${event.sourceRecordingId}');
          } else if (!isFiller) {
            context.push('/program/${event.id}');
          } else {
            _showProgramSheet(context, event, isLive, isPast);
          }
        },
        onLongPress: () => _showProgramSheet(context, event, isLive, isPast),
        child: Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: cardBorder, width: isLive ? 1.5 : 1),
            boxShadow: isLive
                ? [BoxShadow(color: const Color(0xFFEF4444).withValues(alpha: 0.25), blurRadius: 8)]
                : null,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Time + status row
              Row(
                children: [
                  Text(
                    _hhmm(event.scheduledAt),
                    style: TextStyle(
                      color: isLive ? const Color(0xFFF87171) : const Color(0xFF94A3B8),
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'monospace',
                    ),
                  ),
                  const Spacer(),
                  if (isLive)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 5,
                          height: 5,
                          margin: const EdgeInsets.only(right: 3),
                          decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                        ),
                        const Text(
                          'LIVE',
                          style: TextStyle(
                            color: Color(0xFFEF4444),
                            fontSize: 7,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  if (isFiller && !isLive)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1B4B),
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: const Text('R', style: TextStyle(color: Color(0xFFA5B4FC), fontSize: 7, fontWeight: FontWeight.w900)),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              // Title
              Expanded(
                child: Text(
                  event.title,
                  style: TextStyle(
                    color: isPast
                        ? const Color(0xFF64748B)
                        : isLive
                            ? Colors.white
                            : const Color(0xFFCBD5E1),
                    fontSize: 10,
                    fontWeight: isLive ? FontWeight.w900 : FontWeight.w700,
                    height: 1.3,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              // Duration + category badge
              if (width > 55)
                Align(
                  alignment: Alignment.bottomRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (width > 120 && event.tags.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(right: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            event.tags.first.toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 7,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: durMin <= 30
                              ? const Color(0xFF451A03)
                              : durMin <= 60
                                  ? const Color(0xFF0F1E30)
                                  : const Color(0xFF1E1B4B),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: durMin <= 30
                                ? const Color(0xFFD97706).withValues(alpha: 0.5)
                                : durMin <= 60
                                    ? const Color(0xFF00E5FF).withValues(alpha: 0.4)
                                    : const Color(0xFF818CF8).withValues(alpha: 0.4),
                            width: 0.5,
                          ),
                        ),
                        child: Text(
                          _fmtDuration(durMin),
                          style: TextStyle(
                            color: durMin <= 30
                                ? const Color(0xFFFBBF24)
                                : durMin <= 60
                                    ? const Color(0xFF00E5FF)
                                    : const Color(0xFFA5B4FC),
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showProgramSheet(BuildContext context, LiveEventModel e, bool isLive, bool isPast) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0B1320),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ProgramDetailSheet(event: e, isLive: isLive, isPast: isPast),
    );
  }
}

// ─── Program detail bottom sheet ─────────────────────────
class _ProgramDetailSheet extends StatelessWidget {
  final LiveEventModel event;
  final bool isLive;
  final bool isPast;

  const _ProgramDetailSheet({required this.event, required this.isLive, required this.isPast});

  @override
  Widget build(BuildContext context) {
    final endTime = event.endTime;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF334155),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              if (isLive)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF450A0A),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF991B1B)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.circle, size: 6, color: Color(0xFFEF4444)),
                      SizedBox(width: 4),
                      Text('LIVE', style: TextStyle(color: Color(0xFFF87171), fontSize: 10, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              if (event.isFiller)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1B4B),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    event.fillerKind == 'recording-replay' ? 'REPLAY' : 'ON-AIR',
                    style: const TextStyle(color: Color(0xFFA5B4FC), fontSize: 10, fontWeight: FontWeight.w900),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            event.title,
            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.schedule_rounded, size: 13, color: Color(0xFF64748B)),
              const SizedBox(width: 4),
              Text(
                '${_hhmm(event.scheduledAt)} → ${_hhmm(endTime)}',
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontFamily: 'monospace'),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E1A2B),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  _fmtDuration(event.durationMinutes),
                  style: const TextStyle(color: Color(0xFF00E5FF), fontSize: 11, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          if (event.description != null && event.description!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              event.description!,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.5),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 20),
          Row(
            children: [
              if (isLive)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      context.push('/program/${event.id}');
                    },
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: const Text('Xem Trực Tiếp'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEF4444),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                )
              else if (isPast && event.sourceRecordingId != null)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      context.push('/recording/${event.sourceRecordingId}');
                    },
                    icon: const Icon(Icons.replay_rounded),
                    label: const Text('Xem Lại'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E5FF),
                      foregroundColor: const Color(0xFF070B12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                )
              else if (!event.isFiller)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      context.push('/program/${event.id}');
                    },
                    icon: const Icon(Icons.info_outline_rounded, size: 16),
                    label: const Text('Chi Tiết'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF00E5FF),
                      side: const BorderSide(color: Color(0xFF00E5FF)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Supporting widgets ───────────────────────────────────
class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
      ],
    );
  }
}

class _LiveDot extends StatefulWidget {
  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.4, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        width: 12,
        height: 12,
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [BoxShadow(color: const Color(0xFFEF4444).withValues(alpha: 0.6), blurRadius: 6)],
        ),
      ),
    );
  }
}

class _CategoryBar extends StatelessWidget {
  final List<Map<String, String>> categories;
  final String selected;
  final void Function(String) onSelect;

  const _CategoryBar({required this.categories, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      color: const Color(0xFF070B12),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: categories.length,
        itemBuilder: (_, i) {
          final k = categories[i]['key']!;
          final l = categories[i]['label']!;
          final isSel = k == selected;
          return Padding(
            padding: const EdgeInsets.only(right: 6, top: 2, bottom: 2),
            child: GestureDetector(
              onTap: () => onSelect(k),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: isSel ? const Color(0xFF00E5FF) : const Color(0xFF0B1320),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSel ? const Color(0xFF00E5FF) : const Color(0xFF16253C),
                  ),
                ),
                child: Text(
                  l,
                  style: TextStyle(
                    color: isSel ? const Color(0xFF070B12) : const Color(0xFFCBD5E1),
                    fontSize: 11,
                    fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  final DateTime? lastFetchedAt;
  const _OfflineBanner({this.lastFetchedAt});

  @override
  Widget build(BuildContext context) {
    final timeStr = lastFetchedAt != null ? _hhmm(lastFetchedAt!) : '--:--';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      color: const Color(0xFF451A03),
      child: Row(
        children: [
          const Icon(Icons.wifi_off_rounded, size: 13, color: Color(0xFFFCD34D)),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Offline – dữ liệu từ cache lúc $timeStr',
              style: const TextStyle(color: Color(0xFFFCD34D), fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Data types ───────────────────────────────────────────
class _ChannelGroup {
  final ChannelInfo? channel;
  final List<LiveEventModel> events;
  _ChannelGroup({required this.channel, required this.events});
}

class _QuickJumpChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? iconColor;
  final bool isActive;
  final VoidCallback onTap;

  const _QuickJumpChip({
    required this.label,
    this.icon,
    this.iconColor,
    this.isActive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF1E1010) : const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isActive ? const Color(0xFFEF4444) : const Color(0xFF1E293B),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 8, color: iconColor ?? Colors.white),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: TextStyle(
                  color: isActive ? const Color(0xFFEF4444) : const Color(0xFFCBD5E1),
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.w900 : FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavIconButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  const _NavIconButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
      icon: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Icon(icon, size: 14, color: const Color(0xFF00E5FF)),
      ),
      tooltip: tooltip,
      onPressed: onPressed,
    );
  }
}

