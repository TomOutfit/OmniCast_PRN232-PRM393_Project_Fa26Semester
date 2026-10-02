// OmniCast - Settings Screen
// Theme / language / notifications / data saver.
// Re-designed with Cyber-Dark Broadcast System aesthetics.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/i18n/app_locale.dart';
import '../../../core/i18n/strings.dart';
import '../../../core/utils/token_storage_helper.dart';
import '../../../core/theme/app_theme.dart';

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
    HapticFeedback.mediumImpact();
    await _storage.saveNotificationPrefs(
      push: _push,
      email: _email,
      live: _live,
    );
    await _storage.saveDataSaver(_dataSaver);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF091424),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF00E5FF), width: 0.8),
        ),
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Color(0xFF00E5FF), size: 20),
            const SizedBox(width: 10),
            Text(
              AppStrings.t('common.save', appLocaleOf(context)),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = appLocaleOf(context);
    final mode = appThemeModeOf(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        centerTitle: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              AppStrings.t('settings.title', locale),
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                fontFamily: 'Outfit',
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 2),
            const Text(
              'HỆ THỐNG & TÙY CHỌN PHÁT SÓNG',
              style: TextStyle(
                fontSize: 10,
                fontFamily: 'JetBrainsMono',
                fontWeight: FontWeight.w700,
                color: Color(0xFF00E5FF),
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
      ),
      body: !_hydrated
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
            )
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                // Appearance Section
                _SectionTitle(
                  icon: Icons.palette_outlined,
                  title: AppStrings.t('settings.appearance', locale),
                ),
                _CyberCard(
                  children: [
                    Text(
                      AppStrings.t('settings.theme.label', locale),
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _ThemePill(
                          label: AppStrings.t('settings.theme.dark', locale),
                          icon: Icons.dark_mode_rounded,
                          isSelected: mode == ThemeMode.dark,
                          onTap: () {
                            AppThemeModeScope.read(context).setMode(ThemeMode.dark);
                            _storage.saveThemeMode('dark');
                          },
                        ),
                        const SizedBox(width: 8),
                        _ThemePill(
                          label: AppStrings.t('settings.theme.light', locale),
                          icon: Icons.light_mode_rounded,
                          isSelected: mode == ThemeMode.light,
                          onTap: () {
                            AppThemeModeScope.read(context).setMode(ThemeMode.light);
                            _storage.saveThemeMode('light');
                          },
                        ),
                        const SizedBox(width: 8),
                        _ThemePill(
                          label: AppStrings.t('settings.theme.system', locale),
                          icon: Icons.settings_brightness_rounded,
                          isSelected: mode == ThemeMode.system,
                          onTap: () {
                            AppThemeModeScope.read(context).setMode(ThemeMode.system);
                            _storage.saveThemeMode('system');
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(color: Color(0x1A00E5FF), height: 1),
                    const SizedBox(height: 14),
                    Text(
                      AppStrings.t('settings.language.label', locale),
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: AppLocale.values.map((l) {
                        final isSel = l == appLocaleOf(context);
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: InkWell(
                            onTap: () {
                              AppLocaleScope.read(context).setLocale(l);
                              _storage.saveLocale(l.code);
                            },
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSel ? const Color(0x2600E5FF) : const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSel ? const Color(0xFF00E5FF) : const Color(0x1F00E5FF),
                                  width: isSel ? 1.2 : 0.8,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    l.code == 'vi' ? '🇻🇳' : '🇬🇧',
                                    style: const TextStyle(fontSize: 14),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    l.label,
                                    style: TextStyle(
                                      color: isSel ? const Color(0xFF00E5FF) : Colors.white,
                                      fontSize: 13,
                                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Notifications Section
                _SectionTitle(
                  icon: Icons.notifications_active_outlined,
                  title: AppStrings.t('settings.notifications', locale),
                ),
                _CyberCard(
                  children: [
                    _CyberSwitchRow(
                      title: AppStrings.t('settings.notifications.push', locale),
                      subtitle: 'Thông báo đẩy khi chương trình phát sóng',
                      value: _push,
                      onChanged: (v) => setState(() => _push = v),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Divider(color: Color(0x1A00E5FF), height: 1),
                    ),
                    _CyberSwitchRow(
                      title: AppStrings.t('settings.notifications.live', locale),
                      subtitle: 'Cảnh báo luồng phát trực tiếp khẩn cấp',
                      value: _live,
                      onChanged: (v) => setState(() => _live = v),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Divider(color: Color(0x1A00E5FF), height: 1),
                    ),
                    _CyberSwitchRow(
                      title: AppStrings.t('settings.notifications.email', locale),
                      subtitle: 'Bản tin tổng hợp lịch phát sóng hàng tuần',
                      value: _email,
                      onChanged: (v) => setState(() => _email = v),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Streaming & Bandwidth Section
                const _SectionTitle(
                  icon: Icons.network_check_rounded,
                  title: 'BĂNG THÔNG & MẠNG',
                ),
                _CyberCard(
                  children: [
                    _CyberSwitchRow(
                      title: AppStrings.t('settings.dataSaver', locale),
                      subtitle: 'Tối ưu tiết kiệm dữ liệu di động (giới hạn 1080p khi dùng 4G/5G)',
                      value: _dataSaver,
                      onChanged: (v) => setState(() => _dataSaver = v),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0x1A00E5FF),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0x3300E5FF), width: 0.8),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.bolt_rounded, color: Color(0xFF00E5FF), size: 16),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'HEVC H.265 Direct Stream · Độ trễ phát sóng <1.2s',
                              style: TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 11,
                                fontFamily: 'JetBrainsMono',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // Save CTA button
                GestureDetector(
                  onTap: _savePrefs,
                  child: Container(
                    width: double.infinity,
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00E5FF), Color(0xFF0072FF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00E5FF).withValues(alpha: 0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.save_rounded, color: Colors.black, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          AppStrings.t('common.save', locale).toUpperCase(),
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'Outfit',
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionTitle({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 2),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF00E5FF)),
          const SizedBox(width: 6),
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: Color(0xFF00E5FF),
              fontSize: 12,
              fontFamily: 'JetBrainsMono',
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

class _CyberCard extends StatelessWidget {
  final List<Widget> children;

  const _CyberCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1320),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0x1F00E5FF),
          width: 0.8,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _ThemePill extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _ThemePill({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0x2600E5FF) : const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? const Color(0xFF00E5FF) : const Color(0x1F00E5FF),
              width: isSelected ? 1.2 : 0.8,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected ? const Color(0xFF00E5FF) : const Color(0xFF94A3B8),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? const Color(0xFF00E5FF) : Colors.white,
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CyberSwitchRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _CyberSwitchRow({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Switch.adaptive(
          value: value,
          onChanged: onChanged,
          activeTrackColor: const Color(0xFF00E5FF),
          activeThumbColor: Colors.black,
          inactiveThumbColor: const Color(0xFF64748B),
          inactiveTrackColor: const Color(0xFF1E293B),
        ),
      ],
    );
  }
}
