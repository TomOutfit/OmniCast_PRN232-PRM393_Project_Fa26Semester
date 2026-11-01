// ============================================================
// OmniCast Mobile - LAN & Universal Wi-Fi Discovery Tests
// ============================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:omnicast/core/constants/app_constants.dart';
import 'package:omnicast/core/services/lan_discovery_service.dart';

void main() {
  group('LanDiscoveryService & AppConstants Tests', () {
    setUp(() {
      AppConstants.setCustomMediaHost('');
      AppConstants.setDiscoveredMediaHost('');
    });

    test('mediaHost respects customMediaHost override', () {
      AppConstants.setCustomMediaHost('192.168.1.55');
      AppConstants.setDiscoveredMediaHost('10.0.0.1');

      expect(AppConstants.mediaHost, equals('192.168.1.55'));
    });

    test('mediaHost uses discoveredMediaHost when no custom host set', () {
      AppConstants.setDiscoveredMediaHost('omnicast-tunnel.trycloudflare.com');

      expect(AppConstants.mediaHost, equals('omnicast-tunnel.trycloudflare.com'));
      expect(AppConstants.mediaHostDisplay, equals('omnicast-tunnel.trycloudflare.com'));
    });

    test('mediaHost falls back gracefully when neither custom nor discovered exists', () {
      expect(AppConstants.mediaHost, isEmpty);
      expect(AppConstants.mediaHostDisplay, contains('chưa phát hiện'));
    });

    test('LanDiscoveryResult stores host, source and ports accurately', () {
      const res = LanDiscoveryResult(
        success: true,
        host: '192.168.1.99',
        hlsPort: 8888,
        whipPort: 8889,
        source: 'subnet_sweep',
        elapsed: Duration(milliseconds: 120),
      );

      expect(res.success, isTrue);
      expect(res.host, equals('192.168.1.99'));
      expect(res.hlsPort, equals(8888));
      expect(res.source, equals('subnet_sweep'));
      expect(res.toString(), contains('192.168.1.99:8888'));
    });
  });
}
