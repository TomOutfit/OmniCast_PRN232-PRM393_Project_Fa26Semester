// OmniCast - Dependency Injection Setup

import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';

import '../network/dio_client.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/channels_repository.dart';
import '../../data/repositories/programs_repository.dart';
import '../../data/repositories/search_repository.dart';
import '../../data/datasources/local/database_helper.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/channels/channels_bloc.dart';
import '../../logic/programs/programs_bloc.dart';
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
    ),
  );

  getIt.registerLazySingleton<ChannelsRepository>(
    () => ChannelsRepository(dioClient: getIt<DioClient>()),
  );

  getIt.registerLazySingleton<ProgramsRepository>(
    () => ProgramsRepository(dioClient: getIt<DioClient>()),
  );

  getIt.registerLazySingleton<SearchRepository>(
    () => SearchRepository(dioClient: getIt<DioClient>()),
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
    () => EpgBloc(programsRepository: getIt<ProgramsRepository>()),
  );

  getIt.registerFactory<SearchBloc>(
    () => SearchBloc(searchRepository: getIt<SearchRepository>()),
  );

  getIt.registerFactory<WatchlistBloc>(
    () => WatchlistBloc(databaseHelper: getIt<DatabaseHelper>()),
  );
}
