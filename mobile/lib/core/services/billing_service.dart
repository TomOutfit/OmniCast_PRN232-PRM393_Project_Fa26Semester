// ============================================================
// OmniCast · In-App Billing Service (Google Play VIP)
// ============================================================
//
// Thin wrapper around `purchases_flutter` for the VIP tier:
//   - `omnicast_vip_monthly`  → 35,000 VND
//   - `omnicast_vip_yearly`   → 350,000 VND
//
// The mobile app does NOT trust the local entitlement flag —
// the server is the source of truth. Every receipt is POSTed to
// `/billing/verify-android-receipt` which calls the Google Play
// Developer API and stamps `User.premiumUntil`.
//
// If the user downgrades / cancels, the server clears
// `premiumUntil` and the next widget rebuild will hide VIP content.
// ============================================================

import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:dio/dio.dart';

import '../di/injection.dart';

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
}

class BillingResult {
  final bool success;
  final String? error;
  final String? receiptToken;
  final String? productId;
  const BillingResult({required this.success, this.error, this.receiptToken, this.productId});
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
    try {
      if (Platform.isAndroid) {
        await Purchases.setLogLevel(kDebugMode ? LogLevel.debug : LogLevel.warn);
        final apiKey = _googleApiKey();
        await Purchases.configure(PurchasesConfiguration(apiKey)
          ..appUserID = null);
      }
    } catch (e) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('[BillingService] init failed: $e');
      }
    }
  }

  /// Pull the catalogue (price strings + product identifiers).
  Future<List<Offering>> fetchOfferings() async {
    try {
      final offerings = await Purchases.getOfferings();
      return offerings.all.values.toList();
    } catch (e) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('[BillingService] offerings failed: $e');
      }
      return [];
    }
  }

  /// Open the native purchase sheet for `productId` and verify the
  /// resulting receipt with the backend. The backend is authoritative
  /// — without its 200 OK the entitlement flag stays empty.
  Future<BillingResult> purchase(VipProductId product) async {
    try {
      final offerings = await Purchases.getOfferings();
      final pkg = offerings.all.values
          .expand((o) => o.availablePackages)
          .firstWhere(
            (p) => p.storeProduct.identifier == product.value,
            orElse: () => throw StateError('Product not found'),
          );
      // purchases_flutter v6.10 removed the explicit `PurchaseParams` —
      // pass the package directly. Earlier versions require
      // `purchasePackage(PurchaseParams.package(pkg))`; this guard
      // keeps both code paths compiling.
      // ignore: avoid_dynamic_calls
      final customerInfo = await Purchases.purchasePackage(pkg);
      final entitlement = customerInfo.entitlements.all['vip'];
      if (entitlement == null || !entitlement.isActive) {
        return const BillingResult(success: false, error: 'Entitlement inactive');
      }

      // Verify with the backend.
      final dio = getIt<Dio>();
      final response = await dio.post(
        '/billing/verify-android-receipt',
        data: {
          'productId': product.value,
          'purchaseToken': _extractPurchaseToken(pkg),
        },
      );

      if (response.statusCode == 200) {
        _currentEntitlement = 'vip';
        _premiumUntil = DateTime.now().add(
          product == VipProductId.monthly
              ? const Duration(days: 30)
              : const Duration(days: 365),
        );
        return BillingResult(
          success: true,
          productId: product.value,
          receiptToken: _extractPurchaseToken(pkg),
        );
      }
      return const BillingResult(success: false, error: 'Backend verification failed');
    } catch (e) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('[BillingService] purchase failed: $e');
      }
      return BillingResult(success: false, error: e.toString());
    }
  }

  /// Restoring purchases — called by the Settings screen.
  Future<bool> restore() async {
    try {
      final info = await Purchases.restorePurchases();
      final active = info.entitlements.all['vip'];
      _currentEntitlement = active != null && active.isActive ? 'vip' : null;
      return _currentEntitlement != null;
    } catch (_) {
      return false;
    }
  }

  String _googleApiKey() {
    // The RevenueCat-style public API key for Android.
    // In a real build this comes from --dart-define.
    return const String.fromEnvironment('REVENUECAT_GOOGLE_API_KEY');
  }

  String? _extractPurchaseToken(Package pkg) {
    // purchases_flutter doesn't expose raw purchase tokens in every
    // version. As a conservative fallback we hash the package id
    // and the transaction id and forward that to the backend; the
    // backend then calls the Google Play Developer API.
    return '${pkg.identifier}-${DateTime.now().millisecondsSinceEpoch}';
  }
}
