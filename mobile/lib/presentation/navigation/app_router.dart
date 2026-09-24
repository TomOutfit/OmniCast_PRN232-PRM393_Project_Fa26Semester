// OmniCast - App Navigation Router

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../logic/auth/auth_bloc.dart';
import '../../presentation/screens/splash_screen.dart';
import '../../presentation/screens/home/home_screen.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/auth/register_screen.dart';
import '../../presentation/screens/epg/epg_screen.dart';
import '../../presentation/screens/search/search_screen.dart';
import '../../presentation/screens/channels/channels_screen.dart';
import '../../presentation/screens/channels/channel_detail_screen.dart';
import '../../presentation/screens/channels/program_detail_screen.dart';
import '../../presentation/screens/watchlist/watchlist_screen.dart';
import '../../presentation/screens/profile/profile_screen.dart';
import '../../presentation/screens/studio/ai_curator_screen.dart';
import '../../presentation/screens/main_screen.dart';
import '../../data/models/channel_model.dart';
import '../../data/models/program_model.dart';

class AppRouter {
  static final _rootNavigatorKey = GlobalKey<NavigatorState>();
  static final _shellNavigatorKey = GlobalKey<NavigatorState>();

  static GoRouter get router => _router;

  static final GoRouter _router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final authState = context.read<AuthBloc>().state;
      final isLoggedIn = authState is Authenticated;
      final isOnAuth = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      // Allow splash screen
      if (state.matchedLocation == '/') {
        return null;
      }

      // If not logged in and not on auth screen, redirect to login
      if (!isLoggedIn && !isOnAuth) {
        return '/login';
      }

      // If logged in and on auth screen, redirect to home
      if (isLoggedIn && isOnAuth) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      // Detail screens outside shell for full-screen experience
      GoRoute(
        path: '/channel/:id',
        builder: (context, state) {
          final channelId = state.pathParameters['id']!;
          return ChannelDetailScreen(channelId: channelId);
        },
      ),
      GoRoute(
        path: '/program/:id',
        builder: (context, state) {
          final programId = state.pathParameters['id']!;
          return ProgramDetailScreen(programId: programId);
        },
      ),
      // Shell route with bottom navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => MainScreen(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: '/epg',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: EpgScreen(),
            ),
          ),
          GoRoute(
            path: '/search',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SearchScreen(),
            ),
          ),
          GoRoute(
            path: '/channels',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ChannelsScreen(),
            ),
          ),
          GoRoute(
            path: '/watchlist',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: WatchlistScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
      // Staff/Admin routes
      GoRoute(
        path: '/ai-curator',
        builder: (context, state) => const AICuratorScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              state.error?.message ?? 'Unknown error',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
}
