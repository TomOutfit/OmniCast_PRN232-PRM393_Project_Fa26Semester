// OmniCast - Main Screen with Cyber-Dark Glass Bottom Navigation
// Features sleek active glow pills, high-contrast cyan accents, and
// seamless routing across all primary tabs.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainScreen extends StatefulWidget {
  final Widget child;

  const MainScreen({super.key, required this.child});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final _navItems = const [
    _NavItem(
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
      label: 'Trang chủ',
      path: '/home',
    ),
    _NavItem(
      icon: Icons.calendar_today_outlined,
      activeIcon: Icons.calendar_month_rounded,
      label: 'EPG Lịch',
      path: '/epg',
    ),
    _NavItem(
      icon: Icons.tv_outlined,
      activeIcon: Icons.tv_rounded,
      label: 'Kênh TV',
      path: '/channels',
    ),
    _NavItem(
      icon: Icons.video_library_outlined,
      activeIcon: Icons.video_library_rounded,
      label: 'Kho VOD',
      path: '/recordings',
    ),
    _NavItem(
      icon: Icons.search_rounded,
      activeIcon: Icons.search_rounded,
      label: 'Tìm kiếm',
      path: '/search',
    ),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateCurrentIndex();
  }

  void _updateCurrentIndex() {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _navItems.indexWhere((item) => item.path == location);
    if (index != -1 && index != _currentIndex) {
      setState(() => _currentIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      body: widget.child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF090F1A),
          border: Border(
            top: BorderSide(color: Color(0xFF162338), width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Color(0x66000000),
              blurRadius: 20,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_navItems.length, (index) {
                final item = _navItems[index];
                final isSelected = _currentIndex == index;

                return Expanded(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () {
                        setState(() => _currentIndex = index);
                        context.go(item.path);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Icon with glowing effect if active
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                if (isSelected)
                                  Container(
                                    width: 38,
                                    height: 26,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF00E5FF)
                                          .withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(13),
                                      boxShadow: const [
                                        BoxShadow(
                                          color: Color(0x3300E5FF),
                                          blurRadius: 10,
                                        ),
                                      ],
                                    ),
                                  ),
                                Icon(
                                  isSelected ? item.activeIcon : item.icon,
                                  color: isSelected
                                      ? const Color(0xFF00E5FF)
                                      : const Color(0xFF64748B),
                                  size: 22,
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              item.label,
                              style: TextStyle(
                                color: isSelected
                                    ? const Color(0xFF00E5FF)
                                    : const Color(0xFF64748B),
                                fontSize: 10,
                                fontWeight: isSelected
                                    ? FontWeight.w800
                                    : FontWeight.w500,
                                letterSpacing: 0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String path;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.path,
  });
}