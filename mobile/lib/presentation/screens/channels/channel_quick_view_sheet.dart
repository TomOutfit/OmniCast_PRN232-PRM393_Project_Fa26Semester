// OmniCast - Channel Quick View Bottom Sheet
// Mirrors the frontend ChannelQuickView drawer with cyber-dark styling,
// broadcast specs, and upcoming today schedule.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/injection.dart';
import '../../../data/models/channel_model.dart';
import '../../../data/models/program_model.dart';
import '../../../data/repositories/programs_repository.dart';
import '../../widgets/channel_logo.dart';

class ChannelQuickViewSheet extends StatefulWidget {
  final ChannelModel channel;

  const ChannelQuickViewSheet({
    super.key,
    required this.channel,
  });

  static Future<void> show(BuildContext context, ChannelModel channel) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ChannelQuickViewSheet(channel: channel),
    );
  }

  @override
  State<ChannelQuickViewSheet> createState() => _ChannelQuickViewSheetState();
}

class _ChannelQuickViewSheetState extends State<ChannelQuickViewSheet> {
  List<LiveEventModel> _programs = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchUpcomingSchedule();
  }

  Future<void> _fetchUpcomingSchedule() async {
    try {
      final repo = getIt<ProgramsRepository>();
      final page = await repo.getPrograms(
        channelId: widget.channel.id,
        limit: 6,
      );
      if (mounted) {
        setState(() {
          _programs = page.items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final channel = widget.channel;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF090F1A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: Color(0xFF162338), width: 1.5),
          left: BorderSide(color: Color(0xFF162338), width: 1),
          right: BorderSide(color: Color(0xFF162338), width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x99000000),
            blurRadius: 30,
            offset: Offset(0, -10),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag Handle Pill
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF223552),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Sheet Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121E30),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF1F304A)),
                    ),
                    child: ChannelLogo(
                      channel: channel,
                      size: 44,
                      showLiveIndicator: channel.isLive,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              channel.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -0.3,
                              ),
                            ),
                            if (channel.isLive) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF450A0A),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: const Color(0xFF991B1B),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CircleAvatar(
                                      radius: 3,
                                      backgroundColor: Color(0xFFEF4444),
                                    ),
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
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          channel.categoryDisplayName.toUpperCase(),
                          style: const TextStyle(
                            color: Color(0xFF00E5FF),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            const Divider(color: Color(0xFF162338), height: 1),

            // Scrollable Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Channel Description / Tagline
                    if (channel.description != null &&
                        channel.description!.isNotEmpty) ...[
                      Text(
                        channel.description!,
                        style: const TextStyle(
                          color: Color(0xFFCBD5E1),
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Broadcast Specifications Grid
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070E1A),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF142236)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              _buildSpecBadge(
                                icon: Icons.hd_rounded,
                                label: '2160p60 HEVC',
                                color: const Color(0xFF00E5FF),
                              ),
                              const SizedBox(width: 8),
                              _buildSpecBadge(
                                icon: Icons.surround_sound_rounded,
                                label: 'DOLBY 5.1',
                                color: const Color(0xFF38BDF8),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _buildSpecBadge(
                                icon: Icons.speed_rounded,
                                label: 'Độ trễ < 1.2s',
                                color: const Color(0xFF34D399),
                              ),
                              const SizedBox(width: 8),
                              _buildSpecBadge(
                                icon: Icons.history_rounded,
                                label: 'Xem lại 7 ngày',
                                color: const Color(0xFFFBBF24),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Upcoming Programs Section
                    Row(
                      children: [
                        const Icon(
                          Icons.schedule_rounded,
                          size: 16,
                          color: Color(0xFF00E5FF),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'LỊCH PHÁT SÓNG HÔM NAY',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          DateFormat('dd/MM/yyyy').format(DateTime.now()),
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 11,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    if (_isLoading) ...[
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Color(0xFF00E5FF),
                          ),
                        ),
                      ),
                    ] else if (_error != null || _programs.isEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 20,
                          horizontal: 16,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0B1320),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF16253C)),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _error != null
                              ? 'Không thể tải lịch phát sóng lúc này.'
                              : (channel.currentProgram ??
                                  'Chưa có lịch phát sóng chi tiết hôm nay.'),
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ] else ...[
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _programs.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final prog = _programs[index];
                          final timeStr = DateFormat('HH:mm').format(
                            prog.scheduledAt.toLocal(),
                          );
                          final isCurrent = index == 0 && channel.isLive;

                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: isCurrent
                                  ? const Color(0xFF0E1A2C)
                                  : const Color(0xFF0B1320),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isCurrent
                                    ? const Color(0xFF00E5FF).withValues(alpha: 0.4)
                                    : const Color(0xFF16253C),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF070E1A),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: const Color(0xFF142236),
                                    ),
                                  ),
                                  child: Text(
                                    timeStr,
                                    style: TextStyle(
                                      color: isCurrent
                                          ? const Color(0xFF00E5FF)
                                          : const Color(0xFF94A3B8),
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    prog.title,
                                    style: TextStyle(
                                      color: isCurrent
                                          ? Colors.white
                                          : const Color(0xFFE2E8F0),
                                      fontSize: 12,
                                      fontWeight: isCurrent
                                          ? FontWeight.w800
                                          : FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (isCurrent) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF450A0A),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'ON-AIR',
                                      style: TextStyle(
                                        color: Color(0xFFF87171),
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Bottom Action Bar
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF00E5FF), Color(0xFF2563EB)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x6600E5FF),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () {
                      Navigator.of(context).pop();
                      context.push('/channel/${channel.id}');
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.play_arrow_rounded,
                            color: Color(0xFF070B12),
                            size: 22,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Xem Trực Tiếp Kênh Này',
                            style: TextStyle(
                              color: Color(0xFF070B12),
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecBadge({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF16253C)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: Color(0xFFE2E8F0),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
