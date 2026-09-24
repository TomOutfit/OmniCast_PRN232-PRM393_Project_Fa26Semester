// OmniCast - AI Report Card Widget
// Displays AI-generated analysis results

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class AIReportCard extends StatelessWidget {
  final String title;
  final String description;
  final int confidence;
  final String category;
  final String? timestamp;
  final List<AIInsight>? insights;
  final VoidCallback? onTap;
  final VoidCallback? onApply;
  final VoidCallback? onDismiss;

  const AIReportCard({
    super.key,
    required this.title,
    required this.description,
    required this.confidence,
    required this.category,
    this.timestamp,
    this.insights,
    this.onTap,
    this.onApply,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _getConfidenceColor(confidence).withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Category Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome,
                            color: AppColors.primary,
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            category,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Confidence Indicator
                    _ConfidenceBadge(confidence: confidence),
                  ],
                ),
                const SizedBox(height: 12),

                // Title
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),

                // Description
                Text(
                  description,
                  style: const TextStyle(
                    color: AppColors.dark300,
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),

                // Timestamp
                if (timestamp != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time,
                        color: AppColors.dark500,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        timestamp!,
                        style: const TextStyle(
                          color: AppColors.dark500,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Insights (if any)
          if (insights != null && insights!.isNotEmpty) ...[
            const Divider(color: AppColors.dark700, height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Chi tiết phân tích',
                    style: TextStyle(
                      color: AppColors.dark400,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...insights!.map((insight) => _InsightRow(insight: insight)),
                ],
              ),
            ),
          ],

          // Action Buttons
          if (onApply != null || onDismiss != null) ...[
            const Divider(color: AppColors.dark700, height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  if (onDismiss != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onDismiss,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.dark400,
                          side: const BorderSide(color: AppColors.dark600),
                        ),
                        child: const Text('Bỏ qua'),
                      ),
                    ),
                  if (onDismiss != null && onApply != null)
                    const SizedBox(width: 12),
                  if (onApply != null)
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: onApply,
                        icon: const Icon(Icons.check, size: 18),
                        label: const Text('Áp dụng'),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getConfidenceColor(int confidence) {
    if (confidence >= 80) return AppColors.success;
    if (confidence >= 60) return AppColors.warning;
    return AppColors.error;
  }
}

class AIReportCardCompact extends StatelessWidget {
  final String title;
  final int confidence;
  final String category;
  final IconData? icon;
  final VoidCallback? onTap;

  const AIReportCardCompact({
    super.key,
    required this.title,
    required this.confidence,
    required this.category,
    this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.dark700),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon ?? Icons.psychology,
                color: AppColors.primary,
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
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    category,
                    style: const TextStyle(
                      color: AppColors.dark500,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            _ConfidenceBadge(
              confidence: confidence,
              compact: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _ConfidenceBadge extends StatelessWidget {
  final int confidence;
  final bool compact;

  const _ConfidenceBadge({
    required this.confidence,
    this.compact = false,
  });

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

    if (compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          '$confidence%',
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.psychology, color: color, size: 14),
          const SizedBox(width: 6),
          Text(
            '$confidence%',
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class AIInsight {
  final String label;
  final String value;
  final IconData? icon;
  final Color? color;

  const AIInsight({
    required this.label,
    required this.value,
    this.icon,
    this.color,
  });
}

class _InsightRow extends StatelessWidget {
  final AIInsight insight;

  const _InsightRow({required this.insight});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          if (insight.icon != null) ...[
            Icon(
              insight.icon,
              color: insight.color ?? AppColors.dark400,
              size: 16,
            ),
            const SizedBox(width: 8),
          ],
          Text(
            insight.label,
            style: const TextStyle(
              color: AppColors.dark400,
              fontSize: 13,
            ),
          ),
          const Spacer(),
          Text(
            insight.value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// AI Analytics Summary Card
class AIAnalyticsCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final double? trend;
  final String? trendLabel;

  const AIAnalyticsCard({
    super.key,
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    required this.color,
    this.trend,
    this.trendLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withOpacity(0.2),
            color.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const Spacer(),
              if (trend != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: trend! >= 0
                        ? AppColors.success.withOpacity(0.2)
                        : AppColors.error.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        trend! >= 0
                            ? Icons.trending_up
                            : Icons.trending_down,
                        color: trend! >= 0
                            ? AppColors.success
                            : AppColors.error,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${trend! >= 0 ? '+' : ''}${trend!.toStringAsFixed(1)}%',
                        style: TextStyle(
                          color: trend! >= 0
                              ? AppColors.success
                              : AppColors.error,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              color: AppColors.dark300,
              fontSize: 14,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: const TextStyle(
                color: AppColors.dark500,
                fontSize: 12,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// AI Status Indicator
class AIStatusIndicator extends StatelessWidget {
  final bool isActive;
  final String? message;

  const AIStatusIndicator({
    super.key,
    required this.isActive,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.success.withOpacity(0.2)
            : AppColors.error.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isActive ? AppColors.success : AppColors.error,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _PulsingDot(
            color: isActive ? AppColors.success : AppColors.error,
          ),
          const SizedBox(width: 8),
          Text(
            isActive ? 'AI Active' : 'AI Offline',
            style: TextStyle(
              color: isActive ? AppColors.success : AppColors.error,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (message != null) ...[
            const SizedBox(width: 8),
            Text(
              message!,
              style: TextStyle(
                color: isActive ? AppColors.success : AppColors.error,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PulsingDot extends StatefulWidget {
  final Color color;

  const _PulsingDot({required this.color});

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: widget.color.withOpacity(_animation.value),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.color.withOpacity(0.5),
                blurRadius: 4,
                spreadRadius: 1,
              ),
            ],
          ),
        );
      },
    );
  }
}
