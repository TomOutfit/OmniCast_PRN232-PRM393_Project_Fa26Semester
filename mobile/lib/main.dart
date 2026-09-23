// OmniCast - Main Application Entry Point

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/di/injection.dart';
import 'core/theme/app_theme.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/channels/channels_bloc.dart';
import 'logic/programs/programs_bloc.dart';
import 'logic/epg/epg_bloc.dart';
import 'logic/search/search_bloc.dart';
import 'logic/watchlist/watchlist_bloc.dart';
import 'presentation/navigation/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF020617),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Lock orientation to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize dependencies
  await initDependencies();

  runApp(const OmniCastApp());
}

class OmniCastApp extends StatelessWidget {
  const OmniCastApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => getIt<AuthBloc>()..add(CheckAuthStatusEvent()),
        ),
        BlocProvider<ChannelsBloc>(
          create: (_) => getIt<ChannelsBloc>(),
        ),
        BlocProvider<ProgramsBloc>(
          create: (_) => getIt<ProgramsBloc>(),
        ),
        BlocProvider<EpgBloc>(
          create: (_) => getIt<EpgBloc>(),
        ),
        BlocProvider<SearchBloc>(
          create: (_) => getIt<SearchBloc>(),
        ),
        BlocProvider<WatchlistBloc>(
          create: (_) => getIt<WatchlistBloc>(),
        ),
      ],
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, authState) {
          return MaterialApp.router(
            title: 'OmniCast',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: ThemeMode.dark,
            routerConfig: AppRouter.router,
          );
        },
      ),
    );
  }
}
