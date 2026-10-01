// OmniCast · Register Screen
//
// Re-designed against the canonical Stitch "Live TV & EPG" design system
// (matches the Flutter login screen DNA exactly):
//  • Deep-navy surface (#0F131D) + cyan primary (#00F2FE) — see AppColors
//  • Outfit (display) + Inter (body) + JetBrains Mono (telemetry labels)
//  • Glass blur · animated ON-AIR pulse · LIVE telemetry card · cyber grid
//  • Multi-step stepper (Account → Security → Confirm)
//  • Live password-strength checklist (Stitch-style status pills)

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/auth/auth_bloc.dart';
import '../../../core/theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  int _step = 1;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _next() {
    if (_step == 1) {
      final formState = _formKey.currentState;
      if (formState == null) return;
      // Validate only step-1 fields by inspecting validators (Form is shared).
      final nameOk = _nameController.text.trim().length >= 2;
      final emailOk = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
          .hasMatch(_emailController.text.trim());
      if (!nameOk || !emailOk) {
        formState.validate();
        return;
      }
      setState(() => _step = 2);
    } else if (_step == 2) {
      final formState = _formKey.currentState;
      if (formState == null) return;
      final pw = _passwordController.text;
      final pwOk = pw.length >= 8 &&
          RegExp(r'[A-Z]').hasMatch(pw) &&
          RegExp(r'[a-z]').hasMatch(pw) &&
          RegExp(r'[0-9]').hasMatch(pw);
      final match = pw == _confirmPasswordController.text && pw.isNotEmpty;
      if (!pwOk || !match) {
        formState.validate();
        return;
      }
      setState(() => _step = 3);
    }
  }

  void _prev() => setState(() => _step = (_step - 1).clamp(1, 3));

  void _handleRegister() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
            RegisterRequested(
              email: _emailController.text.trim(),
              password: _passwordController.text,
              fullName: _nameController.text.trim(),
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: Stack(
          children: [
            const _BackgroundBackdrop(),
            SafeArea(
              child: BlocListener<AuthBloc, AuthState>(
                listener: (context, state) {
                  if (state is Authenticated) {
                    context.go('/home');
                  } else if (state is AuthError) {
                    _toast(state.message, isError: true);
                  }
                },
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 12),
                      _Header(),
                      const SizedBox(height: 24),
                      _Stepper(step: _step),
                      const SizedBox(height: 20),
                      _FormCard(
                        formKey: _formKey,
                        step: _step,
                        nameController: _nameController,
                        emailController: _emailController,
                        passwordController: _passwordController,
                        confirmPasswordController:
                            _confirmPasswordController,
                        obscurePassword: _obscurePassword,
                        obscureConfirm: _obscureConfirmPassword,
                        onTogglePassword: () => setState(
                            () => _obscurePassword = !_obscurePassword),
                        onToggleConfirm: () => setState(() =>
                            _obscureConfirmPassword =
                                !_obscureConfirmPassword),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          if (_step > 1)
                            Expanded(
                              flex: 1,
                              child: _OutlineButton(
                                label: 'QUAY LẠI',
                                icon: Icons.chevron_left_rounded,
                                onTap: _prev,
                              ),
                            ),
                          if (_step > 1) const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: _PrimaryButton(
                              label: _step == 3 ? 'TẠO TÀI KHOẢN' : 'TIẾP TỤC',
                              icon: _step == 3
                                  ? Icons.person_add_alt_1_rounded
                                  : Icons.chevron_right_rounded,
                              onTap: _step == 3 ? _handleRegister : _next,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _SignInRow(onTap: () => context.go('/login')),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _toast(String message, {bool isError = false}) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        backgroundColor: isError
            ? AppColors.stitchSurfaceContainerHigh
            : AppColors.stitchSurfaceContainerHigh,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppColors.rLg),
          side: BorderSide(
            color: isError
                ? AppColors.stitchError
                : AppColors.stitchOutlineVariant,
            width: 0.8,
          ),
        ),
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.info_outline,
              color: isError
                  ? AppColors.stitchError
                  : AppColors.stitchPrimaryContainer,
              size: 18,
            ),
            const SizedBox(width: 10),
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
}

// ─────────────────────────────────────────────────────────────────────────
// Background backdrop (shared pattern with login screen)
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
                  radius: 1.1,
                  colors: [
                    AppColors.stitchSecondary.withValues(alpha: 0.10),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
          ),
          Positioned.fill(child: CustomPaint(painter: _GridPainter())),
          Positioned(
            top: -100,
            right: -80,
            child: _Orb(
              size: 320,
              color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.18),
            ),
          ),
          Positioned(
            top: 280,
            left: -120,
            child: _Orb(
              size: 280,
              color: AppColors.stitchSecondary.withValues(alpha: 0.12),
            ),
          ),
          Positioned(
            bottom: 40,
            right: -60,
            child: _Orb(
              size: 240,
              color: AppColors.stitchTertiaryContainer.withValues(alpha: 0.10),
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
      ..color = AppColors.stitchOutlineVariant.withValues(alpha: 0.08)
      ..strokeWidth = 0.6;
    const step = 32.0;
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
// Header — logo + ON-AIR pill + title
// ─────────────────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
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
          ShaderMask(
            shaderCallback: (rect) => const LinearGradient(
              colors: [AppColors.stitchPrimaryContainer, AppColors.stitchSecondary],
            ).createShader(rect),
            blendMode: BlendMode.srcIn,
            child: const Text(
              'Tạo tài khoản',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 32,
                fontFamily: AppFonts.display,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppColors.rPill),
              border: Border.all(
                color: AppColors.stitchPrimaryContainer.withValues(alpha: 0.30),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _LivePulseDot(color: AppColors.stitchPrimaryContainer),
                const SizedBox(width: 6),
                Text(
                  'TIER 01 // WELCOME',
                  style: TextStyle(
                    fontSize: 10,
                    fontFamily: AppFonts.mono,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.18 * 10 / 10,
                    color: AppColors.stitchPrimaryContainer,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Mở khoá 524 kênh trực tiếp, kho VOD 4K HDR và AI Curator cá nhân hoá.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontFamily: AppFonts.body,
              color: AppColors.stitchOnSurfaceVariant,
              height: 1.5,
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
// Stepper
// ─────────────────────────────────────────────────────────────────────────

class _Stepper extends StatelessWidget {
  final int step;
  const _Stepper({required this.step});

  @override
  Widget build(BuildContext context) {
    const steps = [
      (id: 1, label: 'TÀI KHOẢN', icon: Icons.person_outline_rounded),
      (id: 2, label: 'BẢO MẬT', icon: Icons.lock_outline_rounded),
      (id: 3, label: 'HOÀN TẤT', icon: Icons.verified_user_outlined),
    ];
    return Row(
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          _StepperDot(
            id: steps[i].id,
            label: steps[i].label,
            icon: steps[i].icon,
            isActive: step == steps[i].id,
            isDone: step > steps[i].id,
          ),
          if (i < steps.length - 1)
            Expanded(
              child: Container(
                height: 1,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                color: step > steps[i].id
                    ? AppColors.stitchPrimaryContainer
                    : AppColors.stitchOutlineVariant,
              ),
            ),
        ],
      ],
    );
  }
}

class _StepperDot extends StatelessWidget {
  final int id;
  final String label;
  final IconData icon;
  final bool isActive;
  final bool isDone;
  const _StepperDot({
    required this.id,
    required this.label,
    required this.icon,
    required this.isActive,
    required this.isDone,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive
                ? AppColors.stitchPrimaryContainer
                : isDone
                    ? AppColors.stitchPrimaryContainer.withValues(alpha: 0.18)
                    : AppColors.stitchSurfaceContainer,
            border: Border.all(
              color: isActive || isDone
                  ? AppColors.stitchPrimaryContainer
                  : AppColors.stitchOutlineVariant,
              width: 1.5,
            ),
            boxShadow: isActive ? AppColors.glowCyan : null,
          ),
          child: Icon(
            isDone ? Icons.check_rounded : icon,
            color: isActive
                ? AppColors.stitchOnPrimaryContainer
                : isDone
                    ? AppColors.stitchPrimaryContainer
                    : AppColors.stitchOutline,
            size: 18,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '${id.toString().padLeft(2, '0')} · $label',
          style: TextStyle(
            fontSize: 9,
            fontFamily: AppFonts.mono,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.18 * 9 / 9,
            color: isActive
                ? AppColors.stitchPrimaryContainer
                : isDone
                    ? AppColors.stitchPrimary
                    : AppColors.stitchOutline,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Form card — Stitch styled with secure-channel strip
// ─────────────────────────────────────────────────────────────────────────

class _FormCard extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final int step;
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final bool obscurePassword;
  final bool obscureConfirm;
  final VoidCallback onTogglePassword;
  final VoidCallback onToggleConfirm;

  const _FormCard({
    required this.formKey,
    required this.step,
    required this.nameController,
    required this.emailController,
    required this.passwordController,
    required this.confirmPasswordController,
    required this.obscurePassword,
    required this.obscureConfirm,
    required this.onTogglePassword,
    required this.onToggleConfirm,
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
            offset: Offset(0, (1 - t) * 14),
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
          ],
        ),
        child: Form(
          key: formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Secure channel strip
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
                      letterSpacing: 0.18 * 10 / 10,
                      color: AppColors.stitchPrimaryContainer,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'BƯỚC ${step.toString().padLeft(2, '0')} / 03',
                    style: TextStyle(
                      fontSize: 10,
                      fontFamily: AppFonts.mono,
                      color: AppColors.stitchOnSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (step == 1) ...[
                _LabeledField(
                  label: 'HỌ VÀ TÊN',
                  child: _StyledField(
                    controller: nameController,
                    hint: 'Nguyễn Văn A',
                    icon: Icons.person_outline_rounded,
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.words,
                    validator: (v) {
                      if (v == null || v.trim().length < 2) {
                        return 'Vui lòng nhập họ tên';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(height: 14),
                _LabeledField(
                  label: 'EMAIL',
                  child: _StyledField(
                    controller: emailController,
                    hint: 'nguoixem@omnicast.tv',
                    icon: Icons.mail_outline_rounded,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Vui lòng nhập email';
                      }
                      if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                          .hasMatch(v.trim())) {
                        return 'Email không hợp lệ';
                      }
                      return null;
                    },
                  ),
                ),
              ] else if (step == 2) ...[
                _LabeledField(
                  label: 'MẬT KHẨU',
                  child: _StyledField(
                    controller: passwordController,
                    hint: '••••••••',
                    icon: Icons.lock_outline_rounded,
                    obscureText: obscurePassword,
                    textInputAction: TextInputAction.next,
                    suffixIcon: IconButton(
                      icon: Icon(
                        obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: AppColors.stitchOutline,
                        size: 18,
                      ),
                      onPressed: onTogglePassword,
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        return 'Vui lòng nhập mật khẩu';
                      }
                      if (v.length < 8) return 'Tối thiểu 8 ký tự';
                      if (!RegExp(r'[A-Z]').hasMatch(v)) {
                        return 'Cần ít nhất 1 chữ hoa';
                      }
                      if (!RegExp(r'[a-z]').hasMatch(v)) {
                        return 'Cần ít nhất 1 chữ thường';
                      }
                      if (!RegExp(r'[0-9]').hasMatch(v)) {
                        return 'Cần ít nhất 1 số';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(height: 10),
                _PasswordChecklist(password: passwordController.text),
                const SizedBox(height: 14),
                _LabeledField(
                  label: 'XÁC NHẬN MẬT KHẨU',
                  child: _StyledField(
                    controller: confirmPasswordController,
                    hint: '••••••••',
                    icon: Icons.lock_outline_rounded,
                    obscureText: obscureConfirm,
                    textInputAction: TextInputAction.done,
                    suffixIcon: IconButton(
                      icon: Icon(
                        obscureConfirm
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: AppColors.stitchOutline,
                        size: 18,
                      ),
                      onPressed: onToggleConfirm,
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) {
                        return 'Vui lòng xác nhận mật khẩu';
                      }
                      if (v != passwordController.text) {
                        return 'Mật khẩu xác nhận không khớp';
                      }
                      return null;
                    },
                  ),
                ),
              ] else ...[
                _SummaryRow(
                  label: 'HỌ TÊN',
                  value: nameController.text.trim().isEmpty
                      ? '—'
                      : nameController.text.trim(),
                ),
                const SizedBox(height: 8),
                _SummaryRow(
                  label: 'EMAIL',
                  value: emailController.text.trim().isEmpty
                      ? '—'
                      : emailController.text.trim(),
                ),
                const SizedBox(height: 8),
                _SummaryRow(label: 'MẬT KHẨU', value: '••••••••', mono: true),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.stitchSurfaceContainerLowest,
                    borderRadius: BorderRadius.circular(AppColors.rMd),
                    border: Border.all(
                      color: AppColors.stitchOutlineVariant
                          .withValues(alpha: 0.60),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.verified_user_outlined,
                        color: AppColors.stitchPrimaryContainer,
                        size: 16,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            text:
                                'Bằng việc tạo tài khoản, bạn đồng ý với ',
                            style: TextStyle(
                              color: AppColors.stitchOnSurfaceVariant,
                              fontSize: 12,
                              fontFamily: AppFonts.body,
                              height: 1.5,
                            ),
                            children: const [
                              TextSpan(
                                text: 'Điều khoản sử dụng',
                                style: TextStyle(
                                  color: AppColors.stitchPrimaryContainer,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              TextSpan(text: ' và '),
                              TextSpan(
                                text: 'Chính sách bảo mật',
                                style: TextStyle(
                                  color: AppColors.stitchPrimaryContainer,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              TextSpan(text: ' của OmniCast.'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Form primitives
// ─────────────────────────────────────────────────────────────────────────

class _LabeledField extends StatelessWidget {
  final String label;
  final Widget child;
  const _LabeledField({required this.label, required this.child});

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
        child,
      ],
    );
  }
}

class _StyledField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final TextCapitalization textCapitalization;
  final bool obscureText;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;

  const _StyledField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.textInputAction,
    this.textCapitalization = TextCapitalization.none,
    this.obscureText = false,
    this.suffixIcon,
    required this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      textCapitalization: textCapitalization,
      obscureText: obscureText,
      autocorrect: false,
      enableSuggestions: false,
      style: const TextStyle(
        color: AppColors.stitchPrimary,
        fontSize: 16,
        fontFamily: AppFonts.body,
      ),
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, color: AppColors.stitchOutline, size: 18),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: AppColors.stitchSurfaceContainerLowest,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide:
              const BorderSide(color: AppColors.stitchOutlineVariant, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppColors.rXl),
          borderSide:
              const BorderSide(color: AppColors.stitchOutlineVariant, width: 1),
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
          borderSide:
              const BorderSide(color: AppColors.stitchError, width: 1.5),
        ),
        hintStyle: TextStyle(
          color: AppColors.stitchOutline,
          fontSize: 14,
          fontFamily: AppFonts.body,
        ),
        errorStyle: TextStyle(
          color: AppColors.stitchError,
          fontSize: 11,
          fontFamily: AppFonts.mono,
          fontWeight: FontWeight.w600,
        ),
      ),
      validator: validator,
    );
  }
}

class _PasswordChecklist extends StatelessWidget {
  final String password;
  const _PasswordChecklist({required this.password});

  @override
  Widget build(BuildContext context) {
    final checks = <(String, bool)>[
      ('ÍT NHẤT 8 KÝ TỰ', password.length >= 8),
      ('CÓ CHỮ HOA', RegExp(r'[A-Z]').hasMatch(password)),
      ('CÓ CHỮ THƯỜNG', RegExp(r'[a-z]').hasMatch(password)),
      ('CÓ SỐ', RegExp(r'[0-9]').hasMatch(password)),
    ];
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.stitchSurfaceContainerLowest.withValues(alpha: 0.70),
        borderRadius: BorderRadius.circular(AppColors.rLg),
        border: Border.all(
          color: AppColors.stitchOutlineVariant.withValues(alpha: 0.60),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'PASSWORD CHECKLIST',
                style: TextStyle(
                  fontSize: 10,
                  fontFamily: AppFonts.mono,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.18 * 10 / 10,
                  color: AppColors.stitchPrimaryContainer,
                ),
              ),
              Text(
                '${password.length} KÝ TỰ',
                style: TextStyle(
                  fontSize: 10,
                  fontFamily: AppFonts.mono,
                  color: AppColors.stitchOnSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (label, ok) in checks)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: ok
                        ? AppColors.stitchPrimaryContainer.withValues(alpha: 0.12)
                        : AppColors.stitchSurfaceContainer,
                    borderRadius: BorderRadius.circular(AppColors.rPill),
                    border: Border.all(
                      color: ok
                          ? AppColors.stitchPrimaryContainer
                              .withValues(alpha: 0.40)
                          : AppColors.stitchOutlineVariant
                              .withValues(alpha: 0.60),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: ok
                              ? AppColors.stitchPrimaryContainer
                              : AppColors.stitchSurfaceContainerHigh,
                        ),
                        child: Icon(
                          ok ? Icons.check_rounded : Icons.close_rounded,
                          color: ok
                              ? AppColors.stitchOnPrimaryContainer
                              : AppColors.stitchOutline,
                          size: 10,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 10,
                          fontFamily: AppFonts.mono,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.18 * 10 / 10,
                          color: ok
                              ? AppColors.stitchPrimary
                              : AppColors.stitchOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool mono;
  const _SummaryRow({
    required this.label,
    required this.value,
    this.mono = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.stitchSurfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppColors.rMd),
        border: Border.all(
          color: AppColors.stitchOutlineVariant.withValues(alpha: 0.40),
        ),
      ),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontFamily: AppFonts.mono,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.18 * 10 / 10,
              color: AppColors.stitchOnSurfaceVariant,
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 14,
                fontFamily: mono ? AppFonts.mono : AppFonts.body,
                fontWeight: FontWeight.w600,
                color: AppColors.stitchPrimary,
                letterSpacing: mono ? 2 : 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────────────────

class _PrimaryButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _PrimaryButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final isLoading = state is AuthLoading;
        final disabled = isLoading && label == 'TẠO TÀI KHOẢN';
        return SizedBox(
          height: 52,
          child: Opacity(
            opacity: disabled ? 0.7 : 1,
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
                  onTap: disabled ? null : onTap,
                  child: Center(
                    child: disabled
                        ? SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: AppColors.stitchOnPrimaryContainer,
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
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
                              Icon(icon,
                                  color: AppColors.stitchOnPrimaryContainer,
                                  size: 18),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _OutlineButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _OutlineButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(AppColors.rPill),
          border: Border.all(
            color: AppColors.stitchOutlineVariant.withValues(alpha: 0.80),
            width: 1.2,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(AppColors.rPill),
            onTap: onTap,
            child: Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon,
                      color: AppColors.stitchOnSurface, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    label,
                    style: TextStyle(
                      color: AppColors.stitchOnSurface,
                      fontSize: 12,
                      fontFamily: AppFonts.display,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.18 * 12 / 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SignInRow extends StatelessWidget {
  final VoidCallback onTap;
  const _SignInRow({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Đã có tài khoản? ',
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
            'ĐĂNG NHẬP',
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
