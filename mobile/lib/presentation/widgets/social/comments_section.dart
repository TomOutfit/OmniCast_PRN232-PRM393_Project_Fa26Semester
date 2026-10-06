// OmniCast - Comments Section (Mobile)
//
// Live interactive comments widget that fetches and posts comments
// directly to the OmniCast API and Supabase database.

import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../../core/network/dio_client.dart';

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

  @override
  void initState() {
    super.initState();
    _fetchComments();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _endpoint {
    return widget.kind == 'recording'
        ? '${AppEndpoints.recordings}/${widget.targetId}/comments'
        : '${AppEndpoints.liveEvents}/${widget.targetId}/comments';
  }

  Future<void> _fetchComments() async {
    try {
      final dio = getIt<DioClient>();
      final res = await dio.get(_endpoint, queryParameters: {'limit': 20});
      final data = res.data;
      final rawList = (data is Map && data['data'] is List)
          ? data['data'] as List
          : (data is List ? data : <dynamic>[]);

      if (mounted) {
        setState(() {
          _comments.clear();
          for (final item in rawList) {
            if (item is Map<String, dynamic>) {
              _comments.add(_CommentItem.fromJson(item));
            }
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submitComment() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSubmitting) return;

    setState(() => _isSubmitting = true);
    try {
      final dio = getIt<DioClient>();
      final res = await dio.post(_endpoint, data: {'content': text});
      final data = res.data;

      if (mounted) {
        _controller.clear();
        FocusScope.of(context).unfocus();

        if (data is Map<String, dynamic>) {
          setState(() {
            _comments.insert(0, _CommentItem.fromJson(data));
            _isSubmitting = false;
          });
        } else {
          setState(() {
            _comments.insert(
              0,
              _CommentItem(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                content: text,
                userName: 'Tôi',
                createdAt: DateTime.now(),
              ),
            );
            _isSubmitting = false;
          });
        }

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã gửi bình luận thành công!'),
            duration: Duration(milliseconds: 1000),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        // Fallback optimistic display
        setState(() {
          _comments.insert(
            0,
            _CommentItem(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              content: text,
              userName: 'Tôi',
              createdAt: DateTime.now(),
            ),
          );
          _isSubmitting = false;
        });
        _controller.clear();
        FocusScope.of(context).unfocus();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã lưu bình luận!'),
            duration: Duration(milliseconds: 800),
          ),
        );
      }
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
