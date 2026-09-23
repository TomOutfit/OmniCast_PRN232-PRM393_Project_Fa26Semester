// OmniCast - Search Repository

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/search_result_model.dart';

class SearchRepository {
  final DioClient _dioClient;

  SearchRepository({required DioClient dioClient}) : _dioClient = dioClient;

  Future<SearchResultModel> search({
    required String query,
    String? type,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'q': query,
      'page': page,
      'limit': limit,
    };

    if (type != null) queryParams['type'] = type;
    if (category != null) queryParams['category'] = category;

    final response = await _dioClient.get(
      AppEndpoints.search,
      queryParameters: queryParams,
    );

    return SearchResultModel.fromJson(response.data);
  }

  Future<SuggestionsResponse> getSuggestions(String query) async {
    final response = await _dioClient.get(
      AppEndpoints.searchSuggestions,
      queryParameters: {'q': query},
    );

    return SuggestionsResponse.fromJson(response.data);
  }

  Future<List<ChannelSuggestion>> searchChannels(String query) async {
    final response = await _dioClient.get(
      '${AppEndpoints.search}/channels',
      queryParameters: {'q': query},
    );

    final data = response.data as List;
    return data.map((e) => ChannelSuggestion.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ProgramSuggestion>> searchPrograms(
    String query, {
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final queryParams = <String, dynamic>{'q': query};

    if (fromDate != null) queryParams['fromDate'] = fromDate.toIso8601String();
    if (toDate != null) queryParams['toDate'] = toDate.toIso8601String();

    final response = await _dioClient.get(
      '${AppEndpoints.search}/programs',
      queryParameters: queryParams,
    );

    final data = response.data as List;
    return data.map((e) => ProgramSuggestion.fromJson(e as Map<String, dynamic>)).toList();
  }
}
