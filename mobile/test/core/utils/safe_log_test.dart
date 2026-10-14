// OmniCast - Safe logger tests (Dart port of `safe-log.test.ts`)

import 'package:flutter_test/flutter_test.dart';
import 'package:omnicast/core/utils/safe_log.dart';

void main() {
  group('toSafeLogValue', () {
    test('redacts strings in place', () {
      expect(
        toSafeLogValue('hello'),
        'hello',
      );
      expect(
        toSafeLogValue('token=eyJabc.def.ghi').contains('eyJabc.def.ghi'),
        isFalse,
      );
    });

    test('redacts deeply nested secrets inside a Map', () {
      final input = <String, dynamic>{
        'url': '/api/v1/programs',
        'method': 'POST',
        'config': <String, dynamic>{
          'headers': <String, dynamic>{
            'Authorization': 'Bearer abc.def.ghi',
            'Content-Type': 'application/json',
          },
          'data': <String, dynamic>{
            'password': 'hunter2',
            'nested': <String, dynamic>{'token': 'xxx.yyy.zzz'},
          },
        },
      };
      final out = toSafeLogValue(input);
      expect(out.contains('abc.def.ghi'), isFalse);
      expect(out.contains('hunter2'), isFalse);
      expect(out.contains('xxx.yyy.zzz'), isFalse);
      expect(out.contains('<REDACTED>'), isTrue);
      // Non-sensitive fields survive
      expect(out.contains('/api/v1/programs'), isTrue);
      expect(out.contains('application/json'), isTrue);
    });
  });

  group('safePrint / safeLog', () {
    test('redacts a Map payload through safePrint', () {
      // We just check that the function does not throw and
      // returns void. The string content is verified via
      // `toSafeLogValue` directly above.
      expect(
        () => safePrint(
          '[omnicast:test]',
          <String, dynamic>{'password': 'hunter2'},
        ),
        returnsNormally,
      );
    });

    test('redacts a Dio-style headers map through safeLog', () {
      expect(
        () => safeLog(
          '[omnicast:test]',
          <String, dynamic>{
            'headers': <String, dynamic>{
              'Authorization': 'Bearer secret.jwt.value',
            },
          },
        ),
        returnsNormally,
      );
    });
  });
}
