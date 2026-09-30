// OmniCast - Login Screen
//
// Polished, accessible login flow:
//  • Hero panel with brand, glow & animated background orbs
//  • Remember-me email persisted via flutter_secure_storage
//  • Caps-Lock detection via RawKeyboardListener
//  • Inline validation with focus-to-first-failure
//  • Social placeholders (Google / Apple) + Guest + Demo accounts
//  • High-contrast error & caps-lock hints (a11y)

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
    // Auto-focus email after hero anim settles
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
      // Focus the first invalid field for a11y.
      final ctx = _emailController.text.trim().isEmpty
          ? _emailFocus
          : _passwordFocus;
      FocusScope.of(context).requestFocus(ctx);
      return;
    }

    FocusScope.of(context).unfocus();

    // Persist remember-me + last email
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
            // Decorative gradient orbs (non-interactive)
            const _BackgroundOrbs(),
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
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const SizedBox(height: 32),
                            // ─── Hero panel ─────────────────────────
                            _HeroSection(hydrated: _hydrated),
                            const SizedBox(height: 36),
                            // ─── Form card ───────────────────────────
                            _FormCard(
                              formKey: _formKey,
                              emailController: _emailController,
                              passwordController: _passwordController,
                              emailFocus: _emailFocus,
                              passwordFocus: _passwordFocus,
                              obscurePassword: _obscurePassword,
                              onTogglePassword: () =>
                                  setState(() => _obscurePassword = !_obscurePassword),
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
                            const SizedBox(height: 24),
                            _SocialRow(
                              onGoogle: () => _toastInfo(
                                'Đăng nhập Google sẽ sớm ở bản cập nhật tiếp theo.',
                              ),
                              onApple: () => _toastInfo(
                                'Đăng nhập Apple sẽ sớm ở bản cập nhật tiếp theo.',
                              ),
                            ),
                            const SizedBox(height: 24),
                            _GuestButton(onTap: () => context.go('/home')),
                            const SizedBox(height: 24),
                            _DemoAccountsCard(
                              onViewer: () => _applyDemo(
                                'testviewer@omnicast.tv',
                                'Password@123',
                              ),
                              onAdmin: () => _applyDemo(
                                'admin@omnicast.tv',
                                'Admin@123456',
                              ),
                              onStaff: () => _applyDemo(
                                'staff@omnicast.tv',
                                'Admin@123456',
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
        backgroundColor: AppColors.surfaceRaised,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          side: const BorderSide(color: AppColors.error),
        ),
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: AppColors.text, fontSize: 13),
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
// Background orbs
// ─────────────────────────────────────────────────────────────────────────

class _BackgroundOrbs extends StatelessWidget {
  const _BackgroundOrbs();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned(
            top: -120,
            left: -100,
            child: _Orb(
              size: 320,
              color: AppColors.primary.withValues(alpha: 0.22),
            ),
          ),
          Positioned(
            top: 180,
            right: -120,
            child: _Orb(
              size: 260,
              color: AppColors.accentCyan.withValues(alpha: 0.16),
            ),
          ),
          Positioned(
            bottom: 120,
            left: 80,
            child: _Orb(
              size: 200,
              color: AppColors.accent.withValues(alpha: 0.10),
            ),
          ),
        ],
      ),
    );
  }
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
// Hero section (logo + title + subtitle)
// ─────────────────────────────────────────────────────────────────────────

class _HeroSection extends StatelessWidget {
  final bool hydrated;
  const _HeroSection({required this.hydrated});

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
            child: OmniCastBrandLogo(size: 84, showGlow: true),
          ),
          const SizedBox(height: 20),
          ShaderMask(
            shaderCallback: (rect) => const LinearGradient(
              colors: [Colors.white, AppColors.accentCyan],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ).createShader(rect),
            blendMode: BlendMode.srcIn,
            child: const Text(
              'Chào mừng trở lại',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Đăng nhập để tiếp tục trải nghiệm OmniCast',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              color: AppColors.textDim,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 16),
          // Trust pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: const BoxDecoration(
              color: Color(0x1F3B82F6), // primary @ 12%
              borderRadius: BorderRadius.all(Radius.circular(AppColors.rPill)),
              border: Border.fromBorderSide(
                BorderSide(color: Color(0x593B82F6)), // primary @ 35%
              ),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.verified_user_outlined,
                    color: AppColors.primaryLight, size: 14),
                SizedBox(width: 6),
                Text(
                  'Bảo mật JWT · refresh tự động',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryLight,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Form card (email, password, remember, submit)
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
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 22),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(AppColors.rLg),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.45),
              blurRadius: 24,
              spreadRadius: -6,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Form(
          key: formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Email
              _FormField(
                label: 'Email',
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
                const Padding(
                  padding: EdgeInsets.only(top: 6, left: 4),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded,
                          color: AppColors.warning, size: 14),
                      SizedBox(width: 6),
                      Text(
                        'Phím Caps Lock đang bật',
                        style: TextStyle(
                          color: AppColors.warning,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
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
                              width: 20,
                              height: 20,
                              child: Checkbox(
                                value: rememberMe,
                                onChanged: onRememberChanged,
                                activeColor: AppColors.primary,
                                checkColor: Colors.white,
                                side: const BorderSide(
                                  color: AppColors.borderStrong,
                                  width: 1.5,
                                ),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Flexible(
                              child: Text(
                                'Ghi nhớ email',
                                style: TextStyle(
                                  color: AppColors.textDim,
                                  fontSize: 13,
                                ),
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
                    child: const Text(
                      'Quên mật khẩu?',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Submit
              BlocBuilder<AuthBloc, AuthState>(
                builder: (context, state) {
                  final isLoading = state is AuthLoading;
                  return _GradientButton(
                    label: 'Đăng nhập',
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
// Form field (reusable)
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
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      autofillHints: autoFillHints,
      autocorrect: false,
      enableSuggestions: false,
      style: const TextStyle(color: AppColors.text, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(prefixIcon,
            color: AppColors.textFaint.withValues(alpha: 0.9)),
        filled: true,
        fillColor: AppColors.surfaceRaised,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        errorStyle: const TextStyle(color: AppColors.error, fontSize: 12),
      ),
      validator: validator,
      onFieldSubmitted: onSubmitted,
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
    return Focus(
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent || event is KeyRepeatEvent) {
          final isDown = HardwareKeyboard.instance.isMetaPressed;
          // CapsLock detection via RawKeyEvent data
          final caps = event.character != null &&
              event.character!.toUpperCase() == event.character &&
              event.character!.toLowerCase() != event.character &&
              event.logicalKey.keyLabel.length == 1;
          // Use the dedicated helper for reliable detection
          final on = HardwareKeyboard.instance.lockModesEnabled
                  .contains(KeyboardLockMode.capsLock) ||
              caps;
          onCapsLockChanged(on);
          if (isDown) return KeyEventResult.ignored;
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
        style: const TextStyle(color: AppColors.text, fontSize: 15),
        decoration: InputDecoration(
          labelText: 'Mật khẩu',
          hintText: 'Nhập mật khẩu của bạn',
          prefixIcon: const Icon(Icons.lock_outline_rounded,
              color: AppColors.textFaint),
          suffixIcon: IconButton(
            icon: Icon(
              obscure
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
              color: AppColors.textFaint,
            ),
            onPressed: onToggleObscure,
            tooltip: obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
          ),
          filled: true,
          fillColor: AppColors.surfaceRaised,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.rMd),
            borderSide: const BorderSide(color: AppColors.error, width: 1.5),
          ),
          errorStyle: const TextStyle(color: AppColors.error, fontSize: 12),
        ),
        validator: validator,
        onFieldSubmitted: onSubmitted,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Gradient submit button
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
    return Opacity(
      opacity: onPressed == null ? 0.7 : 1,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryLight],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(AppColors.rMd),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.4),
              blurRadius: 16,
              spreadRadius: -2,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(AppColors.rMd),
            onTap: onPressed,
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(icon, color: Colors.white, size: 18),
                      ],
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
        const Text(
          'Chưa có tài khoản? ',
          style: TextStyle(color: AppColors.textDim, fontSize: 14),
        ),
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text(
            'Đăng ký miễn phí',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
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
        // ignore: prefer_const_literals_to_create_immutables
        Row(
          children: [
            const Expanded(child: Divider(color: AppColors.border)),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'hoặc tiếp tục với',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const Expanded(child: Divider(color: AppColors.border)),
          ],
        ),
        const SizedBox(height: 16),
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
                icon: const Icon(Icons.apple, color: Colors.white, size: 22),
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
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        border: Border.all(color: AppColors.borderStrong),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          onTap: onTap,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              icon,
              const SizedBox(width: 10),
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 14,
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
    // Blue
    p.color = const Color(0xFF4285F4);
    canvas.drawArc(
      Rect.fromLTWH(0, 0, size.width, size.height),
      -1.5708,
      1.5708,
      true,
      p,
    );
    // Green
    p.color = const Color(0xFF34A853);
    canvas.drawArc(
      Rect.fromLTWH(0, 0, size.width, size.height),
      0,
      1.5708,
      true,
      p,
    );
    // Yellow
    p.color = const Color(0xFFFBBC05);
    canvas.drawArc(
      Rect.fromLTWH(0, 0, size.width, size.height),
      1.5708,
      1.5708,
      true,
      p,
    );
    // Red
    p.color = const Color(0xFFEA4335);
    canvas.drawArc(
      Rect.fromLTWH(0, 0, size.width, size.height),
      3.1416,
      1.5708,
      true,
      p,
    );
    // White center to give the "G" look
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
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.5),
          width: 1.2,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppColors.rMd),
          onTap: onTap,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.explore_outlined,
                    color: AppColors.primaryLight, size: 18),
                SizedBox(width: 8),
                Text(
                  'Khám phá ngay (không cần đăng nhập)',
                  style: TextStyle(
                    color: AppColors.primaryLight,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(AppColors.rMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ignore: prefer_const_literals_to_create_immutables
          Row(
            children: [
              Icon(Icons.science_outlined,
                  color: AppColors.accentCyan, size: 16),
              const SizedBox(width: 8),
              const Text(
                'Tài khoản dùng thử',
                style: TextStyle(
                  color: AppColors.textDim,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _DemoChip(
                  label: 'Khán giả',
                  icon: Icons.person_outline,
                  onTap: onViewer),
              _DemoChip(
                  label: 'Staff',
                  icon: Icons.support_agent_outlined,
                  onTap: onStaff),
              _DemoChip(
                  label: 'Admin',
                  icon: Icons.admin_panel_settings_outlined,
                  onTap: onAdmin),
            ],
          ),
        ],
      ),
    );
  }
}

class _DemoChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _DemoChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceRaised,
      borderRadius: BorderRadius.circular(AppColors.rPill),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.rPill),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.rPill),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: AppColors.textDim),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.textDim,
                  fontSize: 12,
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

class _LegalFooter extends StatelessWidget {
  const _LegalFooter();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(top: 16),
      child: Text.rich(
        TextSpan(
          text: 'Bằng việc đăng nhập, bạn đồng ý với ',
          style: TextStyle(color: AppColors.textMuted, fontSize: 11),
          children: [
            TextSpan(
              text: 'Điều khoản',
              style: TextStyle(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
            TextSpan(text: ' và '),
            TextSpan(
              text: 'Chính sách bảo mật',
              style: TextStyle(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
            TextSpan(text: ' của OmniCast.'),
          ],
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}