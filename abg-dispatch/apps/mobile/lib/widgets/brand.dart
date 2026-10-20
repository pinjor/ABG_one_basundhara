import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/theme.dart';
import '../theme/tokens.dart';

/// The supplied Anvir Bashundhara Group logo. [full] uses the original
/// artwork; otherwise the transparent rendition keyed off its navy field.
class AbgLogo extends StatelessWidget {
  const AbgLogo({super.key, this.width = 160, this.markOnly = false});

  final double width;
  final bool markOnly;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Anvir Bashundhara Group',
      image: true,
      child: Image.asset(
        markOnly
            ? 'assets/brand/abg-mark-light.png'
            : 'assets/brand/abg-logo-light.png',
        width: width,
        filterQuality: FilterQuality.high,
        isAntiAlias: true,
      ),
    );
  }
}

/// Midnight-navy field with a faint platinum swoosh echoing the arc in the
/// ABG mark. Used behind the logo and as the header of every main screen.
class HeroBackground extends StatelessWidget {
  const HeroBackground({
    super.key,
    required this.child,
    this.borderRadius,
    this.showArcs = true,
  });

  final Widget child;
  final BorderRadius? borderRadius;
  final bool showArcs;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: DecoratedBox(
        decoration: const BoxDecoration(gradient: AbgGradients.hero),
        child: CustomPaint(
          painter: showArcs ? _ArcPainter() : null,
          child: child,
        ),
      ),
    );
  }
}

class _ArcPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final glow = Paint()
      ..shader =
          RadialGradient(
            colors: [
              const Color(0xFF3A5A8C).withValues(alpha: 0.35),
              Colors.transparent,
            ],
          ).createShader(
            Rect.fromCircle(
              center: Offset(size.width * 0.92, -size.height * 0.1),
              radius: size.width * 0.9,
            ),
          );
    canvas.drawRect(Offset.zero & size, glow);

    for (var i = 0; i < 3; i++) {
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2 - i * 0.3
        ..shader = LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0),
            AbgColors.platinum.withValues(alpha: 0.18 - i * 0.04),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(Offset.zero & size);
      final r = size.width * (1.25 + i * 0.22);
      final rect = Rect.fromCircle(
        center: Offset(size.width * 0.25, size.height + r * 0.62),
        radius: r,
      );
      canvas.drawArc(rect, -math.pi * 0.92, math.pi * 0.62, false, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Primary action on dark surfaces: brushed platinum with navy text.
class PlatinumButton extends StatelessWidget {
  const PlatinumButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.height = 56,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool busy;
  final double height;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: enabled ? 1 : 0.6,
        child: Container(
          height: height,
          decoration: BoxDecoration(
            gradient: AbgGradients.platinum,
            borderRadius: BorderRadius.circular(AbgRadii.md),
            boxShadow: const [
              BoxShadow(
                color: Color(0x40000000),
                blurRadius: 16,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              borderRadius: BorderRadius.circular(AbgRadii.md),
              onTap: enabled ? onPressed : null,
              child: Center(
                child: busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: AbgColors.navy,
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (icon != null) ...[
                            Icon(icon, color: AbgColors.navy, size: 20),
                            const SizedBox(width: 10),
                          ],
                          Text(
                            label,
                            style: AbgText.button.copyWith(
                              color: AbgColors.navy,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
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

/// "ABG DISPATCH" wordmark in letter-spaced platinum.
class DispatchWordmark extends StatelessWidget {
  const DispatchWordmark({super.key, this.size = 13});

  final double size;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (r) => AbgGradients.platinumText.createShader(r),
      child: Text(
        'DISPATCH',
        style: AbgText.overline.copyWith(
          fontSize: size,
          color: Colors.white,
          letterSpacing: size * 0.6,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
