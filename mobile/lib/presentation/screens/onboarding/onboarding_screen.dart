// ============================================================
// OmniCast · Onboarding Screens
// ============================================================
//
// 3-page swipe intro for first-time users. Stitch-aligned dark
// design. Skippable from top-right corner.
//
// Pages:
//   1. "Xem 25 kênh trực tiếp"
//   2. "AI Curator đề xuất lịch xem"
//   3. "Watchlist offline & nhắc trước 15 phút"
//
// After completion, `TokenStorageHelper.setOnboardingComplete()` is
// called and the user is pushed into the regular auth flow.
// ============================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/utils/token_storage_helper.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  static const List<_OnboardingPageData> _pages = [
    _OnboardingPageData(
      icon: Icons.live_tv_rounded,
      title: 'Xem 25 kênh trực tiếp',
      description:
          'Trực tiếp thể thao, tin tức, phim ảnh — chất lượng 4K HDR, không quảng cáo popup.',
      accent: Color(0xFF00F2FE),
    ),
    _OnboardingPageData(
      icon: Icons.auto_awesome_rounded,
      title: 'AI Curator đề xuất lịch xem',
      description:
          'Trợ lý AI phân tích sở thích của bạn để gợi ý chương trình và khung giờ phát sóng phù hợp nhất.',
      accent: Color(0xFF8B5CF6),
    ),
    _OnboardingPageData(
      icon: Icons.bookmark_added_rounded,
      title: 'Watchlist offline & nhắc trước 15 phút',
      description:
          'Lưu chương trình yêu thích để xem offline và nhận thông báo trước khi chương trình bắt đầu 15 phút.',
      accent: Color(0xFFF472B6),
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onNext() async {
    if (_currentIndex < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutCubic,
      );
    } else {
      await _completeOnboarding();
    }
  }

  Future<void> _completeOnboarding() async {
    try {
      await TokenStorageHelper().setOnboardingComplete();
    } catch (_) {
      // ignore — non-critical flag
    }
    if (!mounted) return;
    // After onboarding: send to login if not authed, otherwise home.
    // The router handles redirects; this is a fresh sign-up UX.
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFF050810),
      body: Stack(
        children: [
          // Ambient radial glow
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    _pages[_currentIndex].accent.withValues(alpha: 0.18),
                    const Color(0xFF050810),
                  ],
                  radius: 1.2,
                  center: Alignment.center,
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top bar: Skip
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        child: Text(
                          'OmniCast',
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                            color: _pages[_currentIndex].accent,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _completeOnboarding,
                        child: const Text(
                          'Bỏ qua',
                          style: TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // PageView
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: (i) => setState(() => _currentIndex = i),
                    itemCount: _pages.length,
                    itemBuilder: (context, idx) {
                      final p = _pages[idx];
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 32,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [
                                    p.accent.withValues(alpha: 0.30),
                                    p.accent.withValues(alpha: 0.05),
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                border: Border.all(
                                  color: p.accent.withValues(alpha: 0.40),
                                  width: 1.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: p.accent.withValues(alpha: 0.30),
                                    blurRadius: 30,
                                    spreadRadius: 4,
                                  ),
                                ],
                              ),
                              child: Icon(
                                p.icon,
                                color: p.accent,
                                size: 56,
                              ),
                            ),
                            const SizedBox(height: 36),
                            Text(
                              p.title,
                              textAlign: TextAlign.center,
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              p.description,
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: Colors.white60,
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Dot indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_pages.length, (idx) {
                    final isActive = idx == _currentIndex;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      height: 6,
                      width: isActive ? 28 : 6,
                      decoration: BoxDecoration(
                        color: isActive
                            ? _pages[_currentIndex].accent
                            : Colors.white24,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 28),

                // Next / Get Started button
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  child: SizedBox(
                    height: 54,
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _onNext,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _pages[_currentIndex].accent,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentIndex == _pages.length - 1
                            ? 'Bắt đầu ngay'
                            : 'Tiếp theo',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingPageData {
  final IconData icon;
  final String title;
  final String description;
  final Color accent;

  const _OnboardingPageData({
    required this.icon,
    required this.title,
    required this.description,
    required this.accent,
  });
}

// ============================================================
// Onboarding guard — call at app startup to decide which screen
// to navigate to. Use inside a FutureBuilder if you need to wait
// for the SecureStorage read.
// ============================================================
class OnboardingGuard {
  static Future<bool> shouldShowOnboarding() async {
    try {
      return !(await TokenStorageHelper().isOnboardingComplete());
    } catch (_) {
      return true;
    }
  }
}

// Convenience constants — re-export so consumers don't need to
// duplicate the string key.
const String kOnboardingRoute = AppConstants.onboardingKey;
