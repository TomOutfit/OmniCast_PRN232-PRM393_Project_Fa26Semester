// OmniCast - Recording Detail Screen
//
// Mobile counterpart of the Frontend `/programs/recording/[id]` page.
// Loads the recording by id through `RecordingsBloc`, plays it via
// `OmniPlayer` (video_player) and surfaces similar recordings in a
// bottom rail.

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
  'SD_480P': '480p',
  'HD_720P': '720p',
  'FULL_HD_1080P': '1080p',
  'QHD_1440P': '1440p',
  'UHD_4K': '4K',
  'AUTO': 'Tự động',
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
      backgroundColor: AppColors.dark950,
      body: BlocBuilder<RecordingsBloc, RecordingsState>(
        builder: (context, state) {
          if (state is RecordingsLoading) {
            return const Center(child: CircularProgressIndicator());
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
              // App bar with back button
              SliverAppBar(
                expandedHeight: 240,
                pinned: true,
                backgroundColor: Colors.black,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => context.pop(),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: _PlayerSection(recording: r),
                ),
              ),

              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges row
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'VOD',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (r.quality != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.dark700,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _qualityLabels[r.quality] ?? r.quality!,
                                style: const TextStyle(
                                  color: AppColors.dark300,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          if (r.language != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.dark700,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                r.language!.toUpperCase(),
                                style: const TextStyle(
                                  color: AppColors.dark300,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          if (r.isAgeRestricted)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.error.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                '18+',
                                style: TextStyle(
                                  color: AppColors.error,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          if (r.category != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color:
                                    AppColors.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _categoryLabel(r.category!),
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Title
                      Text(
                        r.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Channel & date row
                      if (r.channel != null)
                        GestureDetector(
                          onTap: () => context
                              .push('/channel/${r.channel!.id}'),
                          child: Row(
                            children: [
                              if (r.channel!.logoUrl != null)
                                ClipOval(
                                  child: SizedBox(
                                    width: 36,
                                    height: 36,
                                    child: CachedNetworkImage(
                                      imageUrl: r.channel!.logoUrl!,
                                      fit: BoxFit.cover,
                                      placeholder: (_, __) => const ColoredBox(
                                          color: AppColors.dark700),
                                      errorWidget: (_, __, ___) =>
                                          const ColoredBox(
                                              color: AppColors.dark700),
                                    ),
                                  ),
                                )
                              else
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: AppColors.dark700,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.tv,
                                      color: AppColors.dark500, size: 20),
                                ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      r.channel!.name,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      _formatDate(r.publishedAt),
                                      style: const TextStyle(
                                        color: AppColors.dark400,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              OutlinedButton(
                                onPressed: () => context
                                    .push('/channel/${r.channel!.id}'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 6),
                                ),
                                child: const Text('Xem kênh'),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 16),

                      // Stats row
                      Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 16),
                        decoration: BoxDecoration(
                          color: AppColors.dark800,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _StatColumn(
                              icon: Icons.visibility,
                              value: _formatCount(r.viewCount),
                              label: 'lượt xem',
                            ),
                            _StatColumn(
                              icon: Icons.thumb_up,
                              value: _formatCount(r.likeCount),
                              label: 'thích',
                            ),
                            _StatColumn(
                              icon: Icons.comment,
                              value: _formatCount(r.commentCount),
                              label: 'bình luận',
                            ),
                            _StatColumn(
                              icon: Icons.share,
                              value: _formatCount(r.shareCount),
                              label: 'chia sẻ',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Action row
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content:
                                          Text('Đã lưu vào danh sách yêu thích')),
                                );
                              },
                              icon: const Icon(Icons.bookmark_border),
                              label: const Text('Lưu'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Đã sao chép link')),
                                );
                              },
                              icon: const Icon(Icons.share),
                              label: const Text('Chia sẻ'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Description
                      const Text(
                        'Mô tả',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        r.description ?? 'Chưa có mô tả.',
                        style: const TextStyle(
                          color: AppColors.dark300,
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Tags
                      if (r.tags.isNotEmpty) ...[
                        const Text(
                          'Thẻ',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
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
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.dark700,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '#$tag',
                                  style: const TextStyle(
                                    color: AppColors.dark300,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Source info
                      if (r.externalPlatform != null) ...[
                        const Text(
                          'Nguồn',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Nội dung được cung cấp bởi ${r.externalPlatform}${r.externalId != null ? ' · ID: ${r.externalId}' : ''}',
                          style: const TextStyle(
                            color: AppColors.dark400,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ],
                  ),
                ),
              ),

              // Similar recordings rail
              if (state.similar.isNotEmpty || state.isLoadingSimilar)
                SliverToBoxAdapter(
                  child: _SimilarRail(
                    similar: state.similar,
                    isLoading: state.isLoadingSimilar,
                    excludeId: r.id,
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),
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
                      const ColoredBox(color: AppColors.dark900),
                  errorWidget: (_, __, ___) => const Icon(
                    Icons.play_circle_outline,
                    size: 64,
                    color: AppColors.dark500,
                  ),
                )
              : const Icon(
                  Icons.play_circle_outline,
                  size: 64,
                  color: AppColors.dark500,
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
          // Subtle gradient overlay so the back button stays legible.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.5),
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
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.dark400,
            fontSize: 10,
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
            'Video liên quan',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 140,
          child: isLoading && list.isEmpty
              ? const Center(child: CircularProgressIndicator())
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
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.dark700),
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
                    height: 80,
                    child: recording.thumbnailUrl != null
                        ? CachedNetworkImage(
                            imageUrl: recording.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) =>
                                const ColoredBox(color: AppColors.dark700),
                            errorWidget: (_, __, ___) => const ColoredBox(
                              color: AppColors.dark700,
                              child: Icon(Icons.play_circle_outline,
                                  color: AppColors.dark500, size: 32),
                            ),
                          )
                        : const ColoredBox(
                            color: AppColors.dark700,
                            child: Icon(Icons.play_circle_outline,
                                color: AppColors.dark500, size: 32),
                          ),
                  ),
                ),
                if (recording.duration > 0)
                  Positioned(
                    bottom: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        recording.formattedDuration,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
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
                          color: AppColors.dark400,
                          fontSize: 10,
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
          const Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
