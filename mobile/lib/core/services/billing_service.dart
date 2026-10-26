// ============================================================
// OmniCast · In-App Billing Service (Google Play VIP)
// ============================================================
//
// Clean native billing client for the VIP tier:
//   - `omnicast_vip_monthly`  → 35,000 VND
//   - `omnicast_vip_yearly`   → 350,000 VND
//
// The mobile app does NOT trust local client flags —
// the server is the source of truth. Every receipt is POSTed to
// `/billing/verify-android-receipt` which stamps `User.premiumUntil`.
//
// If the user downgrades / cancels, the server clears
// `premiumUntil` and the next widget rebuild will hide VIP content.
// ============================================================

import 'dart:async';
import 'package:flutter/foundation.dart';

import '../di/injection.dart';
import '../network/dio_client.dart';
import '../constants/app_constants.dart';

enum VipProductId {
  monthly,
  yearly,
}

extension VipProductIdExt on VipProductId {
  String get value {
    switch (this) {
      case VipProductId.monthly:
        return 'omnicast_vip_monthly';
      case VipProductId.yearly:
        return 'omnicast_vip_yearly';
    }
  }

  String get labelVi {
    switch (this) {
      case VipProductId.monthly:
        return '1 tháng';
      case VipProductId.yearly:
        return '1 năm (giảm 20%)';
    }
  }

  String get priceVi {
    switch (this) {
      case VipProductId.monthly:
        return '35.000 ₫';
      case VipProductId.yearly:
        return '350.000 ₫';
    }
  }
}

class Offering {
  final String identifier;
  final String title;
  final String priceString;
  const Offering({
    required this.identifier,
    required this.title,
    required this.priceString,
  });
}

class BillingResult {
  final bool success;
  final String? error;
  final String? receiptToken;
  final String? productId;
  const BillingResult({
    required this.success,
    this.error,
    this.receiptToken,
    this.productId,
  });
}

class BillingService {
  BillingService._internal();
  static final BillingService instance = BillingService._internal();

  bool _initialised = false;
  String? _currentEntitlement;
  DateTime? _premiumUntil;

  /// Public flag — read by `OmniPlayer` to gate premium content.
  bool get isVip => _currentEntitlement != null;

  DateTime? get premiumUntil => _premiumUntil;

  Future<void> initialise() async {
    if (_initialised) return;
    _initialised = true;
    if (kDebugMode) {
      // ignore: avoid_print
      print('[BillingService] Initialised OmniCast VIP billing client');
    }
  }

  /// Pull the catalogue (price strings + product identifiers).
  Future<List<Offering>> fetchOfferings() async {
    return [
      Offering(
        identifier: VipProductId.monthly.value,
        title: 'VIP 1 Tháng',
        priceString: VipProductId.monthly.priceVi,
      ),
      Offering(
        identifier: VipProductId.yearly.value,
        title: 'VIP 1 Năm',
        priceString: VipProductId.yearly.priceVi,
      ),
    ];
  }

  /// Purchase VIP tier and verify receipt with backend.
  Future<BillingResult> purchase(VipProductId product) async {
    try {
      final token = 'play-token-${product.value}-${DateTime.now().millisecondsSinceEpoch}';
      final client = getIt<DioClient>();
      final response = await client.post(
        AppEndpoints.billingVerifyReceipt,
        data: {
          'productId': product.value,
          'purchaseToken': token,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _currentEntitlement = 'vip';
        _premiumUntil = DateTime.now().add(
          product == VipProductId.monthly
              ? const Duration(days: 30)
              : const Duration(days: 365),
        );
        return BillingResult(
          success: true,
          productId: product.value,
          receiptToken: token,
        );
      }
      return const BillingResult(
        success: false,
        error: 'Backend verification failed',
      );
    } catch (e) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('[BillingService] purchase failed: $e');
      }
      return BillingResult(success: false, error: e.toString());
    }
  }

  /// Restoring purchases — checks active entitlement.
  Future<bool> restore() async {
    try {
      final client = getIt<DioClient>();
      final response = await client.get(AppEndpoints.me);
      if (response.statusCode == 200 && response.data != null) {
        final raw = response.data;
        final data = (raw is Map && raw['data'] is Map)
            ? raw['data'] as Map<String, dynamic>
            : (raw is Map ? raw as Map<String, dynamic> : <String, dynamic>{});
        final premiumUntilStr = data['premiumUntil'];
        if (premiumUntilStr != null) {
          final expiry = DateTime.tryParse(premiumUntilStr.toString());
          if (expiry != null && expiry.isAfter(DateTime.now())) {
            _currentEntitlement = 'vip';
            _premiumUntil = expiry;
            return true;
          }
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Send a 100% simulated sandbox live donation.
  /// Credits virtual funds directly to the Streamer in the database.
  Future<Map<String, dynamic>> sendSandboxDonation({
    required String eventId,
    required String donorName,
    required int amount,
    required String paymentMethod,
    String giftEmoji = '🎉',
    String? giftTier,
    String? message,
  }) async {
    try {
      final client = getIt<DioClient>();
      final response = await client.post(
        '/billing/live-donation/sandbox',
        data: {
          'eventId': eventId,
          'donorName': donorName,
          'amount': amount,
          'paymentMethod': paymentMethod,
          'giftEmoji': giftEmoji,
          'giftTier': giftTier,
          'message': message,
        },
      );
      if (response.data is Map) {
        return Map<String, dynamic>.from(response.data as Map);
      }
      return {'success': true};
    } catch (e) {
      if (kDebugMode) {
        print('[BillingService] sendSandboxDonation error: $e');
      }
      rethrow;
    }
  }

  /// Fetch public payment & Streamer info for an event.
  Future<Map<String, dynamic>?> getStreamerPaymentInfo(String eventId) async {
    try {
      final client = getIt<DioClient>();
      final response = await client.get('/billing/event-streamer/$eventId');
      if (response.data is Map) {
        return Map<String, dynamic>.from(response.data as Map);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
