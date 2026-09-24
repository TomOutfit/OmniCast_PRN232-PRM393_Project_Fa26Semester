// OmniCast - AI Curator Screen (Staff Only)

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../logic/auth/auth_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/constants/app_constants.dart';

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
  String? _selectedChannel;
  String? _selectedTimeRange;
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
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('AI Curator'),
        backgroundColor: AppColors.dark950,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showInfoDialog(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            _buildHeader(),
            const SizedBox(height: 24),

            // Filters
            _buildFilters(),
            const SizedBox(height: 24),

            // Analyze Button
            _buildAnalyzeButton(),
            const SizedBox(height: 24),

            // Results
            if (_error != null) _buildError(),
            if (_analysisResult != null) _buildResults(),
          ],
        ),
      ),
    );
  }

  Widget _buildAccessDenied() {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('AI Curator'),
        backgroundColor: AppColors.dark950,
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
                  color: AppColors.error.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_outline,
                  size: 64,
                  color: AppColors.error,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Truy cập bị từ chối',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Tính năng AI Curator chỉ dành cho nhân viên được ủy quyền.',
                style: TextStyle(
                  color: AppColors.dark400,
                  fontSize: 14,
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.2),
            AppColors.accentCyan.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.primary.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.auto_awesome,
              color: AppColors.primary,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Phân tích thông minh',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'AI phân tích dữ liệu xem và đề xuất nội dung tối ưu',
                  style: TextStyle(
                    color: AppColors.dark400,
                    fontSize: 13,
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
          'Bộ lọc',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        // Time Range
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.dark800,
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButton<String>(
            value: _selectedTimeRange,
            hint: const Text('Chọn khoảng thời gian'),
            isExpanded: true,
            underline: const SizedBox(),
            dropdownColor: AppColors.dark800,
            items: _timeRanges.map((range) {
              return DropdownMenuItem(
                value: range,
                child: Text(range, style: const TextStyle(color: Colors.white)),
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
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isLoading ? null : _runAnalysis,
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          backgroundColor: AppColors.primary,
        ),
        icon: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.psychology),
        label: Text(
          _isLoading ? 'Đang phân tích...' : 'Phân tích với AI',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _error!,
              style: const TextStyle(color: AppColors.error),
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
          'Kết quả phân tích',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

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
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tổng quan',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.visibility,
                  label: 'Lượt xem',
                  value: _formatNumber(totalViews),
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.timer,
                  label: 'Thời gian xem TB',
                  value: '${avgWatchTime} phút',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatItem(
                  icon: Icons.schedule,
                  label: 'Giờ cao điểm',
                  value: peakHour,
                ),
              ),
              Expanded(
                child: _StatItem(
                  icon: Icons.category,
                  label: 'Danh mục hot',
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Top hiệu suất',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        if (topChannels.isNotEmpty) ...[
          const Text(
            'Top Kênh',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.dark400,
            ),
          ),
          const SizedBox(height: 8),
          ...topChannels.take(3).map((channel) => _TopItem(
                title: channel['name'] ?? '',
                subtitle: '${_formatNumber(channel['views'] ?? 0)} lượt xem',
                icon: Icons.tv,
              )),
        ],
        if (topPrograms.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Text(
            'Top Chương trình',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.dark400,
            ),
          ),
          const SizedBox(height: 8),
          ...topPrograms.take(3).map((program) => _TopItem(
                title: program['title'] ?? '',
                subtitle: '${_formatNumber(program['views'] ?? 0)} lượt xem',
                icon: Icons.play_circle,
              )),
        ],
      ],
    );
  }

  Widget _buildRecommendations() {
    final recommendations = _analysisResult?['recommendations'] as List? ?? [];

    if (recommendations.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Đề xuất từ AI',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        ...recommendations.map<Widget>((rec) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AppColors.primary.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.lightbulb_outline,
                    color: AppColors.accentGold,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      rec['text'] ?? '',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Phân tích xu hướng',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.dark800,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              _TrendItem(
                label: 'Tăng trưởng người xem',
                trend: trends['viewerGrowth'] ?? 0,
              ),
              const Divider(color: AppColors.dark700),
              _TrendItem(
                label: 'Tương tác',
                trend: trends['engagementChange'] ?? 0,
              ),
              const Divider(color: AppColors.dark700),
              _TrendItem(
                label: 'Giữ chân người xem',
                trend: trends['retentionChange'] ?? 0,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _runAnalysis() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _analysisResult = null;
    });

    try {
      // Simulate API call - in production, call actual AI Curator API
      await Future.delayed(const Duration(seconds: 2));

      // Mock response
      final result = {
        'totalViews': 1250000,
        'avgWatchTime': 28,
        'peakHour': '20:00 - 22:00',
        'topCategory': 'Thể thao',
        'topChannels': [
          {'name': 'VTV3', 'views': 250000},
          {'name': 'VTV6', 'views': 180000},
          {'name': 'HTV7', 'views': 150000},
        ],
        'topPrograms': [
          {'title': 'Bóng đá Việt Nam', 'views': 320000},
          {'title': 'The Voice', 'views': 180000},
          {'title': 'Phim truyện Tết', 'views': 150000},
        ],
        'recommendations': [
          {
            'text':
                'Nên tăng lịch phát sóng thể thao vào cuối tuần để đạt lượng xem cao hơn.'
          },
          {
            'text':
                'Chương trình giải trí vào khung giờ vàng (20:00-22:00) có tỷ lệ xem cao nhất.'
          },
          {
            'text':
                'Xem xét hợp tác với các KOL để tăng tương tác trên mạng xã hội.'
          },
        ],
        'trends': {
          'viewerGrowth': 15.5,
          'engagementChange': 8.2,
          'retentionChange': -2.1,
        },
      };

      setState(() {
        _analysisResult = result;
        _isLoading = false;
      });
    } catch (e) {
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
        backgroundColor: AppColors.dark800,
        title: const Text('AI Curator là gì?'),
        content: const Text(
          'AI Curator phân tích dữ liệu người xem, xu hướng nội dung và đề '
          'xuất các chiến lược tối ưu hóa lịch phát sóng và nội dung.\n\n'
          'Tính năng này chỉ dành cho nhân viên được ủy quyền.',
          style: TextStyle(color: AppColors.dark300),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng'),
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
        Icon(icon, size: 20, color: AppColors.dark400),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: AppColors.dark500,
                fontSize: 11,
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
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
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.dark400,
                    fontSize: 12,
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
    final color = isPositive ? AppColors.success : AppColors.error;
    final icon = isPositive ? Icons.trending_up : Icons.trending_down;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: AppColors.dark300),
            ),
          ),
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 4),
              Text(
                '${isPositive ? '+' : ''}${trend.toStringAsFixed(1)}%',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
