// ============================================================
// OmniCast · Onboarding Screen Tests
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:omnicast_mobile/presentation/screens/onboarding/onboarding_screen.dart';

void main() {
  testWidgets('Onboarding screen renders all 3 pages + skip button',
      (tester) async {
    final router = GoRouter(
      initialLocation: '/onboarding',
      routes: [
        GoRoute(
          path: '/onboarding',
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const Scaffold(body: Text('LOGIN')),
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp.router(routerConfig: router),
    );
    await tester.pumpAndSettle();

    // Page 1 content visible
    expect(find.text('Xem 25 kênh trực tiếp'), findsOneWidget);
    expect(find.text('Bỏ qua'), findsOneWidget);
    expect(find.text('Tiếp theo'), findsOneWidget);

    // Swipe to page 2
    await tester.tap(find.text('Tiếp theo'));
    await tester.pumpAndSettle();
    expect(find.text('AI Curator đề xuất lịch xem'), findsOneWidget);

    // Swipe to page 3 (last) — button should now be "Bắt đầu ngay"
    await tester.tap(find.text('Tiếp theo'));
    await tester.pumpAndSettle();
    expect(find.text('Watchlist offline & nhắc trước 15 phút'), findsOneWidget);
    expect(find.text('Bắt đầu ngay'), findsOneWidget);
  });

  testWidgets('Skip button jumps to login', (tester) async {
    String? currentRoute;
    final router = GoRouter(
      initialLocation: '/onboarding',
      routes: [
        GoRoute(
          path: '/onboarding',
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) {
            currentRoute = '/login';
            return const Scaffold(body: Text('LOGIN'));
          },
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bỏ qua'));
    await tester.pumpAndSettle();
    expect(currentRoute, '/login');
  });
}
