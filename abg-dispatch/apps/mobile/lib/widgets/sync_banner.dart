import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/offline_queue.dart';
import '../l10n/app_localizations.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';

/// "2 actions waiting to sync" — and any replay the server rejected.
class SyncBanner extends StatelessWidget {
  const SyncBanner({super.key, this.parcelId});

  final String? parcelId;

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<OfflineQueue>();
    final l = L.of(context);
    final items = parcelId == null ? queue.items : queue.forParcel(parcelId!);
    final waiting = items.where((i) => i.state == QueuedState.waiting).length;
    final problems = items
        .where((i) => i.state != QueuedState.waiting)
        .toList();
    if (waiting == 0 && problems.isEmpty && queue.online) {
      return const SizedBox.shrink();
    }
    return Column(
      children: [
        if (!queue.online || waiting > 0)
          _Banner(
            icon: queue.online
                ? Icons.cloud_sync_outlined
                : Icons.cloud_off_rounded,
            color: AbgColors.pending,
            bg: AbgColors.pendingSoft,
            text: waiting > 0 ? l.pendingSync(waiting) : l.offline,
            action: waiting > 0 ? l.syncNow : null,
            onAction: queue.flush,
          ),
        for (final p in problems)
          _Banner(
            icon: Icons.sync_problem_rounded,
            color: AbgColors.danger,
            bg: AbgColors.dangerSoft,
            text:
                '${l.syncNeedsAttention}: ${p.label} (${p.trackingNumber}) — ${p.message ?? ''}',
            action: l.dismiss,
            onAction: () => queue.dismiss(p),
          ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.icon,
    required this.color,
    required this.bg,
    required this.text,
    this.action,
    this.onAction,
  });

  final IconData icon;
  final Color color;
  final Color bg;
  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 8, 6, 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AbgRadii.md),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: AbgText.small.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (action != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(foregroundColor: color),
              child: Text(action!),
            ),
        ],
      ),
    );
  }
}
