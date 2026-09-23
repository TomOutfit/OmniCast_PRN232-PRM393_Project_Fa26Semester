// OmniCast - Search Models

import 'channel_model.dart';
import 'program_model.dart';

class SearchResultModel {
  final List<ChannelSuggestion> channels;
  final List<ProgramSuggestion> liveEvents;
  final List<ProgramSuggestion> recordings;
  final int totalResults;

  SearchResultModel({
    required this.channels,
    required this.liveEvents,
    required this.recordings,
    required this.totalResults,
  });

  factory SearchResultModel.fromJson(Map<String, dynamic> json) {
    return SearchResultModel(
      channels: (json['channels'] as List?)
              ?.map((e) => ChannelSuggestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      liveEvents: (json['liveEvents'] as List?)
              ?.map((e) => ProgramSuggestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      recordings: (json['recordings'] as List?)
              ?.map((e) => ProgramSuggestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalResults: json['totalResults'] as int? ?? 0,
    );
  }

  bool get isEmpty => totalResults == 0;
  bool get isNotEmpty => !isEmpty;
}

class ChannelSuggestion {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String? category;
  final int? followerCount;

  ChannelSuggestion({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.category,
    this.followerCount,
  });

  factory ChannelSuggestion.fromJson(Map<String, dynamic> json) {
    return ChannelSuggestion(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      logoUrl: json['logoUrl'] as String?,
      category: json['category'] as String?,
      followerCount: json['followerCount'] as int?,
    );
  }

  ChannelModel toChannelModel() {
    return ChannelModel(
      id: id,
      name: name,
      slug: slug,
      logoUrl: logoUrl,
      category: category ?? 'ENTERTAINMENT',
      language: 'vi',
      followerCount: followerCount ?? 0,
      totalViews: 0,
      totalVideos: 0,
      subscriberCount: 0,
      isVerified: false,
      isActive: true,
      isFeatured: false,
      isPublic: true,
      allowComments: true,
      requireSub: false,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}

class ProgramSuggestion {
  final String id;
  final String title;
  final String? description;
  final String? thumbnailUrl;
  final String? scheduledAt;
  final String? status;
  final String? channelId;
  final String? channelName;

  ProgramSuggestion({
    required this.id,
    required this.title,
    this.description,
    this.thumbnailUrl,
    this.scheduledAt,
    this.status,
    this.channelId,
    this.channelName,
  });

  factory ProgramSuggestion.fromJson(Map<String, dynamic> json) {
    return ProgramSuggestion(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      scheduledAt: json['scheduledAt'] as String?,
      status: json['status'] as String?,
      channelId: json['channelId'] as String?,
      channelName: json['channel']?['name'] as String?,
    );
  }

  LiveEventModel toLiveEventModel() {
    return LiveEventModel(
      id: id,
      title: title,
      description: description,
      thumbnailUrl: thumbnailUrl,
      contentSource: 'EXTERNAL',
      isPrivate: false,
      quality: 'AUTO',
      language: 'vi',
      status: status ?? 'SCHEDULED',
      scheduledAt: scheduledAt != null
          ? DateTime.parse(scheduledAt!)
          : DateTime.now(),
      viewerCount: 0,
      peakViewers: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      channelId: channelId ?? '',
      tags: [],
      autoRecord: true,
      slowMode: false,
      chatEnabled: true,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}

class SuggestionsResponse {
  final List<ChannelSuggestion> channels;
  final List<ProgramSuggestion> programs;

  SuggestionsResponse({
    required this.channels,
    required this.programs,
  });

  factory SuggestionsResponse.fromJson(Map<String, dynamic> json) {
    return SuggestionsResponse(
      channels: (json['channels'] as List?)
              ?.map((e) => ChannelSuggestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      programs: (json['programs'] as List?)
              ?.map((e) => ProgramSuggestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
