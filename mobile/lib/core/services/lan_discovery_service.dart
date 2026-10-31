// ============================================================
// OmniCast Mobile - Wi-Fi / LAN Auto-Discovery Service
// ============================================================
//
// Automatically detects and connects to the active MediaMTX & OmniCast
// server on the same Wi-Fi network with ZERO manual IP configuration.
//
// Multi-Tier Discovery Pipeline:
//   1. Backend LAN Discovery Endpoint (`GET /programs/studio/lan-discovery`)
//   2. UDP Broadcast Beacon Listener & Probe (port 8880)
//   3. High-Speed Subnet Candidate Sweep (port 8888 MediaMTX probe)
//   4. Local IP Cache & Persistent Memory
// ============================================================

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import '../constants/app_constants.dart';
import '../utils/token_storage_helper.dart';

class LanDiscoveryResult {
  final bool success;
  final String? host;
  final int hlsPort;
  final int whipPort;
  final String source;
  final Duration elapsed;

  const LanDiscoveryResult({
    required this.success,
    this.host,
    this.hlsPort = 8888,
    this.whipPort = 8889,
    required this.source,
    required this.elapsed,
  });

  @override
  String toString() =>
      'LanDiscoveryResult(success: $success, host: $host:$hlsPort, via: $source, elapsed: ${elapsed.inMilliseconds}ms)';
}

class LanDiscoveryService {
  static final LanDiscoveryService _instance = LanDiscoveryService._internal();
  factory LanDiscoveryService() => _instance;
  LanDiscoveryService._internal();

  bool _isScanning = false;
  bool get isScanning => _isScanning;

  String? _lastDiscoveredHost;
  String? get lastDiscoveredHost => _lastDiscoveredHost;

  final _discoveryController = StreamController<LanDiscoveryResult>.broadcast();
  Stream<LanDiscoveryResult> get onDiscovery => _discoveryController.stream;

  /// Inspect network interfaces on this mobile device to find its active Wi-Fi IPv4.
  Future<String?> getDeviceWifiIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLoopback: false,
      );

      for (final iface in interfaces) {
        final name = iface.name.toLowerCase();
        // Skip cellular/vpn if recognizable
        if (name.contains('tun') || name.contains('ppp') || name.contains('rmnet')) {
          continue;
        }

        for (final addr in iface.addresses) {
          final ip = addr.address;
          if (_isPrivateIpv4(ip)) {
            return ip;
          }
        }
      }

      // Fallback: any private IPv4
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (_isPrivateIpv4(addr.address)) {
            return addr.address;
          }
        }
      }
    } catch (e) {
      debugPrint('[LanDiscovery] Error retrieving device IP: $e');
    }
    return null;
  }

  /// Perform automatic discovery of the local MediaMTX streaming server.
  /// Seamlessly checks backend discovery, UDP beacon, and candidate ping.
  Future<LanDiscoveryResult> autoDiscoverMediaHost({Duration timeout = const Duration(seconds: 3)}) async {
    if (_isScanning) {
      if (_lastDiscoveredHost != null) {
        return LanDiscoveryResult(
          success: true,
          host: _lastDiscoveredHost,
          source: 'in_progress_cached',
          elapsed: Duration.zero,
        );
      }
    }

    _isScanning = true;
    final stopwatch = Stopwatch()..start();

    try {
      // 0. Quick check: Is current mediaHost already reachable on Wi-Fi?
      final currentHost = AppConstants.mediaHost;
      if (currentHost.isNotEmpty && currentHost != 'localhost' && currentHost != '127.0.0.1') {
        final ok = await _probeMediaMtx(currentHost, 8888, timeout: const Duration(milliseconds: 350));
        if (ok) {
          _lastDiscoveredHost = currentHost;
          stopwatch.stop();
          final res = LanDiscoveryResult(
            success: true,
            host: currentHost,
            source: 'verified_current',
            elapsed: stopwatch.elapsed,
          );
          _discoveryController.add(res);
          return res;
        }
      }

      // 1. Vector 1: Check backend LAN discovery endpoint (fastest, authoritative)
      final backendResult = await _probeBackendLanDiscovery(timeout: const Duration(milliseconds: 800));
      if (backendResult != null) {
        final verified = await _probeMediaMtx(backendResult, 8888, timeout: const Duration(milliseconds: 400));
        if (verified) {
          _applyDiscoveredHost(backendResult);
          stopwatch.stop();
          final res = LanDiscoveryResult(
            success: true,
            host: backendResult,
            source: 'backend_api',
            elapsed: stopwatch.elapsed,
          );
          _discoveryController.add(res);
          return res;
        }
      }

      // 2. Vector 2: UDP Broadcast Beacon Listener (port 8880)
      final udpResult = await _probeUdpBroadcast(timeout: const Duration(milliseconds: 800));
      if (udpResult != null) {
        _applyDiscoveredHost(udpResult);
        stopwatch.stop();
        final res = LanDiscoveryResult(
          success: true,
          host: udpResult,
          source: 'udp_beacon',
          elapsed: stopwatch.elapsed,
        );
        _discoveryController.add(res);
        return res;
      }

      // 3. Vector 3: Smart Subnet Candidate Sweep
      final deviceIp = await getDeviceWifiIp();
      if (deviceIp != null) {
        final parts = deviceIp.split('.');
        if (parts.length == 4) {
          final subnet = '${parts[0]}.${parts[1]}.${parts[2]}';
          final deviceLastOctet = int.tryParse(parts[3]) ?? 0;

          // Prime candidates in the local Wi-Fi subnet
          final candidates = <String>{
            '$subnet.1', // Default Gateway / Router
            '$subnet.162', // Host machine detected in FA26 lab
            '$subnet.88', // Legacy static fallback
            '$subnet.100', // Common DHCP reservations
            '$subnet.101',
            '$subnet.2',
            '$subnet.10',
            '$subnet.20',
            '$subnet.50',
          };

          // Also check neighbor IPs around this mobile device
          if (deviceLastOctet > 1) {
            candidates.add('$subnet.${deviceLastOctet - 1}');
            candidates.add('$subnet.${deviceLastOctet + 1}');
          }

          // Probe all candidates concurrently with fast timeouts
          final sweepFutures = candidates.map((host) async {
            final isAlive = await _probeMediaMtx(host, 8888, timeout: const Duration(milliseconds: 600));
            return isAlive ? host : null;
          });

          final results = await Future.wait(sweepFutures);
          final found = results.firstWhere((h) => h != null, orElse: () => null);

          if (found != null) {
            _applyDiscoveredHost(found);
            stopwatch.stop();
            final res = LanDiscoveryResult(
              success: true,
              host: found,
              source: 'subnet_sweep',
              elapsed: stopwatch.elapsed,
            );
            _discoveryController.add(res);
            return res;
          }
        }
      }

      stopwatch.stop();
      return LanDiscoveryResult(
        success: false,
        host: currentHost,
        source: 'unreachable',
        elapsed: stopwatch.elapsed,
      );
    } finally {
      _isScanning = false;
    }
  }

  void _applyDiscoveredHost(String host) {
    _lastDiscoveredHost = host;
    AppConstants.setDiscoveredMediaHost(host);
    // Remember the host so the next app launch can play immediately,
    // without waiting for the discovery sweep to complete.
    unawaited(TokenStorageHelper().saveDiscoveredMediaHost(host));
    debugPrint('[LanDiscovery] ⚡ Successfully auto-connected to MediaMTX at $host:8888 (Wi-Fi Auto-Discovery)');
  }

  /// Restore the MediaMTX host remembered from the previous run.
  ///
  /// Called during startup so the first player already points at the
  /// right machine. The host is verified afterwards by
  /// [autoDiscoverMediaHost], which replaces it if it is stale.
  Future<String?> restorePersistedHost() async {
    try {
      final persisted = await TokenStorageHelper().getDiscoveredMediaHost();
      if (persisted != null && persisted.trim().isNotEmpty) {
        AppConstants.setDiscoveredMediaHost(persisted.trim());
        _lastDiscoveredHost = persisted.trim();
        debugPrint('[LanDiscovery] ♻️ Restored persisted media host: $persisted');
        return persisted.trim();
      }
    } catch (e) {
      debugPrint('[LanDiscovery] Could not restore persisted host: $e');
    }
    return null;
  }

  /// Probe a specific host on a port to see if MediaMTX is active.
  Future<bool> _probeMediaMtx(String host, int port, {Duration timeout = const Duration(milliseconds: 400)}) async {
    HttpClient? client;
    try {
      client = HttpClient()..connectionTimeout = timeout;
      final uri = Uri.parse('http://$host:$port/');
      final request = await client.getUrl(uri).timeout(timeout);
      final response = await request.close().timeout(timeout);

      // MediaMTX typically returns 404 Not Found (or 200/302) on root "/"
      // Any HTTP response proves a web server is answering on this port.
      final serverHeader = response.headers.value('server')?.toLowerCase() ?? '';
      if (serverHeader.contains('mediamtx') || response.statusCode == 404 || response.statusCode == 200) {
        return true;
      }
      return true;
    } catch (_) {
      return false;
    } finally {
      client?.close(force: true);
    }
  }

  /// Query the backend's `/programs/studio/lan-discovery` endpoint.
  Future<String?> _probeBackendLanDiscovery({required Duration timeout}) async {
    HttpClient? client;
    try {
      client = HttpClient()..connectionTimeout = timeout;
      final base = AppConstants.baseUrl;
      final uri = Uri.parse('$base/programs/studio/lan-discovery');
      final request = await client.getUrl(uri).timeout(timeout);
      final response = await request.close().timeout(timeout);

      if (response.statusCode == 200) {
        final text = await response.transform(utf8.decoder).join();
        final map = jsonDecode(text);
        if (map is Map) {
          // The API wraps every payload in an envelope:
          //   { success, statusCode, data: { lanIp, publicHost, ... } }
          // so the fields live one level down. Older builds read them
          // from the top level, which made this tier ALWAYS fail and
          // silently fall through to the slower UDP / subnet probes.
          final payload = (map['data'] is Map) ? map['data'] as Map : map;
          final lanIp = payload['lanIp']?.toString() ?? payload['publicHost']?.toString();
          if (lanIp != null && _isPrivateIpv4(lanIp)) {
            return lanIp;
          }
        }
      }
    } catch (_) {
      // Backend not yet reachable or on another host
    } finally {
      client?.close(force: true);
    }
    return null;
  }

  /// Send UDP broadcast on port 8880 and listen for OmniCast responder beacon.
  Future<String?> _probeUdpBroadcast({required Duration timeout}) async {
    RawDatagramSocket? socket;
    try {
      socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
      socket.broadcastEnabled = true;

      final data = utf8.encode('OMNICAST_DISCOVER');
      socket.send(data, InternetAddress('255.255.255.255'), 8880);

      final completer = Completer<String?>();
      late StreamSubscription sub;

      sub = socket.listen((RawSocketEvent event) {
        if (event == RawSocketEvent.read) {
          final datagram = socket?.receive();
          if (datagram != null) {
            try {
              final text = utf8.decode(datagram.data);
              final map = jsonDecode(text);
              if (map is Map && map['app'] == 'omnicast') {
                final lanIp = map['lanIp']?.toString();
                if (lanIp != null && _isPrivateIpv4(lanIp)) {
                  sub.cancel();
                  if (!completer.isCompleted) completer.complete(lanIp);
                }
              }
            } catch (_) {}
          }
        }
      });

      return await completer.future.timeout(timeout, onTimeout: () {
        sub.cancel();
        return null;
      });
    } catch (_) {
      return null;
    } finally {
      socket?.close();
    }
  }

  /// True for any usable local IPv4 address.
  ///
  /// The old check only accepted RFC1918 ranges (`10/8`, `192.168/16`,
  /// `172.16/12`). Many campus / lab networks hand out addresses in
  /// `172.9.x` — which is OUTSIDE `172.16/12` and therefore looked
  /// "public" — so the discovery silently rejected the very server it
  /// was looking for. We now accept every literal IPv4 except
  /// loopback and link-local.
  static bool _isPrivateIpv4(String ip) {
    if (ip.isEmpty) return false;
    if (ip == 'localhost' || ip == '127.0.0.1' || ip == '::1') return false;
    if (ip.startsWith('169.254.')) return false;
    return RegExp(r'^\d{1,3}(\.\d{1,3}){3}$').hasMatch(ip);
  }
}

