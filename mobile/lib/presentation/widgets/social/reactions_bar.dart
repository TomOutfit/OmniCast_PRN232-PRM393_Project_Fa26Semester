// OmniCast - Reactions Bar (Mobile)
//
// Interactive reactions bar that toggles reactions directly via OmniCast API
// and Supabase database.

import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';

class ReactionsBar extends StatefulWidget {
  final String targetId;
  final String kind;

  const ReactionsBar({
    super.key,
    required this.targetId,
    required this.kind,
  });

  @override
  State<ReactionsBar> createState() => _ReactionsBarState();
}

class _ReactionsBarState extends State<ReactionsBar> {
  String? _selectedType;
  bool _isLoading = false;

  final List<Map<String, String>> _reactions = const [
    {'emoji': '❤️', 'label': 'Yêu thích', 'type': 'HEART'},
    {'emoji': '🔥', 'label': 'Tuyệt vời', 'type': 'FIRE'},
    {'emoji': '👏', 'label': 'Hay quá', 'type': 'CLAP'},
    {'emoji': '😮', 'label': 'Bất ngờ', 'type': 'WOW'},
  ];

  Future<void> _handleReaction(String type, String label) async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      final dio = getIt<DioClient>();
      final isRecording = widget.kind == 'recording';
      final endpoint = isRecording
          ? '${AppEndpoints.recordings}/${widget.targetId}/reactions'
          : '${AppEndpoints.liveEvents}/${widget.targetId}/reactions';

      final res = await dio.post(endpoint, data: {'type': type});
      final data = res.data;
      final toggled = data is Map && data['toggled'] == true;

      if (mounted) {
        setState(() {
          _selectedType = toggled ? type : null;
          _isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(toggled ? 'Đã gửi cảm xúc $label' : 'Đã bỏ cảm xúc $label'),
            duration: const Duration(milliseconds: 1000),
            backgroundColor: AppColors.surfaceRaised,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Cảm xúc $label (offline/best-effort)'),
            duration: const Duration(milliseconds: 800),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: _reactions.map((r) {
          final isSelected = _selectedType == r['type'];
          return _ReactionPill(
            emoji: r['emoji']!,
            label: r['label']!,
            isSelected: isSelected,
            onTap: () => _handleReaction(r['type']!, r['label']!),
          );
        }).toList(),
      ),
    );
  }
}

class _ReactionPill extends StatelessWidget {
  final String emoji;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ReactionPill({
    required this.emoji,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: isSelected ? Border.all(color: AppColors.primary, width: 1) : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: TextStyle(fontSize: isSelected ? 26 : 22)),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppColors.primary : AppColors.textDim,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
