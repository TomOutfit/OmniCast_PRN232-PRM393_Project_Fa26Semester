// OmniCast - Connectivity Service

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:rxdart/rxdart.dart';

class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();
  
  // Stream controllers
  final _connectivityController = BehaviorSubject<bool>.seeded(true);
  final _connectionTypeController = BehaviorSubject<ConnectionType>.seeded(ConnectionType.wifi);

  // Streams
  Stream<bool> get connectivityStream => _connectivityController.stream;
  Stream<ConnectionType> get connectionTypeStream => _connectionTypeController.stream;

  // Current state
  bool get isOnline => _connectivityController.value;
  ConnectionType get currentConnectionType => _connectionTypeController.value;

  // Subscription
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  /// Initialize the connectivity service
  Future<void> init() async {
    // Check initial connectivity
    await _checkConnectivity();

    // Listen for changes
    _subscription = _connectivity.onConnectivityChanged.listen(_handleConnectivityChange);
  }

  /// Check current connectivity status
  Future<void> _checkConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();
      _handleConnectivityChange(results);
    } catch (e) {
      debugPrint('Connectivity check error: $e');
      _connectivityController.add(false);
    }
  }

  /// Handle connectivity changes
  void _handleConnectivityChange(List<ConnectivityResult> results) {
    final hasConnection = results.isNotEmpty && 
                          !results.contains(ConnectivityResult.none);
    
    _connectivityController.add(hasConnection);

    // Determine connection type
    if (!hasConnection) {
      _connectionTypeController.add(ConnectionType.none);
    } else if (results.contains(ConnectivityResult.wifi)) {
      _connectionTypeController.add(ConnectionType.wifi);
    } else if (results.contains(ConnectivityResult.mobile)) {
      _connectionTypeController.add(ConnectionType.mobile);
    } else if (results.contains(ConnectivityResult.ethernet)) {
      _connectionTypeController.add(ConnectionType.ethernet);
    } else {
      _connectionTypeController.add(ConnectionType.other);
    }
  }

  /// Manually check connectivity
  Future<bool> checkConnectivity() async {
    await _checkConnectivity();
    return isOnline;
  }

  /// Dispose resources
  void dispose() {
    _subscription?.cancel();
    _connectivityController.close();
    _connectionTypeController.close();
  }
}

enum ConnectionType {
  wifi,
  mobile,
  ethernet,
  none,
  other,
}

extension ConnectionTypeExtension on ConnectionType {
  String get displayName {
    switch (this) {
      case ConnectionType.wifi:
        return 'WiFi';
      case ConnectionType.mobile:
        return 'Mobile Data';
      case ConnectionType.ethernet:
        return 'Ethernet';
      case ConnectionType.none:
        return 'No Connection';
      case ConnectionType.other:
        return 'Other';
    }
  }

  String get icon {
    switch (this) {
      case ConnectionType.wifi:
        return 'wifi';
      case ConnectionType.mobile:
        return 'signal_cellular_alt';
      case ConnectionType.ethernet:
        return 'settings_ethernet';
      case ConnectionType.none:
        return 'wifi_off';
      case ConnectionType.other:
        return 'signal_wifi_connected_no_internet_4';
    }
  }

  bool get isWifi => this == ConnectionType.wifi;
  bool get isMobile => this == ConnectionType.mobile;
  bool get isOffline => this == ConnectionType.none;
}
