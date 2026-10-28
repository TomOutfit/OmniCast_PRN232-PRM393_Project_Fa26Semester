// OmniCast - AICuratorScreen widget tests
// ============================================================
//
// Covers the curated-existing tab feature work for AI Curator v2:
//   1. Renders 3 tabs (analyze, apply, curate-existing)
//   2. Tapping the "Phân tích AI" button on a row calls
//      AiCuratorRepository.curate(programId, forceRefresh: true).
//   3. Empty state for the curate-existing tab when no programs.
//   4. Pull-to-refresh triggers _loadHistory for the selected program.
//   5. Tab switching preserves `_result` state across tab flips.
//   6. parseSuggestedTime unit tests (3 cases: well-formed, empty, garbage).
//   7. AccessDenied screen when role is 'VIEWER'.
//   8. Form validation in `_runAnalysis` — empty title shows error.
//
// We inject fakes for AiCuratorRepository and ProgramsRepository via
// getIt (the screen resolves both in initState), then drive the screen
// from a BlocProvider<AuthBloc> in the appropriate Authenticated state.


import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:omnicast/core/di/injection.dart';
import 'package:omnicast/core/i18n/app_locale.dart';
import 'package:omnicast/core/i18n/strings.dart';
import 'package:omnicast/core/theme/app_theme.dart';
import 'package:omnicast/data/models/program_model.dart';
import 'package:omnicast/data/models/user_model.dart';
import 'package:omnicast/data/repositories/ai_curator_repository.dart';
import 'package:omnicast/data/repositories/auth_repository.dart';
import 'package:omnicast/data/repositories/programs_repository.dart';
import 'package:omnicast/logic/auth/auth_bloc.dart';
import 'package:omnicast/presentation/screens/studio/ai_curator_screen.dart';

// ── Mocks ──────────────────────────────────────────────────────

class _MockAiCuratorRepository extends Mock implements AiCuratorRepository {}

class _MockProgramsRepository extends Mock implements ProgramsRepository {}

class _MockAuthRepository extends Mock implements AuthRepository {}

// ── Fixtures ────────────────────────────────────────────────────

UserModel _user({String role = 'STAFF'}) {
  return UserModel(
    id: 'user-1',
    email: 'staff@omnicast.tv',
    fullName: 'Staff Demo',
    avatarUrl: null,
    bio: null,
    role: role,
    isActive: true,
    emailVerified: true,
    lastLoginAt: DateTime(2026, 10, 1),
    createdAt: DateTime(2026, 1, 1),
  );
}

LiveEventModel _program({
  String id = 'prog-1',
  String title = 'Champions League Final',
  String channelName = 'Sports HD',
}) {
  return LiveEventModel(
    id: id,
    title: title,
    description: 'A test program',
    contentSource: 'UPLOADED',
    isPrivate: false,
    quality: 'HD',
    language: 'vi',
    status: 'SCHEDULED',
    scheduledAt: DateTime(2026, 12, 16, 20, 0),
    viewerCount: 0,
    peakViewers: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    channelId: 'channel-1',
    tags: const [],
    autoRecord: false,
    slowMode: false,
    chatEnabled: true,
    createdAt: DateTime(2026, 10, 1),
    updatedAt: DateTime(2026, 10, 1),
    channel: ChannelInfo(
      id: 'channel-1',
      name: channelName,
      slug: 'sports-hd',
    ),
  );
}

AiCuratorReport _report({
  int? confidence,
  String suggestedTimeSlot = '21:00 - 23:00',
}) {
  return AiCuratorReport(
    broadcastSuitability: 'PRIME_TIME',
    suggestedTimeSlot: suggestedTimeSlot,
    targetAudienceVibe: 'Football fans',
    riskWarnings: '',
    sentiment: const AiSentiment(
      overallSentiment: 'positive',
      hypeLevel: 'high',
      audienceEngagement: 87,
    ),
    compliance: const AiCompliance(
      isAgeRestricted: true,
      ageRating: 'T16',
      flaggedContent: ['violence'],
      recommendedBroadcastWindow: 'EVENING',
    ),
    contentAssessment: const ContentAssessment(
      summary: 'Football match analysis and preview',
      highlights: ['Key moments'],
      strengths: ['Great dynamics'],
      weaknesses: ['Pacing in second half'],
      narrativeFlow: 'Fast paced',
      targetAudienceDetails: 'Sports lovers',
    ),
    formatAssessment: const FormatAssessment(
      productionFormat: 'Live Sports',
      pacing: 'DYNAMIC',
      visualAudioRequirements: ['1080p60'],
      interactivityLevel: 'HIGH',
      technicalRecommendations: 'High bitrate',
    ),
    scoringBreakdown: const ScoringBreakdown(
      contentQuality: 90,
      productionValue: 88,
      audienceAppeal: 92,
      complianceSafety: 95,
      commercialPotential: 89,
      overallScore: 91,
      grade: 'S',
    ),
    aiModelVersion: 'gpt-4o-mini-v2',
    processingTimeMs: 1234,
    tokenUsed: 512,
    cached: false,
    confidence: confidence,
  );
}

ProgramsPage<LiveEventModel> _page(List<LiveEventModel> items) {
  return ProgramsPage<LiveEventModel>(
    items: items,
    page: 1,
    limit: items.length,
    total: items.length,
    totalPages: 1,
  );
}

// ── Widget harness ──────────────────────────────────────────────

/// Builds the screen wrapped in:
///   - AppLocaleScope  (vi)
///   - AppThemeModeScope (dark)
///   - BlocProvider<AuthBloc> pre-seeded with `role`
///   - MaterialApp(home: AICuratorScreen())
Future<void> _pump(
  WidgetTester tester, {
  required _MockAiCuratorRepository curator,
  required _MockProgramsRepository programs,
  String role = 'STAFF',
}) async {
  final authBloc = AuthBloc(authRepository: _MockAuthRepository());
  authBloc.emit(Authenticated(_user(role: role)));

  await tester.pumpWidget(
    AppLocaleScope(
      provider: AppLocaleProvider(AppLocale.vi),
      child: AppThemeModeScope(
        provider: AppThemeModeProvider(ThemeMode.dark),
        child: BlocProvider<AuthBloc>.value(
          value: authBloc,
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const AICuratorScreen(),
          ),
        ),
      ),
    ),
  );

  // Let the programs load + the tab controller settle.
  await tester.pumpAndSettle(const Duration(milliseconds: 200));
}

void main() {
  late _MockAiCuratorRepository curator;
  late _MockProgramsRepository programs;

  setUpAll(() {
    // mocktail requires a registered fallback for any() of non-primitive
    // types. `LiveEventModel` is the only one we pass via any().
    registerFallbackValue(_program());
  });

  setUp(() {
    curator = _MockAiCuratorRepository();
    programs = _MockProgramsRepository();
    if (getIt.isRegistered<AiCuratorRepository>()) {
      getIt.unregister<AiCuratorRepository>();
    }
    if (getIt.isRegistered<ProgramsRepository>()) {
      getIt.unregister<ProgramsRepository>();
    }
    getIt.registerSingleton<AiCuratorRepository>(curator);
    getIt.registerSingleton<ProgramsRepository>(programs);
  });

  tearDown(() async {
    if (getIt.isRegistered<AiCuratorRepository>()) {
      await getIt.unregister<AiCuratorRepository>();
    }
    if (getIt.isRegistered<ProgramsRepository>()) {
      await getIt.unregister<ProgramsRepository>();
    }
  });

  // ============================================================
  // 1. Renders 3 tabs
  // ============================================================
  testWidgets('renders 3 tabs (analyze, apply, curate-existing)', (tester) async {
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page(const []));

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    await _pump(tester, curator: curator, programs: programs);

    final tabBar = find.byType(TabBar);
    expect(tabBar, findsOneWidget);

    final tabs = tester.widget<TabBar>(tabBar).tabs;
    expect(tabs.length, 3, reason: 'expected length-3 TabBar');
  });

  // ============================================================
  // 2. Tapping "Phân tích AI" on a row calls curate()
  // ============================================================
  testWidgets('tapping "Phân tích AI" on a row triggers curate()', (tester) async {
    final p = _program(id: 'prog-99', title: 'Late Night Show');
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page([p]));

    when(() => curator.curate(
          programId: any(named: 'programId'),
          forceRefresh: any(named: 'forceRefresh'),
        )).thenAnswer((_) async => _report(confidence: 88));

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    await _pump(tester, curator: curator, programs: programs);

    // Switch to the 3rd tab (Curate-Existing).
    await tester.tap(find.text('Phân tích có sẵn'));
    await tester.pumpAndSettle();

    // Tap the per-row "Phân tích AI" button.
    final curateButton = find.text('Phân tích AI');
    expect(curateButton, findsOneWidget);
    await tester.tap(curateButton);
    await tester.pumpAndSettle(const Duration(milliseconds: 200));

    final captured = verify(() => curator.curate(
          programId: captureAny(named: 'programId'),
          forceRefresh: captureAny(named: 'forceRefresh'),
        )).captured;
    expect(captured.length, 2);
    expect(captured[0], 'prog-99');
    expect(captured[1], true,
        reason: 'forceRefresh should be true so the backend skips cache');
  });

  // ============================================================
  // 3. Empty state for curate-existing when no programs
  // ============================================================
  testWidgets('curate-existing tab shows empty state when no programs',
      (tester) async {
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page(const []));

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    await _pump(tester, curator: curator, programs: programs);

    await tester.tap(find.text('Phân tích có sẵn'));
    await tester.pumpAndSettle();

    expect(
      find.text('Chưa có chương trình nào đang chờ phân tích'),
      findsOneWidget,
    );
  });

  // ============================================================
  // 4. Pull-to-refresh triggers _loadHistory
  // ============================================================
  testWidgets('pull-to-refresh on curate-existing triggers history fetch',
      (tester) async {
    final p = _program(id: 'prog-7', title: 'Pull test program');
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page([p]));

    when(() => curator.curate(
          programId: any(named: 'programId'),
          forceRefresh: any(named: 'forceRefresh'),
        )).thenAnswer((_) async => _report());

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    await _pump(tester, curator: curator, programs: programs);

    // Curate once so the result is set + _selectedProgram is chosen.
    await tester.tap(find.text('Phân tích có sẵn'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Phân tích AI'));
    await tester.pumpAndSettle(const Duration(milliseconds: 200));

    clearInteractions(curator);

    // Fling the body down to trigger the RefreshIndicator.
    await tester.fling(
      find.byType(ListView).first,
      const Offset(0, 300),
      1200,
    );
    await tester.pumpAndSettle(const Duration(milliseconds: 500));

    // _loadHistory(programId) should be called at least once.
    verify(() => curator.history('prog-7')).called(greaterThanOrEqualTo(1));
  });

  // ============================================================
  // 5. Tab switching preserves `_result` state
  // ============================================================
  testWidgets('tab switching preserves _result state', (tester) async {
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page(const []));

    when(() => curator.analyze(
          title: any(named: 'title'),
          description: any(named: 'description'),
          channelName: any(named: 'channelName'),
        )).thenAnswer((_) async => _report(confidence: 91));

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    await _pump(tester, curator: curator, programs: programs);

    // Type a title and run analysis on tab 1.
    await tester.enterText(find.byType(TextField).first, 'World Cup Final');
    await tester.tap(find.text('CHẠY PHÂN TÍCH VỚI AI'));
    await tester.pumpAndSettle(const Duration(milliseconds: 300));

    // The result summary should now show on tab 1.
    expect(find.text('Kết quả AI'), findsOneWidget);
    expect(find.text('CHỈ SỐ ĐÁNH GIÁ ĐA CHIỀU (OBI INDEX)'), findsOneWidget);
    expect(find.text('THẨM ĐỊNH NỘI DUNG CHƯƠNG TRÌNH'), findsOneWidget);
    expect(find.text('THẨM ĐỊNH HÌNH THỨC & DÀN DỰNG KỸ THUẬT'), findsOneWidget);

    // Switch to tab 3 (Curate-Existing) — result must still be visible.
    await tester.tap(find.text('Phân tích có sẵn'));
    await tester.pumpAndSettle();
    expect(find.text('Kết quả AI'), findsOneWidget,
        reason: '_result must survive tab switches');

    // Switch back to tab 1 — result still visible.
    await tester.tap(find.text('Phân tích mới'));
    await tester.pumpAndSettle();
    expect(find.text('Kết quả AI'), findsOneWidget);
  });

  // ============================================================
  // 6. parseSuggestedTime edge cases
  // ============================================================
  group('parseSuggestedTime', () {
    final fallback = DateTime(2026, 10, 16, 0, 0);

    test('well-formed slot returns ISO timestamp on fallback date', () {
      final iso = parseSuggestedTime('21:00 - 23:00', fallback);
      expect(iso, isNotNull);
      final parsed = DateTime.parse(iso!);
      expect(parsed.hour, 21);
      expect(parsed.minute, 0);
      expect(parsed.year, 2026);
      expect(parsed.month, 10);
      expect(parsed.day, 16);
    });

    test('empty slot returns null', () {
      expect(parseSuggestedTime('', fallback), isNull);
    });

    test('garbage slot returns null', () {
      expect(parseSuggestedTime('garbage', fallback), isNull);
    });
  });

  // ============================================================
  // 7. AccessDenied screen when role is 'VIEWER'
  // ============================================================
  testWidgets('shows access-denied screen when role is VIEWER',
      (tester) async {
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page(const []));

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    await _pump(
      tester,
      curator: curator,
      programs: programs,
      role: 'VIEWER',
    );

    expect(find.text('TRUY CẬP BỊ TỪ CHỐI'), findsOneWidget);
    // The "Curate existing" tab must NOT be rendered.
    expect(find.text('Phân tích có sẵn'), findsNothing);
  });

  // ============================================================
  // 8. Form validation in _runAnalysis — empty title shows error
  // ============================================================
  testWidgets('empty title shows "Title is required" error', (tester) async {
    when(() => programs.getPrograms(
          status: any(named: 'status'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        )).thenAnswer((_) async => _page(const []));

    when(() => curator.history(any())).thenAnswer((_) async => const []);

    when(() => curator.analyze(
          title: any(named: 'title'),
          description: any(named: 'description'),
          channelName: any(named: 'channelName'),
        )).thenAnswer((_) async => _report());

    await _pump(tester, curator: curator, programs: programs);

    // Tap the analyze button without entering a title.
    await tester.tap(find.text('CHẠY PHÂN TÍCH VỚI AI'));
    await tester.pumpAndSettle(const Duration(milliseconds: 200));

    // Vietnamese message from the i18n table (active locale = vi).
    expect(find.text('Tiêu đề là bắt buộc.'), findsOneWidget);

    // The repository must NOT have been called.
    verifyNever(() => curator.analyze(
          title: any(named: 'title'),
          description: any(named: 'description'),
          channelName: any(named: 'channelName'),
        ));
  });
}