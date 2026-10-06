// OmniCast · Login Screen
//
// Re-designed against the canonical Stitch "Live TV & EPG" design system.
//  • Deep-navy surface (#0F131D) + cyan primary (#00F2FE) — see AppColors
//  • Outfit (display) + Inter (body) + JetBrains Mono (telemetry labels)
//  • Pill CTAs with cyan glow · glass blur · animated ON-AIR pulse
//  • Asymmetric split (mobile): brand showcase on top, secure-login form
//    below (collapses to single scrollable column on small devices).
//  • All previous contracts preserved — remember-me email persisted via
//    flutter_secure_storage, Caps-Lock detection via RawKeyboardListener,
//    inline validation with focus-to-first-failure, social placeholders,
//    guest + demo accounts.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/brand_logo.dart';
import '../../../logic/auth/auth_bloc.dart';
import '../../../core/theme/app_theme.dart';

// ─── Persisted prefs ─────────────────────────────────────────────────────
const _kRememberMe = 'omnicast.remember_me';
const _kLastEmail = 'omnicast.last_email';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _storage = const FlutterSecureStorage();

  bool _obscurePassword = true;
  bool _rememberMe = false;
  bool _capsLockOn = false;
  bool _hydrated = false;

  @override
  void initState() {
    super.initState();
    _hydrateSavedPrefs();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _emailController.text.isEmpty) {
        FocusScope.of(context).requestFocus(_emailFocus);
      }
    });
  }

  Future<void> _hydrateSavedPrefs() async {
    try {
      final remember = await _storage.read(key: _kRememberMe);
      final email = await _storage.read(key: _kLastEmail);
      if (!mounted) return;
      setState(() {
        _rememberMe = remember == '1';
        if (_rememberMe && email != null && email.isNotEmpty) {
          _emailController.text = email;
        }
      });
    } catch (_) {
      // Storage may be unavailable; fall through silently.
    } finally {
      if (mounted) setState(() => _hydrated = true);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final formState = _formKey.currentState;
    if (formState == null || !formState.validate()) {
      final ctx = _emailController.text.trim().isEmpty
          ? _emailFocus
          : _passwordFocus;
      FocusScope.of(context).requestFocus(ctx);
      return;
    }

    FocusScope.of(context).unfocus();

    try {
      if (_rememberMe) {
        await _storage.write(key: _kRememberMe, value: '1');
        await _storage.write(
          key: _kLastEmail,
          value: _emailController.text.trim(),
        );
      } else {
        await _storage.write(key: _kRememberMe, value: '0');
        await _storage.delete(key: _kLastEmail);
      }
    } catch (_) {
      /* non-fatal */
    }

    if (!mounted) return;
    context.read<AuthBloc>().add(
          LoginRequested(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          ),
        );
  }

  void _applyDemo(String email, String password) {
    setState(() {
      _emailController.text = email;
      _passwordController.text = password;
    });
    FocusScope.of(context).requestFocus(_passwordFocus);
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: Stack(
          children: [
            // Decorative backdrop — cyan radial + cyber grid
            const _BackgroundBackdrop(),
            // Content
            BlocListener<AuthBloc, AuthState>(
              listener: (context, state) {
                if (state is Authenticated) {
                  context.go('/home');
                } else if (state is AuthError) {
                  _showError(state.message);
                }
              },
              child: SafeArea(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.only(
                    top: media.padding.top > 0 ? 8 : 16,
                    bottom: 24,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: media.size.height -
                          media.padding.top -
                          media.padding.bottom -
                          32,
                    ),
                    child: IntrinsicHeight(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const SizedBox(height: 16),
                            // Brand header (collapses to mobile compact header)
                            _BrandHeader(hydrated: _hydrated),
                            const SizedBox(height: 24),
                            // Live telemetry card (hidden on very small screens)
                            const _TelemetryCard(),
                            const SizedBox(height: 24),
                            // Form card
                            _FormCard(
                              formKey: _formKey,
                              emailController: _emailController,
                              passwordController: _passwordController,
                              emailFocus: _emailFocus,
                              passwordFocus: _passwordFocus,
                              obscurePassword: _obscurePassword,
                              onTogglePassword: () => setState(
                                  () => _obscurePassword = !_obscurePassword),
                              rememberMe: _rememberMe,
                              onRememberChanged: (v) =>
                                  setState(() => _rememberMe = v ?? false),
                              capsLockOn: _capsLockOn,
                              onCapsLockChanged: (on) =>
                                  setState(() => _capsLockOn = on),
                              onSubmit: _handleLogin,
                            ),
                            const SizedBox(height: 16),
                            _SignUpRow(onTap: () => context.go('/register')),
                            const SizedBox(height: 16),
                            _SocialRow(
                              onGoogle: () => _toastInfo(
                                'Đăng nhập Google sẽ sớm ở bản cập nhật tiếp theo.',
                              ),
                              onApple: () => _toastInfo(
                                'Đăng nhập Apple sẽ sớm ở bản cập nhật tiếp theo.',
                              ),
                            ),
                            const SizedBox(height: 16),
                            _GuestButton(onTap: () => context.go('/home')),
                            const SizedBox(height: 16),
                            _DemoAccountsCard(
                              onViewer: () => _applyDemo(
                                'viewer1@omnicast.tv',
                                'Admin123!',
                              ),
                              onAdmin: () => _applyDemo(
                                'admin@omnicast.tv',
                                'Admin123!',
                              ),
                              onStaff: () => _applyDemo(
                                'staff@omnicast.tv',
                                'Admin123!',
                              ),
                            ),
                            const Spacer(),
                            const _LegalFooter(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showError(String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        backgroundColor: AppColors.stitchSurfaceContainerHigh,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rLg),
          side: const BorderSide(color: AppColors.stitchError, width: 0.8),
        ),
        content: Row(
          children: [
            const Icon(Icons.error_outline,
                color: AppColors.stitchError, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: AppColors.stitchOnSurface,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _toastInfo(String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Background backdrop — cyan radial + cyber grid (Stitch DNA)
// ─────────────────────────────────────────────────────────────────────────

class _BackgroundBackdrop extends StatelessWidget {
  const _BackgroundBackdrop();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -0.6),
                  radius: 1.2,
                  colors: [
                    AppColors.stitchPrimaryContainer.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(painter: _GridPainter()),
          ),
          // Studio spatial lighting orbs
          Positioned(
            top: -120,
            left: -80,
            child: _Orb(
              size: 300,
              color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.12),
            ),
          ),
          Positioned(
            top: 260,
            right: -100,
            child: _Orb(
              size: 260,
              color: AppColors.stitchSecondary.withValues(alpha: 0.08),
            ),
          ),
          Positioned(
            bottom: 40,
            left: -60,
            child: _Orb(
              size: 220,
              color: AppColors.stitchTertiaryContainer.withValues(alpha: 0.06),
            ),
          ),
        ],
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.stitchOutlineVariant.withValues(alpha: 0.025)
      ..strokeWidth = 0.5;
    const step = 44.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_GridPainter oldDelegate) => false;
}

class _Orb extends StatelessWidget {
  final double size;
  final Color color;
  const _Orb({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
          stops: const [0.0, 1.0],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Brand header (logo + ON-AIR chip + title + subtitle)
// ─────────────────────────────────────────────────────────────────────────

class _BrandHeader extends StatelessWidget {
  final bool hydrated;
  const _BrandHeader({required this.hydrated});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 480),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) {
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 12),
            child: child,
          ),
        );
      },
      child: Column(
        children: [
          const Center(
            child: OmniCastBrandLogo(size: 76, showGlow: true),
          ),
          const SizedBox(height: 14),
          // Broadcast Studio Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(AppColors.rPill),
              border: Border.all(
                color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.28),
                width: 0.8,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _LivePulseDot(color: AppColors.stitchPrimaryContainer),
                const SizedBox(width: 6),
                Text(
                  'BROADCAST PORTAL // PHIÊN BẢO MẬT',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontFamily: AppFonts.mono,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.18 * 10 / 10,
                    color: AppColors.stitchPrimaryContainer,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ShaderMask(
            shaderCallback: (rect) => const LinearGradient(
              colors: [AppColors.stitchPrimary, AppColors.stitchSecondary],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ).createShader(rect),
            blendMode: BlendMode.srcIn,
            child: const Text(
              'Đăng nhập OmniCast',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 28,
                fontFamily: AppFonts.display,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
          ),
          const SizedBox(height: 2),
          ShaderMask(
            shaderCallback: (rect) => const LinearGradient(
              colors: [AppColors.stitchPrimaryContainer, AppColors.stitchSecondary],
            ).createShader(rect),
            blendMode: BlendMode.srcIn,
            child: const Text(
              'Hạ tầng truyền hình 4K',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontFamily: AppFonts.display,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Hệ thống truyền hình tương tác độ trễ thấp & đồng bộ đa thiết bị.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13.5,
              fontFamily: AppFonts.body,
              color: AppColors.stitchOnSurfaceVariant,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _LivePulseDot extends StatefulWidget {
  final Color color;
  const _LivePulseDot({required this.color});

  @override
  State<_LivePulseDot> createState() => _LivePulseDotState();
}

class _LivePulseDotState extends State<_LivePulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _scale = Tween(begin: 1.0, end: 2.2).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
    _fade = Tween(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 12,
      height: 12,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, __) {
          return Stack(
            alignment: Alignment.center,
            children: [
              Transform.scale(
                scale: _scale.value,
                child: Opacity(
                  opacity: _fade.value,
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: widget.color,
                    ),
                  ),
                ),
              ),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.color,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Live telemetry card (Stitch pattern: LIVE FEED + Sessions/Latency/Channels)
// ─────────────────────────────────────────────────────────────────────────

class _TelemetryCard extends StatelessWidget {
  const _TelemetryCard();

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) {
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 12),
            child: child,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.stitchSurfaceContainerLowest.withValues(alpha: 0.70),
          borderRadius: BorderRadius.circular(AppColors.rLg),
          border: Border.all(
            color: AppColors.stitchOutlineVariant.withValues(alpha: 0.60),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x4D000000),
              blurRadius: 24,
              spreadRadius: -8,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _LivePulseDot(color: AppColors.stitchError),
                const SizedBox(width: 8),
                Text(
                  'LIVE FEED // SECURE AUTH',
                  style: TextStyle(
                    fontSize: 11,
                    fontFamily: AppFonts.mono,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.18 * 11 / 11,
                    color: AppColors.stitchError,
                  ),
                ),
                const Spacer(),
                Text(
                  'TLS 1.3 · OWASP',
                  style: TextStyle(
                    fontSize: 10,
                    fontFamily: AppFonts.mono,
                    color: AppColors.stitchOnSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: const [
                Expanded(
                  child: _Metric(
                    label: 'Sessions',
                    value: '12.4K',
                    sub: 'đang trực tuyến',
                    color: AppColors.stitchPrimaryContainer,
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: _Metric(
                    label: 'Latency',
                    value: '0.42s',
                    sub: 'sign-in p95',
                    color: AppColors.stitchSecondary,
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: _Metric(
                    label: 'Channels',
                    value: '524',
                    sub: 'toàn quốc',
                    color: AppColors.stitchTertiaryContainer,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final Color color;
  const _Metric({
    required this.label,
    required this.value,
    required this.sub,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.stitchSurfaceContainer,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        border: Border.all(
          color: AppColors.stitchOutlineVariant.withValues(alpha: 0.40),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 9,
              fontFamily: AppFonts.mono,
              color: AppColors.stitchOutline,
              letterSpacing: 0.18 * 9 / 9,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontFamily: AppFonts.display,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: -0.4,
            ),
          ),
          Text(
            sub,
            style: TextStyle(
              fontSize: 9,
              fontFamily: AppFonts.mono,
              color: AppColors.stitchOnSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Form card (email, password, remember, submit) — Stitch styled
// ─────────────────────────────────────────────────────────────────────────

class _FormCard extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final FocusNode emailFocus;
  final FocusNode passwordFocus;
  final bool obscurePassword;
  final VoidCallback onTogglePassword;
  final bool rememberMe;
  final ValueChanged<bool?> onRememberChanged;
  final bool capsLockOn;
  final ValueChanged<bool> onCapsLockChanged;
  final VoidCallback onSubmit;

  const _FormCard({
    required this.formKey,
    required this.emailController,
    required this.passwordController,
    required this.emailFocus,
    required this.passwordFocus,
    required this.obscurePassword,
    required this.onTogglePassword,
    required this.rememberMe,
    required this.onRememberChanged,
    required this.capsLockOn,
    required this.onCapsLockChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) {
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 16),
            child: child,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
        decoration: BoxDecoration(
          color: AppColors.stitchSurfaceContainer.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(AppColors.rXl),
          border: Border.all(
            color: AppColors.stitchOutlineVariant.withValues(alpha: 0.60),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x73000000),
              blurRadius: 24,
              spreadRadius: -6,
              offset: Offset(0, 8),
            ),
            BoxShadow(
              color: Color(0x14FFFFFF),
              blurRadius: 0,
            ),
          ],
        ),
        child: Form(
          key: formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Secure-channel strip
              Row(
                children: [
                  _LivePulseDot(color: AppColors.stitchPrimaryContainer),
                  const SizedBox(width: 8),
                  Text(
                    'SECURE CHANNEL',
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: AppFonts.mono,
                      fontWeight: FontWeight.w700,
                      color: AppColors.stitchPrimaryContainer,
                      letterSpacing: 0.18 * 10 / 10,
                    ),
                  ),
                  const Spacer(),
                  Icon(Icons.account_circle_outlined,
                      size: 12, color: AppColors.stitchOnSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    'CREDENTIAL · JWT',
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: AppFonts.mono,
                      color: AppColors.stitchOnSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Email
              _FormField(
                label: 'EMAIL',
                hint: 'nguoixem@omnicast.tv',
                controller: emailController,
                focusNode: emailFocus,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autoFillHints: const [AutofillHints.email],
                prefixIcon: Icons.mail_outline_rounded,
                validator: (value) {
                  final v = value?.trim() ?? '';
                  if (v.isEmpty) return 'Vui lòng nhập email';
                  final regex = RegExp(
                    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$',
                  );
                  if (!regex.hasMatch(v)) return 'Email không hợp lệ';
                  return null;
                },
                onSubmitted: (_) => passwordFocus.requestFocus(),
              ),
              const SizedBox(height: 14),
              // Password (with caps-lock detection)
              _PasswordField(
                controller: passwordController,
                focusNode: passwordFocus,
                obscure: obscurePassword,
                onToggleObscure: onTogglePassword,
                onCapsLockChanged: onCapsLockChanged,
                onSubmitted: (_) => onSubmit(),
                validator: (value) {
                  final v = value ?? '';
                  if (v.isEmpty) return 'Vui lòng nhập mật khẩu';
                  if (v.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
                  return null;
                },
              ),
              if (capsLockOn)
                Padding(
                  padding: const EdgeInsets.only(top: 6, left: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded,
                          color: AppColors.warning, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        'PHÍM CAPS LOCK ĐANG BẬT',
                        style: TextStyle(
                          color: AppColors.warning,
                          fontSize: 10,
                          fontFamily: AppFonts.mono,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.18 * 10 / 10,
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              // Remember-me + Forgot-password row
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: () => onRememberChanged(!rememberMe),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: Checkbox(
                                value: rememberMe,
                                onChanged: onRememberChanged,
                                activeColor: AppColors.stitchPrimaryContainer,
                                checkColor: AppColors.stitchOnPrimaryContainer,
                                side: const BorderSide(
                                  color: AppColors.stitchOutlineVariant,
                                  width: 1.5,
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'GHI NHỚ EMAIL',
                              style: TextStyle(
                                color: AppColors.stitchOnSurfaceVariant,
                                fontSize: 10,
                                fontFamily: AppFonts.mono,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.18 * 10 / 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _toastInfo(
                      context,
                      'Vui lòng liên hệ support@omnicast.tv để đặt lại mật khẩu.',
                    ),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'QUÊN MẬT KHẨU?',
                      style: TextStyle(
                        fontSize: 10,
                        fontFamily: AppFonts.mono,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.18 * 10 / 10,
                        color: AppColors.stitchPrimaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Submit (pill with cyan glow)
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  final isLoading = state is AuthLoading;
                  return _GradientButton(
                    label: 'ĐĂNG NHẬP',
                    isLoading: isLoading,
                    onPressed: isLoading ? null : onSubmit,
                    icon: Icons.arrow_forward_rounded,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _toastInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 3)),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Form field — Stitch style (mono label, on-surface-lowest background)
// ─────────────────────────────────────────────────────────────────────────

class _FormField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController controller;
  final FocusNode focusNode;
  final TextInputType keyboardType;
  final TextInputAction textInputAction;
  final List<String> autoFillHints;
  final IconData prefixIcon;
  final String? Function(String?)? validator;
  final void Function(String)? onSubmitted;

  const _FormField({
    required this.label,
    this.hint,
    required this.controller,
    required this.focusNode,
    required this.keyboardType,
    required this.textInputAction,
    required this.autoFillHints,
    required this.prefixIcon,
    required this.validator,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontFamily: AppFonts.mono,
              fontWeight: FontWeight.w700,
              color: AppColors.stitchOnSurfaceVariant,
              letterSpacing: 0.18 * 10 / 10,
            ),
          ),
        ),
        TextFormField(
          controller: controller,
          focusNode: focusNode,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          autofillHints: autoFillHints,
          autocorrect: false,
          enableSuggestions: false,
          style: const TextStyle(
            color: AppColors.stitchPrimary,
            fontSize: 16,
            fontFamily: AppFonts.body,
          ),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(prefixIcon,
                color: AppColors.stitchOutline, size: 18),
            filled: true,
            fillColor: AppColors.stitchSurfaceContainerLowest,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppColors.rXl),
              borderSide: const BorderSide(
                  color: AppColors.stitchOutlineVariant, width: 1),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppColors.rXl),
              borderSide: const BorderSide(
                  color: AppColors.stitchOutlineVariant, width: 1),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppColors.rXl),
              borderSide: const BorderSide(
                  color: AppColors.stitchPrimaryContainer, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppColors.rXl),
              borderSide: const BorderSide(color: AppColors.stitchError),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppColors.rXl),
              borderSide: const BorderSide(
                  color: AppColors.stitchError, width: 1.5),
            ),
            errorStyle: const TextStyle(
              color: AppColors.stitchError,
              fontSize: 11,
              fontFamily: AppFonts.mono,
              fontWeight: FontWeight.w600,
            ),
            hintStyle: TextStyle(
              color: AppColors.stitchOutline,
              fontSize: 14,
              fontFamily: AppFonts.body,
            ),
          ),
          validator: validator,
          onFieldSubmitted: onSubmitted,
        ),
      ],
    );
  }
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final ValueChanged<bool> onCapsLockChanged;
  final String? Function(String?)? validator;
  final void Function(String)? onSubmitted;

  const _PasswordField({
    required this.controller,
    required this.focusNode,
    required this.obscure,
    required this.onToggleObscure,
    required this.onCapsLockChanged,
    required this.validator,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            'MẬT KHẨU',
            style: TextStyle(
              fontSize: 10,
              fontFamily: AppFonts.mono,
              fontWeight: FontWeight.w700,
              color: AppColors.stitchOnSurfaceVariant,
              letterSpacing: 0.18 * 10 / 10,
            ),
          ),
        ),
        Focus(
          onKeyEvent: (node, event) {
            if (event is KeyDownEvent || event is KeyRepeatEvent) {
              final caps = event.character != null &&
                  event.character!.toUpperCase() == event.character &&
                  event.character!.toLowerCase() != event.character &&
                  event.logicalKey.keyLabel.length == 1;
              final on = HardwareKeyboard.instance.lockModesEnabled
                      .contains(KeyboardLockMode.capsLock) ||
                  caps;
              onCapsLockChanged(on);
            }
            return KeyEventResult.ignored;
          },
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            obscureText: obscure,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            autocorrect: false,
            enableSuggestions: false,
            style: const TextStyle(
              color: AppColors.stitchPrimary,
              fontSize: 16,
              fontFamily: AppFonts.body,
            ),
            decoration: InputDecoration(
              hintText: 'Nhập mật khẩu của bạn',
              prefixIcon: const Icon(Icons.lock_outline_rounded,
                  color: AppColors.stitchOutline, size: 18),
              suffixIcon: IconButton(
                icon: Icon(
                  obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: AppColors.stitchOutline,
                  size: 18,
                ),
                onPressed: onToggleObscure,
                tooltip: obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
              ),
              filled: true,
              fillColor: AppColors.stitchSurfaceContainerLowest,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppColors.rXl),
                borderSide: const BorderSide(
                    color: AppColors.stitchOutlineVariant, width: 1),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppColors.rXl),
                borderSide: const BorderSide(
                    color: AppColors.stitchOutlineVariant, width: 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppColors.rXl),
                borderSide: const BorderSide(
                    color: AppColors.stitchPrimaryContainer, width: 1.5),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppColors.rXl),
                borderSide: const BorderSide(color: AppColors.stitchError),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppColors.rXl),
                borderSide: const BorderSide(
                    color: AppColors.stitchError, width: 1.5),
              ),
              errorStyle: const TextStyle(
                color: AppColors.stitchError,
                fontSize: 11,
                fontFamily: AppFonts.mono,
                fontWeight: FontWeight.w600,
              ),
              hintStyle: TextStyle(
                color: AppColors.stitchOutline,
                fontSize: 14,
                fontFamily: AppFonts.body,
              ),
            ),
            validator: validator,
            onFieldSubmitted: onSubmitted,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Pill submit button with cyan glow
// ─────────────────────────────────────────────────────────────────────────

class _GradientButton extends StatelessWidget {
  final String label;
  final bool isLoading;
  final VoidCallback? onPressed;
  final IconData icon;

  const _GradientButton({
    required this.label,
    required this.isLoading,
    required this.onPressed,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Opacity(
        opacity: onPressed == null ? 0.7 : 1,
        child: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [
                AppColors.stitchPrimaryContainer,
                AppColors.stitchSecondary,
              ],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(AppColors.rPill),
            boxShadow: AppColors.glowCyan,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppColors.rPill),
              onTap: onPressed,
              child: Center(
                child: isLoading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: AppColors.stitchOnPrimaryContainer,
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              color: AppColors.stitchOnPrimaryContainer,
                              fontSize: 14,
                              fontFamily: AppFonts.display,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.18 * 14 / 14,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(icon, color: AppColors.stitchOnPrimaryContainer, size: 18),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sign-up row + Social row + Guest + Demo
// ─────────────────────────────────────────────────────────────────────────

class _SignUpRow extends StatelessWidget {
  final VoidCallback onTap;
  const _SignUpRow({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Chưa có tài khoản? ',
          style: TextStyle(
            color: AppColors.stitchOnSurfaceVariant,
            fontSize: 13,
            fontFamily: AppFonts.body,
          ),
        ),
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'ĐĂNG KÝ MIỄN PHÍ',
            style: TextStyle(
              fontSize: 11,
              fontFamily: AppFonts.mono,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.18 * 11 / 11,
              color: AppColors.stitchPrimaryContainer,
            ),
          ),
        ),
      ],
    );
  }
}

class _SocialRow extends StatelessWidget {
  final VoidCallback onGoogle;
  final VoidCallback onApple;
  const _SocialRow({required this.onGoogle, required this.onApple});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
                child: Divider(color: AppColors.stitchOutlineVariant)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'HOẶC TIẾP TỤC VỚI',
                style: TextStyle(
                  color: AppColors.stitchOnSurfaceVariant,
                  fontSize: 10,
                  fontFamily: AppFonts.mono,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.18 * 10 / 10,
                ),
              ),
            ),
            Expanded(
                child: Divider(color: AppColors.stitchOutlineVariant)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _SocialButton(
                onTap: onGoogle,
                icon: const _GoogleGlyph(),
                label: 'Google',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SocialButton(
                onTap: onApple,
                icon: const Icon(Icons.apple,
                    color: AppColors.stitchOnSurface, size: 22),
                label: 'Apple',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SocialButton extends StatelessWidget {
  final VoidCallback onTap;
  final Widget icon;
  final String label;

  const _SocialButton({
    required this.onTap,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.stitchSurfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppColors.rXl),
        border:
            Border.all(color: AppColors.stitchOutlineVariant, width: 0.8),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          onTap: onTap,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              icon,
              const SizedBox(width: 10),
              Text(
                label,
                style: TextStyle(
                  color: AppColors.stitchOnSurface,
                  fontSize: 13,
                  fontFamily: AppFonts.body,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GoogleGlyph extends StatelessWidget {
  const _GoogleGlyph();
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 18,
      height: 18,
      child: CustomPaint(
        painter: _GooglePainter(),
      ),
    );
  }
}

class _GooglePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..style = PaintingStyle.fill;
    p.color = const Color(0xFF4285F4);
    canvas.drawArc(Rect.fromLTWH(0, 0, size.width, size.height), -1.5708, 1.5708, true, p);
    p.color = const Color(0xFF34A853);
    canvas.drawArc(Rect.fromLTWH(0, 0, size.width, size.height), 0, 1.5708, true, p);
    p.color = const Color(0xFFFBBC05);
    canvas.drawArc(Rect.fromLTWH(0, 0, size.width, size.height), 1.5708, 1.5708, true, p);
    p.color = const Color(0xFFEA4335);
    canvas.drawArc(Rect.fromLTWH(0, 0, size.width, size.height), 3.1416, 1.5708, true, p);
    p.color = Colors.white;
    canvas.drawCircle(
      Offset(size.width / 2, size.height / 2),
      size.width * 0.28,
      p,
    );
    p.color = const Color(0xFF4285F4);
    canvas.drawRect(
      Rect.fromLTWH(size.width / 2, size.height / 2 - 1.5, size.width * 0.25, 3),
      p,
    );
  }

  @override
  bool shouldRepaint(_GooglePainter oldDelegate) => false;
}

class _GuestButton extends StatelessWidget {
  final VoidCallback onTap;
  const _GuestButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.stitchSurfaceContainerLowest.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(AppColors.rLg),
        border: Border.all(
          color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.35),
          width: 0.9,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppColors.rLg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.explore_outlined,
                  color: AppColors.stitchPrimaryContainer,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  'TRẢI NGHIỆM KHÁCH // GUEST MODE',
                  style: TextStyle(
                    color: AppColors.stitchPrimaryContainer,
                    fontSize: 11,
                    fontFamily: AppFonts.mono,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.18 * 11 / 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DemoAccountsCard extends StatelessWidget {
  final VoidCallback onViewer;
  final VoidCallback onAdmin;
  final VoidCallback onStaff;
  const _DemoAccountsCard({
    required this.onViewer,
    required this.onAdmin,
    required this.onStaff,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.stitchSurfaceContainerLowest.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(AppColors.rLg),
        border: Border.all(
          color: AppColors.stitchOutlineVariant.withValues(alpha: 0.45),
          width: 0.8,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 20,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.verified_user_outlined,
                color: AppColors.stitchPrimaryContainer,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                'TÀI KHOẢN TRẢI NGHIỆM (RBAC 4 CẤP)',
                style: TextStyle(
                  color: AppColors.stitchOnSurface,
                  fontSize: 11,
                  fontFamily: AppFonts.mono,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.18 * 11 / 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _RoleIdentityCard(
                  title: 'ADMIN',
                  subtitle: 'Quản trị viên',
                  roleBadge: 'CẤP 3',
                  accentColor: const Color(0xFFF59E0B),
                  icon: Icons.admin_panel_settings_rounded,
                  onTap: onAdmin,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _RoleIdentityCard(
                  title: 'STAFF',
                  subtitle: 'Biên tập viên',
                  roleBadge: 'CẤP 1',
                  accentColor: const Color(0xFFA855F7),
                  icon: Icons.support_agent_rounded,
                  onTap: onStaff,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _RoleIdentityCard(
                  title: 'VIEWER',
                  subtitle: 'Khán giả 4K',
                  roleBadge: 'CẤP 2',
                  accentColor: AppColors.stitchPrimaryContainer,
                  icon: Icons.tv_rounded,
                  onTap: onViewer,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RoleIdentityCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String roleBadge;
  final Color accentColor;
  final IconData icon;
  final VoidCallback onTap;

  const _RoleIdentityCard({
    required this.title,
    required this.subtitle,
    required this.roleBadge,
    required this.accentColor,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: accentColor.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: accentColor.withValues(alpha: 0.35),
              width: 0.8,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(icon, size: 16, color: accentColor),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 1.5,
                    ),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      roleBadge,
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 8,
                        fontFamily: AppFonts.mono,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.stitchOnSurface,
                  fontSize: 11,
                  fontFamily: AppFonts.mono,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.stitchOnSurfaceVariant,
                  fontSize: 9.5,
                  fontFamily: AppFonts.body,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LegalFooter extends StatelessWidget {
  const _LegalFooter();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Text.rich(
        TextSpan(
          text: 'Bằng việc đăng nhập, bạn đồng ý với ',
          style: TextStyle(
            color: AppColors.stitchOnSurfaceVariant,
            fontSize: 11,
            fontFamily: AppFonts.body,
          ),
          children: [
            TextSpan(
              text: 'Điều khoản',
              style: TextStyle(
                color: AppColors.stitchPrimaryContainer,
                fontWeight: FontWeight.w700,
                fontFamily: AppFonts.mono,
                fontSize: 11,
                letterSpacing: 0.5,
              ),
            ),
            const TextSpan(text: ' và '),
            TextSpan(
              text: 'Chính sách bảo mật',
              style: TextStyle(
                color: AppColors.stitchPrimaryContainer,
                fontWeight: FontWeight.w700,
                fontFamily: AppFonts.mono,
                fontSize: 11,
                letterSpacing: 0.5,
              ),
            ),
            const TextSpan(text: ' của OmniCast.'),
          ],
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}
