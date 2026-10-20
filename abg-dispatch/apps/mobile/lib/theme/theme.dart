import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'tokens.dart';

const _fallback = ['NotoSansBengali'];

TextStyle _display(
  double size,
  FontWeight weight, {
  double? height,
  double spacing = -0.4,
  Color color = AbgColors.ink,
}) => TextStyle(
  fontFamily: 'Manrope',
  fontFamilyFallback: _fallback,
  fontSize: size,
  fontWeight: weight,
  height: height,
  letterSpacing: spacing,
  color: color,
);

TextStyle _body(
  double size,
  FontWeight weight, {
  double? height,
  double spacing = 0,
  Color color = AbgColors.ink,
}) => TextStyle(
  fontFamily: 'Inter',
  fontFamilyFallback: _fallback,
  fontSize: size,
  fontWeight: weight,
  height: height,
  letterSpacing: spacing,
  color: color,
);

abstract final class AbgText {
  static final hero = _display(
    30,
    FontWeight.w800,
    height: 1.12,
    spacing: -0.8,
  );
  static final h1 = _display(24, FontWeight.w800, height: 1.18, spacing: -0.6);
  static final h2 = _display(19, FontWeight.w700, height: 1.25, spacing: -0.3);
  static final h3 = _display(16, FontWeight.w700, height: 1.3, spacing: -0.2);
  static final body = _body(15, FontWeight.w400, height: 1.45);
  static final bodyStrong = _body(15, FontWeight.w600, height: 1.45);
  static final small = _body(
    13,
    FontWeight.w500,
    height: 1.4,
    color: AbgColors.inkMuted,
  );
  static final caption = _body(
    12,
    FontWeight.w500,
    height: 1.35,
    color: AbgColors.inkSubtle,
  );
  static final overline = _body(
    11,
    FontWeight.w700,
    height: 1.2,
    spacing: 1.1,
    color: AbgColors.inkSubtle,
  );
  static final mono = _body(
    13,
    FontWeight.w600,
    spacing: 0.3,
  ).copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
  static final button = _body(15, FontWeight.w600, spacing: 0.1);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AbgColors.navy,
    primary: AbgColors.navy,
    onPrimary: AbgColors.white,
    secondary: AbgColors.navy500,
    surface: AbgColors.white,
    onSurface: AbgColors.ink,
    error: AbgColors.danger,
  );
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    fontFamily: 'Inter',
    fontFamilyFallback: _fallback,
  );
  final outline = OutlineInputBorder(
    borderRadius: BorderRadius.circular(AbgRadii.md),
    borderSide: const BorderSide(color: AbgColors.border),
  );
  return base.copyWith(
    scaffoldBackgroundColor: AbgColors.surface,
    splashFactory: InkSparkle.splashFactory,
    textTheme: base.textTheme.copyWith(
      headlineMedium: AbgText.h1,
      titleLarge: AbgText.h2,
      titleMedium: AbgText.h3,
      bodyLarge: AbgText.body,
      bodyMedium: AbgText.body.copyWith(fontSize: 14),
      bodySmall: AbgText.small,
      labelLarge: AbgText.button,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AbgColors.surface,
      foregroundColor: AbgColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: AbgText.h2,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
    ),
    cardTheme: CardThemeData(
      color: AbgColors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        side: const BorderSide(color: AbgColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AbgColors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: outline,
      enabledBorder: outline,
      focusedBorder: outline.copyWith(
        borderSide: const BorderSide(color: AbgColors.navy, width: 1.6),
      ),
      errorBorder: outline.copyWith(
        borderSide: const BorderSide(color: AbgColors.danger),
      ),
      labelStyle: AbgText.small,
      floatingLabelStyle: AbgText.small.copyWith(
        color: AbgColors.navy,
        fontWeight: FontWeight.w600,
      ),
      hintStyle: AbgText.body.copyWith(color: AbgColors.inkSubtle),
      prefixIconColor: AbgColors.inkSubtle,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AbgColors.navy,
        foregroundColor: AbgColors.white,
        disabledBackgroundColor: AbgColors.softSilver,
        minimumSize: const Size.fromHeight(54),
        textStyle: AbgText.button,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AbgRadii.md),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AbgColors.navy,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: AbgColors.borderStrong),
        textStyle: AbgText.button,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AbgRadii.md),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AbgColors.navy,
        textStyle: AbgText.button,
        minimumSize: const Size(kMinTap, kMinTap),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: AbgColors.white,
      selectedColor: AbgColors.navy,
      side: const BorderSide(color: AbgColors.border),
      labelStyle: AbgText.small.copyWith(color: AbgColors.ink),
      secondaryLabelStyle: AbgText.small.copyWith(color: AbgColors.white),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    ),
    dividerTheme: const DividerThemeData(
      color: AbgColors.border,
      thickness: 1,
      space: 1,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AbgColors.white,
      showDragHandle: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AbgRadii.sheet),
        ),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AbgColors.navy,
      contentTextStyle: AbgText.body.copyWith(
        color: AbgColors.white,
        fontSize: 14,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(kMinTap, kMinTap)),
        textStyle: WidgetStatePropertyAll(
          AbgText.small.copyWith(fontWeight: FontWeight.w600),
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AbgRadii.md),
          ),
        ),
        side: const WidgetStatePropertyAll(BorderSide(color: AbgColors.border)),
        backgroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? AbgColors.navy
              : AbgColors.white,
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? AbgColors.white
              : AbgColors.ink,
        ),
        iconColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? AbgColors.white
              : AbgColors.inkMuted,
        ),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: AbgColors.navy,
      unselectedLabelColor: AbgColors.inkSubtle,
      labelStyle: AbgText.small.copyWith(fontWeight: FontWeight.w700),
      unselectedLabelStyle: AbgText.small.copyWith(fontWeight: FontWeight.w600),
      indicatorColor: AbgColors.navy,
      indicatorSize: TabBarIndicatorSize.label,
      dividerColor: AbgColors.border,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected)
            ? AbgColors.white
            : AbgColors.platinumDeep,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected)
            ? AbgColors.navy
            : AbgColors.softSilver,
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AbgColors.navy,
      linearTrackColor: AbgColors.softSilver,
    ),
  );
}
