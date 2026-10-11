// OmniCast - Notifications Screen
// ------------------------------------------------------------
// Full notifications list backing the bell badge. Mirrors the
// web client's popover but as a dedicated screen — mobile users
// tap the bell once and the screen takes over.
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/di/injection.dart';
import '../../../data/models/notification_model.dart';
import '../../../data/repositories/notifications_repository.dart';
import '../../../logic/notifications/notifications_bloc.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Provide a screen-scoped BLoC. We intentionally reuse the
    // app-level `getIt` singleton so the badge count stays in
    // sync with the screen — both share the same cache.
    return BlocProvider.value(
      value: getIt<NotificationsBloc>()..add(const NotificationsStarted()),
      child: const _NotificationsView(),
    );
  }
}

class _NotificationsView extends StatelessWidget {
  const _NotificationsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Thông báo',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          BlocBuilder<NotificationsBloc, NotificationsState>(
            builder: (context, state) {
              if (state is! NotificationsReady || state.unreadCount == 0) {
                return const SizedBox.shrink();
              }
              return TextButton.icon(
                onPressed: () {
                  HapticFeedback.lightImpact();
                  context
                      .read<NotificationsBloc>()
                      .add(const NotificationsMarkedAllRead());
                },
                icon: const Icon(
                  Icons.done_all_rounded,
                  color: Color(0xFF00E5FF),
                  size: 18,
                ),
                label: const Text(
                  'Đã đọc tất cả',
                  style: TextStyle(
                    color: Color(0xFF00E5FF),
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<NotificationsBloc, NotificationsState>(
        builder: (context, state) {
          if (state is NotificationsInitial || state is NotificationsLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
            );
          }
          if (state is NotificationsError) {
            return _ErrorView(
              message: state.message,
              onRetry: () => context
                  .read<NotificationsBloc>()
                  .add(const NotificationsRefreshed()),
            );
          }
          final ready = state as NotificationsReady;
          return Column(
            children: [
              _FilterBar(
                current: ready.filter,
                unreadCount: ready.unreadCount,
                onChanged: (f) => context
                    .read<NotificationsBloc>()
                    .add(NotificationsFilterChanged(f)),
              ),
              Expanded(
                child: RefreshIndicator(
                  color: const Color(0xFF00E5FF),
                  backgroundColor: const Color(0xFF090F1A),
                  onRefresh: () async {
                    context
                        .read<NotificationsBloc>()
                        .add(const NotificationsRefreshed());
                    await Future<void>.delayed(
                        const Duration(milliseconds: 400));
                  },
                  child: ready.items.isEmpty
                      ? _EmptyView(filter: ready.filter)
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          itemCount: ready.items.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 6),
                          itemBuilder: (context, i) {
                            final n = ready.items[i];
                            return _NotificationTile(
                              item: n,
                              onTap: () {
                                if (!n.isRead) {
                                  context
                                      .read<NotificationsBloc>()
                                      .add(NotificationMarkedRead(n.id));
                                }
                                _handleAction(context, n);
                              },
                              onDelete: () {
                                context
                                    .read<NotificationsBloc>()
                                    .add(NotificationDeleted(n.id));
                              },
                            );
                          },
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  /// Resolve `notification.actionUrl` into an in-app route. External
  /// URLs (http/https) are surfaced via SnackBar with a copy action
  /// since we don't ship `url_launcher` as a dep — the user can paste
  /// it into their browser manually.
  Future<void> _handleAction(
    BuildContext context,
    NotificationModel n,
  ) async {
    final url = n.actionUrl;
    if (url == null || url.isEmpty) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF091424),
            duration: const Duration(seconds: 5),
            content: Text(
              'Mở liên kết trong trình duyệt: $url',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
              ),
            ),
            action: SnackBarAction(
              label: 'Sao chép',
              textColor: const Color(0xFF00E5FF),
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: url));
              },
            ),
          ),
        );
      }
      return;
    }
    // Internal route — push via go_router if the path is registered.
    if (context.mounted) {
      try {
        context.push(url);
      } catch (_) {
        // Route not registered yet — silently ignore.
      }
    }
  }
}

// ============================================================
// Filter chips
// ============================================================

class _FilterBar extends StatelessWidget {
  final NotificationFilter current;
  final int unreadCount;
  final ValueChanged<NotificationFilter> onChanged;

  const _FilterBar({
    required this.current,
    required this.unreadCount,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: const BoxDecoration(
        color: Color(0xFF090F1A),
        border: Border(
          bottom: BorderSide(color: Color(0x1F00E5FF), width: 0.6),
        ),
      ),
      child: Row(
        children: [
          _Chip(
            label: 'Tất cả',
            isSelected: current == NotificationFilter.all,
            onTap: () => onChanged(NotificationFilter.all),
          ),
          const SizedBox(width: 8),
          _Chip(
            label: 'Chưa đọc${unreadCount > 0 ? ' ($unreadCount)' : ''}',
            isSelected: current == NotificationFilter.unread,
            onTap: () => onChanged(NotificationFilter.unread),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _Chip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0x2600E5FF)
              : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF00E5FF)
                : const Color(0x1F00E5FF),
            width: isSelected ? 1.2 : 0.8,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF00E5FF) : Colors.white,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ============================================================
// Notification tile
// ============================================================

class _NotificationTile extends StatelessWidget {
  final NotificationModel item;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _NotificationTile({
    required this.item,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final iconData = _iconFor(item.type);
    final iconColor = _colorFor(item.type);
    final hasAvatar = item.actorAvatarUrl != null &&
        item.actorAvatarUrl!.isNotEmpty;

    return Dismissible(
      key: ValueKey('notif-${item.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 18),
        decoration: BoxDecoration(
          color: const Color(0xFF7F1D1D),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_rounded, color: Colors.white),
      ),
      confirmDismiss: (_) async {
        HapticFeedback.mediumImpact();
        return true;
      },
      onDismissed: (_) => onDelete(),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: item.isRead
                  ? const Color(0xFF0B1320)
                  : const Color(0x1A00E5FF),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: item.isRead
                    ? const Color(0x1F162338)
                    : const Color(0x6600E5FF),
                width: 0.8,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Icon / avatar ──
                if (hasAvatar)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: CachedNetworkImage(
                      imageUrl: item.actorAvatarUrl!,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => _IconBadge(
                          icon: iconData, color: iconColor),
                      errorWidget: (_, __, ___) => _IconBadge(
                          icon: iconData, color: iconColor),
                    ),
                  )
                else
                  _IconBadge(icon: iconData, color: iconColor),
                const SizedBox(width: 12),
                // ── Body ──
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: TextStyle(
                          color: item.isRead
                              ? const Color(0xFFCBD5E1)
                              : Colors.white,
                          fontSize: 13,
                          fontWeight: item.isRead
                              ? FontWeight.w600
                              : FontWeight.w800,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (item.message != null && item.message!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          item.message!,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                            height: 1.35,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 6),
                      Text(
                        '${item.timeAgo} trước',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 10,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                // ── Unread dot ──
                if (!item.isRead)
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(top: 6, left: 6),
                    decoration: const BoxDecoration(
                      color: Color(0xFF00E5FF),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x9900E5FF),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _IconBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  const _IconBadge({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.5), width: 0.8),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}

IconData _iconFor(NotificationType t) {
  switch (t) {
    case NotificationType.newFollower:
      return Icons.person_add_rounded;
    case NotificationType.newVideo:
      return Icons.video_library_rounded;
    case NotificationType.liveStart:
      return Icons.podcasts_rounded;
    case NotificationType.liveEnded:
      return Icons.tv_rounded;
    case NotificationType.commentReply:
      return Icons.reply_rounded;
    case NotificationType.commentMention:
      return Icons.alternate_email_rounded;
    case NotificationType.reaction:
      return Icons.favorite_rounded;
    case NotificationType.systemAnnouncement:
      return Icons.campaign_rounded;
    case NotificationType.unknown:
      return Icons.notifications_rounded;
  }
}

Color _colorFor(NotificationType t) {
  switch (t) {
    case NotificationType.newFollower:
      return const Color(0xFF34D399);
    case NotificationType.newVideo:
      return const Color(0xFF38BDF8);
    case NotificationType.liveStart:
      return const Color(0xFFEF4444);
    case NotificationType.liveEnded:
      return const Color(0xFFA78BFA);
    case NotificationType.commentReply:
      return const Color(0xFF60A5FA);
    case NotificationType.commentMention:
      return const Color(0xFFFBBF24);
    case NotificationType.reaction:
      return const Color(0xFFF472B6);
    case NotificationType.systemAnnouncement:
      return const Color(0xFFFB923C);
    case NotificationType.unknown:
      return const Color(0xFF94A3B8);
  }
}

// ============================================================
// Empty + error states
// ============================================================

class _EmptyView extends StatelessWidget {
  final NotificationFilter filter;
  const _EmptyView({required this.filter});

  @override
  Widget build(BuildContext context) {
    return ListView(
      // ListView so the RefreshIndicator still works on an empty list
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 80),
        Icon(
          Icons.notifications_off_rounded,
          size: 72,
          color: const Color(0xFF1E293B),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            filter == NotificationFilter.unread
                ? 'Không có thông báo chưa đọc'
                : 'Chưa có thông báo nào',
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: Color(0xFFEF4444),
              size: 56,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00E5FF),
                foregroundColor: Colors.black,
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
