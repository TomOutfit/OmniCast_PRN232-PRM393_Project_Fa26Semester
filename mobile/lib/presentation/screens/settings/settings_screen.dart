// OmniCast - Settings Screen
// Theme / language / notifications / data saver / account security.
// Re-designed with Cyber-Dark Broadcast System aesthetics.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/injection.dart';
import '../../../core/i18n/app_locale.dart';
import '../../../core/i18n/strings.dart';
import '../../../core/utils/token_storage_helper.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/newsletter_repository.dart';
import '../../../logic/auth/auth_bloc.dart';
import '../../../logic/newsletter/newsletter_bloc.dart';

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
                    // Newsletter — REAL API
                    // Replaces the previous local-only toggle.
                    // Subscribes via `POST /v1/newsletter/subscribe`
                    // (public, 5 req/min/IP, idempotent). The form
                    // pre-fills the current user's email when
                    // authenticated, and falls back to a manual
                    // input for guests.
                    BlocProvider<NewsletterBloc>(
                      create: (_) => getIt<NewsletterBloc>(),
                      child: const _NewsletterCard(),
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

                // ── Account Security Section ─────────────────────────
                // Two logout actions:
                //   1. "Đăng xuất" — single device (revoke this refresh
                //      token; other devices stay signed in).
                //   2. "Đăng xuất mọi thiết bị" — revoke every refresh
                //      token owned by the user (use when phone is lost
                //      or shared account).
                const _SectionTitle(
                  icon: Icons.security_rounded,
                  title: 'BẢO MẬT TÀI KHOẢN',
                ),
                _CyberCard(
                  children: [
                    _LogoutActionTile(
                      icon: Icons.logout_rounded,
                      iconColor: const Color(0xFFF59E0B),
                      title: 'Đăng xuất khỏi thiết bị này',
                      subtitle: 'Phiên hiện tại kết thúc. Thiết bị khác vẫn hoạt động.',
                      buttonLabel: 'Đăng xuất',
                      buttonColor: const Color(0xFFF59E0B),
                      onConfirm: () {
                        context.read<AuthBloc>().add(LogoutRequested());
                        context.go('/login');
                      },
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Divider(color: Color(0x1A00E5FF), height: 1),
                    ),
                    _LogoutActionTile(
                      icon: Icons.shield_rounded,
                      iconColor: const Color(0xFFEF4444),
                      title: 'Đăng xuất khỏi mọi thiết bị',
                      subtitle:
                          'Thu hồi tất cả refresh token. Bạn sẽ cần đăng nhập lại trên mọi thiết bị.',
                      buttonLabel: 'Đăng xuất tất cả',
                      buttonColor: const Color(0xFFEF4444),
                      onConfirm: () {
                        context.read<AuthBloc>().add(
                              LogoutAllDevicesRequested(),
                            );
                        context.go('/login');
                      },
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

/// Reusable Logout row used by the "Account Security" section of
/// the Settings screen. Renders a labelled icon, a title/subtitle
/// explaining the scope of the logout (single vs all devices), and
/// a destructive CTA button. Confirmation is handled by an
/// `AlertDialog` that the parent triggers via `onConfirm`.
class _LogoutActionTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String buttonLabel;
  final Color buttonColor;
  final VoidCallback onConfirm;

  const _LogoutActionTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.buttonColor,
    required this.onConfirm,
  });

  Future<void> _showConfirmDialog(BuildContext context) async {
    final isAllDevices = buttonColor == const Color(0xFFEF4444);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF090F1A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFF162338)),
        ),
        title: Text(
          isAllDevices
              ? 'Đăng xuất khỏi mọi thiết bị?'
              : 'Đăng xuất khỏi OmniCast?',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
        content: Text(
          isAllDevices
              ? 'Tất cả phiên đăng nhập của bạn sẽ bị thu hồi. Bạn sẽ cần đăng nhập lại trên từng thiết bị.'
              : 'Phiên hiện tại sẽ kết thúc. Các thiết bị khác của bạn vẫn hoạt động bình thường.',
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 13,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Hủy',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: buttonColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              buttonLabel,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      onConfirm();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton(
          onPressed: () => _showConfirmDialog(context),
          style: ElevatedButton.styleFrom(
            backgroundColor: buttonColor.withValues(alpha: 0.15),
            foregroundColor: buttonColor,
            side: BorderSide(color: buttonColor.withValues(alpha: 0.5)),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            textStyle: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
          child: Text(buttonLabel),
        ),
      ],
    );
  }
}

// ============================================================
// NEWSLETTER FORM — real API subscriber
// ------------------------------------------------------------
// Mounted in the "Thông báo đẩy" section of Settings. Wraps
// the `NewsletterBloc` so the form is fully self-contained —
// the parent `SettingsScreen` doesn't need to know about the
// newsletter domain.
// ============================================================

class _NewsletterCard extends StatefulWidget {
  const _NewsletterCard();

  @override
  State<_NewsletterCard> createState() => _NewsletterCardState();
}

class _NewsletterCardState extends State<_NewsletterCard> {
  final _emailCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  // Topic toggles — match the backend enum values.
  bool _weekly = true;
  bool _aiPicks = true;
  bool _liveAlerts = true;

  @override
  void initState() {
    super.initState();
    // Pre-fill with the signed-in user's email so a signed-in
    // user can subscribe in one tap.
    final auth = context.read<AuthBloc>().state;
    if (auth is Authenticated && auth.user.email.isNotEmpty) {
      _emailCtrl.text = auth.user.email;
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  List<NewsletterTopic> _selectedTopics() {
    return [
      if (_weekly) NewsletterTopic.weeklySchedule,
      if (_aiPicks) NewsletterTopic.aiCuratorPicks,
      if (_liveAlerts) NewsletterTopic.liveAlerts,
    ];
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    HapticFeedback.lightImpact();
    final locale = appLocaleOf(context).code;
    context.read<NewsletterBloc>().add(
          NewsletterSubscribeRequested(
            email: _emailCtrl.text,
            topics: _selectedTopics(),
            locale: locale,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<NewsletterBloc, NewsletterState>(
      listener: (context, state) {
        if (state is NewsletterSuccess) {
          HapticFeedback.mediumImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF091424),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(
                  color: state.alreadySubscribed
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF00E5FF),
                  width: 0.8,
                ),
              ),
              content: Row(
                children: [
                  Icon(
                    state.alreadySubscribed
                        ? Icons.info_outline_rounded
                        : Icons.check_circle_rounded,
                    color: state.alreadySubscribed
                        ? const Color(0xFFCBD5E1)
                        : const Color(0xFF00E5FF),
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      state.alreadySubscribed
                          ? 'Bạn đã đăng ký rồi — ${state.email}'
                          : 'Đã đăng ký — ${state.email}. Kiểm tra email để xác nhận (có thể trong thư mục spam).',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        } else if (state is NewsletterFailure) {
          HapticFeedback.heavyImpact();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF1C0A0A),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFF7F1D1D), width: 0.8),
              ),
              content: Row(
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: Color(0xFFF87171),
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      state.message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      },
      builder: (context, state) {
        final isSending = state is NewsletterSending;
        return Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Bản tin email',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 3),
              const Text(
                'Lịch phát sóng tuần, gợi ý AI và cảnh báo trực tiếp — không spam.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                enabled: !isSending,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                decoration: InputDecoration(
                  prefixIcon: const Icon(
                    Icons.alternate_email_rounded,
                    color: Color(0xFF94A3B8),
                    size: 18,
                  ),
                  hintText: 'email@example.com',
                  hintStyle: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 13,
                  ),
                  filled: true,
                  fillColor: const Color(0xFF0F172A),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: Color(0x1F00E5FF),
                      width: 0.8,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: Color(0x1F00E5FF),
                      width: 0.8,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: Color(0xFF00E5FF),
                      width: 1.2,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: Color(0xFFEF4444),
                      width: 0.8,
                    ),
                  ),
                ),
                validator: (v) {
                  final s = (v ?? '').trim();
                  if (s.isEmpty) return 'Vui lòng nhập email';
                  if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(s)) {
                    return 'Email không hợp lệ';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              // Topic checkboxes
              _TopicRow(
                label: 'Lịch phát sóng hàng tuần',
                value: _weekly,
                onChanged: isSending
                    ? null
                    : (v) => setState(() => _weekly = v),
              ),
              _TopicRow(
                label: 'Gợi ý AI Curator',
                value: _aiPicks,
                onChanged: isSending
                    ? null
                    : (v) => setState(() => _aiPicks = v),
              ),
              _TopicRow(
                label: 'Cảnh báo trực tiếp',
                value: _liveAlerts,
                onChanged: isSending
                    ? null
                    : (v) => setState(() => _liveAlerts = v),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 42,
                child: ElevatedButton.icon(
                  onPressed: isSending ? null : _submit,
                  icon: isSending
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : const Icon(
                          Icons.send_rounded,
                          size: 16,
                          color: Colors.black,
                        ),
                  label: Text(
                    isSending ? 'Đang gửi…' : 'Đăng ký nhận bản tin',
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF),
                    disabledBackgroundColor: const Color(0xFF0F172A),
                    disabledForegroundColor: const Color(0xFF64748B),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TopicRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool>? onChanged;

  const _TopicRow({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onChanged == null;
    return InkWell(
      onTap: disabled ? null : () => onChanged!(!value),
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: Checkbox(
                value: value,
                onChanged: disabled
                    ? null
                    : (v) => onChanged!(v ?? false),
                activeColor: const Color(0xFF00E5FF),
                checkColor: Colors.black,
                side: const BorderSide(
                  color: Color(0x1F00E5FF),
                  width: 0.8,
                ),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: disabled
                      ? const Color(0xFF64748B)
                      : const Color(0xFFCBD5E1),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
