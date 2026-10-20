import 'package:flutter/material.dart';

import '../core/formatting.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import 'common.dart';
import 'vocab.dart';

class ParcelCard extends StatelessWidget {
  const ParcelCard({super.key, required this.parcel, required this.onTap});

  final ParcelRow parcel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = parcel;
    final incoming = p.direction == 'INCOMING';
    final urgent = p.priority == 'URGENT' || p.priority == 'CRITICAL';
    return Semantics(
      button: true,
      label: '${p.trackingNumber}, ${p.title}, ${statusLabel(l, p.status)}',
      child: SectionCard(
        onTap: onTap,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _DirectionIcon(direction: p.direction),
                const SizedBox(width: 10),
                Expanded(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      p.trackingNumber,
                      maxLines: 1,
                      style: AbgText.mono.copyWith(
                        fontSize: 12,
                        color: AbgColors.inkMuted,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ),
                if (urgent) ...[
                  ToneBadge(
                    label: priorityLabel(l, p.priority),
                    tone: Tone.danger,
                    icon: Icons.bolt_rounded,
                    dense: true,
                  ),
                  const SizedBox(width: 6),
                ],
                StatusChip(p.status, dense: true),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              p.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AbgText.h3.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  incoming
                      ? Icons.south_west_rounded
                      : Icons.north_east_rounded,
                  size: 15,
                  color: AbgColors.inkSubtle,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    incoming
                        ? '${l.from}: ${p.senderName} · ${p.origin}'
                        : '${l.to}: ${p.receiverName} · ${p.destination}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AbgText.small,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  relative(p.statusChangedAt ?? p.createdAt, l),
                  style: AbgText.caption,
                ),
              ],
            ),
            if (p.isOverdue || p.hasOpenException) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                children: [
                  if (p.isOverdue)
                    ToneBadge(
                      label: l.overdue,
                      tone: Tone.danger,
                      icon: Icons.timer_off_outlined,
                      dense: true,
                    ),
                  if (p.hasOpenException)
                    ToneBadge(
                      label: l.exceptionOpen,
                      tone: Tone.danger,
                      icon: Icons.report_problem_outlined,
                      dense: true,
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DirectionIcon extends StatelessWidget {
  const _DirectionIcon({required this.direction});
  final String direction;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (direction) {
      'INCOMING' => (Icons.move_to_inbox_rounded, AbgColors.success),
      'OUTGOING' => (Icons.outbox_rounded, AbgColors.active),
      'CARRYING' => (Icons.directions_walk_rounded, AbgColors.pending),
      _ => (Icons.inventory_2_outlined, AbgColors.neutral),
    };
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, size: 16, color: color),
    );
  }
}
