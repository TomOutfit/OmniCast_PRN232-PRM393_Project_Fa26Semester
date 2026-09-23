// OmniCast - Channels Repository

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/channel_model.dart';

class ChannelsRepository {
  final DioClient _dioClient;

  ChannelsRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<List<ChannelModel>> getChannels({
    String? category,
    bool? isActive,
    bool? isFeatured,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (category != null) queryParams['category'] = category;
    if (isActive != null) queryParams['isActive'] = isActive;
    if (isFeatured != null) queryParams['isFeatured'] = isFeatured;

    final response = await _dioClient.get(
      AppEndpoints.channels,
      queryParameters: queryParams,
    );

    final data = response.data['data'] as List;
    return data.map((e) => ChannelModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChannelModel> getChannelById(String channelId) async {
    final response = await _dioClient.get(AppEndpoints.channel(channelId));
    return ChannelModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<ChannelModel> getChannelBySlug(String slug) async {
    final response = await _dioClient.get(AppEndpoints.channelBySlug(slug));
    return ChannelModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<ChannelModel>> searchChannels(String query) async {
    final response = await _dioClient.get(
      '${AppEndpoints.search}/channels',
      queryParameters: {'q': query},
    );

    final data = response.data as List;
    return data.map((e) => ChannelModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> followChannel(String channelId) async {
    await _dioClient.post(
      '${AppEndpoints.channels}/$channelId/follow',
    );
  }

  Future<void> unfollowChannel(String channelId) async {
    await _dioClient.delete(
      '${AppEndpoints.channels}/$channelId/follow',
    );
  }

  Future<List<ChannelCategory>> getCategories() async {
    final response = await _dioClient.get('${AppEndpoints.channels}/categories');
    final data = response.data as List;
    return data.map((e) => ChannelCategory.fromJson(e as Map<String, dynamic>)).toList();
  }
}

class ChannelCategory {
  final String category;
  final int count;

  ChannelCategory({
    required this.category,
    required this.count,
  });

  factory ChannelCategory.fromJson(Map<String, dynamic> json) {
    return ChannelCategory(
      category: json['category'] as String,
      count: json['_count'] as int,
    );
  }

  String get displayName {
    switch (category) {
      case 'SPORTS':
        return 'Thể thao';
      case 'SHOW':
        return 'Show';
      case 'ENTERTAINMENT':
        return 'Giải trí';
      case 'CINE':
        return 'Điện ảnh';
      case 'DRAMA':
        return 'Phim truyện';
      case 'NEWS':
        return 'Tin tức';
      case 'MUSIC':
        return 'Âm nhạc';
      case 'KIDS':
        return 'Thiếu nhi';
      case 'TECH':
        return 'Công nghệ';
      case 'FOOD':
        return 'Ẩm thực';
      default:
        return category;
    }
  }
}
