import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// The illustrated header behind the home screen: an evening landscape in the
/// group's navy and platinum — hills, a river, the city skyline with a
/// factory and LPG storage spheres, and a few houses and trees. Purely
/// decorative; it carries no information.
class HomeScene extends StatelessWidget {
  const HomeScene({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: const _ScenePainter(), child: child);
  }
}

class _ScenePainter extends CustomPainter {
  const _ScenePainter();

  static const _farHill = Color(0xFF213659);
  static const _skyline = Color(0xFF2B4572);
  static const _skylineNear = Color(0xFF243B63);
  static const _nearHill = Color(0xFF172A47);
  static const _leaves = Color(0xFF34507E);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final rect = Offset.zero & size;

    // Sky.
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AbgColors.midnight, Color(0xFF0E1C33), Color(0xFF1B2E4D)],
          stops: [0, 0.55, 1],
        ).createShader(rect),
    );

    // A soft platinum glow low on the horizon.
    canvas.drawCircle(
      Offset(w * 0.58, h * 0.70),
      w * 0.55,
      Paint()
        ..shader =
            RadialGradient(
              colors: [
                AbgColors.platinum.withValues(alpha: 0.16),
                AbgColors.platinum.withValues(alpha: 0),
              ],
            ).createShader(
              Rect.fromCircle(
                center: Offset(w * 0.58, h * 0.70),
                radius: w * 0.55,
              ),
            ),
    );

    _stars(canvas, w, h);
    _clouds(canvas, w, h);

    final horizon = h * 0.66;

    // Far hills.
    final far = Path()
      ..moveTo(0, horizon + h * 0.02)
      ..quadraticBezierTo(w * 0.18, horizon - h * 0.05, w * 0.36, horizon)
      ..quadraticBezierTo(
        w * 0.55,
        horizon + h * 0.05,
        w * 0.72,
        horizon - h * 0.01,
      )
      ..quadraticBezierTo(w * 0.88, horizon - h * 0.06, w, horizon - h * 0.02)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();

    _skylineLayer(canvas, w, h, horizon);
    canvas.drawPath(far, Paint()..color = _farHill);

    // River winding from the horizon towards the viewer.
    final river = Path()
      ..moveTo(w * 0.53, horizon + h * 0.01)
      ..cubicTo(
        w * 0.47,
        horizon + h * 0.08,
        w * 0.62,
        horizon + h * 0.14,
        w * 0.50,
        h * 0.88,
      )
      ..cubicTo(w * 0.44, h * 0.94, w * 0.42, h, w * 0.40, h)
      ..lineTo(w * 0.64, h)
      ..cubicTo(w * 0.62, h * 0.95, w * 0.62, h * 0.90, w * 0.66, h * 0.84)
      ..cubicTo(
        w * 0.72,
        horizon + h * 0.12,
        w * 0.56,
        horizon + h * 0.06,
        w * 0.55,
        horizon + h * 0.01,
      )
      ..close();
    canvas.drawPath(
      river,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AbgColors.platinum.withValues(alpha: 0.14),
            AbgColors.platinum.withValues(alpha: 0.34),
          ],
        ).createShader(Rect.fromLTWH(0, horizon, w, h - horizon)),
    );

    // Near fields, left and right of the river.
    final left = Path()
      ..moveTo(0, h * 0.76)
      ..quadraticBezierTo(w * 0.22, h * 0.72, w * 0.42, h * 0.84)
      ..quadraticBezierTo(w * 0.46, h * 0.92, w * 0.40, h)
      ..lineTo(0, h)
      ..close();
    final right = Path()
      ..moveTo(w * 0.64, h)
      ..quadraticBezierTo(w * 0.62, h * 0.86, w * 0.74, h * 0.79)
      ..quadraticBezierTo(w * 0.88, h * 0.71, w, h * 0.72)
      ..lineTo(w, h)
      ..close();
    final fields = Paint()..color = _nearHill;
    canvas.drawPath(left, fields);
    canvas.drawPath(right, fields);

    // Furrows on the fields.
    final furrow = Paint()
      ..color = Colors.white.withValues(alpha: 0.05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    for (var i = 0; i < 3; i++) {
      final y = h * (0.84 + i * 0.05);
      canvas.drawPath(
        Path()
          ..moveTo(0, y)
          ..quadraticBezierTo(w * 0.18, y - h * 0.03, w * 0.36, y + h * 0.02),
        furrow,
      );
      canvas.drawPath(
        Path()
          ..moveTo(w * 0.70, y - h * 0.04)
          ..quadraticBezierTo(w * 0.85, y - h * 0.08, w, y - h * 0.05),
        furrow,
      );
    }

    _house(canvas, Offset(w * 0.17, h * 0.80), math.min(w, h * 2) * 0.075);
    _house(canvas, Offset(w * 0.80, h * 0.765), math.min(w, h * 2) * 0.06);
    _drawTree(canvas, Offset(w * 0.91, h * 0.735), h * 0.05);
    _drawTree(canvas, Offset(w * 0.955, h * 0.745), h * 0.038);
    _drawTree(canvas, Offset(w * 0.05, h * 0.765), h * 0.042);
  }

  void _stars(Canvas canvas, double w, double h) {
    const stars = [
      [0.08, 0.10, 1.0],
      [0.21, 0.06, 0.8],
      [0.34, 0.16, 1.2],
      [0.47, 0.08, 0.7],
      [0.58, 0.20, 1.0],
      [0.66, 0.05, 0.9],
      [0.74, 0.30, 0.7],
      [0.88, 0.40, 1.1],
      [0.93, 0.14, 0.8],
      [0.29, 0.34, 0.6],
      [0.12, 0.44, 0.7],
      [0.52, 0.38, 0.6],
      [0.80, 0.08, 1.3],
      [0.40, 0.27, 0.8],
      [0.97, 0.52, 0.6],
      [0.03, 0.30, 0.9],
    ];
    for (final s in stars) {
      canvas.drawCircle(
        Offset(w * s[0], h * s[1]),
        s[2] * 1.1,
        Paint()..color = Colors.white.withValues(alpha: 0.18 + s[2] * 0.22),
      );
    }
  }

  void _clouds(Canvas canvas, double w, double h) {
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.045);
    void cloud(double cx, double cy, double r) {
      canvas.drawCircle(Offset(cx, cy), r, paint);
      canvas.drawCircle(Offset(cx + r * 1.1, cy + r * 0.25), r * 0.8, paint);
      canvas.drawCircle(Offset(cx - r * 1.0, cy + r * 0.3), r * 0.7, paint);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(cx - r * 1.7, cy + r * 0.2, r * 3.6, r * 0.9),
          Radius.circular(r),
        ),
        paint,
      );
    }

    cloud(w * 0.12, h * 0.55, h * 0.045);
    cloud(w * 0.70, h * 0.50, h * 0.04);
  }

  /// City skyline on the horizon: office towers, a factory with chimneys and
  /// two LPG storage spheres, with a few lit windows.
  void _skylineLayer(Canvas canvas, double w, double h, double horizon) {
    final unit = h * 0.012;
    final body = Paint()..color = _skyline;
    final near = Paint()..color = _skylineNear;
    final lit = Paint()..color = AbgColors.platinum.withValues(alpha: 0.35);
    final base = horizon + h * 0.015;

    void tower(
      double x,
      double width,
      double height, {
      bool windows = true,
      bool mast = false,
      Paint? paint,
    }) {
      final r = Rect.fromLTWH(x, base - height, width, height);
      canvas.drawRect(r, paint ?? body);
      if (mast) {
        canvas.drawRect(
          Rect.fromLTWH(
            x + width / 2 - 0.6,
            r.top - unit * 2.4,
            1.2,
            unit * 2.4,
          ),
          paint ?? body,
        );
      }
      if (windows) {
        for (var yy = r.top + unit * 0.9; yy < base - unit; yy += unit * 1.6) {
          for (
            var xx = x + unit * 0.6;
            xx < x + width - unit * 0.6;
            xx += unit * 1.3
          ) {
            if (((xx * 7 + yy * 13).floor() % 5) == 0) {
              canvas.drawRect(
                Rect.fromLTWH(xx, yy, unit * 0.5, unit * 0.6),
                lit,
              );
            }
          }
        }
      }
    }

    // Office towers, left of centre.
    tower(w * 0.04, w * 0.05, unit * 4.5);
    tower(w * 0.095, w * 0.035, unit * 7.5, mast: true);
    tower(w * 0.135, w * 0.06, unit * 5.5);
    tower(w * 0.20, w * 0.04, unit * 9.5, mast: true);
    tower(w * 0.245, w * 0.05, unit * 6.5);
    tower(w * 0.30, w * 0.03, unit * 4);

    // Factory with chimneys and smoke, right of the river.
    final fx = w * 0.62;
    canvas.drawRect(
      Rect.fromLTWH(fx, base - unit * 4.2, w * 0.12, unit * 4.2),
      near,
    );
    final saw = Path()..moveTo(fx, base - unit * 4.2);
    for (var i = 0; i < 4; i++) {
      final sx = fx + i * w * 0.03;
      saw
        ..lineTo(sx + w * 0.022, base - unit * 5.8)
        ..lineTo(sx + w * 0.03, base - unit * 4.2);
    }
    saw.close();
    canvas.drawPath(saw, near);
    for (final cx in [fx + w * 0.02, fx + w * 0.09]) {
      canvas.drawRect(
        Rect.fromLTWH(cx, base - unit * 9.5, unit * 1.1, unit * 5.5),
        near,
      );
      final smoke = Paint()..color = AbgColors.platinum.withValues(alpha: 0.07);
      canvas.drawCircle(
        Offset(cx + unit * 1.4, base - unit * 11),
        unit * 1.3,
        smoke,
      );
      canvas.drawCircle(
        Offset(cx + unit * 3.2, base - unit * 12.6),
        unit * 1.8,
        smoke,
      );
      canvas.drawCircle(
        Offset(cx + unit * 5.6, base - unit * 13.4),
        unit * 2.2,
        smoke,
      );
    }

    // LPG storage spheres on legs.
    for (final sx in [w * 0.78, w * 0.845]) {
      final r = unit * 2.6;
      final legs = Paint()
        ..color = near.color
        ..strokeWidth = 1.4;
      canvas.drawLine(
        Offset(sx - r * 0.7, base),
        Offset(sx - r * 0.5, base - r * 1.4),
        legs,
      );
      canvas.drawLine(
        Offset(sx + r * 0.7, base),
        Offset(sx + r * 0.5, base - r * 1.4),
        legs,
      );
      canvas.drawCircle(Offset(sx, base - r * 1.9), r, near);
      canvas.drawArc(
        Rect.fromCircle(center: Offset(sx, base - r * 1.9), radius: r * 0.8),
        math.pi * 1.1,
        math.pi * 0.5,
        false,
        Paint()
          ..color = AbgColors.platinum.withValues(alpha: 0.18)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.1,
      );
    }

    // A few low buildings at the right edge.
    tower(w * 0.90, w * 0.045, unit * 5);
    tower(w * 0.95, w * 0.05, unit * 3.4, windows: false);
  }

  void _house(Canvas canvas, Offset at, double width) {
    final height = width * 0.55;
    final wall = RRect.fromRectAndRadius(
      Rect.fromLTWH(at.dx, at.dy - height, width, height),
      const Radius.circular(1.5),
    );
    canvas.drawRRect(
      wall,
      Paint()..color = AbgColors.platinum.withValues(alpha: 0.85),
    );
    final roof = Path()
      ..moveTo(at.dx - width * 0.08, at.dy - height)
      ..lineTo(at.dx + width * 0.2, at.dy - height * 1.75)
      ..lineTo(at.dx + width * 1.02, at.dy - height * 1.75)
      ..lineTo(at.dx + width * 1.1, at.dy - height)
      ..close();
    canvas.drawPath(roof, Paint()..color = AbgColors.navy500);
    canvas.drawRect(
      Rect.fromLTWH(
        at.dx + width * 0.62,
        at.dy - height * 0.62,
        width * 0.18,
        height * 0.62,
      ),
      Paint()..color = AbgColors.navy700,
    );
    canvas.drawRect(
      Rect.fromLTWH(
        at.dx + width * 0.16,
        at.dy - height * 0.7,
        width * 0.2,
        height * 0.3,
      ),
      Paint()..color = const Color(0xFFF4D58D).withValues(alpha: 0.8),
    );
  }

  void _drawTree(Canvas canvas, Offset base, double size) {
    canvas.drawRect(
      Rect.fromLTWH(
        base.dx - size * 0.08,
        base.dy - size * 0.9,
        size * 0.16,
        size * 0.9,
      ),
      Paint()..color = const Color(0xFF0F1B2E),
    );
    final leaves = Paint()..color = _leaves;
    canvas.drawCircle(
      Offset(base.dx, base.dy - size * 1.3),
      size * 0.55,
      leaves,
    );
    canvas.drawCircle(
      Offset(base.dx - size * 0.38, base.dy - size * 1.0),
      size * 0.4,
      leaves,
    );
    canvas.drawCircle(
      Offset(base.dx + size * 0.38, base.dy - size * 1.0),
      size * 0.42,
      leaves,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
