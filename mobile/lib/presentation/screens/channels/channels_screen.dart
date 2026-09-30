// OmniCast - Channels Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/channel_model.dart';
import '../../widgets/channel_logo.dart';

class ChannelsScreen extends StatefulWidget {
  const ChannelsScreen({super.key});

  @override
  State<ChannelsScreen> createState() => _ChannelsScreenState();
}

class _ChannelsScreenState extends State<ChannelsScreen> {
  String? _selectedCategory;

  final _categories = [
    {'value': null, 'label': 'Tất cả'},
    // === 12 category ban đầu ===
    {'value': 'SPORTS', 'label': 'Thể thao'},
    {'value': 'SHOW', 'label': 'Show'},
    {'value': 'ENTERTAINMENT', 'label': 'Giải trí'},
    {'value': 'CINE', 'label': 'Điện ảnh'},
    {'value': 'DRAMA', 'label': 'Phim truyện'},
    {'value': 'NEWS', 'label': 'Tin tức'},
    {'value': 'MUSIC', 'label': 'Âm nhạc'},
    {'value': 'KIDS', 'label': 'Thiếu nhi'},
    {'value': 'TECH', 'label': 'Công nghệ'},
    {'value': 'FOOD', 'label': 'Ẩm thực'},
    {'value': 'DOCUMENTARY', 'label': 'Khám phá'},
    {'value': 'EDUCATION', 'label': 'Giáo dục'},
    // === 8 category mở rộng ===
    {'value': 'GAMING', 'label': 'Esports'},
    {'value': 'PODCAST', 'label': 'Podcast'},
    {'value': 'LIFESTYLE', 'label': 'Phong cách sống'},
    {'value': 'TRAVEL', 'label': 'Du lịch'},
    {'value': 'ART', 'label': 'Nghệ thuật'},
    {'value': 'BUSINESS', 'label': 'Kinh doanh'},
    {'value': 'HEALTH', 'label': 'Sức khỏe'},
  ];

  @override
  void initState() {
    super.initState();
    context.read<ChannelsBloc>().add(const LoadChannels());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('Kênh'),
        backgroundColor: AppColors.dark950,
      ),
      body: Column(
        children: [
          // Category Filter
          Container(
            height: 50,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final category = _categories[index];
                final isSelected = _selectedCategory == category['value'];

                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedCategory = category['value']);
                    context.read<ChannelsBloc>().add(
                          LoadChannels(category: category['value']),
                        );
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : AppColors.dark800,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      category['label'] as String,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppColors.dark300,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Channels Grid
          Expanded(
            child: BlocBuilder<ChannelsBloc, ChannelsState>(
              builder: (context, state) {
                if (state is ChannelsLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is ChannelsLoaded) {
                  if (state.channels.isEmpty) {
                    return const Center(
                      child: Text(
                        'Không có kênh nào',
                        style: TextStyle(color: AppColors.dark400),
                      ),
                    );
                  }

                  return GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.78,
                    ),
                    itemCount: state.channels.length,
                    itemBuilder: (context, index) {
                      return _ChannelCard(channel: state.channels[index]);
                    },
                  );
                }

                if (state is ChannelsError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: AppColors.error,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          state.message,
                          style: const TextStyle(color: AppColors.error),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<ChannelsBloc>().add(const LoadChannels());
                          },
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  );
                }

                return const SizedBox();
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ChannelCard extends StatelessWidget {
  final ChannelModel channel;

  const _ChannelCard({required this.channel});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Navigate to channel details
        context.push('/channel/${channel.id}');
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.dark800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: channel.isLive
                ? AppColors.liveRed.withOpacity(0.5)
                : AppColors.dark700,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Hero(
              tag: 'channel_logo_${channel.id}',
              child: ChannelLogo(
                channel: channel,
                size: 60,
                showLiveIndicator: channel.isLive,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                channel.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              channel.categoryDisplayName,
              style: const TextStyle(
                color: AppColors.dark400,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
