// OmniCast - Reactions Bar (Mobile)
//
// Lightweight stub widget that lets the user send a HEART reaction to
// the targeted entity (live event or recording). The full multi-reaction
// UI and aggregate counters are slated for the engagement feature
// (FR-08 follow-up); this minimal implementation keeps the program
// detail page compiling while remaining API-compatible with what the
// final widget will expose.

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class ReactionsBar extends StatelessWidget {
  final String targetId;
  final String kind;

  const ReactionsBar({
    super.key,
    required this.targetId,
    required this.kind,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: const [
          _ReactionPill(emoji: '❤️', label: 'Yêu thích'),
          _ReactionPill(emoji: '🔥', label: 'Tuyệt vời'),
          _ReactionPill(emoji: '👏', label: 'Hay quá'),
          _ReactionPill(emoji: '😮', label: 'Bất ngờ'),
        ],
      ),
    );
  }
}

class _ReactionPill extends StatelessWidget {
  final String emoji;
  final String label;

  const _ReactionPill({required this.emoji, required this.label});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã gửi cảm xúc $label'),
            duration: const Duration(milliseconds: 800),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 22)),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(color: AppColors.dark400, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}
