// OmniCast - Notification Bell Widget
// ------------------------------------------------------------
// Compact icon-with-badge that drops into AppBar actions on
// Home / EPG / Search / Channels / Watchlist. Wires to the
// shared `NotificationsBloc` so the badge count stays in sync
// with the full notifications screen.
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/injection.dart';
import '../../logic/notifications/notifications_bloc.dart';

class NotificationBellAction extends StatelessWidget {
  /// Optional fixed width/height for the icon — defaults to 40×40
  /// to match the standard AppBar action size.
  final double size;

  const NotificationBellAction({super.key, this.size = 40});

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      // The bloc is registered as a lazy singleton in DI — sharing
      // it across the AppBar badge and the full screen keeps both
      // surfaces reading from the same cache.
      value: getIt<NotificationsBloc>()..add(const NotificationsStarted()),
      child: BlocBuilder<NotificationsBloc, NotificationsState>(
        builder: (context, state) {
          final unread = state is NotificationsReady ? state.unreadCount : 0;
          final hasUnread = unread > 0;
          final label = unread > 99 ? '99+' : '$unread';

          return Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: () {
                  // Make sure the screen reads the freshest list
                  getIt<NotificationsBloc>()
                      .add(const NotificationsRefreshed());
                  context.push('/notifications');
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: size,
                  height: size,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: hasUnread
                        ? const Color(0x1A00E5FF)
                        : const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: hasUnread
                          ? const Color(0xFF00E5FF)
                          : const Color(0x1F162338),
                      width: hasUnread ? 1.0 : 0.6,
                    ),
                  ),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Icon(
                        hasUnread
                            ? Icons.notifications_active_rounded
                            : Icons.notifications_none_rounded,
                        size: 20,
                        color: hasUnread
                            ? const Color(0xFF00E5FF)
                            : const Color(0xFF94A3B8),
                      ),
                      if (hasUnread)
                        Positioned(
                          top: -6,
                          right: -8,
                          child: Container(
                            constraints: const BoxConstraints(
                              minWidth: 16,
                              minHeight: 16,
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 4,
                            ),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(0xFF090F1A),
                                width: 1.5,
                              ),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x6600E5FF),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: Text(
                              label,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                height: 1.0,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
