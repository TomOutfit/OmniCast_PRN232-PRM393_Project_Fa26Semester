// OmniCast - Staff AI Curator Screen
// AI-powered content curation studio for staff members

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../logic/auth/auth_bloc.dart';

class StaffCuratorScreen extends StatefulWidget {
  const StaffCuratorScreen({super.key});

  @override
  State<StaffCuratorScreen> createState() => _StaffCuratorScreenState();
}

class _StaffCuratorScreenState extends State<StaffCuratorScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedCategory = 'all';

  final _categories = [
    {'value': 'all', 'label': 'Tất cả', 'icon': Icons.grid_view},
    {'value': 'trending', 'label': 'Xu hướng', 'icon': Icons.trending_up},
    {'value': 'sports', 'label': 'Thể thao', 'icon': Icons.sports},
    {'value': 'entertainment', 'label': 'Giải trí', 'icon': Icons.movie},
    {'value': 'news', 'label': 'Tin tức', 'icon': Icons.newspaper},
    {'value': 'music', 'label': 'Âm nhạc', 'icon': Icons.music_note},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Check if user is staff
    final authState = context.read<AuthBloc>().state;
    final isStaff = authState is Authenticated &&
        (authState.user.isStaff || authState.user.isAdmin);

    if (!isStaff) {
      return _buildAccessDenied();
    }

    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('AI Curator'),
        backgroundColor: AppColors.dark950,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshAIReports,
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _showSettings(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'AI Insights'),
            Tab(text: 'Schedules'),
            Tab(text: 'Analytics'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Category Filter
          _buildCategoryFilter(),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildInsightsTab(),
                _buildSchedulesTab(),
                _buildAnalyticsTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAIRecommendations(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.auto_awesome),
        label: const Text('AI Gợi ý'),
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.dark800,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_outline,
                size: 64,
                color: AppColors.dark500,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Truy cập bị giới hạn',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tính năng này chỉ dành cho Biên tập viên và Quản trị viên',
              style: TextStyle(
                color: AppColors.dark400,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Quay lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryFilter() {
    return Container(
      height: 50,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final category = _categories[index];
          final isSelected = _selectedCategory == category['value'];

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedCategory = category['value'] as String;
              });
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.dark800,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    category['icon'] as IconData,
                    size: 16,
                    color: isSelected ? Colors.white : AppColors.dark400,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    category['label'] as String,
                    style: TextStyle(
                      color: isSelected ? Colors.white : AppColors.dark300,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInsightsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // AI Status Card
        _buildAIStatusCard(),
        const SizedBox(height: 16),

        // Recent Reports
        const Text(
          'Báo cáo gần đây',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        _AIRecommendationCard(
          title: 'Tăng trưởng thể thao',
          description: 'Phát hiện xu hướng tăng 45% lượng xem thể thao vào buổi sáng. Gợi ý thêm 2 slot phát sóng thể thao.',
          confidence: 92,
          category: 'SPORTS',
          action: 'Áp dụng',
          onAction: () {},
        ),
        _AIRecommendationCard(
          title: 'Tối ưu lịch phát',
          description: 'Dữ liệu cho thấy khán giả phản hồi tốt với phim truyện vào thứ 6-7. Gợi ý thêm 1 slot phim vào cuối tuần.',
          confidence: 87,
          category: 'DRAMA',
          action: 'Xem chi tiết',
          onAction: () {},
        ),
        _AIRecommendationCard(
          title: 'Cảnh báo trending',
          description: 'Một sự kiện âm nhạc đang trending mạnh. Gợi ý mời khách từ 2-3 ngày tới.',
          confidence: 78,
          category: 'MUSIC',
          action: 'Chi tiết',
          onAction: () {},
        ),
      ],
    );
  }

  Widget _buildSchedulesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // AI-Generated Schedule Preview
        _buildSchedulePreviewCard(),
        const SizedBox(height: 16),

        // Schedule Conflicts
        const Text(
          'Xung đột lịch phát',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        _ScheduleConflictCard(
          title: 'Trùng lặp thể thao',
          programs: ['Bóng đá Châu Âu', 'Tennis Grand Slam'],
          time: '20:00 - 22:00',
          suggestion: 'Di chuyển Tennis sang kênh phụ',
        ),
      ],
    );
  }

  Widget _buildAnalyticsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Performance Overview
        Row(
          children: [
            Expanded(
              child: _PerformanceCard(
                title: 'Độ chính xác',
                value: '94%',
                trend: '+2%',
                icon: Icons.verified,
                color: AppColors.success,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _PerformanceCard(
                title: 'Đề xuất áp dụng',
                value: '87%',
                trend: '+5%',
                icon: Icons.check_circle,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _PerformanceCard(
                title: 'Tăng trưởng views',
                value: '+23%',
                trend: '+8%',
                icon: Icons.trending_up,
                color: AppColors.accentGold,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _PerformanceCard(
                title: 'Tương tác',
                value: '+18%',
                trend: '+3%',
                icon: Icons.favorite,
                color: AppColors.error,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAIStatusCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
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
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.auto_awesome,
              color: AppColors.primary,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'AI Curator đang hoạt động',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đã phân tích 1,234 chương trình hôm nay',
                  style: TextStyle(
                    color: AppColors.dark300,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.success.withOpacity(0.5),
                  blurRadius: 6,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSchedulePreviewCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_today, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Lịch phát tuần này',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {},
                child: const Text('Chỉnh sửa'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const _ScheduleTimeline(),
        ],
      ),
    );
  }

  void _refreshAIReports() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đang làm mới báo cáo AI...'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _showSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.dark800,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _SettingsSheet(),
    );
  }

  void _showAIRecommendations() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.dark900,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _AIRecommendationsSheet(),
    );
  }
}

class _AIRecommendationCard extends StatelessWidget {
  final String title;
  final String description;
  final int confidence;
  final String category;
  final String action;
  final VoidCallback onAction;

  const _AIRecommendationCard({
    required this.title,
    required this.description,
    required this.confidence,
    required this.category,
    required this.action,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.dark700),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  category,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Spacer(),
              _ConfidenceIndicator(confidence: confidence),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: const TextStyle(
              color: AppColors.dark300,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onAction,
              child: Text(action),
            ),
          ),
        ],
      ),
    );
  }
}

class _ConfidenceIndicator extends StatelessWidget {
  final int confidence;

  const _ConfidenceIndicator({required this.confidence});

  @override
  Widget build(BuildContext context) {
    Color color;
    if (confidence >= 80) {
      color = AppColors.success;
    } else if (confidence >= 60) {
      color = AppColors.warning;
    } else {
      color = AppColors.error;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.psychology, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            '$confidence%',
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleConflictCard extends StatelessWidget {
  final String title;
  final List<String> programs;
  final String time;
  final String suggestion;

  const _ScheduleConflictCard({
    required this.title,
    required this.programs,
    required this.time,
    required this.suggestion,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.warning.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.warning_amber,
              color: AppColors.warning,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  programs.join(' vs '),
                  style: const TextStyle(
                    color: AppColors.dark300,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  suggestion,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

class _PerformanceCard extends StatelessWidget {
  final String title;
  final String value;
  final String trend;
  final IconData icon;
  final Color color;

  const _PerformanceCard({
    required this.title,
    required this.value,
    required this.trend,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  trend,
                  style: const TextStyle(
                    color: AppColors.success,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            title,
            style: const TextStyle(
              color: AppColors.dark400,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleTimeline extends StatelessWidget {
  const _ScheduleTimeline();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _TimelineItem(time: '06:00', title: 'Tin tức buổi sáng', category: 'NEWS'),
        _TimelineItem(time: '08:00', title: 'Thể thao sáng', category: 'SPORTS'),
        _TimelineItem(time: '12:00', title: 'Giải trí trưa', category: 'ENTERTAINMENT'),
        _TimelineItem(time: '18:00', title: 'Tin tức tối', category: 'NEWS'),
        _TimelineItem(time: '20:00', title: 'Phim truyện', category: 'DRAMA', isHighlight: true),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String time;
  final String title;
  final String category;
  final bool isHighlight;

  const _TimelineItem({
    required this.time,
    required this.title,
    required this.category,
    this.isHighlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isHighlight ? AppColors.primary.withOpacity(0.2) : AppColors.dark700,
        borderRadius: BorderRadius.circular(8),
        border: isHighlight ? Border.all(color: AppColors.primary) : null,
      ),
      child: Row(
        children: [
          Text(
            time,
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(color: Colors.white),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.dark600,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              category,
              style: const TextStyle(
                color: AppColors.dark300,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cài đặt AI Curator',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 24),
          ListTile(
            leading: const Icon(Icons.schedule, color: AppColors.primary),
            title: const Text('Thời gian nhắc trước'),
            subtitle: const Text('15 phút'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.notifications, color: AppColors.primary),
            title: const Text('Thông báo'),
            trailing: Switch(
              value: true,
              onChanged: (value) {},
              activeColor: AppColors.primary,
            ),
          ),
          ListTile(
            leading: const Icon(Icons.auto_fix_high, color: AppColors.primary),
            title: const Text('Độ nhạy AI'),
            subtitle: const Text('Cao'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _AIRecommendationsSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.auto_awesome, color: AppColors.primary),
                  const SizedBox(width: 8),
                  const Text(
                    'AI Gợi ý cho bạn',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    _AIRecommendationCard(
                      title: 'Thêm slot thể thao',
                      description: 'Phân tích cho thấy nhu cầu xem thể thao tăng cao vào buổi sáng. Gợi ý thêm 1 giờ thể thao từ 6-7h.',
                      confidence: 95,
                      category: 'SPORTS',
                      action: 'Áp dụng',
                      onAction: () {},
                    ),
                    _AIRecommendationCard(
                      title: 'Tối ưu phim truyện',
                      description: 'Phim truyện vào cuối tuần có lượt xem cao hơn 40%. Gợi ý thêm 2 slot phim vào T7-CN.',
                      confidence: 88,
                      category: 'DRAMA',
                      action: 'Xem chi tiết',
                      onAction: () {},
                    ),
                    _AIRecommendationCard(
                      title: 'Nhạc trending',
                      description: 'Top 10 nhạc trending đang hot. Gợi ý thêm chương trình âm nhạc vào tối thứ 6.',
                      confidence: 82,
                      category: 'MUSIC',
                      action: 'Chi tiết',
                      onAction: () {},
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
