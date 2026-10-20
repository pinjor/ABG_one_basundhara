import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';

/// Bottom navigation: Home · Parcels · [Scan] · Alerts · Profile.
/// Scan sits in the middle as a raised platinum-ringed button because it is
/// the fastest way to record a custody change.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final badge = context.watch<NotificationBadge>();
    final index = shell.currentIndex;
    void go(int i) => shell.goBranch(i, initialLocation: i == index);
    return Scaffold(
      body: shell,
      extendBody: true,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          height: 74,
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
          decoration: BoxDecoration(
            color: AbgColors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AbgColors.border),
            boxShadow: AbgShadows.raised,
          ),
          child: Row(
            children: [
              _NavItem(
                icon: Icons.space_dashboard_outlined,
                active: Icons.space_dashboard_rounded,
                label: l.navHome,
                selected: index == 0,
                onTap: () => go(0),
              ),
              _NavItem(
                icon: Icons.inventory_2_outlined,
                active: Icons.inventory_2_rounded,
                label: l.navParcels,
                selected: index == 1,
                onTap: () => go(1),
              ),
              Expanded(
                child: Center(
                  child: _ScanButton(
                    label: l.navScan,
                    onTap: () => context.push('/scan'),
                  ),
                ),
              ),
              _NavItem(
                icon: Icons.notifications_none_rounded,
                active: Icons.notifications_rounded,
                label: l.navAlerts,
                selected: index == 2,
                onTap: () => go(2),
                badge: badge.total,
              ),
              _NavItem(
                icon: Icons.person_outline_rounded,
                active: Icons.person_rounded,
                label: l.navProfile,
                selected: index == 3,
                onTap: () => go(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.active,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final IconData active;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Semantics(
        button: true,
        selected: selected,
        label: badge > 0 ? '$label, $badge unread' : label,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: ExcludeSemantics(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: selected
                            ? AbgColors.platinumBright
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        selected ? active : icon,
                        color: selected ? AbgColors.navy : AbgColors.inkSubtle,
                        size: 23,
                      ),
                    ),
                    if (badge > 0)
                      Positioned(
                        right: 6,
                        top: -2,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 1,
                          ),
                          constraints: const BoxConstraints(minWidth: 18),
                          decoration: BoxDecoration(
                            color: AbgColors.danger,
                            borderRadius: BorderRadius.circular(9),
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                          child: Text(
                            badge > 99 ? '99+' : '$badge',
                            textAlign: TextAlign.center,
                            style: AbgText.caption.copyWith(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: AbgText.caption.copyWith(
                    fontSize: 11,
                    color: selected ? AbgColors.navy : AbgColors.inkSubtle,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
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

class _ScanButton extends StatelessWidget {
  const _ScanButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 60,
          height: 60,
          padding: const EdgeInsets.all(3),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: AbgGradients.platinum,
            boxShadow: AbgShadows.raised,
          ),
          child: Container(
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: AbgGradients.hero,
            ),
            child: const Icon(
              Icons.qr_code_scanner_rounded,
              color: AbgColors.platinumBright,
              size: 27,
            ),
          ),
        ),
      ),
    );
  }
}
