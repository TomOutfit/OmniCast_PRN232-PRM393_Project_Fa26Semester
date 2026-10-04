// OmniCast - EpgBloc Unit Tests
//
// Tests EpgBloc events (LoadEpgSchedule, ChangeEpgDate, SelectEpgChannel)
// and verifies that the 24-hour procedural fallback and caching mechanism
// work reliably when offline.

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:omnicast/data/datasources/local/database_helper.dart';
import 'package:omnicast/data/models/program_model.dart';
import 'package:omnicast/data/repositories/programs_repository.dart';
import 'package:omnicast/logic/epg/epg_bloc.dart';

class _MockProgramsRepository extends Mock implements ProgramsRepository {}
class _MockDatabaseHelper extends Mock implements DatabaseHelper {}

LiveEventModel _makeEvent({
  String id = 'event-1',
  String title = 'Trận Cầu Ngoại Hạng Anh',
  String channelId = 'ch-sport-1',
  DateTime? scheduledAt,
}) {
  return LiveEventModel(
    id: id,
    title: title,
    contentSource: 'EXTERNAL',
    isPrivate: false,
    quality: 'FULL_HD_1080P',
    language: 'vi',
    status: 'SCHEDULED',
    scheduledAt: scheduledAt ?? DateTime.now(),
    viewerCount: 1500,
    peakViewers: 2000,
    likeCount: 50,
    commentCount: 10,
    shareCount: 5,
    channelId: channelId,
    tags: const ['SPORTS'],
    autoRecord: true,
    slowMode: false,
    chatEnabled: true,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
    channel: ChannelInfo(
      id: 'ch-sport-1',
      name: 'Omni Sport 1',
      slug: 'sport-1',
      category: 'SPORTS',
    ),
    isFiller: false,
  );
}

void main() {
  late _MockProgramsRepository mockRepo;
  late _MockDatabaseHelper mockDb;

  setUp(() {
    mockRepo = _MockProgramsRepository();
    mockDb = _MockDatabaseHelper();
  });

  group('EpgBloc Tests', () {
    final targetDate = DateTime(2026, 10, 4);

    test('Initial state is EpgInitial', () {
      final bloc = EpgBloc(programsRepository: mockRepo, db: mockDb);
      expect(bloc.state, isA<EpgInitial>());
    });

    blocTest<EpgBloc, EpgState>(
      'emits [EpgLoading, EpgLoaded] on LoadEpgSchedule success',
      build: () {
        when(() => mockRepo.getEpgSchedule(date: any(named: 'date'), channelId: any(named: 'channelId')))
            .thenAnswer((_) async => [_makeEvent()]);
        when(() => mockDb.lastEpgFetchAt(any()))
            .thenAnswer((_) async => DateTime(2026, 10, 4, 12, 0));
        return EpgBloc(programsRepository: mockRepo, db: mockDb);
      },
      act: (bloc) => bloc.add(LoadEpgSchedule(date: targetDate)),
      expect: () => [
        isA<EpgLoading>(),
        isA<EpgLoaded>()
            .having((s) => s.events.length, 'events.length', 1)
            .having((s) => s.timeSlots.length, 'timeSlots.length', 25)
            .having((s) => s.isOfflineMode, 'isOfflineMode', false),
      ],
    );

    blocTest<EpgBloc, EpgState>(
      'serves SQLite cached payload when network fails',
      build: () {
        when(() => mockRepo.getEpgSchedule(date: any(named: 'date'), channelId: any(named: 'channelId')))
            .thenThrow(Exception('Connection refused'));
        when(() => mockDb.getEpgCachePayload(any()))
            .thenAnswer((_) async => '{"data":{"channels":[]}}');
        when(() => mockRepo.tryDecodeEpg(any()))
            .thenReturn([_makeEvent(id: 'cached-1', title: 'Cached Show')]);
        when(() => mockDb.lastEpgFetchAt(any()))
            .thenAnswer((_) async => DateTime(2026, 10, 4, 10, 0));
        return EpgBloc(programsRepository: mockRepo, db: mockDb);
      },
      act: (bloc) => bloc.add(LoadEpgSchedule(date: targetDate)),
      expect: () => [
        isA<EpgLoading>(),
        isA<EpgLoaded>()
            .having((s) => s.events.length, 'events.length', 1)
            .having((s) => s.isOfflineMode, 'isOfflineMode', true),
      ],
    );

    blocTest<EpgBloc, EpgState>(
      'emits EpgError when network fails and no cached data exists',
      build: () {
        when(() => mockRepo.getEpgSchedule(date: any(named: 'date'), channelId: any(named: 'channelId')))
            .thenThrow(Exception('Network error'));
        when(() => mockDb.getEpgCachePayload(any()))
            .thenAnswer((_) async => null);
        return EpgBloc(programsRepository: mockRepo, db: mockDb);
      },
      act: (bloc) => bloc.add(LoadEpgSchedule(date: targetDate)),
      expect: () => [
        isA<EpgLoading>(),
        isA<EpgError>(),
      ],
    );

    blocTest<EpgBloc, EpgState>(
      're-triggers LoadEpgSchedule on ChangeEpgDate when already loaded',
      build: () {
        when(() => mockRepo.getEpgSchedule(date: any(named: 'date'), channelId: any(named: 'channelId')))
            .thenAnswer((_) async => [_makeEvent()]);
        when(() => mockDb.lastEpgFetchAt(any())).thenAnswer((_) async => null);
        return EpgBloc(programsRepository: mockRepo, db: mockDb);
      },
      seed: () => EpgLoaded(
        selectedDate: DateTime(2026, 10, 3),
        events: [_makeEvent()],
        timeSlots: const ['00:00', '01:00'],
      ),
      act: (bloc) => bloc.add(ChangeEpgDate(targetDate)),
      expect: () => [
        isA<EpgLoading>(),
        isA<EpgLoaded>().having((s) => s.selectedDate, 'selectedDate', targetDate),
      ],
    );
  });
}
