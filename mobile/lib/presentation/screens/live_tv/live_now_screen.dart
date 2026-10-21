// ============================================================
// OmniCast - Live Now Screen
//
// Lists every event currently in `status = LIVE`. The backend
// returns the result of `/v1/programs/live-events/live-now`,
// already grouped by channel. Tapping a card pushes the
// LiveWatchScreen so the user lands in the full viewer
// experience with the live player + reactions + comments.
//
// The screen auto-refreshes every 15s so freshly-curated events
// from the Studio surface without a manual pull-to-refresh.
// ============================================================

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
import '../../widgets/live_pulse_widget.dart';

class LiveNowScreen extends StatefulWidget {
  const LiveNowScreen({super.key});

  @override
  State<LiveNowScreen> createState() => _LiveNowScreenState();
}

class _LiveNowScreenState extends State<LiveNowScreen> {
  static const _accent = Color(0xFF00E5FF);
  static const _danger = Color(0xFFFF2A55);

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

  // ============================================================
  // Build
  // ============================================================

  @override
  Widget build(BuildContext context) {
    final totalViewers = _events.fold<int>(0, (s, e) => s + e.viewerCount);
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: _buildAppBar(totalViewers),
      body: RefreshIndicator(
        color: _accent,
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(int totalViewers) {
    return AppBar(
      backgroundColor: const Color(0xFF0B1320),
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
      ),
      title: const Row(
        children: [
          LiveBadge(),
          SizedBox(width: 10),
          Text(
            'Đang phát sóng',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
      actions: [
        BlocBuilder<AuthBloc, AuthState>(
          builder: (context, authState) {
            final isStaffOrAdmin = authState is Authenticated &&
                authState.user.isStaffOrAdmin;
            if (!isStaffOrAdmin) return const SizedBox.shrink();
            return IconButton(
              tooltip: 'Live Studio (Phát sóng)',
              icon: const Icon(Icons.podcasts_rounded, color: _danger),
              onPressed: () {
                final slug = _activeEvents.isNotEmpty
                    ? _activeEvents.first.channel?.slug
                    : null;
                context.push(
                  slug != null
                      ? '/studio/live?channel=$slug'
                      : '/studio/live',
                );
              },
            );
          },
        ),
        IconButton(
          tooltip: _sortMode == 0 ? 'Sắp xếp theo thời gian bắt đầu' : 'Sắp xếp theo lượt xem',
          icon: Icon(
            _sortMode == 0
                ? Icons.trending_up_rounded
                : Icons.access_time_rounded,
            color: _accent,
          ),
          onPressed: () {
            HapticFeedback.lightImpact();
            setState(() => _sortMode = 1 - _sortMode);
          },
        ),
        IconButton(
          tooltip: 'Làm mới',
          icon: const Icon(Icons.refresh, color: _accent),
          onPressed: _load,
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(44),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          color: const Color(0xFF0B1320),
          child: Row(
            children: [
              _PillStat(
                icon: Icons.live_tv_rounded,
                value: '${_events.length}',
                label: 'SỰ KIỆN LIVE',
                color: _danger,
              ),
              const SizedBox(width: 8),
              _PillStat(
                icon: Icons.remove_red_eye_outlined,
                value: _formatCount(totalViewers),
                label: 'TỔNG VIEWER',
                color: _accent,
              ),
              const Spacer(),
              const Text(
                'AUTO-REFRESH 15s',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 9,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: _accent),
      );
    }
    if (_error != null && _events.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.signal_wifi_bad_outlined,
              color: Color(0xFF94A3B8), size: 48),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              'Không thể tải danh sách live',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _accent,
                foregroundColor: Colors.black,
              ),
            ),
          ),
        ],
      );
    }
    if (_events.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 80),
          Icon(Icons.podcasts_rounded,
              color: Color(0xFF94A3B8), size: 48),
          SizedBox(height: 12),
          Center(
            child: Text(
              'Hiện chưa có kênh nào đang phát sóng',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          SizedBox(height: 4),
          Center(
            child: Text(
              'Hãy quay lại sau hoặc khám phá kho VOD.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ),
        ],
      );
    }

    final list = _sortedEvents;
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
      itemCount: list.length,
      itemBuilder: (context, i) => _LiveCard(event: list[i]),
    );
  }
}

// ============================================================
// Card
// ============================================================

class _LiveCard extends StatelessWidget {
  final LiveEventModel event;
  const _LiveCard({required this.event});

  static const _danger = Color(0xFFFF2A55);

  @override
  Widget build(BuildContext context) {
    final ch = event.channel;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () {
        HapticFeedback.lightImpact();
        context.push('/live/${event.id}', extra: event);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _danger.withValues(alpha: 0.35),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: _danger.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Thumbnail
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (event.thumbnailUrl != null && event.thumbnailUrl!.isNotEmpty)
                    CachedNetworkImage(
                      imageUrl: event.thumbnailUrl!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => _thumbPlaceholder(),
                      placeholder: (_, __) => _thumbPlaceholder(),
                    )
                  else
                    _thumbPlaceholder(),
                  // Gradient overlay
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.75),
                          ],
                          stops: const [0.55, 1.0],
                        ),
                      ),
                    ),
                  ),
                  // LIVE badge
                  const Positioned(
                    top: 10,
                    left: 10,
                    child: LiveBadge(),
                  ),
                  // Viewer count
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.2),
                          width: 0.6,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.remove_red_eye_outlined,
                              size: 11, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            _formatCount(event.viewerCount),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Title at bottom of thumb
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
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'Outfit',
                        height: 1.25,
                        shadows: [
                          Shadow(color: Colors.black, blurRadius: 4),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Footer: channel + meta
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Row(
                children: [
                  if (ch != null) ...[
                    if (ch.logoUrl != null && ch.logoUrl!.isNotEmpty)
                      ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: ch.logoUrl!,
                          width: 28,
                          height: 28,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => const _MiniLogo(),
                          placeholder: (_, __) => const _MiniLogo(),
                        ),
                      )
                    else
                      const _MiniLogo(),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        ch.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ] else
                    const Expanded(
                      child: Text(
                        'Kênh phát sóng',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  _metaPill(
                    icon: Icons.favorite_rounded,
                    value: _formatCount(event.likeCount),
                  ),
                  const SizedBox(width: 6),
                  _metaPill(
                    icon: Icons.chat_bubble_rounded,
                    value: _formatCount(event.commentCount),
                  ),
                  const SizedBox(width: 6),
                  _metaPill(
                    icon: Icons.share_rounded,
                    value: _formatCount(event.shareCount),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [_danger, Color(0xFFDC2626)],
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'XEM',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(Icons.arrow_forward_ios_rounded,
                            color: Colors.white, size: 10),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaPill({required IconData icon, required String value}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: const Color(0x1F00E5FF),
          width: 0.6,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: const Color(0xFF94A3B8)),
          const SizedBox(width: 3),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFFCBD5E1),
              fontSize: 10,
              fontWeight: FontWeight.w700,
              fontFamily: 'JetBrainsMono',
            ),
          ),
        ],
      ),
    );
  }

  Widget _thumbPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
        ),
      ),
      alignment: Alignment.center,
      child: const Icon(Icons.live_tv_rounded,
          color: Color(0xFF475569), size: 36),
    );
  }
}

class _MiniLogo extends StatelessWidget {
  const _MiniLogo();
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        shape: BoxShape.circle,
        border: Border.all(
          color: const Color(0xFF00E5FF).withValues(alpha: 0.4),
          width: 0.8,
        ),
      ),
      child: const Icon(Icons.tv_rounded,
          color: Color(0xFF00E5FF), size: 14),
    );
  }
}

class _PillStat extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  const _PillStat({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withValues(alpha: 0.45),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w900,
              fontFamily: 'JetBrainsMono',
            ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 9,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

String _formatCount(int n) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
  if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
  return n.toString();
}
