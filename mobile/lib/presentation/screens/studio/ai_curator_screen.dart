// OmniCast - AI Curator Screen (Staff Only)
// Cyber-Dark Broadcast System styling with AI Neural Telemetry.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../logic/auth/auth_bloc.dart';
import '../../../core/theme/app_theme.dart';

class AICuratorScreen extends StatefulWidget {
  const AICuratorScreen({super.key});

  @override
  State<AICuratorScreen> createState() => _AICuratorScreenState();
}

class _AICuratorScreenState extends State<AICuratorScreen> {
  bool _isLoading = false;
  Map<String, dynamic>? _analysisResult;
  String? _error;

  // Filters
  String? _selectedTimeRange = '24 giờ qua';
  final List<String> _timeRanges = [
    '24 giờ qua',
    '7 ngày qua',
    '30 ngày qua',
  ];

  @override
  Widget build(BuildContext context) {
    // Check if user is staff
    final authState = context.read<AuthBloc>().state;
    if (authState is! Authenticated || !_isStaff(authState.user.role)) {
      return _buildAccessDenied();
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AI Curator Studio',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
                fontFamily: 'Outfit',
              ),
            ),
            Text(
              'NEURAL ANALYTICS // BROADCAST AI',
              style: TextStyle(
                color: Color(0xFF00E5FF),
                fontSize: 9,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                letterSpacing: 1.1,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: Color(0xFF00E5FF)),
            onPressed: () => _showInfoDialog(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            _buildHeader(),
            const SizedBox(height: 20),

            // Filters
            _buildFilters(),
            const SizedBox(height: 20),

            // Analyze Button
            _buildAnalyzeButton(),
            const SizedBox(height: 24),

            // Results
            if (_error != null) _buildError(),
            if (_analysisResult != null) _buildResults(),
            const SizedBox(height: 36),
          ],
        ),
      ),
    );
  }

  Widget _buildAccessDenied() {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('AI Curator'),
        backgroundColor: AppColors.bg,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.lock_clock_rounded,
                  size: 56,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'TRUY CẬP BỊ TỪ CHỐI',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Outfit',
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Tính năng AI Curator phân tích nội dung chỉ dành riêng cho tài khoản Quản trị & Điều hành phát sóng.',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0x3300E5FF),
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF00E5FF).withValues(alpha: 0.3),
                  blurRadius: 10,
                ),
              ],
            ),
            child: const Icon(
              Icons.auto_awesome,
              color: Colors.black,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mô hình đề xuất luồng AI',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Outfit',
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Phân tích lưu lượng xem thời gian thực & tối ưu khung giờ vàng',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'KHUNG THỜI GIAN PHÂN TÍCH',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            fontFamily: 'JetBrainsMono',
            color: Color(0xFF00E5FF),
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF0B1320),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
          ),
          child: DropdownButton<String>(
            value: _selectedTimeRange,
            hint: const Text('Chọn khoảng thời gian', style: TextStyle(color: Color(0xFF94A3B8))),
            isExpanded: true,
            underline: const SizedBox(),
            dropdownColor: const Color(0xFF0B1320),
            icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF00E5FF)),
            items: _timeRanges.map((range) {
              return DropdownMenuItem(
                value: range,
                child: Text(
                  range,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() => _selectedTimeRange = value);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAnalyzeButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _runAnalysis,
      child: Container(
        width: double.infinity,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF00E5FF).withValues(alpha: 0.25),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isLoading)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.black,
                ),
              )
            else
              const Icon(Icons.psychology_rounded, color: Colors.black, size: 20),
            const SizedBox(width: 8),
            Text(
              _isLoading ? 'ĐANG PHÂN TÍCH...' : 'CHẠY PHÂN TÍCH VỚI AI',
              style: const TextStyle(
                color: Colors.black,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                fontFamily: 'Outfit',
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _error!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResults() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'KẾT QUẢ ĐỀ XUẤT',
          style: TextStyle(
            fontSize: 12,
            fontFamily: 'JetBrainsMono',
            fontWeight: FontWeight.w700,
            color: Color(0xFF00E5FF),
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 12),

        // Summary Card
        _buildSummaryCard(),
        const SizedBox(height: 16),

        // Top Performers
        _buildTopPerformers(),
        const SizedBox(height: 16),

        // Recommendations
        _buildRecommendations(),
        const SizedBox(height: 16),

        // Trend Analysis
        _buildTrendAnalysis(),
      ],
    );
  }

  Widget _buildSummaryCard() {
    final totalViews = _analysisResult?['totalViews'] ?? 0;
    final avgWatchTime = _analysisResult?['avgWatchTime'] ?? 0;
    final peakHour = _analysisResult?['peakHour'] ?? 'N/A';
    final topCategory = _analysisResult?['topCategory'] ?? 'N/A';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TỔNG QUAN LƯU LƯỢNG',
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.visibility_rounded,
                  label: 'Tổng lượt xem',
                  value: _formatNumber(totalViews),
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.timer_outlined,
                  label: 'Thời gian TB',
                  value: '$avgWatchTime phút',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.schedule_rounded,
                  label: 'Giờ cao điểm',
                  value: peakHour,
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.category_outlined,
                  label: 'Chuyên mục hot',
                  value: topCategory,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTopPerformers() {
    final topChannels = _analysisResult?['topChannels'] as List? ?? [];
    final topPrograms = _analysisResult?['topPrograms'] as List? ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'HIỆU SUẤT CAO NHẤT',
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          if (topChannels.isNotEmpty) ...[
            const Text(
              'Kênh thu hút người xem',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF94A3B8),
                fontFamily: 'JetBrainsMono',
              ),
            ),
            const SizedBox(height: 8),
            ...topChannels.take(3).map((channel) => _TopItem(
                  title: channel['name'] ?? '',
                  subtitle: '${_formatNumber(channel['views'] ?? 0)} lượt xem',
                  icon: Icons.tv_rounded,
                )),
          ],
          if (topPrograms.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Chương trình nổi bật',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF94A3B8),
                fontFamily: 'JetBrainsMono',
              ),
            ),
            const SizedBox(height: 8),
            ...topPrograms.take(3).map((program) => _TopItem(
                  title: program['title'] ?? '',
                  subtitle: '${_formatNumber(program['views'] ?? 0)} lượt xem',
                  icon: Icons.play_circle_fill_rounded,
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildRecommendations() {
    final recommendations = _analysisResult?['recommendations'] as List? ?? [];
    if (recommendations.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ĐỀ XUẤT TỐI ƯU HÓA TỪ AI',
          style: TextStyle(
            fontSize: 11,
            fontFamily: 'JetBrainsMono',
            fontWeight: FontWeight.w700,
            color: Color(0xFF00E5FF),
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 10),
        ...recommendations.map<Widget>((rec) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0B1320),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0x3300E5FF),
                  width: 0.8,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.lightbulb_rounded,
                    color: Color(0xFF00E5FF),
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      rec['text'] ?? '',
                      style: const TextStyle(
                        color: Color(0xFFE2E8F0),
                        fontSize: 12,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  Widget _buildTrendAnalysis() {
    final trends = _analysisResult?['trends'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'CHỈ SỐ XU HƯỚNG',
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          _TrendItem(
            label: 'Tăng trưởng người xem',
            trend: trends['viewerGrowth'] ?? 0,
          ),
          const Divider(color: Color(0x1A00E5FF), height: 16),
          _TrendItem(
            label: 'Mức độ tương tác',
            trend: trends['engagementChange'] ?? 0,
          ),
          const Divider(color: Color(0x1A00E5FF), height: 16),
          _TrendItem(
            label: 'Tỷ lệ giữ chân người xem',
            trend: trends['retentionChange'] ?? 0,
          ),
        ],
      ),
    );
  }

  Future<void> _runAnalysis() async {
    HapticFeedback.lightImpact();
    setState(() {
      _isLoading = true;
      _error = null;
      _analysisResult = null;
    });

    try {
      await Future.delayed(const Duration(seconds: 1));

      final result = {
        'totalViews': 1250000,
        'avgWatchTime': 28,
        'peakHour': '20:00 - 22:00',
        'topCategory': 'Thể thao 4K',
        'topChannels': [
          {'name': 'VTV3 HD', 'views': 250000},
          {'name': 'VTV6 Live', 'views': 180000},
          {'name': 'HTV7 4K', 'views': 150000},
        ],
        'topPrograms': [
          {'title': 'Bóng đá Trực Tiếp V-League', 'views': 320000},
          {'title': 'The Voice Vietnam 2026', 'views': 180000},
          {'title': 'Thời sự Toàn cảnh 19:00', 'views': 150000},
        ],
        'recommendations': [
          {
            'text':
                'Nên tăng lịch phát sóng thể thao 4K vào cuối tuần để tối đa hóa lượng xem cao điểm.'
          },
          {
            'text':
                'Khung giờ vàng (20:00-22:00) đạt hiệu suất cao nhất khi ghép đôi với talkshow tương tác.'
          },
          {
            'text':
                'Kích hoạt tính năng thông báo phát lại cho các trận đấu thể thao đạt hơn 100K lượt xem.'
          },
        ],
        'trends': {
          'viewerGrowth': 15.5,
          'engagementChange': 8.2,
          'retentionChange': -1.4,
        },
      };

      if (!mounted) return;
      setState(() {
        _analysisResult = result;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể phân tích: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  bool _isStaff(String role) {
    return role == 'STAFF' || role == 'ADMIN';
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }

  void _showInfoDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0B1320),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x3300E5FF), width: 0.8),
        ),
        title: const Text(
          'AI Curator Studio',
          style: TextStyle(
            color: Colors.white,
            fontFamily: 'Outfit',
            fontWeight: FontWeight.w700,
          ),
        ),
        content: const Text(
          'AI Curator là công cụ phân tích dữ liệu người xem, xu hướng chuyên mục và đề xuất tối ưu hóa luồng phát sóng 4K HEVC theo thời gian thực.\n\nTính năng này chỉ dành riêng cho tài khoản Quản trị & Điều hành OmniCast.',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 13,
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng', style: TextStyle(color: Color(0xFF00E5FF))),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF00E5FF)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 10,
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TopItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const _TopItem({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0x1F00E5FF), width: 0.6),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF00E5FF), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TrendItem extends StatelessWidget {
  final String label;
  final double trend;

  const _TrendItem({
    required this.label,
    required this.trend,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = trend >= 0;
    final color = isPositive ? const Color(0xFF00E5FF) : const Color(0xFFFF2A55);
    final icon = isPositive ? Icons.trending_up_rounded : Icons.trending_down_rounded;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 12,
              ),
            ),
          ),
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 4),
              Text(
                '${isPositive ? '+' : ''}${trend.toStringAsFixed(1)}%',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                  fontFamily: 'JetBrainsMono',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
