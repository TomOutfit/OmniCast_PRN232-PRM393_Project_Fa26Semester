// OmniCast - Save to Watchlist Button (Mobile)
//
// Toggle button that adds/removes a program from the user's watchlist
// via the WatchlistBloc. Visual state (saved vs. not) is computed from
// the bloc's `isInWatchlist(programId)` helper, so the button always
// reflects the latest cache + cloud state.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_theme.dart';
import '../../../data/models/program_model.dart';
import '../../../data/models/watchlist_item_model.dart';
import '../../../logic/watchlist/watchlist_bloc.dart';

class SaveToWatchlistButton extends StatefulWidget {
  /// When supplied, the widget builds a fully-populated
  /// [WatchlistItemModel] from the live event and schedules a reminder
  /// 15 minutes before the program airs. When omitted, the button
  /// only knows about the IDs (less rich — used by list tiles).
  final String programId;
  final String? channelId;
  final LiveEventModel? program;
  final bool scheduleReminder;

  const SaveToWatchlistButton({
    super.key,
    required this.programId,
    this.channelId,
    this.program,
    this.scheduleReminder = false,
  });

  @override
  State<SaveToWatchlistButton> createState() => _SaveToWatchlistButtonState();
}

class _SaveToWatchlistButtonState extends State<SaveToWatchlistButton> {
  bool _busy = false;

  Future<void> _toggle() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final bloc = context.read<WatchlistBloc>();
      final isSaved = bloc.state.isInWatchlist(widget.programId);
      if (isSaved) {
        bloc.add(RemoveFromWatchlist(widget.programId));
      } else {
        // Build the item. If the caller supplied the full program we can
        // capture title / thumbnail / schedule right away; otherwise fall
        // back to placeholders that the next cloud sync will overwrite.
        final program = widget.program;
        final item = program != null
            ? WatchlistItemModel(
                programId: program.id,
                programTitle: program.title,
                thumbnailUrl: program.thumbnailUrl,
                channelId: program.channelId,
                channelName: program.channel?.name,
                scheduledAt: program.scheduledAt,
                duration: program.duration,
                reminderEnabled: widget.scheduleReminder,
                reminderTime: widget.scheduleReminder
                    ? program.scheduledAt
                        .subtract(const Duration(minutes: 15))
                    : null,
                addedAt: DateTime.now(),
              )
            : WatchlistItemModel(
                programId: widget.programId,
                programTitle: '',
                channelId: widget.channelId,
                scheduledAt: DateTime.now(),
                reminderEnabled: false,
                addedAt: DateTime.now(),
              );
        bloc.add(
          AddToWatchlist(
            item: item,
            programId: widget.programId,
            channelId: widget.channelId,
            scheduleReminder: widget.scheduleReminder,
          ),
        );
      }
      await Future<void>.delayed(const Duration(milliseconds: 150));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<WatchlistBloc, WatchlistState>(
      builder: (context, state) {
        final isSaved = state.isInWatchlist(widget.programId);
        return Material(
          color: isSaved
              ? AppColors.primary.withValues(alpha: 0.18)
              : AppColors.dark800,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            onTap: _busy ? null : _toggle,
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isSaved ? Icons.bookmark : Icons.bookmark_outline,
                    color: isSaved ? AppColors.primary : AppColors.dark300,
                    size: 18,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isSaved ? 'Đã lưu' : 'Lưu',
                    style: TextStyle(
                      color: isSaved ? AppColors.primary : AppColors.dark300,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}