// OmniCast - Offline Banner Widget
// Shows offline/connectivity status banner

import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

import '../../../core/theme/app_theme.dart';

class OfflineBanner extends StatefulWidget {
  final Widget child;
  final bool showAnimation;

  const OfflineBanner({
    super.key,
    required this.child,
    this.showAnimation = true,
  });

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isOffline = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _checkConnectivity();
    _listenToConnectivityChanges();
  }

  @override
  void dispose() {
    _controller.dispose();
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  void _checkConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    _updateConnectionStatus(result);
  }

  void _listenToConnectivityChanges() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(
      _updateConnectionStatus,
    );
  }

  void _updateConnectionStatus(List<ConnectivityResult> results) {
    final isConnected = results.isNotEmpty &&
        !results.contains(ConnectivityResult.none);

    if (isConnected != _isOffline) {
      setState(() {
        _isOffline = !isConnected;
      });

      if (_isOffline) {
        _controller.forward();
      } else {
        _controller.reverse();
        // Show "Back online" message briefly
        _showBackOnlineMessage();
      }
    }
  }

  void _showBackOnlineMessage() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.wifi, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Đã kết nối lại'),
          ],
        ),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        // Offline Banner
        AnimatedPositioned(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          top: _isOffline ? 0 : -60,
          left: 0,
          right: 0,
          child: _OfflineBannerContent(
            showAnimation: widget.showAnimation,
          ),
        ),
      ],
    );
  }
}

class _OfflineBannerContent extends StatelessWidget {
  final bool showAnimation;

  const _OfflineBannerContent({
    required this.showAnimation,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 16,
        right: 16,
        bottom: 8,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.warning.withOpacity(0.95),
            AppColors.warning.withOpacity(0.9),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.warning.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        bottom: false,
        child: Row(
          children: [
            if (showAnimation)
              const _WifiIcon()
            else
              const Icon(
                Icons.wifi_off,
                color: Colors.white,
                size: 20,
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Không có kết nối mạng',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    'Vui lòng kiểm tra kết nối WiFi hoặc dữ liệu di động',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'OFFLINE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WifiIcon extends StatefulWidget {
  const _WifiIcon();

  @override
  State<_WifiIcon> createState() => _WifiIconState();
}

class _WifiIconState extends State<_WifiIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Opacity(
          opacity: _animation.value,
          child: const Icon(
            Icons.wifi_off,
            color: Colors.white,
            size: 20,
          ),
        );
      },
    );
  }
}

// Simple offline indicator without banner
class OfflineIndicator extends StatelessWidget {
  final bool isOffline;

  const OfflineIndicator({
    super.key,
    required this.isOffline,
  });

  @override
  Widget build(BuildContext context) {
    if (!isOffline) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.9),
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.wifi_off,
            color: Colors.white,
            size: 12,
          ),
          SizedBox(width: 4),
          Text(
            'Offline',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// Connection status chip
class ConnectionStatusChip extends StatelessWidget {
  const ConnectionStatusChip({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ConnectivityResult>>(
      stream: Connectivity().onConnectivityChanged,
      initialData: [ConnectivityResult.none],
      builder: (context, snapshot) {
        final isOffline = snapshot.data?.contains(ConnectivityResult.none) ?? true;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: isOffline
                ? AppColors.warning.withOpacity(0.2)
                : AppColors.success.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isOffline ? AppColors.warning : AppColors.success,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isOffline ? Icons.wifi_off : Icons.wifi,
                color: isOffline ? AppColors.warning : AppColors.success,
                size: 14,
              ),
              const SizedBox(width: 4),
              Text(
                isOffline ? 'Offline' : 'Online',
                style: TextStyle(
                  color: isOffline ? AppColors.warning : AppColors.success,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
