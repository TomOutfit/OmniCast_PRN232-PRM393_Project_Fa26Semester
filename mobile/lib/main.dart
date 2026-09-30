// OmniCast - Main Application Entry Point

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/di/injection.dart';
import 'core/i18n/app_locale.dart';
import 'core/i18n/strings.dart';
import 'core/services/notification_service.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/token_storage_helper.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/channels/channels_bloc.dart';
import 'logic/programs/programs_bloc.dart';
import 'logic/epg/epg_bloc.dart';
import 'logic/search/search_bloc.dart';
import 'logic/watchlist/watchlist_bloc.dart';
import 'presentation/navigation/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style (will be re-applied per theme)
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

  // Initialize notification service
  await getIt<NotificationService>().initialize();
  await getIt<NotificationService>().requestPermissions();

  // Hydrate theme + locale from secure storage
  final storage = TokenStorageHelper();
  final themeModeRaw = await storage.getThemeMode();
  final themeMode = _themeModeFromString(themeModeRaw);
  final localeRaw = await storage.getLocale();
  final locale = AppLocale.fromCode(localeRaw);

  runApp(OmniCastApp(
    themeMode: themeMode,
    locale: locale,
  ));
}

ThemeMode _themeModeFromString(String? raw) {
  switch (raw) {
    case 'light':
      return ThemeMode.light;
    case 'system':
      return ThemeMode.system;
    case 'dark':
    default:
      return ThemeMode.dark;
  }
}

String _themeModeToString(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'light';
    case ThemeMode.system:
      return 'system';
    case ThemeMode.dark:
      return 'dark';
  }
}

class OmniCastApp extends StatefulWidget {
  final ThemeMode themeMode;
  final AppLocale locale;

  const OmniCastApp({
    super.key,
    required this.themeMode,
    required this.locale,
  });

  @override
  State<OmniCastApp> createState() => _OmniCastAppState();
}

class _OmniCastAppState extends State<OmniCastApp> {
  late final AppLocaleProvider _localeProvider =
      AppLocaleProvider(widget.locale);
  late final AppThemeModeProvider _themeModeProvider =
      AppThemeModeProvider(widget.themeMode);

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
      child: AppLocaleScope(
        provider: _localeProvider,
        child: AppThemeModeScope(
          provider: _themeModeProvider,
          child: Builder(
            builder: (context) {
              final mode = appThemeModeOf(context);
              final locale = appLocaleOf(context);
              return MaterialApp.router(
                title: 'OmniCast',
                debugShowCheckedModeBanner: false,
                theme: AppTheme.lightTheme,
                darkTheme: AppTheme.darkTheme,
                themeMode: mode,
                locale: locale.toFlutterLocale(),
                supportedLocales: AppLocale.values
                    .map((l) => l.toFlutterLocale())
                    .toList(),
                localizationsDelegates: const [
                  GlobalMaterialLocalizations.delegate,
                  GlobalWidgetsLocalizations.delegate,
                  GlobalCupertinoLocalizations.delegate,
                ],
                routerConfig: AppRouter.router,
              );
            },
          ),
        ),
      ),
    );
  }

  /// Public so child widgets can call when the user changes settings.
  void setLocale(AppLocale next) {
    _localeProvider.setLocale(next);
    TokenStorageHelper().saveLocale(next.code);
  }

  void setThemeMode(ThemeMode next) {
    _themeModeProvider.setMode(next);
    TokenStorageHelper().saveThemeMode(_themeModeToString(next));
    // Re-apply system UI overlay style for the new brightness.
    if (next == ThemeMode.light ||
        (next == ThemeMode.system &&
            WidgetsBinding.instance.platformDispatcher.platformBrightness ==
                Brightness.light)) {
      SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          systemNavigationBarColor: Color(0xFFFFFFFF),
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
      );
    } else {
      SystemChrome.setSystemUIOverlayStyle(
        const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          systemNavigationBarColor: Color(0xFF020617),
          systemNavigationBarIconBrightness: Brightness.light,
        ),
      );
    }
  }
}
