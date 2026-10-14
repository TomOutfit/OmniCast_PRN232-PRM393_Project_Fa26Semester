// OmniCast - Redactor tests (Dart port of `redact.test.ts`)

import 'package:flutter_test/flutter_test.dart';
import 'package:omnicast/core/utils/redact.dart';

void main() {
  group('redactSecrets', () {
    test('is a no-op on empty / null input', () {
      expect(redactSecrets(''), '');
      expect(redactSecrets(null), '');
    });

    test('redacts CLOUDINARY_URL plain assignment', () {
      const input = 'failed: cloudinary://1234:abcd@lixsfpvi';
      final out = redactSecrets(input);
      expect(out.contains('1234:abcd'), isFalse);
      expect(out.contains('<REDACTED>'), isTrue);
    });

    test('redacts CLOUDINARY_URL in JSON-quoted form', () {
      final out = redactSecrets('{"CLOUDINARY_URL":"cloudinary://1234:abcd@lixsfpvi"}');
      expect(out.contains('1234:abcd'), isFalse);
      expect(out.contains('<REDACTED>'), isTrue);
    });

    test('redacts CLOUDINARY_API_SECRET=value', () {
      final out = redactSecrets('config error CLOUDINARY_API_SECRET=su52RYyFJIk');
      expect(out.contains('su52RYyFJIk'), isFalse);
      expect(out.contains('CLOUDINARY_API_SECRET=<REDACTED>'), isTrue);
    });

    test('redacts JWT_SECRET=... (and quoted variant)', () {
      expect(
        redactSecrets('JWT_SECRET = "super-secret-value"').contains(
          'super-secret-value',
        ),
        isFalse,
      );
      expect(
        redactSecrets('{"JWT_SECRET":"super-secret-value"}').contains(
          'super-secret-value',
        ),
        isFalse,
      );
    });

    test('redacts Authorization Bearer in JSON-quoted form', () {
      final out = redactSecrets(
        'headers={"authorization":"Bearer eyJhbGc.payload.sig"}',
      );
      // The actual contract: the token is gone, regardless of
      // how the surrounding text is reshaped.
      expect(out.contains('eyJhbGc.payload.sig'), isFalse);
      expect(out.contains('<REDACTED>'), isTrue);
    });

    test('redacts Authorization Bearer in plain form too', () {
      final out = redactSecrets('Authorization: Bearer abc.def.ghi');
      expect(out.contains('abc.def.ghi'), isFalse);
      expect(out.contains('<REDACTED>'), isTrue);
    });

    test('redacts nested object fields like password, token, apiKey', () {
      final blob = '{"name":"ok","password":"hunter2","nested":{"token":"abc.def.ghi"},"arr":[{"apiKey":"sk-12345"}]}';
      final out = redactSecrets(blob);
      expect(out.contains('hunter2'), isFalse);
      expect(out.contains('abc.def.ghi'), isFalse);
      expect(out.contains('sk-12345'), isFalse);
    });

    test('redacts connection string userinfo in arbitrary scheme', () {
      final out = redactSecrets(
        'Prisma DATABASE_URL=postgresql://user:s3cret@host:5432/db',
      );
      expect(out.contains('s3cret'), isFalse);
      expect(out.contains('<REDACTED>'), isTrue);
    });

    test('leaves benign messages untouched', () {
      const msg = 'channel "sport-1" missing — please check slug';
      expect(redactSecrets(msg), msg);
    });
  });

  group('sensitiveKeys', () {
    test('covers the high-risk set used by the backend', () {
      // Sanity check: the env keys the backend redactor covers
      // should also appear here so a single point of failure
      // can't drift.
      const must = <String>[
        'CLOUDINARY_URL',
        'CLOUDINARY_API_SECRET',
        'JWT_SECRET',
        'OPENAI_API_KEY',
        'DATABASE_URL',
        'password',
        'token',
        'apiKey',
      ];
      for (final k in must) {
        expect(sensitiveKeys.contains(k), isTrue, reason: 'missing $k');
      }
    });
  });
}
