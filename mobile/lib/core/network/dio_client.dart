// OmniCast - Dio HTTP Client Configuration
//
// Adds:
//   - Bearer token from secure storage (skipped for /login, /register, /refresh)
//   - **Silent 401 refresh + single-flight retry** so expired access tokens
//     don't break user flows. Mirrors the web client's axios interceptor.
//   - Light retry for transient timeouts.

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

/// Callback signature used by the Dio layer to ask the auth layer to
/// rotate the access/refresh token pair. Returns the new access token
/// on success, or `null` if rotation failed (refresh token expired,
/// network down, user signed out, …). On `null` the original 401 is
/// surfaced to the caller unchanged.
typedef TokenRefresher = Future<String?> Function();

class DioClient {
  late final Dio _dio;
  final FlutterSecureStorage _secureStorage;
  TokenRefresher? _tokenRefresher;

  DioClient({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: AppConstants.apiTimeout,
        receiveTimeout: AppConstants.apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _AuthInterceptor(_secureStorage),
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (o) => print('DIO: $o'),
      ),
      _RefreshOn401Interceptor(
        secureStorage: _secureStorage,
        refresher: () async => _tokenRefresher?.call(),
      ),
      _RetryInterceptor(_dio),
    ]);
  }

  Dio get dio => _dio;

  /// Wires the auth refresh callback. Called from `injection.dart`
  /// AFTER both `DioClient` and `AuthRepository` are registered so
  /// we avoid a circular DI dependency.
  void setTokenRefresher(TokenRefresher refresher) {
    _tokenRefresher = refresher;
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }
}

class _AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _secureStorage;

  _AuthInterceptor(this._secureStorage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth for public endpoints
    final publicEndpoints = ['/login', '/register', '/refresh'];
    final isPublic = publicEndpoints.any((e) => options.path.contains(e));

    if (!isPublic) {
      final token = await _secureStorage.read(key: AppConstants.accessTokenKey);
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    handler.next(err);
  }
}

/// Intercepts 401 responses, asks the auth layer to rotate tokens,
/// then retries the original request once with the new access token.
/// Multiple concurrent 401s share a single refresh (single-flight) so
/// we never hammer `/auth/refresh`.
class _RefreshOn401Interceptor extends Interceptor {
  final FlutterSecureStorage _secureStorage;
  final TokenRefresher refresher;

  /// In-flight refresh future, shared across all interceptors until
  /// it resolves. `null` means "no refresh currently happening".
  Future<String?>? _pendingRefresh;

  _RefreshOn401Interceptor({
    required FlutterSecureStorage secureStorage,
    required this.refresher,
  }) : _secureStorage = secureStorage;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final res = err.response;
    final is401 = res?.statusCode == 401;

    // Public endpoints that fail with 401 should bubble up; we never
    // want to recursively call /refresh from inside a refresh attempt.
    final path = err.requestOptions.path;
    final isAuthPath = path.contains('/auth/login') ||
        path.contains('/auth/register') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/logout');

    final alreadyRetried =
        err.requestOptions.extra['retriedAfterRefresh'] == true;

    if (!is401 || isAuthPath || alreadyRetried) {
      return handler.next(err);
    }

    try {
      final newToken = await _getOrStartRefresh();
      if (newToken == null || newToken.isEmpty) {
        return handler.next(err);
      }
      // Clone the original request and mark it so we don't loop.
      final retryOptions = Options(
        method: err.requestOptions.method,
        headers: Map.of(err.requestOptions.headers)
          ..['Authorization'] = 'Bearer $newToken',
        contentType: err.requestOptions.contentType,
        responseType: err.requestOptions.responseType,
        followRedirects: err.requestOptions.followRedirects,
        receiveDataWhenStatusError: err.requestOptions.receiveDataWhenStatusError,
        extra: {
          ...err.requestOptions.extra,
          'retriedAfterRefresh': true,
        },
      );

      final dio = err.requestOptions.headers.isNotEmpty
          ? Dio(BaseOptions(
              baseUrl: err.requestOptions.baseUrl,
              headers: Map.of(err.requestOptions.headers)
                ..['Authorization'] = 'Bearer $newToken',
            ))
          : Dio(BaseOptions(baseUrl: err.requestOptions.baseUrl));

      final response = await dio.fetch<dynamic>(
        Options(
          method: err.requestOptions.method,
          headers: retryOptions.headers,
          contentType: retryOptions.contentType,
          responseType: retryOptions.responseType,
        ).copyWith(
          extra: retryOptions.extra,
        ).compose(
          dio.options,
          err.requestOptions.path,
          queryParameters: err.requestOptions.queryParameters,
          data: err.requestOptions.data,
        ),
      );
      return handler.resolve(response);
    } catch (_) {
      // Refresh itself failed — surface the original 401.
      return handler.next(err);
    }
  }

  /// Returns the new access token, sharing one in-flight refresh
  /// across every concurrent 401.
  Future<String?> _getOrStartRefresh() {
    return _pendingRefresh ??= _doRefresh().whenComplete(() {
      _pendingRefresh = null;
    });
  }

  Future<String?> _doRefresh() async {
    try {
      final newToken = await refresher();
      if (newToken == null) return null;
      return newToken;
    } catch (_) {
      return null;
    }
  }
}

class _RetryInterceptor extends Interceptor {
  final Dio _dio;

  _RetryInterceptor(this._dio);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Only retry transient network timeout errors once
    final isRetry = err.requestOptions.extra['isRetry'] == true;
    if (!isRetry && _shouldRetry(err)) {
      try {
        err.requestOptions.extra['isRetry'] = true;
        final response = await _dio.fetch(err.requestOptions);
        handler.resolve(response);
        return;
      } catch (e) {
        // Retry failed, proceed to normal error handler
      }
    }
    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout;
  }
}
