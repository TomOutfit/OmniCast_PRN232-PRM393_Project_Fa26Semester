// OmniCast - Channels Repository

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/channel_model.dart';

class ChannelsRepository {
  final DioClient _dioClient;

  ChannelsRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<ChannelsPage> getChannels({
    String? category,
    bool? isActive,
    bool? isFeatured,
    String? search,
    int page = 1,
    int limit = 50,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (category != null && category.isNotEmpty && category != 'ALL') {
      queryParams['category'] = category;
    }
    if (isActive != null) queryParams['isActive'] = isActive;
    if (isFeatured != null) queryParams['isFeatured'] = isFeatured;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final response = await _dioClient.get(
      AppEndpoints.channels,
      queryParameters: queryParams,
    );

    final raw = response.data;
    final list = (raw is Map && raw['data'] is List)
        ? raw['data'] as List
        : (raw is List ? raw : <dynamic>[]);

    final parsed = list
        .map((e) => ChannelModel.fromJson(e as Map<String, dynamic>))
        .toList();

    int totalCount = parsed.length;
    if (raw is Map && raw['meta'] is Map && raw['meta']['total'] is num) {
      totalCount = (raw['meta']['total'] as num).toInt();
    }

    return ChannelsPage(
      items: parsed,
      total: totalCount,
    );
  }

  Future<ChannelModel> getChannelById(String channelId) async {
    final response = await _dioClient.get(AppEndpoints.channel(channelId));
    final raw = response.data;
    final map = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return ChannelModel.fromJson(map);
  }

  Future<ChannelModel> getChannelBySlug(String slug) async {
    final response = await _dioClient.get(AppEndpoints.channelBySlug(slug));
    final raw = response.data;
    final map = (raw is Map && raw['data'] is Map)
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return ChannelModel.fromJson(map);
  }

  Future<List<ChannelModel>> searchChannels(String query) async {
    final response = await _dioClient.get(
      '${AppEndpoints.search}/channels',
      queryParameters: {'q': query},
    );
    final raw = response.data;
    final list = (raw is Map && raw['data'] is List)
        ? raw['data'] as List
        : (raw is List ? raw : <dynamic>[]);
    return list
        .map((e) => ChannelModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> followChannel(String channelId) async {
    await _dioClient.post(
      '${AppEndpoints.channels}/$channelId/follow',
    );
  }

  Future<void> unfollowChannel(String channelId) async {
    await _dioClient.post(
      '${AppEndpoints.channels}/$channelId/unfollow',
    );
  }

  Future<List<ChannelCategory>> getCategories() async {
    final response = await _dioClient.get('${AppEndpoints.channels}/categories');
    final raw = response.data;
    final list = (raw is Map && raw['data'] is List)
        ? raw['data'] as List
        : (raw is List ? raw : <dynamic>[]);
    return list
        .map((e) => ChannelCategory.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

class ChannelsPage {
  final List<ChannelModel> items;
  final int total;

  ChannelsPage({required this.items, required this.total});
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
      count: (json['count'] as int?) ?? 0,
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
      case 'DOCUMENTARY':
        return 'Khám phá';
      case 'EDUCATION':
        return 'Giáo dục';
      case 'GAMING':
        return 'Trò chơi';
      case 'PODCAST':
        return 'Podcast';
      case 'LIFESTYLE':
        return 'Phong cách sống';
      case 'TRAVEL':
        return 'Du lịch';
      case 'ART':
        return 'Nghệ thuật';
      case 'BUSINESS':
        return 'Kinh doanh';
      case 'HEALTH':
        return 'Sức khỏe';
      default:
        return category;
    }
  }
}
