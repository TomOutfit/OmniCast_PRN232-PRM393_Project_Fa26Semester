// OmniCast - AuthBloc Unit Tests
//
// Covers the authentication state machine defined in
// Document/TEST_CASES.md (TC-PRM-01..05). Mocks the AuthRepository
// so the tests run as pure unit tests with no network / secure
// storage dependencies.

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:omnicast/data/models/user_model.dart';
import 'package:omnicast/data/repositories/auth_repository.dart';
import 'package:omnicast/logic/auth/auth_bloc.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

UserModel _makeUser({
  String id = 'user-1',
  String email = 'staff@omnicast.tv',
  String fullName = 'Staff Demo',
  String role = 'STAFF',
}) {
  return UserModel(
    id: id,
    email: email,
    fullName: fullName,
    avatarUrl: null,
    bio: null,
    role: role,
    isActive: true,
    emailVerified: true,
    lastLoginAt: DateTime(2026, 10, 11, 10, 0),
    createdAt: DateTime(2026, 1, 1),
  );
}

AuthResponse _makeAuthResponse({UserModel? user}) {
  return AuthResponse(
    accessToken: 'access.jwt.token',
    refreshToken: 'refresh.jwt.token',
    user: user ?? _makeUser(),
  );
}

void main() {
  late _MockAuthRepository mockRepo;

  setUp(() {
    mockRepo = _MockAuthRepository();
  });

  group('AuthBloc Tests', () {
    test('Initial state is AuthInitial', () {
      final bloc = AuthBloc(authRepository: mockRepo);
      expect(bloc.state, isA<AuthInitial>());
    });

    // -----------------------------------------------------------------
    // TC-PRM-01: SplashScreen checks token -> Unauthenticated
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'CheckAuthStatus emits [AuthLoading, Unauthenticated] when no user',
      build: () {
        when(() => mockRepo.getCurrentUser())
            .thenAnswer((_) async => null);
        return AuthBloc(authRepository: mockRepo);
      },
      act: (bloc) => bloc.add(CheckAuthStatusEvent()),
      expect: () => [
        isA<AuthLoading>(),
        isA<Unauthenticated>(),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'CheckAuthStatus emits [AuthLoading, Authenticated] when user in storage',
      build: () {
        when(() => mockRepo.getCurrentUser())
            .thenAnswer((_) async => _makeUser());
        return AuthBloc(authRepository: mockRepo);
      },
      act: (bloc) => bloc.add(CheckAuthStatusEvent()),
      expect: () => [
        isA<AuthLoading>(),
        isA<Authenticated>().having((s) => s.user.email, 'user.email', 'staff@omnicast.tv'),
      ],
    );

    // -----------------------------------------------------------------
    // TC-PRM-02: Login success
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'LoginRequested emits [AuthLoading, Authenticated] on success',
      build: () {
        when(() => mockRepo.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => _makeAuthResponse());
        return AuthBloc(authRepository: mockRepo);
      },
      act: (bloc) => bloc.add(const LoginRequested(
        email: 'staff@omnicast.tv',
        password: 'Admin123!',
      )),
      expect: () => [
        isA<AuthLoading>(),
        isA<Authenticated>().having((s) => s.user.email, 'user.email', 'staff@omnicast.tv'),
      ],
    );

    // -----------------------------------------------------------------
    // TC-PRM-03: Login wrong password
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'LoginRequested emits [AuthLoading, AuthError] on bad credentials',
      build: () {
        when(() => mockRepo.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenThrow(Exception('Thông tin đăng nhập không chính xác'));
        return AuthBloc(authRepository: mockRepo);
      },
      act: (bloc) => bloc.add(const LoginRequested(
        email: 'staff@omnicast.tv',
        password: 'WRONG-PASSWORD',
      )),
      expect: () => [
        isA<AuthLoading>(),
        isA<AuthError>().having(
          (s) => s.message,
          'message',
          contains('không chính xác'),
        ),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'GoogleLoginRequested emits [AuthLoading, Authenticated] on success',
      build: () {
        when(
          () => mockRepo.loginWithGoogle(
            idToken: any(named: 'idToken'),
            email: any(named: 'email'),
            fullName: any(named: 'fullName'),
            avatarUrl: any(named: 'avatarUrl'),
          ),
        ).thenAnswer(
          (_) async => AuthResponse(
            accessToken: 'mock_jwt_token',
            refreshToken: 'mock_refresh_token',
            user: _makeUser(email: 'google@omnicast.tv'),
          ),
        );
        return AuthBloc(authRepository: mockRepo);
      },
      act: (bloc) => bloc.add(const GoogleLoginRequested(
        email: 'google@omnicast.tv',
        fullName: 'Google User',
      )),
      expect: () => [
        isA<AuthLoading>(),
        isA<Authenticated>().having(
          (s) => s.user.email,
          'email',
          'google@omnicast.tv',
        ),
      ],
    );

    // -----------------------------------------------------------------
    // TC-PRM-04: Refresh token when AuthRepository succeeds
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'RefreshTokenRequested does not emit (silent) when refresh succeeds',
      build: () {
        when(() => mockRepo.refreshToken())
            .thenAnswer((_) async {});
        return AuthBloc(authRepository: mockRepo);
      },
      seed: () => Authenticated(_makeUser()),
      act: (bloc) => bloc.add(RefreshTokenRequested()),
      expect: () => <AuthState>[],
    );

    blocTest<AuthBloc, AuthState>(
      'RefreshTokenRequested emits Unauthenticated when refresh fails',
      build: () {
        when(() => mockRepo.refreshToken())
            .thenThrow(Exception('refresh expired'));
        return AuthBloc(authRepository: mockRepo);
      },
      seed: () => Authenticated(_makeUser()),
      act: (bloc) => bloc.add(RefreshTokenRequested()),
      expect: () => [isA<Unauthenticated>()],
    );

    // -----------------------------------------------------------------
    // TC-PRM-05: Logout clears storage
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'LogoutRequested emits Unauthenticated and calls logout()',
      build: () {
        when(() => mockRepo.logout())
            .thenAnswer((_) async {});
        return AuthBloc(authRepository: mockRepo);
      },
      seed: () => Authenticated(_makeUser()),
      act: (bloc) => bloc.add(LogoutRequested()),
      expect: () => [
        isA<Unauthenticated>(),
      ],
      verify: (_) {
        verify(() => mockRepo.logout()).called(1);
      },
    );

    blocTest<AuthBloc, AuthState>(
      'LogoutRequested still emits Unauthenticated when repo throws (best-effort)',
      build: () {
        when(() => mockRepo.logout())
            .thenThrow(Exception('network down'));
        return AuthBloc(authRepository: mockRepo);
      },
      seed: () => Authenticated(_makeUser()),
      act: (bloc) => bloc.add(LogoutRequested()),
      expect: () => [
        isA<Unauthenticated>(),
      ],
    );

    // -----------------------------------------------------------------
    // TC-PRM-06: Logout from all devices — must pass
    // `revokeAllDevices: true` to the repository so the backend
    // hits `/auth/logout-all` (revokes every refresh token).
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'LogoutAllDevicesRequested calls logout(revokeAllDevices: true) and emits Unauthenticated',
      build: () {
        when(() => mockRepo.logout(revokeAllDevices: true))
            .thenAnswer((_) async {});
        return AuthBloc(authRepository: mockRepo);
      },
      seed: () => Authenticated(_makeUser()),
      act: (bloc) => bloc.add(LogoutAllDevicesRequested()),
      expect: () => [
        isA<Unauthenticated>(),
      ],
      verify: (_) {
        verify(() => mockRepo.logout(revokeAllDevices: true)).called(1);
        // CRITICAL: must NOT call the single-device logout
        verifyNever(() => mockRepo.logout());
      },
    );

    blocTest<AuthBloc, AuthState>(
      'LogoutAllDevicesRequested is best-effort (still emits Unauthenticated on failure)',
      build: () {
        when(() => mockRepo.logout(revokeAllDevices: true))
            .thenThrow(Exception('server timeout'));
        return AuthBloc(authRepository: mockRepo);
      },
      seed: () => Authenticated(_makeUser()),
      act: (bloc) => bloc.add(LogoutAllDevicesRequested()),
      expect: () => [
        isA<Unauthenticated>(),
      ],
    );

    // -----------------------------------------------------------------
    // Register success
    // -----------------------------------------------------------------
    blocTest<AuthBloc, AuthState>(
      'RegisterRequested emits [AuthLoading, Authenticated] on success',
      build: () {
        when(() => mockRepo.register(
              email: any(named: 'email'),
              password: any(named: 'password'),
              fullName: any(named: 'fullName'),
            )).thenAnswer((_) async => _makeAuthResponse(
              user: _makeUser(email: 'newbie@omnicast.tv', fullName: 'Newbie'),
            ));
        return AuthBloc(authRepository: mockRepo);
      },
      act: (bloc) => bloc.add(const RegisterRequested(
        email: 'newbie@omnicast.tv',
        password: 'Pass123!',
        fullName: 'Newbie',
      )),
      expect: () => [
        isA<AuthLoading>(),
        isA<Authenticated>().having((s) => s.user.fullName, 'fullName', 'Newbie'),
      ],
    );
  });
}
