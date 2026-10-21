// OmniCast - Auth BLoC

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:rxdart/rxdart.dart';

import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/notifications_repository.dart';
import '../../../data/models/user_model.dart';
import '../../../core/utils/token_storage_helper.dart';
import '../../../core/di/injection.dart';

// Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class CheckAuthStatusEvent extends AuthEvent {}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

class RegisterRequested extends AuthEvent {
  final String email;
  final String password;
  final String fullName;

  const RegisterRequested({
    required this.email,
    required this.password,
    required this.fullName,
  });

  @override
  List<Object?> get props => [email, password, fullName];
}

class GoogleLoginRequested extends AuthEvent {
  final String? idToken;
  final String? email;
  final String? fullName;
  final String? avatarUrl;

  const GoogleLoginRequested({
    this.idToken,
    this.email,
    this.fullName,
    this.avatarUrl,
  });

  @override
  List<Object?> get props => [idToken, email, fullName, avatarUrl];
}

class LogoutRequested extends AuthEvent {}

/// Logout from **every** device the user has an active session on
/// (phone + tablet + other browsers). The backend endpoint
/// `/v1/auth/logout-all` revokes all refresh tokens for the user.
class LogoutAllDevicesRequested extends AuthEvent {}

class RefreshTokenRequested extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class Authenticated extends AuthState {
  final UserModel user;

  const Authenticated(this.user);

  @override
  List<Object?> get props => [user];
}

class Unauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}

// BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(AuthInitial()) {
    on<CheckAuthStatusEvent>(
      _onCheckAuthStatus,
      transformer: (events, mapper) => events.flatMap((mapper)),
    );
    on<LoginRequested>(_onLoginRequested);
    on<GoogleLoginRequested>(_onGoogleLoginRequested);
    on<RegisterRequested>(_onRegisterRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<LogoutAllDevicesRequested>(_onLogoutAllDevicesRequested);
    on<RefreshTokenRequested>(_onRefreshTokenRequested);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        emit(Authenticated(user));
        _registerFcmToken();
      } else {
        emit(Unauthenticated());
      }
    } catch (e) {
      emit(Unauthenticated());
    }
  }

  Future<void> _onGoogleLoginRequested(
    GoogleLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _authRepository.loginWithGoogle(
        idToken: event.idToken,
        email: event.email,
        fullName: event.fullName,
        avatarUrl: event.avatarUrl,
      );
      emit(Authenticated(response.user));
      _registerFcmToken();
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _authRepository.login(
        email: event.email,
        password: event.password,
      );
      emit(Authenticated(response.user));
      _registerFcmToken();
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onRegisterRequested(
    RegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _authRepository.register(
        email: event.email,
        password: event.password,
        fullName: event.fullName,
      );
      emit(Authenticated(response.user));
      _registerFcmToken();
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    _deleteFcmToken();
    emit(Unauthenticated());
    try {
      await _authRepository.logout();
    } catch (_) {
      // Ignore logout errors
    }
  }

  Future<void> _onLogoutAllDevicesRequested(
    LogoutAllDevicesRequested event,
    Emitter<AuthState> emit,
  ) async {
    _deleteFcmToken();
    emit(Unauthenticated());
    try {
      await _authRepository.logout(revokeAllDevices: true);
    } catch (_) {
      // Ignore logout errors
    }
  }

  Future<void> _onRefreshTokenRequested(
    RefreshTokenRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authRepository.refreshToken();
    } catch (e) {
      emit(Unauthenticated());
    }
  }

  void _registerFcmToken() async {
    try {
      final token = await TokenStorageHelper().getDeviceToken();
      if (token != null && token.isNotEmpty) {
        final repo = getIt<NotificationsRepository>();
        await repo.registerDeviceToken(token: token, platform: 'ANDROID');
      }
    } catch (_) {}
  }

  void _deleteFcmToken() async {
    try {
      final token = await TokenStorageHelper().getDeviceToken();
      if (token != null && token.isNotEmpty) {
        final repo = getIt<NotificationsRepository>();
        await repo.deleteDeviceToken(token);
      }
    } catch (_) {}
  }
}
