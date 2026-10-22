// ============================================================
// OmniCast - Live Watch Screen (Viewer)
//
// The dedicated viewer experience for a live event.
//
//   - Top: full-width live player + LIVE NOW badge + viewer count
//   - Mid: floating reactions overlay (heart, fire, clap, wow)
//     that show "rise + fade" particles when tapped
//   - Below: channel info, live program description, and the
//     existing CommentsSection / ReactionsBar wired to the
//     live-event endpoints.
//
// The screen auto-rejoins the live event's share-count / view
// tracking on enter, and flips back to the recording detail
// automatically if the backend reports the event is no longer
// LIVE (so a recording on a stopped event still has somewhere to
// land).
// ============================================================

import 'dart:async';
import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/share_helper.dart';
import '../../../data/models/program_model.dart';
import '../../../data/services/live_socket_service.dart';
import '../../widgets/omni_player.dart';
import '../../widgets/social/comments_section.dart';

class LiveWatchScreen extends StatefulWidget {
  final String eventId;

  /// Optional pre-loaded model (when the user taps into the
  /// watch screen from a list, the parent already has the model
  /// in hand — saves one round-trip on initial render).
  final LiveEventModel? initial;

  const LiveWatchScreen({
    super.key,
    required this.eventId,
    this.initial,
  });

  @override
  State<LiveWatchScreen> createState() => _LiveWatchScreenState();
}

class _LiveWatchScreenState extends State<LiveWatchScreen> {
  static const _accent = Color(0xFF00E5FF);
  static const _danger = Color(0xFFFF2A55);
  static const _warn = Color(0xFFF59E0B);

  final DioClient _dio = getIt<DioClient>();

  late LiveEventModel? _event;
  List<LiveEventModel> _otherLiveEvents = [];
  bool _isLoading = true;
  String? _error;

  // Auto-refresh loop (10s) — picks up the latest viewer count
  // and any program-level state change (LIVE → ENDED) without
  // forcing the user to pull-to-refresh.
  Timer? _refreshTimer;

  // Floating reactions layer
  final List<_FloatingReaction> _floating = [];
  final math.Random _rng = math.Random();

  // Simple local counter — the real one comes from the API.
  // Tapping a reaction here increments the local count and
  // posts to the backend, so the player counter doesn't lag.
  int _localLikeDelta = 0;

  bool _hasJoinedLobby = false;
  String? _broadcasterAnnouncement;
  final List<StreamSubscription> _socketSubscriptions = [];

  @override
  void initState() {
    super.initState();
    _event = widget.initial;
    _bootstrap();
  }

  void _joinLiveSession() {
    setState(() => _hasJoinedLobby = true);
    _initSocket();
  }

  void _initSocket() {
    LiveSocketService.instance.connect();
    LiveSocketService.instance.subscribeEvent(widget.eventId);

    _socketSubscriptions.add(
      LiveSocketService.instance.onViewerCount.listen((count) {
        if (mounted && _event != null) {
          setState(() {
            _event = _event!.copyWith(viewerCount: count);
          });
        }
      }),
    );

    _socketSubscriptions.add(
      LiveSocketService.instance.onReactionNew.listen((data) {
        final type = data['type']?.toString();
        if (type != null && mounted) {
          _spawnReactionParticles(type);
        }
      }),
    );

    _socketSubscriptions.add(
      LiveSocketService.instance.onBroadcasterMessage.listen((data) {
        final msg = data['message']?.toString();
        if (msg != null && mounted) {
          setState(() => _broadcasterAnnouncement = msg);
          _toast('📢 Thông báo từ Host: $msg', accent: _warn);
        }
      }),
    );
  }

  void _spawnReactionParticles(String type) {
    for (int i = 0; i < 3 + _rng.nextInt(3); i++) {
      _floating.add(_FloatingReaction(
        emoji: _emojiFor(type),
        left: 24 + _rng.nextDouble() * 80,
        bottom: 60 + _rng.nextDouble() * 40,
        delay: Duration(milliseconds: 60 * i),
      ));
    }
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    for (final s in _socketSubscriptions) {
      s.cancel();
    }
    LiveSocketService.instance.unsubscribeEvent(widget.eventId);
    super.dispose();
  }

  // ============================================================
  // Data
  // ============================================================

  Future<void> _bootstrap() async {
    _initSocket();
    await _loadEvent();
    _loadOtherLive();
    if (_event != null) {
      // Bump view counter (best-effort, fire-and-forget).
      _bumpView();
      // Initial share/like counter for the UI display.
      _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
        _loadEvent(silent: true);
        _loadOtherLive();
      });
    }
  }

  Future<void> _loadOtherLive() async {
    try {
      final res = await _dio.get(
        AppEndpoints.liveNow,
        queryParameters: {'limit': 10},
      );
      final raw = res.data;
      final list = (raw is Map && raw['data'] is List)
          ? raw['data'] as List
          : (raw is List ? raw : <dynamic>[]);
      final parsed = list
          .whereType<Map<String, dynamic>>()
          .map(LiveEventModel.fromJson)
          .where((e) => e.id != widget.eventId)
          .toList(growable: false);
      if (mounted) {
        setState(() => _otherLiveEvents = parsed);
      }
    } catch (_) {/* best-effort */}
  }

  Future<void> _loadEvent({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final res = await _dio.get(AppEndpoints.liveEvent(widget.eventId));
      final raw = res.data;
      final body = (raw is Map && raw['data'] is Map)
          ? raw['data'] as Map<String, dynamic>
          : raw as Map<String, dynamic>;
      if (mounted) {
        setState(() {
          _event = LiveEventModel.fromJson(body);
          _isLoading = false;
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

  Future<void> _bumpView() async {
    try {
      await _dio.post('${AppEndpoints.liveEvents}/${widget.eventId}/view');
    } catch (_) {/* best-effort */}
  }

  Future<void> _bumpShare() async {
    try {
      await _dio.post('${AppEndpoints.liveEvents}/${widget.eventId}/share');
    } catch (_) {/* best-effort */}
  }

  Future<void> _onTapReaction(String type) async {
    _spawnReactionParticles(type);
    setState(() => _localLikeDelta++);
    if (LiveSocketService.instance.isConnected) {
      LiveSocketService.instance.sendReaction(
        eventId: widget.eventId,
        type: type,
      );
      return;
    }

    try {
      await _dio.post(
        '${AppEndpoints.liveEvents}/${widget.eventId}/reactions',
        data: {'type': type},
      );
    } catch (error) {
      if (mounted) {
        _toast('Khong the gui cam xuc: $error', accent: _warn);
      }
    }
  }

  String _emojiFor(String type) {
    switch (type) {
      case 'HEART':
        return '❤️';
      case 'FIRE':
        return '🔥';
      case 'CLAP':
        return '👏';
      case 'WOW':
        return '😮';
      default:
        return '❤️';
    }
  }

  // ============================================================
  // UI helpers
  // ============================================================

  void _toast(String message, {Color? accent}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: accent ?? const Color(0xFF0B1320),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String _formatViewers(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }

  // ============================================================
  // Build
  // ============================================================

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF070B12),
        appBar: _buildAppBar(),
        body: const Center(
          child: CircularProgressIndicator(color: _accent),
        ),
      );
    }
    if (_event == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF070B12),
        appBar: _buildAppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: _danger, size: 56),
                const SizedBox(height: 12),
                const Text(
                  'Không tìm thấy sự kiện live',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _error ?? 'Sự kiện này có thể đã kết thúc hoặc bị xoá.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 18),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accent,
                    foregroundColor: Colors.black,
                  ),
                  onPressed: () =>
                      context.canPop() ? context.pop() : context.go('/home'),
                  child: const Text('Quay lại'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_hasJoinedLobby) {
      return _buildJoinLobbyView();
    }

    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        color: _accent,
        onRefresh: () => _loadEvent(),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _buildPlayerSection(),
            _buildBroadcasterBanner(),
            _buildLiveInfoCard(),
            _buildReactionsRow(),
            if (_otherLiveEvents.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildOtherLiveSection(),
            ],
            const SizedBox(height: 16),
            _buildSection(
              title: 'BÌNH LUẬN TRỰC TIẾP',
              child: CommentsSection(
                targetId: widget.eventId,
                kind: 'live',
              ),
            ),
            const SizedBox(height: 24),
            _buildChannelFooter(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildBroadcasterBanner() {
    if (_broadcasterAnnouncement == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1500),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _warn.withValues(alpha: 0.6), width: 1),
        boxShadow: [
          BoxShadow(
            color: _warn.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.campaign_rounded, color: _warn, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'THÔNG BÁO TỪ KÊNH / STAFF',
                  style: TextStyle(
                    color: _warn,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _broadcasterAnnouncement!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: const Icon(Icons.close, color: Colors.white60, size: 16),
            onPressed: () => setState(() => _broadcasterAnnouncement = null),
          ),
        ],
      ),
    );
  }

  Widget _buildJoinLobbyView() {
    final ev = _event!;
    final ch = ev.channel;
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: _buildAppBar(),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 480),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _accent.withValues(alpha: 0.3),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: _accent.withValues(alpha: 0.12),
                  blurRadius: 30,
                  spreadRadius: 2,
                ),
              ],
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: _danger.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _danger.withValues(alpha: 0.6)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _PulsingDot(),
                      SizedBox(width: 8),
                      Text(
                        'LIVESTREAM ĐANG DIỄN RA',
                        style: TextStyle(
                          color: _danger,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                if (ev.thumbnailUrl != null && ev.thumbnailUrl!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CachedNetworkImage(
                            imageUrl: ev.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                Container(color: Colors.black26),
                            errorWidget: (_, __, ___) =>
                                Container(color: Colors.black26),
                          ),
                          Container(
                            color: Colors.black.withValues(alpha: 0.4),
                            child: const Center(
                              child: Icon(Icons.play_circle_fill_rounded,
                                  color: _accent, size: 54),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                Text(
                  ev.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 10),
                if (ch != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (ch.logoUrl != null && ch.logoUrl!.isNotEmpty)
                        ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: ch.logoUrl!,
                            width: 24,
                            height: 24,
                            fit: BoxFit.cover,
                          ),
                        ),
                      const SizedBox(width: 8),
                      Text(
                        ch.name,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${_formatViewers(ev.viewerCount)} người đang xem trực tiếp',
                    style: const TextStyle(
                      color: Color(0xFFCBD5E1),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Staff / Admin đã chọn phát nội dung từ kho OmniCast VOD. Bạn có muốn tham gia buổi phát trực tiếp và tương tác cùng người xem khác không?',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.sensors_rounded, size: 20),
                    label: const Text(
                      'ĐỒNG Ý VÀO XEM NGAY',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _accent,
                      foregroundColor: Colors.black,
                      elevation: 6,
                      shadowColor: _accent.withValues(alpha: 0.5),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: _joinLiveSession,
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () =>
                      context.canPop() ? context.pop() : context.go('/home'),
                  child: const Text(
                    'Để sau',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: const Color(0xFF0B1320),
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _danger,
              borderRadius: BorderRadius.circular(4),
              boxShadow: [
                BoxShadow(
                  color: _danger.withValues(alpha: 0.4),
                  blurRadius: 8,
                ),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _PulsingDot(),
                SizedBox(width: 5),
                Text(
                  'LIVE NOW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          const Text(
            'Đang phát sóng',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: 'Làm mới',
          icon: const Icon(Icons.refresh, color: _accent),
          onPressed: () => _loadEvent(),
        ),
        IconButton(
          tooltip: 'Chia sẻ',
          icon: const Icon(Icons.share_rounded, color: Colors.white),
          onPressed: () async {
            HapticFeedback.lightImpact();
            _bumpShare();
            final ev = _event;
            if (ev != null) {
              await ShareHelper.shareLiveEvent(ev);
            }
            _toast('Đã ghi nhận lượt chia sẻ');
          },
        ),
      ],
    );
  }

  // ============================================================
  // Player + floating reactions
  // ============================================================

  Widget _buildPlayerSection() {
    final ev = _event!;
    final streamUrl = ev.streamUrl?.isNotEmpty == true
        ? ev.streamUrl!
        : (ev.externalUrl?.isNotEmpty == true
            ? ev.externalUrl!
            : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(
        fit: StackFit.expand,
        children: [
          OmniPlayer(
            url: streamUrl,
            posterUrl: ev.thumbnailUrl,
            autoPlay: true,
            showControls: true,
            isPremium: ev.isPrivate,
            channelName: ev.channel?.name,
          ),

          // Floating reactions layer
          if (_floating.isNotEmpty)
            Positioned.fill(
              child: IgnorePointer(
                child: _FloatingReactionsLayer(
                  reactions: _floating,
                  onExpired: (r) {
                    if (mounted) {
                      setState(() => _floating.remove(r));
                    }
                  },
                ),
              ),
            ),

          // Top-left program title chip
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.18),
                  width: 0.6,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _PulsingDot(),
                  const SizedBox(width: 6),
                  Text(
                    ev.isLive
                        ? 'TRỰC TIẾP'
                        : (ev.isScheduled ? 'SẮP PHÁT' : 'ĐÃ KẾT THÚC'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Top-right viewer count
          Positioned(
            top: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _danger.withValues(alpha: 0.5),
                  width: 0.8,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.remove_red_eye_outlined,
                      size: 12, color: _danger),
                  const SizedBox(width: 4),
                  Text(
                    '${_formatViewers(ev.viewerCount)} đang xem',
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
        ],
      ),
    );
  }

  // ============================================================
  // Live info / status card
  // ============================================================

  Widget _buildLiveInfoCard() {
    final ev = _event!;
    final ch = ev.channel;
    final peak = ev.peakViewers;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: const Color(0xFF1F2937),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            ev.title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          // Channel + open channel link
          if (ch != null)
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => context.push('/channel/${ev.channelId}'),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0x1F00E5FF),
                    width: 0.8,
                  ),
                ),
                child: Row(
                  children: [
                    if (ch.logoUrl != null && ch.logoUrl!.isNotEmpty)
                      ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: ch.logoUrl!,
                          width: 32,
                          height: 32,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) =>
                              _channelLogoPlaceholder(),
                          placeholder: (_, __) => _channelLogoPlaceholder(),
                        ),
                      )
                    else
                      _channelLogoPlaceholder(),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ch.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (ch.category != null && ch.category!.isNotEmpty)
                            Text(
                              ch.category!.toUpperCase(),
                              style: const TextStyle(
                                color: _accent,
                                fontSize: 10,
                                fontFamily: 'JetBrainsMono',
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded,
                        color: _accent, size: 14),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),

          // Telemetry strip
          Row(
            children: [
              _statTile(
                icon: Icons.visibility_rounded,
                value: _formatViewers(ev.viewerCount),
                label: 'ĐANG XEM',
                color: _danger,
              ),
              const SizedBox(width: 8),
              _statTile(
                icon: Icons.trending_up_rounded,
                value: _formatViewers(peak),
                label: 'ĐỈNH',
                color: _warn,
              ),
              const SizedBox(width: 8),
              _statTile(
                icon: Icons.favorite_rounded,
                value: _formatViewers(ev.likeCount + _localLikeDelta),
                label: 'CẢM XÚC',
                color: const Color(0xFFEC4899),
              ),
              const SizedBox(width: 8),
              _statTile(
                icon: Icons.chat_bubble_rounded,
                value: _formatViewers(ev.commentCount),
                label: 'BÌNH LUẬN',
                color: _accent,
              ),
            ],
          ),

          if (ev.description != null && ev.description!.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              ev.description!,
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 13,
                height: 1.55,
              ),
            ),
          ],

          if (ev.tags.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final tag in ev.tags.take(8))
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: const Color(0x1F00E5FF),
                        width: 0.6,
                      ),
                    ),
                    child: Text(
                      '#$tag',
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 10,
                        fontFamily: 'JetBrainsMono',
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _channelLogoPlaceholder() {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        shape: BoxShape.circle,
        border: Border.all(
          color: _accent.withValues(alpha: 0.5),
          width: 0.8,
        ),
      ),
      child: const Icon(Icons.tv_rounded, color: _accent, size: 16),
    );
  }

  Widget _statTile({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: color.withValues(alpha: 0.25),
            width: 0.8,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w900,
                fontFamily: 'JetBrainsMono',
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
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
      ),
    );
  }

  // ============================================================
  // Reactions (floating + side panel)
  // ============================================================

  Widget _buildReactionsRow() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Row(
        children: [
          _reactionPill('❤️', 'HEART'),
          const SizedBox(width: 8),
          _reactionPill('🔥', 'FIRE'),
          const SizedBox(width: 8),
          _reactionPill('👏', 'CLAP'),
          const SizedBox(width: 8),
          _reactionPill('😮', 'WOW'),
        ],
      ),
    );
  }

  Widget _reactionPill(String emoji, String type) {
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          _onTapReaction(type);
        },
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0x1F00E5FF),
              width: 0.8,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            emoji,
            style: const TextStyle(fontSize: 26),
          ),
        ),
      ),
    );
  }

  Widget _buildOtherLiveSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Container(width: 3, height: 14, color: _danger),
              const SizedBox(width: 6),
              const Text(
                'CÁC KÊNH ĐANG PHÁT KHÁC',
                style: TextStyle(
                  color: _danger,
                  fontSize: 11,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/live'),
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Tất cả',
                      style: TextStyle(
                          color: _accent,
                          fontSize: 11,
                          fontWeight: FontWeight.bold),
                    ),
                    Icon(Icons.chevron_right, size: 14, color: _accent),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 116,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _otherLiveEvents.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final ev = _otherLiveEvents[index];
              return InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () {
                  HapticFeedback.lightImpact();
                  context.pushReplacement('/live/${ev.id}', extra: ev);
                },
                child: Container(
                  width: 160,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0B1320),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: const Color(0x2900E5FF),
                      width: 0.8,
                    ),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            if (ev.thumbnailUrl != null &&
                                ev.thumbnailUrl!.isNotEmpty)
                              CachedNetworkImage(
                                imageUrl: ev.thumbnailUrl!,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) =>
                                    Container(color: const Color(0xFF0F172A)),
                              )
                            else
                              Container(color: const Color(0xFF0F172A)),
                            Positioned(
                              top: 4,
                              left: 4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _danger,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: const Text(
                                  'LIVE',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.w900),
                                ),
                              ),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 4, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.7),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: Text(
                                  '${_formatViewers(ev.viewerCount)} xem',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ev.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              ev.channel?.name ?? 'Kênh',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 9,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ============================================================
  // Section wrapper
  // ============================================================

  Widget _buildSection({required String title, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 3,
                height: 14,
                color: _accent,
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: const TextStyle(
                  color: _accent,
                  fontSize: 11,
                  fontFamily: 'JetBrainsMono',
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  // ============================================================
  // Channel footer
  // ============================================================

  Widget _buildChannelFooter() {
    final ch = _event?.channel;
    if (ch == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/channel/${_event!.channelId}'),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0x1F00E5FF),
              width: 0.8,
            ),
          ),
          child: Row(
            children: [
              _channelLogoPlaceholder(),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Mở trang kênh ${ch.name} →',
                  style: const TextStyle(
                    color: _accent,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                  ),
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded,
                  color: _accent, size: 14),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// Helpers
// ============================================================

class _FloatingReaction {
  final String emoji;
  final double left; // 0-100 percent of width
  final double bottom; // 0-100 percent of height
  final Duration delay;
  _FloatingReaction({
    required this.emoji,
    required this.left,
    required this.bottom,
    this.delay = Duration.zero,
  });
}

class _FloatingReactionsLayer extends StatefulWidget {
  final List<_FloatingReaction> reactions;
  final void Function(_FloatingReaction) onExpired;
  const _FloatingReactionsLayer({
    required this.reactions,
    required this.onExpired,
  });

  @override
  State<_FloatingReactionsLayer> createState() =>
      _FloatingReactionsLayerState();
}

class _FloatingReactionsLayerState extends State<_FloatingReactionsLayer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final List<_AnimatedReaction> _items;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _items = widget.reactions
        .map((r) => _AnimatedReaction(reaction: r))
        .toList(growable: false);
    _ctrl.forward();
    _ctrl.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        for (final item in _items) {
          widget.onExpired(item.reaction);
        }
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        return LayoutBuilder(
          builder: (context, constraints) {
            return Stack(
              children: [
                for (final item in _items)
                  Positioned(
                    left:
                        constraints.maxWidth * (item.reaction.left / 100) - 14,
                    bottom:
                        constraints.maxHeight * (item.reaction.bottom / 100),
                    child: Opacity(
                      opacity: 1 - _ctrl.value,
                      child: Transform.translate(
                        offset: Offset(
                          0,
                          -80 * Curves.easeOutCubic.transform(_ctrl.value),
                        ),
                        child: Transform.scale(
                          scale:
                              0.7 + 0.4 * Curves.easeOut.transform(_ctrl.value),
                          child: Text(
                            item.reaction.emoji,
                            style: const TextStyle(fontSize: 30),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        );
      },
    );
  }
}

class _AnimatedReaction {
  final _FloatingReaction reaction;
  _AnimatedReaction({required this.reaction});
}

class _PulsingDot extends StatefulWidget {
  const _PulsingDot();
  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 12,
      height: 12,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (context, _) {
          final t = _ctrl.value;
          return Stack(
            alignment: Alignment.center,
            children: [
              Opacity(
                opacity: 1 - t,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ),
              Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
