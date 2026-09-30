// OmniCast - App Locale & Theme Mode Provider
// Lightweight InheritedNotifier-based providers so the whole tree rebuilds
// when the user toggles language or dark/light mode.

import 'package:flutter/material.dart';

import 'strings.dart';

class AppLocaleProvider extends ChangeNotifier {
  AppLocale _locale;

  AppLocaleProvider(this._locale);

  AppLocale get locale => _locale;

  Future<void> load() async {
    // The actual persisted value is loaded by TokenStorageHelper on bootstrap;
    // this method is here for future-proofing.
  }

  Future<void> setLocale(AppLocale next) async {
    if (_locale == next) return;
    _locale = next;
    notifyListeners();
  }
}

class AppThemeModeProvider extends ChangeNotifier {
  ThemeMode _mode;

  AppThemeModeProvider(this._mode);

  ThemeMode get mode => _mode;

  Future<void> setMode(ThemeMode next) async {
    if (_mode == next) return;
    _mode = next;
    notifyListeners();
  }
}

class AppLocaleScope extends InheritedNotifier<AppLocaleProvider> {
  const AppLocaleScope({
    super.key,
    required AppLocaleProvider provider,
    required super.child,
  }) : super(notifier: provider);

  static AppLocaleProvider of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<AppLocaleScope>();
    assert(scope != null, 'AppLocaleScope missing in widget tree');
    return scope!.notifier!;
  }

  static AppLocaleProvider read(BuildContext context) {
    final scope =
        context.getInheritedWidgetOfExactType<AppLocaleScope>();
    assert(scope != null, 'AppLocaleScope missing in widget tree');
    return scope!.notifier!;
  }
}

class AppThemeModeScope extends InheritedNotifier<AppThemeModeProvider> {
  const AppThemeModeScope({
    super.key,
    required AppThemeModeProvider provider,
    required super.child,
  }) : super(notifier: provider);

  static AppThemeModeProvider of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<AppThemeModeScope>();
    assert(scope != null, 'AppThemeModeScope missing in widget tree');
    return scope!.notifier!;
  }

  static AppThemeModeProvider read(BuildContext context) {
    final scope =
        context.getInheritedWidgetOfExactType<AppThemeModeScope>();
    assert(scope != null, 'AppThemeModeScope missing in widget tree');
    return scope!.notifier!;
  }
}

/// Convenience helpers — call inside `build()` so the widget rebuilds when
/// the locale or theme mode changes.
String appT(BuildContext context, String key) {
  final locale = AppLocaleScope.of(context).locale;
  return AppStrings.t(key, locale);
}

AppLocale appLocaleOf(BuildContext context) =>
    AppLocaleScope.of(context).locale;

ThemeMode appThemeModeOf(BuildContext context) =>
    AppThemeModeScope.of(context).mode;
