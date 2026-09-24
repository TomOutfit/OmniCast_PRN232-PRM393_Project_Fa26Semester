// OmniCast - Token Storage Helper
// Secure storage wrapper for JWT tokens and user data

import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/constants/app_constants.dart';
import '../../data/models/user_model.dart';

class TokenStorageHelper {
  static final TokenStorageHelper _instance = TokenStorageHelper._internal();
  factory TokenStorageHelper() => _instance;
  TokenStorageHelper._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // Token Operations
  Future<void> saveAccessToken(String token) async {
    await _storage.write(key: AppConstants.accessTokenKey, value: token);
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: AppConstants.accessTokenKey);
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: AppConstants.refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: AppConstants.refreshTokenKey);
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      saveRefreshToken(refreshToken),
    ]);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: AppConstants.accessTokenKey),
      _storage.delete(key: AppConstants.refreshTokenKey),
    ]);
  }

  // User Operations
  Future<void> saveUser(UserModel user) async {
    final userJson = jsonEncode(user.toJson());
    await _storage.write(key: AppConstants.userKey, value: userJson);
  }

  Future<UserModel?> getUser() async {
    final userJson = await _storage.read(key: AppConstants.userKey);
    if (userJson == null) return null;

    try {
      final userData = jsonDecode(userJson) as Map<String, dynamic>;
      return UserModel.fromJson(userData);
    } catch (e) {
      // If parsing fails, clear corrupted data
      await clearUser();
      return null;
    }
  }

  Future<void> clearUser() async {
    await _storage.delete(key: AppConstants.userKey);
  }

  // Combined Auth Operations
  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> saveAuthData({
    required String accessToken,
    required String refreshToken,
    required UserModel user,
  }) async {
    await Future.wait([
      saveTokens(accessToken: accessToken, refreshToken: refreshToken),
      saveUser(user),
    ]);
  }

  Future<void> clearAuthData() async {
    await Future.wait([
      clearTokens(),
      clearUser(),
    ]);
  }

  // Onboarding
  Future<void> setOnboardingComplete() async {
    await _storage.write(key: AppConstants.onboardingKey, value: 'true');
  }

  Future<bool> isOnboardingComplete() async {
    final value = await _storage.read(key: AppConstants.onboardingKey);
    return value == 'true';
  }

  // Clear All Data
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}

// Extension for Auth Repository integration
extension TokenStorageHelperExtension on TokenStorageHelper {
  Future<Map<String, String>> getAuthHeaders() async {
    final token = await getAccessToken();
    if (token == null) return {};
    return {'Authorization': 'Bearer $token'};
  }
}
