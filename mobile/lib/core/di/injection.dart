// OmniCast - Dependency Injection Setup

import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';

import '../network/dio_client.dart';
import '../services/notification_service.dart';
import '../constants/app_constants.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/channels_repository.dart';
import '../../data/repositories/live_studio_repository.dart';
import '../../data/repositories/programs_repository.dart';
import '../../data/repositories/search_repository.dart';
import '../../data/repositories/watchlist_repository.dart';
import '../../data/repositories/admin_repository.dart';
import '../../data/repositories/notifications_repository.dart';
import '../../data/repositories/newsletter_repository.dart';
import '../../data/repositories/ai_curator_repository.dart';
import '../../data/datasources/local/database_helper.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/channels/channels_bloc.dart';
import '../../logic/programs/programs_bloc.dart';
import '../../logic/recordings/recordings_bloc.dart';
import '../../logic/epg/epg_bloc.dart';
import '../../logic/epg/epg_sync_bloc.dart';
import '../../logic/search/search_bloc.dart';
import '../../logic/watchlist/watchlist_bloc.dart';
import '../../logic/notifications/notifications_bloc.dart';
import '../../logic/newsletter/newsletter_bloc.dart';

final getIt = GetIt.instance;

Future<void> initDependencies() async {
  // External
  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  );

  getIt.registerLazySingleton<Dio>(() => Dio());

  // Services
  getIt.registerLazySingleton<NotificationService>(
    () => NotificationService(),
  );

  // Network
  getIt.registerLazySingleton<DioClient>(
    () => DioClient(secureStorage: getIt<FlutterSecureStorage>()),
  );

  // Database
  getIt.registerLazySingleton<DatabaseHelper>(
    () => DatabaseHelper(),
  );

  // Repositories
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepository(
      dioClient: getIt<DioClient>(),
      secureStorage: getIt<FlutterSecureStorage>(),
      databaseHelper: getIt<DatabaseHelper>(),
      notificationService: getIt<NotificationService>(),
    ),
  );

  // Wire the 401 refresh callback now that both DioClient and
  // AuthRepository exist. The refresher returns the new access token
  // (or null if rotation failed, in which case the original 401 is
  // surfaced to the caller).
  getIt<DioClient>().setTokenRefresher(() async {
    try {
      await getIt<AuthRepository>().refreshToken();
      return getIt<FlutterSecureStorage>()
          .read(key: AppConstants.accessTokenKey);
    } catch (_) {
      return null;
    }
  });

  getIt.registerLazySingleton<ChannelsRepository>(
    () => ChannelsRepository(
      dioClient: getIt<DioClient>(),
      db: getIt<DatabaseHelper>(),
    ),
  );

  // Live Studio repository (Staff/Admin control surface for
  // Curated Live + Self-Record). Lazy singleton — most users
  // never reach this code path.
  getIt.registerLazySingleton<LiveStudioRepository>(
    () => LiveStudioRepository(dioClient: getIt<DioClient>()),
  );

  getIt.registerLazySingleton<ProgramsRepository>(
    () => ProgramsRepository(
      dioClient: getIt<DioClient>(),
      db: getIt<DatabaseHelper>(),
    ),
  );

  getIt.registerLazySingleton<SearchRepository>(
    () => SearchRepository(dioClient: getIt<DioClient>()),
  );

  getIt.registerLazySingleton<WatchlistRepository>(
    () => WatchlistRepository(
      dioClient: getIt<DioClient>(),
      db: getIt<DatabaseHelper>(),
    ),
  );

  getIt.registerLazySingleton<AdminRepository>(
    () => AdminRepository(dioClient: getIt<DioClient>()),
  );

  // Notifications — thin REST wrapper, JWT required
  getIt.registerLazySingleton<NotificationsRepository>(
    () => NotificationsRepository(dioClient: getIt<DioClient>()),
  );

  // Newsletter — public endpoint, no JWT needed
  getIt.registerLazySingleton<NewsletterRepository>(
    () => NewsletterRepository(dioClient: getIt<DioClient>()),
  );

  // AI Curator — Staff/Admin control surface for the 3-agent
  // content analysis pipeline. Mirrors `AiCuratorController`.
  getIt.registerLazySingleton<AiCuratorRepository>(
    () => AiCuratorRepository(dioClient: getIt<DioClient>()),
  );

  // BLoCs
  getIt.registerFactory<AuthBloc>(
    () => AuthBloc(authRepository: getIt<AuthRepository>()),
  );

  getIt.registerFactory<ChannelsBloc>(
    () => ChannelsBloc(channelsRepository: getIt<ChannelsRepository>()),
  );

  getIt.registerFactory<ProgramsBloc>(
    () => ProgramsBloc(programsRepository: getIt<ProgramsRepository>()),
  );

  getIt.registerFactory<EpgBloc>(
    () => EpgBloc(
      programsRepository: getIt<ProgramsRepository>(),
      db: getIt<DatabaseHelper>(),
    ),
  );

  getIt.registerFactory<EpgSyncBloc>(
    () => EpgSyncBloc(dioClient: getIt<DioClient>()),
  );

  getIt.registerFactory<SearchBloc>(
    () => SearchBloc(searchRepository: getIt<SearchRepository>()),
  );

  getIt.registerFactory<WatchlistBloc>(
    () => WatchlistBloc(
      databaseHelper: getIt<DatabaseHelper>(),
      notificationService: getIt<NotificationService>(),
      repository: getIt<WatchlistRepository>(),
    ),
  );

  getIt.registerFactory<RecordingsBloc>(
    () => RecordingsBloc(repository: getIt<ProgramsRepository>()),
  );

  // Notifications — singleton (the bell badge needs a shared
  // polling source across screens). Use a factory if you ever
  // want per-screen lifecycles, but right now we want one timer
  // and one cache.
  getIt.registerLazySingleton<NotificationsBloc>(
    () => NotificationsBloc(
      repository: getIt<NotificationsRepository>(),
    ),
  );

  // Newsletter — single shared form state for the settings page
  getIt.registerFactory<NewsletterBloc>(
    () => NewsletterBloc(
      repository: getIt<NewsletterRepository>(),
    ),
  );
}
