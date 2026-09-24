// OmniCast - Channels Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/channels/channels_bloc.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/channel_logo_helper.dart';
import '../../../data/models/channel_model.dart';

class ChannelsScreen extends StatefulWidget {
  const ChannelsScreen({super.key});

  @override
  State<ChannelsScreen> createState() => _ChannelsScreenState();
}

class _ChannelsScreenState extends State<ChannelsScreen> {
  String? _selectedCategory;

  final _categories = [
    {'value': null, 'label': 'Tất cả'},
    {'value': 'SPORTS', 'label': 'Thể thao'},
    {'value': 'ENTERTAINMENT', 'label': 'Giải trí'},
    {'value': 'CINE', 'label': 'Điện ảnh'},
    {'value': 'MUSIC', 'label': 'Âm nhạc'},
    {'value': 'NEWS', 'label': 'Tin tức'},
    {'value': 'DRAMA', 'label': 'Phim truyện'},
    {'value': 'KIDS', 'label': 'Thiếu nhi'},
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
                    setState(() => _selectedCategory = category['value'] as String?);
                    context.read<ChannelsBloc>().add(
                          LoadChannels(category: category['value'] as String?),
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
                      childAspectRatio: 0.85,
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
            Stack(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(ChannelLogoHelper.getFallbackColor(channel.category)),
                        Color(ChannelLogoHelper.getFallbackColor(channel.category)).withOpacity(0.7),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Color(ChannelLogoHelper.getFallbackColor(channel.category)).withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: channel.logoUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: CachedNetworkImage(
                            imageUrl: channel.logoUrl!,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => Center(
                              child: Text(
                                ChannelLogoHelper.getInitial(channel.name),
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            ChannelLogoHelper.getInitial(channel.name),
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                ),
                if (channel.isLive)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.liveRed,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.dark800,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
              ],
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
