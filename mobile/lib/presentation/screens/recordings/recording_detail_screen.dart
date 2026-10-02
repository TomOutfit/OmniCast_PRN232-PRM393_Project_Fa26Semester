// OmniCast - Recording Detail Screen
//
// Mobile counterpart of the Frontend `/programs/recording/[id]` page.
// Cyber-Dark Broadcast System styling with HEVC 4K telemetry and similar rail.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../logic/recordings/recordings_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/program_categories.dart';
import '../../../data/models/recording_model.dart';
import '../../widgets/omni_player.dart';

const _qualityLabels = {
  'SD_480P': '480p SD',
  'HD_720P': '720p HD',
  'FULL_HD_1080P': '1080p FHD',
  'QHD_1440P': '1440p 2K',
  'UHD_4K': '2160p 4K UHD',
  'AUTO': 'Tự động HEVC',
};

class RecordingDetailScreen extends StatefulWidget {
  final String recordingId;

  const RecordingDetailScreen({super.key, required this.recordingId});

  @override
  State<RecordingDetailScreen> createState() => _RecordingDetailScreenState();
}

class _RecordingDetailScreenState extends State<RecordingDetailScreen> {
  @override
  void initState() {
    super.initState();
    context
        .read<RecordingsBloc>()
        .add(LoadRecordingDetails(widget.recordingId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: BlocBuilder<RecordingsBloc, RecordingsState>(
        builder: (context, state) {
          if (state is RecordingsLoading) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
            );
          }
          if (state is RecordingsError) {
            return _ErrorView(
              message: state.message,
              onRetry: () => context
                  .read<RecordingsBloc>()
                  .add(LoadRecordingDetails(widget.recordingId)),
            );
          }
          if (state is! RecordingDetailsLoaded) {
            return const SizedBox.shrink();
          }

          final r = state.recording;
          return CustomScrollView(
            slivers: [
              // Player App Bar
              SliverAppBar(
                expandedHeight: 250,
                pinned: true,
                backgroundColor: Colors.black,
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: CircleAvatar(
                    backgroundColor: Colors.black.withValues(alpha: 0.6),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                      onPressed: () => context.pop(),
                    ),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: _PlayerSection(recording: r),
                ),
              ),

              // Content Body
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Telemetry Badges
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0x2600E5FF),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: const Color(0xFF00E5FF),
                                width: 0.8,
                              ),
                            ),
                            child: const Text(
                              'VOD ARCHIVE',
                              style: TextStyle(
                                color: Color(0xFF00E5FF),
                                fontSize: 10,
                                fontFamily: 'JetBrainsMono',
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: const Color(0x3300E5FF),
                                width: 0.6,
                              ),
                            ),
                            child: Text(
                              _qualityLabels[r.quality] ?? (r.quality ?? '4K UHD'),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontFamily: 'JetBrainsMono',
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (r.language != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: const Color(0x1F00E5FF),
                                  width: 0.6,
                                ),
                              ),
                              child: Text(
                                r.language!.toUpperCase(),
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 10,
                                  fontFamily: 'JetBrainsMono',
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          if (r.isAgeRestricted)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: AppColors.error.withValues(alpha: 0.6),
                                  width: 0.6,
                                ),
                              ),
                              child: const Text(
                                '18+',
                                style: TextStyle(
                                  color: AppColors.error,
                                  fontSize: 10,
                                  fontFamily: 'JetBrainsMono',
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          if (r.category != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0x1A00E5FF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _categoryLabel(r.category!),
                                style: const TextStyle(
                                  color: Color(0xFF00E5FF),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Title
                      Text(
                        r.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Outfit',
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Channel & date card
                      if (r.channel != null)
                        InkWell(
                          onTap: () => context.push('/channel/${r.channel!.id}'),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0B1320),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0x1F00E5FF),
                                width: 0.8,
                              ),
                            ),
                            child: Row(
                              children: [
                                if (r.channel!.logoUrl != null)
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: const Color(0x4D00E5FF),
                                        width: 1,
                                      ),
                                    ),
                                    child: ClipOval(
                                      child: CachedNetworkImage(
                                        imageUrl: r.channel!.logoUrl!,
                                        fit: BoxFit.cover,
                                        placeholder: (_, __) =>
                                            const ColoredBox(color: Color(0xFF0F172A)),
                                        errorWidget: (_, __, ___) =>
                                            const Icon(Icons.tv, color: Color(0xFF00E5FF)),
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: const Color(0x4D00E5FF),
                                        width: 1,
                                      ),
                                    ),
                                    child: const Icon(
                                      Icons.tv_rounded,
                                      color: Color(0xFF00E5FF),
                                      size: 20,
                                    ),
                                  ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        r.channel!.name,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          fontFamily: 'Outfit',
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Phát sóng: ${_formatDate(r.publishedAt)}',
                                        style: const TextStyle(
                                          color: Color(0xFF94A3B8),
                                          fontSize: 11,
                                          fontFamily: 'JetBrainsMono',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0x1F00E5FF),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0x4D00E5FF), width: 0.8),
                                  ),
                                  child: const Text(
                                    'Kênh',
                                    style: TextStyle(
                                      color: Color(0xFF00E5FF),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),

                      // Cyber Stats Row
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0B1320),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _StatColumn(
                              icon: Icons.visibility_rounded,
                              value: _formatCount(r.viewCount),
                              label: 'LƯỢT XEM',
                            ),
                            Container(width: 1, height: 28, color: const Color(0x1A00E5FF)),
                            _StatColumn(
                              icon: Icons.thumb_up_alt_rounded,
                              value: _formatCount(r.likeCount),
                              label: 'THÍCH',
                            ),
                            Container(width: 1, height: 28, color: const Color(0x1A00E5FF)),
                            _StatColumn(
                              icon: Icons.chat_bubble_outline_rounded,
                              value: _formatCount(r.commentCount),
                              label: 'BÌNH LUẬN',
                            ),
                            Container(width: 1, height: 28, color: const Color(0x1A00E5FF)),
                            _StatColumn(
                              icon: Icons.share_rounded,
                              value: _formatCount(r.shareCount),
                              label: 'CHIA SẺ',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Action Row
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Đã lưu vào danh sách xem lại'),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                height: 44,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.bookmark_add_rounded, color: Colors.black, size: 18),
                                    SizedBox(width: 6),
                                    Text(
                                      'LƯU VIDEO',
                                      style: TextStyle(
                                        color: Colors.black,
                                        fontWeight: FontWeight.w800,
                                        fontFamily: 'Outfit',
                                        fontSize: 12,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Đã sao chép liên kết phát sóng'),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0x3300E5FF),
                                    width: 1,
                                  ),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.share_rounded, color: Color(0xFF00E5FF), size: 18),
                                    SizedBox(width: 6),
                                    Text(
                                      'CHIA SẺ',
                                      style: TextStyle(
                                        color: Color(0xFF00E5FF),
                                        fontWeight: FontWeight.w700,
                                        fontFamily: 'Outfit',
                                        fontSize: 12,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Description
                      const Text(
                        'NỘI DUNG PHÁT SÓNG',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 12,
                          fontFamily: 'JetBrainsMono',
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0B1320),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
                        ),
                        child: Text(
                          r.description ?? 'Nội dung lưu trữ chất lượng cao từ đài truyền hình OmniCast.',
                          style: const TextStyle(
                            color: Color(0xFFCBD5E1),
                            fontSize: 13,
                            height: 1.6,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Tags
                      if (r.tags.isNotEmpty) ...[
                        const Text(
                          'TỪ KHÓA',
                          style: TextStyle(
                            color: Color(0xFF00E5FF),
                            fontSize: 12,
                            fontFamily: 'JetBrainsMono',
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final tag in r.tags)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0x1F00E5FF),
                                    width: 0.8,
                                  ),
                                ),
                                child: Text(
                                  '#$tag',
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 11,
                                    fontFamily: 'JetBrainsMono',
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 20),
                      ],
                    ],
                  ),
                ),
              ),

              // Similar Recordings Rail
              if (state.similar.isNotEmpty || state.isLoadingSimilar)
                SliverToBoxAdapter(
                  child: _SimilarRail(
                    similar: state.similar,
                    isLoading: state.isLoadingSimilar,
                    excludeId: r.id,
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 36)),
            ],
          );
        },
      ),
    );
  }

  static String _categoryLabel(String value) {
    return ProgramCategories.labelFor(value);
  }

  static String _formatDate(DateTime d) {
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  static String _formatCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K';
    return n.toString();
  }
}

// ============================================================
// PLAYER SECTION
// ============================================================

class _PlayerSection extends StatelessWidget {
  final RecordingModel recording;

  const _PlayerSection({required this.recording});

  @override
  Widget build(BuildContext context) {
    final src = recording.playableSrc;
    if (src == null) {
      return Container(
        color: Colors.black,
        child: Center(
          child: recording.thumbnailUrl != null
              ? CachedNetworkImage(
                  imageUrl: recording.thumbnailUrl!,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  placeholder: (_, __) =>
                      const ColoredBox(color: Color(0xFF070B12)),
                  errorWidget: (_, __, ___) => const Icon(
                    Icons.play_circle_outline,
                    size: 64,
                    color: Color(0xFF00E5FF),
                  ),
                )
              : const Icon(
                  Icons.play_circle_outline,
                  size: 64,
                  color: Color(0xFF00E5FF),
                ),
        ),
      );
    }

    return Container(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          OmniPlayer(
            url: src,
            posterUrl: recording.thumbnailUrl,
            autoPlay: false,
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 70,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.6),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// STAT COLUMN
// ============================================================

class _StatColumn extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatColumn({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: const Color(0xFF00E5FF), size: 18),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w800,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 9,
            fontFamily: 'JetBrainsMono',
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ============================================================
// SIMILAR RAIL
// ============================================================

class _SimilarRail extends StatelessWidget {
  final List<RecordingModel> similar;
  final bool isLoading;
  final String excludeId;

  const _SimilarRail({
    required this.similar,
    required this.isLoading,
    required this.excludeId,
  });

  @override
  Widget build(BuildContext context) {
    final list = similar.where((r) => r.id != excludeId).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'VIDEO CÙNG THỂ LOẠI',
            style: TextStyle(
              color: Color(0xFF00E5FF),
              fontSize: 12,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 155,
          child: isLoading && list.isEmpty
              ? const Center(
                  child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
                )
              : ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: list.length,
                  itemBuilder: (context, index) {
                    return _SimilarCard(recording: list[index]);
                  },
                ),
        ),
      ],
    );
  }
}

class _SimilarCard extends StatelessWidget {
  final RecordingModel recording;

  const _SimilarCard({required this.recording});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/recording/${recording.id}'),
      child: Container(
        width: 220,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1320),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x1F00E5FF), width: 0.8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  child: SizedBox(
                    width: 220,
                    height: 85,
                    child: recording.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: recording.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const ColoredBox(color: Color(0xFF0F172A)),
                            errorWidget: (_, __, ___) => const ColoredBox(
                              color: Color(0xFF0F172A),
                              child: Icon(
                                Icons.play_circle_outline,
                                color: Color(0xFF00E5FF),
                                size: 32,
                              ),
                            ),
                          )
                        : const ColoredBox(
                            color: Color(0xFF0F172A),
                            child: Icon(
                              Icons.play_circle_outline,
                              color: Color(0xFF00E5FF),
                              size: 32,
                            ),
                          ),
                  ),
                ),
                if (recording.duration > 0)
                  Positioned(
                    bottom: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0x3300E5FF), width: 0.5),
                      ),
                      child: Text(
                        recording.formattedDuration,
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 9,
                          fontFamily: 'JetBrainsMono',
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      recording.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    if (recording.channel != null)
                      Text(
                        recording.channel!.name,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                          fontFamily: 'JetBrainsMono',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// ERROR VIEW
// ============================================================

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, size: 56, color: AppColors.error),
          const SizedBox(height: 14),
          Text(
            message,
            style: const TextStyle(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
            ),
            onPressed: onRetry,
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }
}
