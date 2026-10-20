import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      backgroundColor: AbgColors.midnight,
      body: HeroBackground(
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AbgLogo(width: 210),
                const SizedBox(height: 26),
                const DispatchWordmark(size: 15),
                const SizedBox(height: 40),
                SizedBox(
                  width: 120,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: const LinearProgressIndicator(
                      minHeight: 2,
                      color: AbgColors.platinum,
                      backgroundColor: Color(0x22CAD0D8),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  l.splashLoading,
                  style: AbgText.caption.copyWith(
                    color: AbgColors.platinumDeep,
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
