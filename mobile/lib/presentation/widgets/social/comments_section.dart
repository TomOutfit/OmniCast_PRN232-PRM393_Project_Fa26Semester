// OmniCast - Comments Section (Mobile)
//
// Placeholder implementation. The full comments feature (posting,
// replying, likes, moderation) will be wired up alongside the social
// engagement feature. This stub exists so the program-detail page can
// compile and render the surrounding layout.

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class CommentsSection extends StatelessWidget {
  final String targetId;
  final String kind;

  const CommentsSection({
    super.key,
    required this.targetId,
    required this.kind,
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
        children: const [
          Text(
            'Bình luận',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Tính năng bình luận sẽ được bổ sung ở phiên bản tiếp theo.',
            style: TextStyle(color: AppColors.dark400, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
