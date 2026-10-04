// OmniCast - Admin Hub Screen (Role = 3: System Administrator)
// Specified in Document/PRD.md:
// Realtime dynamic telemetry & zero hardcoded charts

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/injection.dart';
import '../../../data/repositories/channels_repository.dart';
import '../../../data/repositories/programs_repository.dart';
import '../../../data/models/program_model.dart';

class AdminHubScreen extends StatefulWidget {
  const AdminHubScreen({super.key});

  @override
  State<AdminHubScreen> createState() => _AdminHubScreenState();
}

class _AdminHubScreenState extends State<AdminHubScreen> {
  final ChannelsRepository _channelsRepo = getIt<ChannelsRepository>();
  final ProgramsRepository _programsRepo = getIt<ProgramsRepository>();

  List<ChannelCategory> _categories = [];
  List<LiveEventModel> _livePrograms = [];
  bool _isLoading = true;
  int _rttMs = 0;
  Timer? _realtimeTimer;

  // Real-time sampled history points for the live waveform chart
  final List<double> _waveformSamples = [];

  @override
  void initState() {
    super.initState();
    _fetchRealData();
    _startRealtimeSampling();
  }

  @override
  void dispose() {
    _realtimeTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchRealData() async {
    final stopwatch = Stopwatch()..start();
    try {
      final results = await Future.wait([
        _channelsRepo.getCategories(),
        _programsRepo.getLiveNow(),
      ]);
      stopwatch.stop();

      if (mounted) {
        final categories = results[0] as List<ChannelCategory>;
        final liveEvents = results[1] as List<LiveEventModel>;
        final viewers = liveEvents.fold<int>(0, (sum, p) => sum + p.viewerCount);

        setState(() {
          _categories = categories;
          _livePrograms = liveEvents;
          _rttMs = stopwatch.elapsedMilliseconds;
          _isLoading = false;
          if (_waveformSamples.isEmpty) {
            _waveformSamples.add(viewers.toDouble());
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _startRealtimeSampling() {
    _realtimeTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!mounted) return;
      final totalLiveViewers = _livePrograms.fold<int>(
        0,
        (sum, p) => sum + p.viewerCount,
      );

      setState(() {
        _waveformSamples.add(totalLiveViewers.toDouble());
        if (_waveformSamples.length > 25) {
          _waveformSamples.removeAt(0);
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final totalLiveViewers = _livePrograms.fold<int>(
      0,
      (sum, p) => sum + p.viewerCount,
    );
    final totalPeakViewers = _livePrograms.fold<int>(
      0,
      (sum, p) => sum + (p.peakViewers > 0 ? p.peakViewers : p.viewerCount),
    );
    final totalInteractions = _livePrograms.fold<int>(
      0,
      (sum, p) => sum + p.likeCount + p.commentCount + p.shareCount,
    );
    final totalChannels = _categories.fold<int>(0, (sum, c) => sum + c.count);

    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0C1421),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF78350F).withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6)),
              ),
              child: const Text(
                'ROLE 3',
                style: TextStyle(
                  color: Color(0xFFFBBF24),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Admin Control Hub',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF00F2FE)),
            onPressed: () {
              setState(() => _isLoading = true);
              _fetchRealData();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF00F2FE)),
            )
          : RefreshIndicator(
              color: const Color(0xFF00F2FE),
              onRefresh: _fetchRealData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── REALTIME TELEMETRY STRIP ───────────────────────
                    Row(
                      children: [
                        _buildMetricPill(
                          'RTT MẠNG',
                          '$_rttMs ms',
                          Icons.wifi_rounded,
                          const Color(0xFF00F2FE),
                        ),
                        const SizedBox(width: 8),
                        _buildMetricPill(
                          'SỰ KIỆN LIVE',
                          '${_livePrograms.length} Sự Kiện',
                          Icons.play_circle_fill_rounded,
                          const Color(0xFFEF4444),
                        ),
                        const SizedBox(width: 8),
                        _buildMetricPill(
                          'TỔNG KÊNH',
                          '$totalChannels Kênh',
                          Icons.tv_rounded,
                          const Color(0xFF10B981),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // ── REALTIME WAVEFORM CHART CARD (Zero Hardcode) ───
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0E1726),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E2D44)),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF00F2FE).withValues(alpha: 0.05),
                            blurRadius: 20,
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.show_chart_rounded, color: Color(0xFF00F2FE), size: 18),
                                  SizedBox(width: 8),
                                  Text(
                                    'Biểu Đồ Sóng Khán Giả Realtime',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00F2FE).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFF00F2FE).withValues(alpha: 0.4)),
                                ),
                                child: Text(
                                  '$totalLiveViewers VIEWERS',
                                  style: const TextStyle(
                                    color: Color(0xFF00F2FE),
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // CustomPainter Waveform Canvas
                          SizedBox(
                            height: 110,
                            width: double.infinity,
                            child: CustomPaint(
                              painter: _WaveformChartPainter(samples: _waveformSamples),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Mẫu 50s trước',
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontFamily: 'monospace'),
                              ),
                              Text(
                                '${_waveformSamples.length} Mẫu (2s/Tick)',
                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontFamily: 'monospace'),
                              ),
                              const Text(
                                'Thời gian thực',
                                style: TextStyle(color: Color(0xFF00F2FE), fontSize: 9, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── CATEGORY DISTRIBUTION (Zero Hardcode from API) ──
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'PHÂN BỔ THỂ LOẠI (API DATABASE)',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                            fontFamily: 'monospace',
                          ),
                        ),
                        Text(
                          '${_categories.length} Thể loại',
                          style: const TextStyle(
                            color: Color(0xFF00F2FE),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF090E17),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E2D44)),
                      ),
                      child: _categories.isEmpty
                          ? const Center(
                              child: Text(
                                'Đang tải dữ liệu từ API...',
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                              ),
                            )
                          : Column(
                              children: _categories.take(8).map((cat) {
                                final pct = totalChannels > 0
                                    ? (cat.count / totalChannels * 100).round()
                                    : 0;
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            cat.displayName,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          Text(
                                            '$pct% (${cat.count} kênh)',
                                            style: const TextStyle(
                                              color: Color(0xFF94A3B8),
                                              fontSize: 10,
                                              fontFamily: 'monospace',
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 5),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(3),
                                        child: LinearProgressIndicator(
                                          value: totalChannels > 0 ? cat.count / totalChannels : 0.0,
                                          backgroundColor: const Color(0xFF1E293B),
                                          color: _getCategoryColor(cat.category),
                                          minHeight: 5,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                    ),

                    const SizedBox(height: 20),

                    // ── SYSTEM INFRASTRUCTURE HEALTH ───────────────────
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A121E),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E2D44)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Trạng Thái Hạ Tầng API',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                _rttMs > 0 ? 'TRỰC TUYẾN' : 'KẾT NỐI...',
                                style: const TextStyle(
                                  color: Color(0xFF10B981),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildStatusRow('Độ trễ API Gateway', '$_rttMs ms (Hoạt động)', Icons.speed_rounded, const Color(0xFF10B981)),
                          const SizedBox(height: 8),
                          _buildStatusRow('Kênh trực tiếp', '${_livePrograms.length} Sự kiện phát sóng', Icons.cloud_done_rounded, const Color(0xFF38BDF8)),
                          const SizedBox(height: 8),
                          _buildStatusRow('Khán giả trực tiếp', '$totalLiveViewers đang xem (Đỉnh: $totalPeakViewers)', Icons.groups_rounded, const Color(0xFFA78BFA)),
                          const SizedBox(height: 8),
                          _buildStatusRow('Tổng tương tác', '$totalInteractions (Like/Comment/Share)', Icons.thumb_up_alt_rounded, const Color(0xFFF59E0B)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricPill(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 14, color: color),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: color,
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                fontFamily: 'monospace',
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildStatusRow(String title, String subtitle, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ),
        Text(
          subtitle,
          style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'monospace'),
        ),
      ],
    );
  }

  static Color _getCategoryColor(String cat) {
    switch (cat.toUpperCase()) {
      case 'SPORTS':
        return const Color(0xFFEF4444);
      case 'SHOW':
      case 'ENTERTAINMENT':
        return const Color(0xFFA855F7);
      case 'CINE':
      case 'DRAMA':
        return const Color(0xFFF59E0B);
      case 'NEWS':
        return const Color(0xFF3B82F6);
      case 'TECH':
        return const Color(0xFF00F2FE);
      default:
        return const Color(0xFF10B981);
    }
  }
}

// ── CUSTOM PAINTER FOR REALTIME WAVEFORM ─────────────────────────
class _WaveformChartPainter extends CustomPainter {
  final List<double> samples;

  _WaveformChartPainter({required this.samples});

  @override
  void paint(Canvas canvas, Size size) {
    if (samples.length < 2) {
      final placeholderPaint = Paint()
        ..color = const Color(0xFF00F2FE).withValues(alpha: 0.3)
        ..strokeWidth = 1.5
        ..style = PaintingStyle.stroke;
      canvas.drawLine(Offset(0, size.height / 2), Offset(size.width, size.height / 2), placeholderPaint);
      return;
    }

    final double minVal = samples.reduce((a, b) => a < b ? a : b);
    final double maxVal = samples.reduce((a, b) => a > b ? a : b);
    final double range = maxVal == minVal ? (maxVal > 0 ? maxVal : 1.0) : (maxVal - minVal);

    final linePath = Path();
    final areaPath = Path();

    final stepX = size.width / (samples.length - 1);

    for (int i = 0; i < samples.length; i++) {
      final x = i * stepX;
      final normalizedY = maxVal == minVal ? 0.5 : (samples[i] - minVal) / range;
      final y = size.height - (normalizedY * (size.height - 16)) - 8;

      if (i == 0) {
        linePath.moveTo(x, y);
        areaPath.moveTo(x, size.height);
        areaPath.lineTo(x, y);
      } else {
        linePath.lineTo(x, y);
        areaPath.lineTo(x, y);
      }
    }

    areaPath.lineTo(size.width, size.height);
    areaPath.close();

    // Area fill gradient
    final areaPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          const Color(0xFF00F2FE).withValues(alpha: 0.35),
          const Color(0xFF00F2FE).withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;
    canvas.drawPath(areaPath, areaPaint);

    // Stroke line
    final linePaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF3B82F6), Color(0xFF00F2FE), Color(0xFF10B981)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(linePath, linePaint);

    // Latest sample pulse dot
    final lastNormalizedY = maxVal == minVal ? 0.5 : (samples.last - minVal) / range;
    final lastY = size.height - (lastNormalizedY * (size.height - 16)) - 8;
    final dotPaint = Paint()..color = Colors.white;
    final glowPaint = Paint()..color = const Color(0xFF00F2FE).withValues(alpha: 0.6);

    canvas.drawCircle(Offset(size.width, lastY), 5.5, glowPaint);
    canvas.drawCircle(Offset(size.width, lastY), 3.0, dotPaint);
  }

  @override
  bool shouldRepaint(covariant _WaveformChartPainter oldDelegate) => true;
}
