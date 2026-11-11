// OmniCast - Cute Studio Robot Mascot Avatar
// ============================================================
// Adorable, high-tech Robot Studio Director character ("OmniBot")
// equipped with studio headphones, glowing cyber-eyes, and antenna.
// ============================================================

import 'package:flutter/material.dart';

class StudioBotAvatar extends StatelessWidget {
  final double size;
  final bool isSpeaking;
  final bool showOnlineDot;

  const StudioBotAvatar({
    super.key,
    this.size = 36,
    this.isSpeaking = false,
    this.showOnlineDot = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          // Background Glow
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF00E5FF).withValues(alpha: isSpeaking ? 0.35 : 0.2),
                  blurRadius: size * 0.4,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),

          // Custom Painted Cute Studio Bot
          CustomPaint(
            size: Size(size, size),
            painter: _CuteBotPainter(isSpeaking: isSpeaking),
          ),

          // Online indicator dot (optional)
          if (showOnlineDot)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: size * 0.26,
                height: size * 0.26,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF080B11), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withValues(alpha: 0.6),
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CuteBotPainter extends CustomPainter {
  final bool isSpeaking;

  _CuteBotPainter({required this.isSpeaking});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final center = Offset(w / 2, h / 2);

    // ── 1. ANTENNA & GLOWING TIP ──────────────────────────
    final antennaStemPaint = Paint()
      ..color = const Color(0xFF64748B)
      ..strokeWidth = w * 0.05
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(w / 2, h * 0.24),
      Offset(w / 2, h * 0.1),
      antennaStemPaint,
    );

    final antennaTipPaint = Paint()
      ..color = const Color(0xFF00E5FF)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(w / 2, h * 0.08), w * 0.065, antennaTipPaint);

    final tipGlow = Paint()
      ..color = const Color(0xFF00E5FF).withValues(alpha: 0.4)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(w / 2, h * 0.08), w * 0.1, tipGlow);

    // ── 2. HEADPHONE BAND ─────────────────────────────────
    final bandPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.08
      ..strokeCap = StrokeCap.round;
    final bandRect = Rect.fromCenter(
      center: Offset(center.dx, center.dy + h * 0.02),
      width: w * 0.88,
      height: h * 0.72,
    );
    canvas.drawArc(bandRect, 3.14159, 3.14159, false, bandPaint);

    // ── 3. ROBOT HEAD CHASSIS ─────────────────────────────
    final headRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(center.dx, center.dy + h * 0.04),
        width: w * 0.68,
        height: h * 0.58,
      ),
      Radius.circular(w * 0.22),
    );

    final headGradient = const LinearGradient(
      colors: [Color(0xFF0F1C2E), Color(0xFF08121F)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ).createShader(headRect.outerRect);

    final headPaint = Paint()
      ..shader = headGradient
      ..style = PaintingStyle.fill;
    canvas.drawRRect(headRect, headPaint);

    final headBorder = Paint()
      ..color = const Color(0xFF00E5FF).withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.035;
    canvas.drawRRect(headRect, headBorder);

    // ── 4. DIGITAL FACE SCREEN ────────────────────────────
    final screenRect = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(center.dx, center.dy + h * 0.04),
        width: w * 0.54,
        height: h * 0.42,
      ),
      Radius.circular(w * 0.14),
    );
    final screenPaint = Paint()
      ..color = const Color(0xFF050B14)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(screenRect, screenPaint);

    // ── 5. CUTE GLOWING CYAN EYES ─────────────────────────
    final eyePaint = Paint()
      ..color = const Color(0xFF00E5FF)
      ..style = PaintingStyle.fill;

    final eyeWidth = w * 0.09;
    final eyeHeight = isSpeaking ? w * 0.12 : w * 0.10;
    final leftEyeCenter = Offset(w * 0.39, h * 0.50);
    final rightEyeCenter = Offset(w * 0.61, h * 0.50);

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: leftEyeCenter, width: eyeWidth, height: eyeHeight),
        Radius.circular(w * 0.05),
      ),
      eyePaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: rightEyeCenter, width: eyeWidth, height: eyeHeight),
        Radius.circular(w * 0.05),
      ),
      eyePaint,
    );

    // Cute Eye Highlights (white spark)
    final sparkPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(leftEyeCenter.dx - w * 0.02, leftEyeCenter.dy - w * 0.02), w * 0.022, sparkPaint);
    canvas.drawCircle(Offset(rightEyeCenter.dx - w * 0.02, rightEyeCenter.dy - w * 0.02), w * 0.022, sparkPaint);

    // Cute Cheeks (Blush)
    final blushPaint = Paint()
      ..color = const Color(0xFFF43F5E).withValues(alpha: 0.35)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(w * 0.33, h * 0.58), w * 0.035, blushPaint);
    canvas.drawCircle(Offset(w * 0.67, h * 0.58), w * 0.035, blushPaint);

    // ── 6. CUTE SMILING MOUTH ─────────────────────────────
    final mouthPaint = Paint()
      ..color = const Color(0xFF00E5FF)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = w * 0.035;

    final mouthRect = Rect.fromCenter(
      center: Offset(center.dx, center.dy + h * 0.12),
      width: w * 0.16,
      height: w * 0.09,
    );
    canvas.drawArc(mouthRect, 0.2, 2.74, false, mouthPaint);

    // ── 7. HEADPHONE EARCUPS (LEFT & RIGHT) ────────────────
    final earCupPaint = Paint()
      ..color = const Color(0xFF0F263B)
      ..style = PaintingStyle.fill;
    final earCupBorder = Paint()
      ..color = const Color(0xFF00E5FF).withValues(alpha: 0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.03;

    final leftEarRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(w * 0.14, center.dy + h * 0.04), width: w * 0.12, height: h * 0.32),
      Radius.circular(w * 0.06),
    );
    canvas.drawRRect(leftEarRect, earCupPaint);
    canvas.drawRRect(leftEarRect, earCupBorder);

    final rightEarRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(w * 0.86, center.dy + h * 0.04), width: w * 0.12, height: h * 0.32),
      Radius.circular(w * 0.06),
    );
    canvas.drawRRect(rightEarRect, earCupPaint);
    canvas.drawRRect(rightEarRect, earCupBorder);

    // ── 8. STUDIO BOOM MIC ────────────────────────────────
    final micArmPaint = Paint()
      ..color = const Color(0xFF94A3B8)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = w * 0.03;

    final micPath = Path()
      ..moveTo(w * 0.15, center.dy + h * 0.12)
      ..quadraticBezierTo(w * 0.22, center.dy + h * 0.22, w * 0.34, center.dy + h * 0.20);
    canvas.drawPath(micPath, micArmPaint);

    final micTipPaint = Paint()..color = const Color(0xFF00E5FF);
    canvas.drawCircle(Offset(w * 0.34, center.dy + h * 0.20), w * 0.035, micTipPaint);
  }

  @override
  bool shouldRepaint(covariant _CuteBotPainter oldDelegate) {
    return oldDelegate.isSpeaking != isSpeaking;
  }
}

