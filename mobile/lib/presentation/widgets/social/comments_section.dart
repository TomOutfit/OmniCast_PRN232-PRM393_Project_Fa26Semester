// OmniCast - Comments Section (Mobile)
//
// Live interactive comments widget that fetches and posts comments
// directly to the OmniCast API. When `SUPABASE_URL` is configured,
// it additionally subscribes to realtime INSERT/UPDATE/DELETE events
// so two clients see each other's messages without polling.

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/services/supabase_realtime_service.dart';
import '../../../data/services/live_socket_service.dart';

class CommentsSection extends StatefulWidget {
  final String targetId;
  final String kind;

  const CommentsSection({
    super.key,
    required this.targetId,
    required this.kind,
  });

  @override
  State<CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends State<CommentsSection> {
  final TextEditingController _controller = TextEditingController();
  final List<_CommentItem> _comments = [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  StreamSubscription<RealtimeCommentEvent>? _realtimeSub;
  StreamSubscription<Map<String, dynamic>>? _liveSocketSub;
  StreamSubscription<Map<String, dynamic>>? _liveDeleteSub;

  Timer? _livePollTimer;

  @override
  void initState() {
    super.initState();
    _fetchComments();
    _subscribeRealtimeIfAvailable();
    if (widget.kind == 'live') {
      LiveSocketService.instance.connect();
      LiveSocketService.instance.subscribeEvent(widget.targetId);

      _liveSocketSub = LiveSocketService.instance.onChatNew.listen((data) {
        if (!mounted) return;
        if (data['eventId'] == widget.targetId) {
          final comment = data['comment'];
          if (comment is Map<String, dynamic>) {
            final incoming = _CommentItem.fromJson(comment);
            setState(() {
              if (!_comments.any((c) => c.id == incoming.id)) {
                _comments.insert(0, incoming);
              }
            });
          }
        }
      });
      _liveDeleteSub = LiveSocketService.instance.onChatDeleted.listen((data) {
        if (!mounted) return;
        if (data['eventId'] == widget.targetId) {
          final commentId = data['commentId']?.toString();
          if (commentId != null) {
            setState(() {
              _comments.removeWhere((c) => c.id == commentId);
            });
          }
        }
      });
      _livePollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
        if (mounted) _fetchComments(silent: true);
      });
    }
  }

  @override
  void dispose() {
    if (widget.kind == 'live') {
      LiveSocketService.instance.unsubscribeEvent(widget.targetId);
    }
    _livePollTimer?.cancel();
    _realtimeSub?.cancel();
    _liveSocketSub?.cancel();
    _liveDeleteSub?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// If Supabase is configured, subscribe to the recording's comment
  /// channel. Falls back silently to REST-only polling.
  void _subscribeRealtimeIfAvailable() {
    if (widget.kind != 'recording') return; // only wired for VOD
    final svc = SupabaseRealtimeService.instance;
    if (!svc.isAvailable) return;
    _realtimeSub = svc.startCommentsChannel(widget.targetId).listen((event) {
      if (!mounted) return;
      setState(() {
        switch (event.type) {
          case 'INSERT':
          case 'UPDATE':
            final c = event.comment;
            if (c == null) return;
            final incoming = _CommentItem(
              id: c.id,
              content: c.content,
              userName: c.authorDisplayName ?? 'Người dùng',
              createdAt: c.createdAt,
            );
            final existingIdx = _comments.indexWhere((c) => c.id == incoming.id);
            if (existingIdx >= 0) {
              _comments[existingIdx] = incoming;
            } else {
              _comments.insert(0, incoming);
            }
            break;
          case 'DELETE':
            if (event.deletedId == null) break;
            _comments.removeWhere((c) => c.id == event.deletedId);
            break;
        }
      });
    });
  }

  String get _endpoint {
    return widget.kind == 'recording'
        ? '${AppEndpoints.recordings}/${widget.targetId}/comments'
        : '${AppEndpoints.liveEvents}/${widget.targetId}/comments';
  }

  Future<void> _fetchComments({bool silent = false}) async {
    try {
      final dio = getIt<DioClient>();
      final res = await dio.get(_endpoint, queryParameters: {'limit': 30});
      final data = res.data;
      final rawList = (data is Map && data['data'] is List)
          ? data['data'] as List
          : (data is List ? data : <dynamic>[]);

      if (mounted) {
        setState(() {
          if (!silent) {
            _comments.clear();
            for (final item in rawList) {
              if (item is Map<String, dynamic>) {
                _comments.add(_CommentItem.fromJson(item));
              }
            }
            _isLoading = false;
          } else {
            for (final item in rawList) {
              if (item is Map<String, dynamic>) {
                final parsed = _CommentItem.fromJson(item);
                if (!_comments.any((c) => c.id == parsed.id)) {
                  _comments.add(parsed);
                }
              }
            }
            _comments.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          }
        });
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        _livePollTimer?.cancel();
        _livePollTimer = null;
      }
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    } catch (_) {
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submitComment() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSubmitting) return;

    // 0ms Optimistic UI: Immediately render comment in UI and clear input
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final optimisticComment = _CommentItem(
      id: tempId,
      content: text,
      userName: 'Bạn',
      createdAt: DateTime.now(),
    );

    setState(() {
      _comments.insert(0, optimisticComment);
      _isSubmitting = false;
    });
    _controller.clear();
    FocusScope.of(context).unfocus();

    if (widget.kind == 'live') {
      if (LiveSocketService.instance.isConnected) {
        LiveSocketService.instance.sendChat(
          eventId: widget.targetId,
          content: text,
        );
      }

      // Background HTTP sync (best-effort, non-blocking)
      final dio = getIt<DioClient>();
      unawaited(
        dio.post(
          _endpoint,
          data: {'content': text},
          options: Options(
            sendTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 5),
          ),
        ).then((res) {
          final data = res.data;
          if (mounted && data is Map<String, dynamic>) {
            final parsed = _CommentItem.fromJson(data);
            setState(() {
              final idx = _comments.indexWhere((c) => c.id == tempId);
              if (idx != -1) {
                _comments[idx] = parsed;
              }
            });
          }
        }).catchError((_) {
          // Keep optimistic comment on screen
        }),
      );
    } else {
      final dio = getIt<DioClient>();
      unawaited(
        dio.post(
          _endpoint,
          data: {'content': text},
          options: Options(
            sendTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 5),
          ),
        ).then((res) {
          final data = res.data;
          if (mounted && data is Map<String, dynamic>) {
            final parsed = _CommentItem.fromJson(data);
            setState(() {
              final idx = _comments.indexWhere((c) => c.id == tempId);
              if (idx != -1) {
                _comments[idx] = parsed;
              }
            });
          }
        }).catchError((_) {
          // Keep optimistic comment on screen
        }),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Bình luận (${_comments.length})',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Outfit',
                ),
              ),
              if (_isLoading)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Composer
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Thêm bình luận của bạn...',
                    hintStyle: const TextStyle(color: AppColors.textDim, fontSize: 13),
                    filled: true,
                    fillColor: AppColors.surfaceRaised,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                  maxLines: 1,
                  onSubmitted: (_) => _submitComment(),
                ),
              ),
              const SizedBox(width: 8),
              Material(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  onTap: _isSubmitting ? null : _submitComment,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Icon(Icons.send_rounded, size: 18, color: Colors.black),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Comments List
          if (_comments.isEmpty && !_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text(
                  'Chưa có bình luận nào. Hãy là người đầu tiên!',
                  style: TextStyle(color: AppColors.textFaint, fontSize: 12),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _comments.length,
              separatorBuilder: (_, __) => const Divider(color: AppColors.border, height: 18),
              itemBuilder: (context, index) {
                final c = _comments[index];
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.2),
                      child: Text(
                        c.userName.isNotEmpty ? c.userName[0].toUpperCase() : 'U',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                c.userName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                c.timeAgo,
                                style: const TextStyle(
                                  color: AppColors.textFaint,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            c.content,
                            style: const TextStyle(
                              color: AppColors.textDim,
                              fontSize: 13,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

class _CommentItem {
  final String id;
  final String content;
  final String userName;
  final DateTime createdAt;

  _CommentItem({
    required this.id,
    required this.content,
    required this.userName,
    required this.createdAt,
  });

  factory _CommentItem.fromJson(Map<String, dynamic> json) {
    String name = 'Người dùng';
    if (json['user'] is Map && json['user']['fullName'] != null) {
      name = json['user']['fullName'] as String;
    }
    return _CommentItem(
      id: json['id']?.toString() ?? '',
      content: json['content'] as String? ?? '',
      userName: name,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inSeconds < 60) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${diff.inDays} ngày trước';
  }
}
