import 'package:flutter/material.dart';

/// Design tokens shared with the web app's corporate/photography theme:
/// near-black ink on a soft off-white ground, violet accent for primary
/// actions, teal for verified/assigned states.
class AppColors {
  static const ink = Color(0xFF16181D);
  static const paper = Color(0xFFF6F5F8);
  static const card = Color(0xFFFFFFFF);
  // signal/stamp are tuned so white text on them clears WCAG AA (4.5:1);
  // the lighter originals sat at 3.7 and 4.2.
  static const signal = Color(0xFF806DA5);
  static const signalDark = Color(0xFF6F5C93);
  static const stamp = Color(0xFF1E847D);
  static const stampDark = Color(0xFF166860);
  static const warn = Color(0xFFB3492F);
  static const slate = Color(0xFF55596B);
  static const slateLight = Color(0xFFE6E4EC);
  static const rule = Color(0xFFE6E4EC);
}

TextStyle dataStyle({
  double size = 13,
  FontWeight weight = FontWeight.w500,
  Color? color,
  double? letterSpacing,
}) {
  return TextStyle(
    fontSize: size,
    fontWeight: weight,
    color: color ?? AppColors.ink,
    letterSpacing: letterSpacing,
  );
}

TextStyle displayStyle({
  required double size,
  Color color = AppColors.ink,
  double letterSpacing = -0.5,
}) {
  return TextStyle(
    fontWeight: FontWeight.w800,
    fontSize: size,
    height: 1.05,
    letterSpacing: letterSpacing,
    color: color,
  );
}

ThemeData buildAppTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.signal,
    brightness: Brightness.light,
    primary: AppColors.signal,
    onPrimary: AppColors.card,
    secondary: AppColors.stamp,
    surface: AppColors.card,
    onSurface: AppColors.ink,
    error: AppColors.warn,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.paper,
    fontFamily: 'Roboto',
    // Fade-through on every push/pop, matching the web app's soft entrances
    // rather than the platform default slide.
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.paper,
      foregroundColor: AppColors.ink,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        color: AppColors.ink,
        fontWeight: FontWeight.w700,
        fontSize: 20,
        letterSpacing: -0.3,
      ),
    ),
    textTheme: const TextTheme(
      headlineSmall: TextStyle(
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        color: AppColors.ink,
      ),
      titleLarge: TextStyle(fontWeight: FontWeight.w700, color: AppColors.ink),
      titleMedium: TextStyle(fontWeight: FontWeight.w600, color: AppColors.ink),
      bodyMedium: TextStyle(color: AppColors.ink),
      bodySmall: TextStyle(color: AppColors.slate),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.card,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.slateLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.slateLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.signal, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.warn),
      ),
      labelStyle: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppColors.slate,
      ),
      floatingLabelStyle: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.signal,
      ),
      hintStyle: const TextStyle(color: AppColors.slate),
    ),
    cardTheme: CardThemeData(
      color: AppColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: AppColors.slateLight),
        borderRadius: BorderRadius.circular(20),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.card,
      indicatorColor: AppColors.signal.withValues(alpha: 0.14),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.ink,
        ),
      ),
    ),
    dividerColor: AppColors.slateLight,
  );
}
