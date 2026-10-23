import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import '../tours/tour_widgets.dart' show tourDateRange, tourDay;
import 'audit_models.dart';

export '../tours/tour_widgets.dart' show tourDateRange, tourDay;

// ── Vocabulary: label, tone and icon together ──

String auditTypeLabel(L l, String t) => switch (t) {
  'INTERNAL' => l.audTypeINTERNAL,
  'COMPLIANCE' => l.audTypeCOMPLIANCE,
  'SAFETY' => l.audTypeSAFETY,
  'BUYER' => l.audTypeBUYER,
  'ISO' => l.audTypeISO,
  'FINANCIAL' => l.audTypeFINANCIAL,
  'ENVIRONMENT' => l.audTypeENVIRONMENT,
  _ => t,
};

IconData auditTypeIcon(String t) => switch (t) {
  'INTERNAL' => Icons.fact_check_outlined,
  'COMPLIANCE' => Icons.gavel_rounded,
  'SAFETY' => Icons.local_fire_department_outlined,
  'BUYER' => Icons.storefront_outlined,
  'ISO' => Icons.workspace_premium_outlined,
  'FINANCIAL' => Icons.inventory_outlined,
  'ENVIRONMENT' => Icons.eco_outlined,
  _ => Icons.fact_check_outlined,
};

String auditStatusLabel(L l, String s) => switch (s) {
  'PLANNED' => l.audStatusPLANNED,
  'IN_PROGRESS' => l.audStatusIN_PROGRESS,
  'FOLLOW_UP' => l.audStatusFOLLOW_UP,
  'CLOSED' => l.audStatusCLOSED,
  'CANCELLED' => l.audStatusCANCELLED,
  _ => s,
};

Tone auditStatusTone(String s) => switch (s) {
  'IN_PROGRESS' => Tone.active,
  'FOLLOW_UP' => Tone.pending,
  'CLOSED' => Tone.success,
  _ => Tone.neutral,
};

IconData auditStatusIcon(String s) => switch (s) {
  'PLANNED' => Icons.event_note_outlined,
  'IN_PROGRESS' => Icons.manage_search_rounded,
  'FOLLOW_UP' => Icons.build_circle_outlined,
  'CLOSED' => Icons.verified_outlined,
  'CANCELLED' => Icons.block_rounded,
  _ => Icons.circle_outlined,
};

String auditRatingLabel(L l, String r) => switch (r) {
  'SATISFACTORY' => l.audRatingSATISFACTORY,
  'NEEDS_IMPROVEMENT' => l.audRatingNEEDS_IMPROVEMENT,
  _ => l.audRatingUNSATISFACTORY,
};

Tone auditRatingTone(String r) => switch (r) {
  'SATISFACTORY' => Tone.success,
  'NEEDS_IMPROVEMENT' => Tone.pending,
  _ => Tone.danger,
};

String severityLabel(L l, String s) => switch (s) {
  'CRITICAL' => l.audSevCRITICAL,
  'MAJOR' => l.audSevMAJOR,
  'MINOR' => l.audSevMINOR,
  _ => l.audSevOBSERVATION,
};

String severityHint(L l, String s) => switch (s) {
  'CRITICAL' => l.audSevHintCRITICAL,
  'MAJOR' => l.audSevHintMAJOR,
  'MINOR' => l.audSevHintMINOR,
  _ => l.audSevHintOBSERVATION,
};

Tone severityTone(String s) => switch (s) {
  'CRITICAL' || 'MAJOR' => Tone.danger,
  'MINOR' => Tone.pending,
  _ => Tone.neutral,
};

IconData severityIcon(String s) => switch (s) {
  'CRITICAL' => Icons.priority_high_rounded,
  'MAJOR' => Icons.report_outlined,
  'MINOR' => Icons.info_outline_rounded,
  _ => Icons.visibility_outlined,
};

String findingStatusLabel(L l, String s) => switch (s) {
  'OPEN' => l.audFindStatusOPEN,
  'SUBMITTED' => l.audFindStatusSUBMITTED,
  'VERIFIED' => l.audFindStatusVERIFIED,
  _ => l.audFindStatusNOTED,
};

Tone findingStatusTone(String s) => switch (s) {
  'OPEN' => Tone.pending,
  'SUBMITTED' => Tone.active,
  'VERIFIED' => Tone.success,
  _ => Tone.neutral,
};

IconData findingStatusIcon(String s) => switch (s) {
  'OPEN' => Icons.build_outlined,
  'SUBMITTED' => Icons.outbox_outlined,
  'VERIFIED' => Icons.verified_outlined,
  _ => Icons.bookmark_border_rounded,
};

class AuditStatusChip extends StatelessWidget {
  const AuditStatusChip(
    this.status, {
    super.key,
    this.dense = false,
    this.onDark = false,
  });

  final String status;
  final bool dense;
  final bool onDark;

  @override
  Widget build(BuildContext context) => ToneBadge(
    label: auditStatusLabel(L.of(context), status),
    tone: auditStatusTone(status),
    icon: auditStatusIcon(status),
    dense: dense,
    onDark: onDark,
  );
}

/// The severity as a solid tag: red for critical, so it reads at a glance.
class SeverityTag extends StatelessWidget {
  const SeverityTag(this.severity, {super.key});

  final String severity;

  @override
  Widget build(BuildContext context) {
    final critical = severity == 'CRITICAL';
    final c = toneColors(severityTone(severity));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: critical ? AbgColors.danger : c.bg,
        borderRadius: BorderRadius.circular(6),
        border: critical
            ? null
            : Border.all(color: c.fg.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            severityIcon(severity),
            size: 12,
            color: critical ? Colors.white : c.fg,
          ),
          const SizedBox(width: 4),
          Text(
            severityLabel(L.of(context), severity).toUpperCase(),
            style: AbgText.caption.copyWith(
              color: critical ? Colors.white : c.fg,
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}

/// "Due 14 Nov" or, in red, "Overdue since 14 Nov".
class DueLine extends StatelessWidget {
  const DueLine({super.key, required this.finding});

  final AuditFinding finding;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final f = finding;
    if (f.dueDate == null) return const SizedBox.shrink();
    final date = tourDay(f.dueDate!, l.localeName);
    final overdue = f.overdue;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          overdue ? Icons.alarm_rounded : Icons.event_outlined,
          size: 14,
          color: overdue ? AbgColors.danger : AbgColors.inkSubtle,
        ),
        const SizedBox(width: 4),
        Text(
          overdue ? l.audOverdue(date) : l.audDue(date),
          style: AbgText.caption.copyWith(
            color: overdue ? AbgColors.danger : AbgColors.inkMuted,
            fontWeight: overdue ? FontWeight.w700 : null,
          ),
        ),
      ],
    );
  }
}

/// A corrective action in "My actions".
class ActionCard extends StatelessWidget {
  const ActionCard({super.key, required this.finding, required this.onTap});

  final AuditFinding finding;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final f = finding;
    final a = f.audit;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SeverityTag(f.severity),
              const SizedBox(width: 8),
              Text(
                f.number,
                style: AbgText.mono.copyWith(
                  fontSize: 12,
                  color: AbgColors.inkMuted,
                ),
              ),
              const Spacer(),
              ToneBadge(
                label: findingStatusLabel(l, f.status),
                tone: findingStatusTone(f.status),
                icon: findingStatusIcon(f.status),
                dense: true,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(f.title, style: AbgText.bodyStrong.copyWith(fontSize: 15)),
          if (a != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  auditTypeIcon(a.type),
                  size: 14,
                  color: AbgColors.inkSubtle,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '${a.referenceNumber} · ${a.branchName}',
                    style: AbgText.caption,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 6),
          DueLine(finding: f),
        ],
      ),
    );
  }
}

/// An audit in the list.
class AuditCard extends StatelessWidget {
  const AuditCard({super.key, required this.audit, required this.onTap});

  final AuditRow audit;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = audit;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: AbgGradients.hero,
              borderRadius: BorderRadius.circular(AbgRadii.md),
            ),
            child: Icon(
              auditTypeIcon(a.type),
              color: AbgColors.platinumBright,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  a.title,
                  style: AbgText.bodyStrong.copyWith(fontSize: 15),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${a.branchName} · ${tourDateRange(a.plannedStart, a.plannedEnd, l.localeName)}',
                  style: AbgText.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    AuditStatusChip(a.status, dense: true),
                    if (a.counts.criticalOpen > 0)
                      ToneBadge(
                        label:
                            '${a.counts.criticalOpen} ${l.audSevCRITICAL.toLowerCase()}',
                        tone: Tone.danger,
                        icon: Icons.priority_high_rounded,
                        dense: true,
                      ),
                    if (a.counts.overdue > 0)
                      ToneBadge(
                        label: l.audOverdueCount(a.counts.overdue),
                        tone: Tone.danger,
                        icon: Icons.alarm_rounded,
                        dense: true,
                      ),
                    if (a.counts.stillOpen > 0 && a.counts.overdue == 0)
                      Text(
                        l.audActionsLeft(a.counts.stillOpen),
                        style: AbgText.caption,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
