// OmniCast - Live Stream Join Invitation Prompt (Mobile)
//
// Automatically detects active live streams (via REST poll + Socket.IO)
// and displays an interactive floating prompt banner to invited viewers.
// Tapping "Tham gia xem ngay" navigates directly into the live stream room.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';
import '../../../data/models/program_model.dart';

class LiveJoinPromptBanner extends StatefulWidget {
  final Widget child;

  const LiveJoinPromptBanner({super.key, required this.child});

  @override
  State<LiveJoinPromptBanner> createState() => _LiveJoinPromptBannerState();
}

class _LiveJoinPromptBannerState extends State<LiveJoinPromptBanner>
    with SingleTickerProviderStateMixin {
  LiveEventModel? _activeLive;
  String? _dismissedEventId;
  Timer? _checkTimer;
  late AnimationController _animController;
  late Animation<double> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _slideAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutBack,
    );

    // Initial check + periodic check every 30 seconds
    _checkActiveLive();
    _checkTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _checkActiveLive();
    });
  }

  @override
  void dispose() {
    _checkTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _checkActiveLive() async {
    try {
      final dio = getIt<DioClient>();
      final res = await dio.get(
        AppEndpoints.liveNow,
        queryParameters: {'limit': 1},
      );
      final raw = res.data;
      final list = (raw is Map && raw['data'] is List)
          ? raw['data'] as List
          : (raw is List ? raw : <dynamic>[]);

      if (list.isNotEmpty && list.first is Map<String, dynamic>) {
        final event = LiveEventModel.fromJson(list.first as Map<String, dynamic>);
        if (event.id != _dismissedEventId) {
          if (mounted && (_activeLive == null || _activeLive!.id != event.id)) {
            setState(() => _activeLive = event);
            _animController.forward();
          }
          return;
        }
      }

      // If no live stream or dismissed, hide
      if (_activeLive != null && mounted) {
        _animController.reverse().then((_) {
          if (mounted) setState(() => _activeLive = null);
        });
      }
    } catch (_) {
      // best-effort silent check
    }
  }

  void _dismissCurrent() {
    if (_activeLive != null) {
      _dismissedEventId = _activeLive!.id;
      _animController.reverse().then((_) {
        if (mounted) setState(() => _activeLive = null);
      });
    }
  }

  void _joinCurrentLive() {
    final event = _activeLive;
    if (event == null) return;
    _dismissCurrent();
    context.push('/live/${event.id}');
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_activeLive != null)
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 12,
            right: 12,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, -1.2),
                end: Offset.zero,
              ).animate(_slideAnimation),
              child: Material(
                color: Colors.transparent,
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF14070B),
                        Color(0xFF0F172A),
                        Color(0xFF081220),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFFF2A55).withValues(alpha: 0.6),
                      width: 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF2A55).withValues(alpha: 0.25),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF2A55),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.circle, color: Colors.white, size: 8),
                                SizedBox(width: 5),
                                Text(
                                  'ĐANG PHÁT TRỰC TIẾP',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          InkWell(
                            onTap: _dismissCurrent,
                            borderRadius: BorderRadius.circular(20),
                            child: const Padding(
                              padding: EdgeInsets.all(4),
                              child: Icon(
                                Icons.close_rounded,
                                color: Color(0xFF94A3B8),
                                size: 18,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Title & Host
                      Text(
                        _activeLive!.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Kênh ${_activeLive!.channel?.name ?? 'OmniCast'} • Admin/Staff đang phát sóng video này',
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Action Buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: _dismissCurrent,
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFF94A3B8),
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                            child: const Text('Để sau', style: TextStyle(fontSize: 12)),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: _joinCurrentLive,
                            icon: const Icon(Icons.play_arrow_rounded, size: 16),
                            label: const Text('Đồng ý vào xem ngay'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF00E5FF),
                              foregroundColor: Colors.black,
                              textStyle: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
