// OmniCast - Dependency Injection Setup

import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';

import '../network/dio_client.dart';
import '../services/notification_service.dart';
import '../constants/app_constants.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/channels_repository.dart';
import '../../data/repositories/programs_repository.dart';
import '../../data/repositories/search_repository.dart';
import '../../data/repositories/watchlist_repository.dart';
import '../../data/datasources/local/database_helper.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/channels/channels_bloc.dart';
import '../../logic/programs/programs_bloc.dart';
import '../../logic/recordings/recordings_bloc.dart';
import '../../logic/epg/epg_bloc.dart';
import '../../logic/search/search_bloc.dart';
import '../../logic/watchlist/watchlist_bloc.dart';

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
    () => ChannelsRepository(dioClient: getIt<DioClient>()),
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
}
