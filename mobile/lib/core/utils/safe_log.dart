// ============================================================
// OmniCast - Safe Logger (mobile / Dart)
// ============================================================
//
// Thin wrapper around `debugPrint` (Flutter) and `developer.log`
// (dart:developer) that scrubs any string argument before it
// reaches the device console / Sentry / `flutter logs`.
//
// In release builds the production should disable verbose
// logging entirely; the safe-log helpers are here to make sure
// that, when logging *is* enabled, the output can be safely
// pasted into a bug report without leaking tokens.

import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';

import 'redact.dart';

/// Convert any value to a string representation that is safe to
/// log. Strings are redacted in place. Maps and lists are walked
/// recursively (so a `Map<String, dynamic>` Dio response with a
/// nested `headers.Authorization` gets the header scrubbed).
/// Anything else is stringified with `toString()` and then
/// redacted, which catches plain JSON strings too.
String toSafeLogValue(Object? value) {
  if (value == null) return '';
  if (value is String) return redactSecrets(value);
  if (value is Map) {
    return redactSecrets(_stringifyMap(value));
  }
  if (value is Iterable) {
    return redactSecrets(value.map(toSafeLogValue).join(' '));
  }
  return redactSecrets(value.toString());
}

String _stringifyMap(Map<dynamic, dynamic> m) {
  final buf = StringBuffer('{');
  var first = true;
  for (final entry in m.entries) {
    if (!first) buf.write(', ');
    first = false;
    buf.write('${entry.key}: ${toSafeLogValue(entry.value)}');
  }
  buf.write('}');
  return buf.toString();
}

/// Replacement for `debugPrint` that scrubs every argument
/// through `redactSecrets` before it reaches the console.
void safePrint(String prefix, Object? value, [Object? extra]) {
  final parts = <String>[
    prefix,
    toSafeLogValue(value),
    if (extra != null) toSafeLogValue(extra),
  ];
  // debugPrint already handles the multi-arg case by joining
  // with a space, so we pre-join here.
  debugPrint(parts.join(' '));
}

/// Replacement for `developer.log` that scrubs the message
/// before it reaches the IDE / OS console.
void safeLog(
  String prefix,
  Object? value, {
  String name = 'omnicast',
  Object? error,
  StackTrace? stackTrace,
}) {
  final message = <String>[
    prefix,
    toSafeLogValue(value),
    if (error != null) toSafeLogValue(error),
  ].join(' ');
  developer.log(
    redactSecrets(message),
    name: name,
    error: error,
    stackTrace: stackTrace,
  );
}
