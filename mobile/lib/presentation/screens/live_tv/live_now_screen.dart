// OmniCast - Live Now Screen (Modern Minimalist Redesign)
// Clean streaming directory of active live broadcasts with low visual clutter.

import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';
import '../../../data/models/program_model.dart';
import '../../../logic/auth/auth_bloc.dart';

class LiveNowScreen extends StatefulWidget {
  const LiveNowScreen({super.key});

  @override
  State<LiveNowScreen> createState() => _LiveNowScreenState();
}

class _LiveNowScreenState extends State<LiveNowScreen> {
  final DioClient _dio = getIt<DioClient>();

  List<LiveEventModel> _events = [];
  bool _isLoading = true;
  String? _error;
  Timer? _refreshTimer;
  int _sortMode = 0; // 0 = viewers desc, 1 = newest first

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    try {
      final res = await _dio.get(
        AppEndpoints.liveNow,
        queryParameters: {'limit': 100},
      );
      final raw = res.data;
      final list = (raw is Map && raw['data'] is List)
          ? raw['data'] as List
          : (raw is List ? raw : <dynamic>[]);
      final parsed = list
          .whereType<Map<String, dynamic>>()
          .map(LiveEventModel.fromJson)
          .toList(growable: false);
      if (mounted) {
        setState(() {
          _events = parsed;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  List<LiveEventModel> get _sortedEvents {
    final list = [..._events];
    if (_sortMode == 0) {
      list.sort((a, b) => b.viewerCount.compareTo(a.viewerCount));
    } else {
      list.sort((a, b) {
        final aTime = a.startedAt ?? a.scheduledAt;
        final bTime = b.startedAt ?? b.scheduledAt;
        return bTime.compareTo(aTime);
      });
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF080B11),
      appBar: AppBar(
        backgroundColor: const Color(0xFF080B11),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 18),
          onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
        ),
        title: Row(
          children: [
            const Text(
              'Đang phát trực tiếp',
              style: TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(width: 8),
            if (_events.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.35), width: 0.6),
                ),
                child: Text(
                  '${_events.length}',
                  style: const TextStyle(
                    color: Color(0xFFF87171),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
          ],
        ),
        actions: [
          BlocBuilder<AuthBloc, AuthState>(
            builder: (context, authState) {
              final isStaffOrAdmin = authState is Authenticated && authState.user.isStaffOrAdmin;
              if (!isStaffOrAdmin) return const SizedBox.shrink();
              return IconButton(
                tooltip: 'Live Studio',
                icon: const Icon(Icons.podcasts_rounded, color: Color(0xFFEF4444), size: 21),
                onPressed: () => context.push('/studio/live'),
              );
            },
          ),
          IconButton(
            tooltip: _sortMode == 0 ? 'Sắp xếp: Mới nhất' : 'Sắp xếp: Người xem',
            icon: Icon(
              _sortMode == 0 ? Icons.trending_up_rounded : Icons.access_time_rounded,
              color: const Color(0xFF00E5FF),
              size: 20,
            ),
            onPressed: () {
              HapticFeedback.lightImpact();
              setState(() => _sortMode = 1 - _sortMode);
            },
          ),
          IconButton(
            tooltip: 'Làm mới',
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFCBD5E1), size: 20),
            onPressed: () {
              HapticFeedback.lightImpact();
              _load();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF00E5FF),
        backgroundColor: const Color(0xFF0F1523),
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00E5FF)),
      );
    }

    if (_error != null && _events.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.signal_wifi_bad_outlined, color: Color(0xFF64748B), size: 40),
            const SizedBox(height: 12),
            const Text(
              'Không thể tải danh sách phát trực tiếp',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00E5FF),
                foregroundColor: const Color(0xFF080B11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    if (_events.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 100),
          Icon(Icons.tv_off_rounded, color: Color(0xFF475569), size: 44),
          SizedBox(height: 12),
          Center(
            child: Text(
              'Hiện không có luồng phát sóng nào đang phát',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      );
    }

    final list = _sortedEvents;
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: list.length,
      itemBuilder: (context, i) => _LiveStreamCard(event: list[i]),
    );
  }
}

class _LiveStreamCard extends StatelessWidget {
  final LiveEventModel event;

  const _LiveStreamCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final ch = event.channel;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1523),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x14FFFFFF), width: 0.8),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            context.push('/live/${event.id}', extra: event);
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 16:9 Thumbnail
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (event.thumbnailUrl != null && event.thumbnailUrl!.isNotEmpty)
                      CachedNetworkImage(
                        imageUrl: event.thumbnailUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => const ColoredBox(color: Color(0xFF131B2E)),
                        placeholder: (_, __) => const ColoredBox(color: Color(0xFF131B2E)),
                      )
                    else
                      const ColoredBox(color: Color(0xFF131B2E)),

                    // Dark gradient at bottom
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.7),
                            ],
                            stops: const [0.5, 1.0],
                          ),
                        ),
                      ),
                    ),

                    // Top Badges
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircleAvatar(radius: 2.5, backgroundColor: Colors.white),
                            SizedBox(width: 4),
                            Text(
                              'TRỰC TIẾP',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 0.5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.remove_red_eye_outlined, size: 10, color: Colors.white),
                            const SizedBox(width: 4),
                            Text(
                              _formatCount(event.viewerCount),
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Title
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 10,
                      child: Text(
                        event.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          height: 1.25,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Bottom row: Channel logo & name + Play
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    if (ch != null && ch.logoUrl != null && ch.logoUrl!.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: CachedNetworkImage(
                          imageUrl: ch.logoUrl!,
                          width: 24,
                          height: 24,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => const Icon(Icons.tv_rounded, size: 18, color: Color(0xFF64748B)),
                        ),
                      )
                    else
                      const Icon(Icons.tv_rounded, size: 18, color: Color(0xFF64748B)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        ch?.name ?? 'OmniCast Live',
                        style: const TextStyle(
                          color: Color(0xFFCBD5E1),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.play_arrow_rounded, color: Color(0xFF00E5FF), size: 16),
                          SizedBox(width: 3),
                          Text(
                            'Xem',
                            style: TextStyle(
                              color: Color(0xFF00E5FF),
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
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
}

String _formatCount(int n) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
  if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
  return n.toString();
}
