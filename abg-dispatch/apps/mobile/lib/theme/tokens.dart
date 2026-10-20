import 'package:flutter/material.dart';

/// ABG Dispatch design tokens, derived from the Anvir Bashundhara Group mark:
/// metallic platinum lettering on midnight navy. [AbgColors.midnight] is the
/// logo's own background, so the mark sits on it without a visible edge.
///
/// Mirrors packages/shared/src/tokens.ts.
abstract final class AbgColors {
  static const midnight = Color(0xFF071225);
  static const navy = Color(0xFF0C1727);
  static const deepNavy = Color(0xFF142238);
  static const navy700 = Color(0xFF1E2E48);
  static const navy500 = Color(0xFF33466A);
  static const platinum = Color(0xFFCAD0D8);
  static const platinumBright = Color(0xFFEEF1F5);
  static const platinumDeep = Color(0xFF9AA4B2);
  static const softSilver = Color(0xFFE7EBF0);
  static const surface = Color(0xFFF7F9FC);
  static const white = Color(0xFFFFFFFF);
  static const ink = Color(0xFF0C1727);
  static const inkMuted = Color(0xFF5B6678);
  static const inkSubtle = Color(0xFF8A94A6);
  static const border = Color(0xFFE3E8EF);
  static const borderStrong = Color(0xFFCBD3DE);

  static const active = Color(0xFF2F6FED);
  static const activeSoft = Color(0xFFE8F0FE);
  static const pending = Color(0xFFB7791F);
  static const pendingSoft = Color(0xFFFDF3E1);
  static const success = Color(0xFF1F8A5B);
  static const successSoft = Color(0xFFE3F4EC);
  static const danger = Color(0xFFC93C3C);
  static const dangerSoft = Color(0xFFFBE9E9);
  static const neutral = Color(0xFF6B7588);
  static const neutralSoft = Color(0xFFEEF1F5);
}

abstract final class AbgGradients {
  /// The navy field behind the logo on splash, login and screen headers.
  static const hero = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AbgColors.midnight, Color(0xFF0B1A31), AbgColors.deepNavy],
    stops: [0, 0.55, 1],
  );

  /// Brushed-platinum sheen, used sparingly: primary actions on dark, the scan button ring.
  static const platinum = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFF4F6F9),
      Color(0xFFCAD0D8),
      Color(0xFFE9EDF2),
      Color(0xFFAEB6C2),
    ],
    stops: [0, 0.38, 0.62, 1],
  );

  static const platinumText = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFCAD0D8), Color(0xFFEEF1F5)],
  );
}

abstract final class AbgRadii {
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 22.0;
  static const sheet = 28.0;
}

abstract final class AbgSpace {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 28.0;
  static const gutter = 20.0;
}

abstract final class AbgShadows {
  static const card = [
    BoxShadow(color: Color(0x0F0C1727), blurRadius: 18, offset: Offset(0, 6)),
    BoxShadow(color: Color(0x080C1727), blurRadius: 2, offset: Offset(0, 1)),
  ];
  static const raised = [
    BoxShadow(color: Color(0x290C1727), blurRadius: 28, offset: Offset(0, 12)),
  ];
}

/// Minimum interactive size (WCAG 2.2 target size, enhanced).
const double kMinTap = 48;
