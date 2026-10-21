import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';

/// Bottom navigation: Home · My ABG · QR Scan · Inbox — a flat white bar like
/// the wallet apps people already use every day. Scan opens the camera over
/// everything else; the other three are tabs that keep their state.
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
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          color: AbgColors.white,
          border: Border(top: BorderSide(color: AbgColors.border)),
          boxShadow: [
            BoxShadow(
              color: Color(0x14071225),
              blurRadius: 18,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 66,
            child: Row(
              children: [
                _NavItem(
                  icon: Icons.home_outlined,
                  active: Icons.home_rounded,
                  label: l.navHome,
                  selected: index == 0,
                  onTap: () => go(0),
                ),
                _NavItem(
                  icon: Icons.account_box_outlined,
                  active: Icons.account_box_rounded,
                  label: l.navMyAbg,
                  selected: index == 1,
                  onTap: () => go(1),
                ),
                _NavItem(
                  icon: Icons.qr_code_scanner_rounded,
                  active: Icons.qr_code_scanner_rounded,
                  label: l.navQrScan,
                  selected: false,
                  onTap: () => context.push('/scan'),
                ),
                _NavItem(
                  icon: Icons.mail_outline_rounded,
                  active: Icons.mail_rounded,
                  label: l.navInbox,
                  selected: index == 2,
                  onTap: () => go(2),
                  badge: badge.total,
                ),
              ],
            ),
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
    final color = selected ? AbgColors.navy : AbgColors.inkMuted;
    return Expanded(
      child: Semantics(
        button: true,
        selected: selected,
        label: badge > 0 ? '$label, $badge unread' : label,
        child: InkWell(
          onTap: onTap,
          child: ExcludeSemantics(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(selected ? active : icon, color: color, size: 26),
                    if (badge > 0)
                      Positioned(
                        right: -12,
                        top: -7,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 1,
                          ),
                          constraints: const BoxConstraints(minWidth: 20),
                          decoration: BoxDecoration(
                            color: AbgColors.danger,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: Text(
                            badge > 99 ? '99+' : '$badge',
                            textAlign: TextAlign.center,
                            style: AbgText.caption.copyWith(
                              color: Colors.white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AbgText.caption.copyWith(
                    fontSize: 12,
                    color: color,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: const EdgeInsets.only(top: 4),
                  width: selected ? 18 : 0,
                  height: 3,
                  decoration: BoxDecoration(
                    color: AbgColors.navy,
                    borderRadius: BorderRadius.circular(2),
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
