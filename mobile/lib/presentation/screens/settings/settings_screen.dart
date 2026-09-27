// OmniCast - Settings Screen
// Theme / language / notifications / data saver.

import 'package:flutter/material.dart';

import '../../../core/i18n/app_locale.dart';
import '../../../core/i18n/strings.dart';
import '../../../core/utils/token_storage_helper.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _storage = TokenStorageHelper();

  bool _push = true;
  bool _email = false;
  bool _live = true;
  bool _dataSaver = false;
  bool _hydrated = false;

  @override
  void initState() {
    super.initState();
    _hydrate();
  }

  Future<void> _hydrate() async {
    final prefs = await _storage.getNotificationPrefs();
    final saver = await _storage.getDataSaver();
    if (!mounted) return;
    setState(() {
      _push = prefs.push;
      _email = prefs.email;
      _live = prefs.live;
      _dataSaver = saver;
      _hydrated = true;
    });
  }

  Future<void> _savePrefs() async {
    await _storage.saveNotificationPrefs(
      push: _push,
      email: _email,
      live: _live,
    );
    await _storage.saveDataSaver(_dataSaver);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(AppStrings.t('common.save', appLocaleOf(context))),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = appLocaleOf(context);
    final mode = appThemeModeOf(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.t('settings.title', locale)),
      ),
      body: !_hydrated
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: [
                _SectionHeader(
                  label: AppStrings.t('settings.appearance', locale),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Text(
                          AppStrings.t('settings.theme.label', locale),
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      SegmentedButton<ThemeMode>(
                        segments: [
                          ButtonSegment(
                            value: ThemeMode.light,
                            label: Text(
                              AppStrings.t('settings.theme.light', locale),
                            ),
                          ),
                          ButtonSegment(
                            value: ThemeMode.dark,
                            label: Text(
                              AppStrings.t('settings.theme.dark', locale),
                            ),
                          ),
                          ButtonSegment(
                            value: ThemeMode.system,
                            label: Text(
                              AppStrings.t('settings.theme.system', locale),
                            ),
                          ),
                        ],
                        selected: {mode},
                        onSelectionChanged: (set) {
                          final next = set.first;
                          AppThemeModeScope.read(context).setMode(next);
                          _storage.saveThemeMode(_themeToString(next));
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Text(
                          AppStrings.t('settings.language.label', locale),
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      Wrap(
                        spacing: 8,
                        children: AppLocale.values
                            .map(
                              (l) => ChoiceChip(
                                label: Text(l.label),
                                selected: l == appLocaleOf(context),
                                onSelected: (_) {
                                  AppLocaleScope.read(context).setLocale(l);
                                  _storage.saveLocale(l.code);
                                },
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ),
                ),
                _SectionHeader(
                  label: AppStrings.t('settings.notifications', locale),
                ),
                SwitchListTile(
                  title: Text(
                    AppStrings.t('settings.notifications.push', locale),
                  ),
                  value: _push,
                  onChanged: (v) => setState(() => _push = v),
                ),
                SwitchListTile(
                  title: Text(
                    AppStrings.t('settings.notifications.email', locale),
                  ),
                  value: _email,
                  onChanged: (v) => setState(() => _email = v),
                ),
                SwitchListTile(
                  title: Text(
                    AppStrings.t('settings.notifications.live', locale),
                  ),
                  value: _live,
                  onChanged: (v) => setState(() => _live = v),
                ),
                _SectionHeader(
                  label: AppStrings.t('settings.account', locale),
                ),
                SwitchListTile(
                  title: Text(
                    AppStrings.t('settings.dataSaver', locale),
                  ),
                  value: _dataSaver,
                  onChanged: (v) => setState(() => _dataSaver = v),
                ),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: FilledButton.icon(
                    onPressed: _savePrefs,
                    icon: const Icon(Icons.save),
                    label: Text(AppStrings.t('common.save', locale)),
                  ),
                ),
              ],
            ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        label.toUpperCase(),
        style: t.textTheme.labelMedium?.copyWith(
          letterSpacing: 1.2,
          color: t.colorScheme.primary,
        ),
      ),
    );
  }
}

String _themeToString(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'light';
    case ThemeMode.system:
      return 'system';
    case ThemeMode.dark:
      return 'dark';
  }
}
