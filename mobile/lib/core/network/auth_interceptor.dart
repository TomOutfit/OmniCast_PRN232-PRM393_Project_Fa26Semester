// OmniCast - Auth Interceptor
// Automatically attaches JWT token to requests and handles 401 errors

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

import '../constants/app_constants.dart';

class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _secureStorage;
  final Function()? onUnauthorized;
  final Future<void> Function()? onTokenRefresh;

  AuthInterceptor({
    required FlutterSecureStorage secureStorage,
    this.onUnauthorized,
    this.onTokenRefresh,
  }) : _secureStorage = secureStorage;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth for public endpoints
    final publicEndpoints = [
      AppEndpoints.login,
      AppEndpoints.register,
      AppEndpoints.refresh,
    ];
    
    final isPublic = publicEndpoints.any(
      (endpoint) => options.path.contains(endpoint),
    );

    if (!isPublic) {
      final token = await _secureStorage.read(key: AppConstants.accessTokenKey);
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }

    // Add common headers
    options.headers['Content-Type'] = 'application/json';
    options.headers['Accept'] = 'application/json';

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired or invalid
      _handleUnauthorized(handler, err);
    } else {
      handler.next(err);
    }
  }

  Future<void> _handleUnauthorized(
    ErrorInterceptorHandler handler,
    DioException err,
  ) async {
    try {
      // Try to refresh token
      final refreshToken = await _secureStorage.read(
        key: AppConstants.refreshTokenKey,
      );

      if (refreshToken != null) {
        // Call token refresh endpoint
        // This would typically be handled by the AuthRepository
        debugPrint('Attempting to refresh token...');
        
        // If refresh succeeds, retry the original request
        // For now, just trigger the unauthorized callback
        onUnauthorized?.call();
      } else {
        // No refresh token available, user needs to login again
        onUnauthorized?.call();
      }
    } catch (e) {
      debugPrint('Token refresh failed: $e');
      onUnauthorized?.call();
    }

    handler.next(err);
  }
}

// Retry interceptor for network errors
class RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;
  final Duration retryDelay;

  RetryInterceptor({
    required Dio dio,
    this.maxRetries = 1,
    this.retryDelay = const Duration(seconds: 1),
  }) : _dio = dio;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Only retry on specific error types
    if (_shouldRetry(err)) {
      final retryCount = err.requestOptions.extra['retryCount'] ?? 0;

      if (retryCount < maxRetries) {
        // Increment retry count
        err.requestOptions.extra['retryCount'] = retryCount + 1;

        debugPrint('Retrying request (${retryCount + 1}/$maxRetries)...');

        // Wait before retry
        await Future.delayed(retryDelay * (retryCount + 1));

        // Retry the request
        try {
          final response = await _dio.fetch(err.requestOptions);
          handler.resolve(response);
          return;
        } catch (e) {
          // If retry fails, continue to next interceptor
        }
      }
    }

    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    // Retry on connection-related errors
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.response?.statusCode != null &&
            err.response!.statusCode! >= 500);
  }
}

// Log interceptor for debugging
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('🌐 REQUEST[${options.method}] => PATH: ${options.path}');
    if (options.data != null) {
      debugPrint('📤 Request Data: ${options.data}');
    }
    if (options.headers.isNotEmpty) {
      debugPrint('📋 Headers: ${options.headers}');
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    debugPrint(
      '✅ RESPONSE[${response.statusCode}] => PATH: ${response.requestOptions.path}',
    );
    if (response.data != null) {
      debugPrint('📥 Response Data: ${response.data}');
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint(
      '❌ ERROR[${err.response?.statusCode}] => PATH: ${err.requestOptions.path}',
    );
    debugPrint('💥 Error Message: ${err.message}');
    debugPrint('💥 Error Type: ${err.type}');
    if (err.response != null) {
      debugPrint('💥 Response Data: ${err.response?.data}');
    }
    handler.next(err);
  }
}

// Cache interceptor for GET requests
class CacheInterceptor extends Interceptor {
  final Map<String, Response> _cache = {};
  final Duration cacheDuration;

  CacheInterceptor({this.cacheDuration = const Duration(minutes: 5)});

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    // Only cache successful GET requests
    if (response.requestOptions.method == 'GET' &&
        response.statusCode == 200) {
      final key = response.requestOptions.uri.toString();
      _cache[key] = response;

      // Clean old cache entries
      _cleanExpiredCache();
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // On network error, try to return cached response
    if (err.type == DioExceptionType.connectionError) {
      final key = err.requestOptions.uri.toString();
      final cachedResponse = _cache[key];

      if (cachedResponse != null) {
        debugPrint('📦 Returning cached response for: $key');
        handler.resolve(cachedResponse);
        return;
      }
    }
    handler.next(err);
  }

  void _cleanExpiredCache() {
    _cache.removeWhere((key, value) {
      final timestamp = value.extra['cachedAt'] as DateTime?;
      if (timestamp == null) return false;
      return DateTime.now().difference(timestamp) > cacheDuration;
    });
  }

  void clearCache() {
    _cache.clear();
  }
}
