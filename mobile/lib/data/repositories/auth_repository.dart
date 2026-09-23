// OmniCast - Auth Repository

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/network/dio_client.dart';
import '../../core/constants/app_constants.dart';
import '../models/user_model.dart';

class AuthRepository {
  final DioClient _dioClient;
  final FlutterSecureStorage _secureStorage;

  AuthRepository({
    required DioClient dioClient,
    required FlutterSecureStorage secureStorage,
  })  : _dioClient = dioClient,
        _secureStorage = secureStorage;

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final response = await _dioClient.post(
      AppEndpoints.login,
      data: {
        'email': email,
        'password': password,
      },
    );

    final data = response.data['data'];
    final authResponse = AuthResponse.fromJson(data);

    // Store tokens
    await _secureStorage.write(
      key: AppConstants.accessTokenKey,
      value: authResponse.accessToken,
    );
    await _secureStorage.write(
      key: AppConstants.refreshTokenKey,
      value: authResponse.refreshToken,
    );
    await _secureStorage.write(
      key: AppConstants.userKey,
      value: authResponse.user.toJson().toString(),
    );

    return authResponse;
  }

  Future<AuthResponse> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final response = await _dioClient.post(
      AppEndpoints.register,
      data: {
        'email': email,
        'password': password,
        'fullName': fullName,
      },
    );

    final data = response.data['data'];
    final authResponse = AuthResponse.fromJson(data);

    // Store tokens
    await _secureStorage.write(
      key: AppConstants.accessTokenKey,
      value: authResponse.accessToken,
    );
    await _secureStorage.write(
      key: AppConstants.refreshTokenKey,
      value: authResponse.refreshToken,
    );

    return authResponse;
  }

  Future<void> logout() async {
    try {
      await _dioClient.post(AppEndpoints.logout);
    } catch (_) {
      // Ignore logout errors
    } finally {
      await _secureStorage.delete(key: AppConstants.accessTokenKey);
      await _secureStorage.delete(key: AppConstants.refreshTokenKey);
      await _secureStorage.delete(key: AppConstants.userKey);
    }
  }

  Future<UserModel?> getCurrentUser() async {
    try {
      final token = await _secureStorage.read(key: AppConstants.accessTokenKey);
      if (token == null) return null;

      final response = await _dioClient.get(AppEndpoints.me);
      return UserModel.fromJson(response.data['data']);
    } catch (_) {
      return null;
    }
  }

  Future<void> refreshToken() async {
    final refreshToken = await _secureStorage.read(
      key: AppConstants.refreshTokenKey,
    );

    if (refreshToken == null) {
      throw Exception('No refresh token available');
    }

    final response = await _dioClient.post(
      AppEndpoints.refresh,
      data: {'refreshToken': refreshToken},
    );

    final data = response.data['data'];
    final authResponse = AuthResponse.fromJson(data);

    await _secureStorage.write(
      key: AppConstants.accessTokenKey,
      value: authResponse.accessToken,
    );
    await _secureStorage.write(
      key: AppConstants.refreshTokenKey,
      value: authResponse.refreshToken,
    );
  }

  Future<bool> isLoggedIn() async {
    final token = await _secureStorage.read(key: AppConstants.accessTokenKey);
    return token != null;
  }
}

class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final UserModel user;

  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
