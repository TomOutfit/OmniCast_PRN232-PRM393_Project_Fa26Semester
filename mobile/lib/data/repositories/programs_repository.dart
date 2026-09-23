// OmniCast - Programs Repository

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/program_model.dart';

class ProgramsRepository {
  final DioClient _dioClient;

  ProgramsRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<List<LiveEventModel>> getPrograms({
    String? channelId,
    String? category,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (channelId != null) queryParams['channelId'] = channelId;
    if (category != null) queryParams['category'] = category;
    if (status != null) queryParams['status'] = status;

    final response = await _dioClient.get(
      AppEndpoints.liveEvents,
      queryParameters: queryParams,
    );

    final data = response.data['data'] as List;
    return data.map((e) => LiveEventModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<LiveEventModel>> getLiveNow() async {
    final response = await _dioClient.get(AppEndpoints.liveNow);
    final data = response.data as List;
    return data.map((e) => LiveEventModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<LiveEventModel> getProgramById(String programId) async {
    final response = await _dioClient.get(AppEndpoints.liveEvent(programId));
    return LiveEventModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<LiveEventModel>> getEpgSchedule({
    required DateTime date,
    String? channelId,
  }) async {
    final startOfDay = DateTime(date.year, date.month, date.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));

    final queryParams = <String, dynamic>{
      'fromDate': startOfDay.toIso8601String(),
      'toDate': endOfDay.toIso8601String(),
    };

    if (channelId != null) queryParams['channelId'] = channelId;

    final response = await _dioClient.get(
      AppEndpoints.liveEvents,
      queryParameters: queryParams,
    );

    final data = response.data['data'] as List;
    return data.map((e) => LiveEventModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> likeProgram(String programId) async {
    await _dioClient.post(
      '${AppEndpoints.liveEvents}/$programId/like',
    );
  }

  Future<void> shareProgram(String programId) async {
    await _dioClient.post(
      '${AppEndpoints.liveEvents}/$programId/share',
    );
  }

  Future<List<RecordingModel>> getRecordings({
    String? channelId,
    String? category,
    bool? isFeatured,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (channelId != null) queryParams['channelId'] = channelId;
    if (category != null) queryParams['category'] = category;
    if (isFeatured != null) queryParams['isFeatured'] = isFeatured;

    final response = await _dioClient.get(
      AppEndpoints.recordings,
      queryParameters: queryParams,
    );

    final data = response.data['data'] as List;
    return data.map((e) => RecordingModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<RecordingModel> getRecordingById(String recordingId) async {
    final response = await _dioClient.get(AppEndpoints.recording(recordingId));
    return RecordingModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}

class RecordingModel {
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final String contentSource;
  final String? externalUrl;
  final String? videoUrl;
  final int duration;
  final String? quality;
  final String? contentType;
  final int viewCount;
  final int likeCount;
  final int commentCount;
  final int shareCount;
  final String channelId;
  final ChannelInfo? channel;
  final DateTime publishedAt;

  RecordingModel({
    required this.id,
    required this.title,
    this.description,
    this.thumbnailUrl,
    required this.contentSource,
    this.externalUrl,
    this.videoUrl,
    required this.duration,
    this.quality,
    this.contentType,
    required this.viewCount,
    required this.likeCount,
    required this.commentCount,
    required this.shareCount,
    required this.channelId,
    this.channel,
    required this.publishedAt,
  });

  factory RecordingModel.fromJson(Map<String, dynamic> json) {
    return RecordingModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      contentSource: json['contentSource'] as String? ?? 'EXTERNAL',
      externalUrl: json['externalUrl'] as String?,
      videoUrl: json['videoUrl'] as String?,
      duration: json['duration'] as int? ?? 0,
      quality: json['quality'] as String?,
      contentType: json['contentType'] as String?,
      viewCount: json['viewCount'] as int? ?? 0,
      likeCount: json['likeCount'] as int? ?? 0,
      commentCount: json['commentCount'] as int? ?? 0,
      shareCount: json['shareCount'] as int? ?? 0,
      channelId: json['channelId'] as String,
      channel: json['channel'] != null
          ? ChannelInfo.fromJson(json['channel'] as Map<String, dynamic>)
          : null,
      publishedAt: DateTime.parse(json['publishedAt'] as String),
    );
  }

  String get formattedDuration {
    final hours = duration ~/ 3600;
    final minutes = (duration % 3600) ~/ 60;
    
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }
}
