import 'package:flutter/material.dart';

import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import '../tours/tour_widgets.dart' show tourDateRange, tourDay;
import 'leave_models.dart';

export '../tours/tour_widgets.dart' show tourDateRange, tourDay;

// ── Vocabulary: label, tone and icon together ──

String leaveTypeLabel(L l, String t) => switch (t) {
  'CASUAL' => l.lvTypeCASUAL,
  'SICK' => l.lvTypeSICK,
  'EARNED' => l.lvTypeEARNED,
  'MATERNITY' => l.lvTypeMATERNITY,
  'PATERNITY' => l.lvTypePATERNITY,
  'UNPAID' => l.lvTypeUNPAID,
  _ => t,
};

String leaveTypeHint(L l, String t) => switch (t) {
  'CASUAL' => l.lvHintCASUAL,
  'SICK' => l.lvHintSICK,
  'EARNED' => l.lvHintEARNED,
  'MATERNITY' => l.lvHintMATERNITY,
  'PATERNITY' => l.lvHintPATERNITY,
  _ => l.lvHintUNPAID,
};

IconData leaveTypeIcon(String t) => switch (t) {
  'CASUAL' => Icons.wb_sunny_outlined,
  'SICK' => Icons.medical_services_outlined,
  'EARNED' => Icons.beach_access_outlined,
  'MATERNITY' => Icons.child_friendly_outlined,
  'PATERNITY' => Icons.family_restroom_outlined,
  _ => Icons.money_off_rounded,
};

Color leaveTypeColor(String t) => switch (t) {
  'CASUAL' => const Color(0xFF2F6FED),
  'SICK' => const Color(0xFFC0466A),
  'EARNED' => const Color(0xFF0E8A8A),
  'MATERNITY' => const Color(0xFF8E4EC6),
  'PATERNITY' => const Color(0xFF4B4FC4),
  _ => AbgColors.neutral,
};

String leaveStatusLabel(L l, String s) => switch (s) {
  'PENDING_HOD' => l.lvStatusPENDING_HOD,
  'PENDING_HR' => l.lvStatusPENDING_HR,
  'APPROVED' => l.lvStatusAPPROVED,
  'REJECTED' => l.lvStatusREJECTED,
  'CANCELLED' => l.lvStatusCANCELLED,
  _ => s,
};

Tone leaveStatusTone(String s) => switch (s) {
  'PENDING_HOD' || 'PENDING_HR' => Tone.pending,
  'APPROVED' => Tone.success,
  'REJECTED' => Tone.danger,
  _ => Tone.neutral,
};

IconData leaveStatusIcon(String s) => switch (s) {
  'PENDING_HOD' => Icons.how_to_reg_outlined,
  'PENDING_HR' => Icons.badge_outlined,
  'APPROVED' => Icons.verified_outlined,
  'REJECTED' => Icons.cancel_outlined,
  'CANCELLED' => Icons.block_rounded,
  _ => Icons.circle_outlined,
};

String leaveStageLabel(L l, String key) => switch (key) {
  'SUBMITTED' => l.lvStageSUBMITTED,
  'PENDING_HOD' => l.lvStagePENDING_HOD,
  'PENDING_HR' => l.lvStagePENDING_HR,
  'APPROVED' => l.lvStageAPPROVED,
  'CANCELLED' => l.lvStageCANCELLED,
  _ => key,
};

IconData leaveStageIcon(String key) => switch (key) {
  'SUBMITTED' => Icons.send_rounded,
  'PENDING_HOD' => Icons.how_to_reg_outlined,
  'PENDING_HR' => Icons.badge_outlined,
  'APPROVED' => Icons.verified_outlined,
  _ => Icons.circle_outlined,
};

String halfDayLabel(L l, String s) =>
    s == 'SECOND_HALF' ? l.lvSECOND_HALF : l.lvFIRST_HALF;

/// "½ day", "1 day", "3 days", "2.5 days".
String leaveDays(L l, double days) {
  if (days == 0.5) return l.lvHalfDayCount;
  if (days == days.roundToDouble()) return l.lvDayCount(days.round());
  return l.lvDaysDecimal(days.toStringAsFixed(1));
}

/// A plain number for balances: "7", "2.5".
String leaveNumber(double v) =>
    v == v.roundToDouble() ? '${v.round()}' : v.toStringAsFixed(1);

/// "14–16 Nov", or "14 Nov · First half (morning)" for a half day.
String leaveWhen(L l, DateTime start, DateTime end, String? halfDay) {
  if (halfDay != null) {
    return '${tourDay(start, l.localeName)} · ${halfDayLabel(l, halfDay)}';
  }
  return tourDateRange(start, end, l.localeName);
}

class LeaveStatusChip extends StatelessWidget {
  const LeaveStatusChip(
    this.status, {
    super.key,
    this.dense = false,
    this.onDark = false,
  });

  final String status;
  final bool dense;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final label = leaveStatusLabel(L.of(context), status);
    return Semantics(
      label: 'Status: $label',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: leaveStatusTone(status),
          icon: leaveStatusIcon(status),
          dense: dense,
          onDark: onDark,
        ),
      ),
    );
  }
}

/// The coloured circle with the type's icon.
class LeaveTypeIcon extends StatelessWidget {
  const LeaveTypeIcon(this.type, {super.key, this.size = 44});

  final String type;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = leaveTypeColor(type);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Color.alphaBlend(c.withValues(alpha: 0.10), Colors.white),
        shape: BoxShape.circle,
        border: Border.all(color: c.withValues(alpha: 0.18)),
      ),
      child: Icon(leaveTypeIcon(type), color: c, size: size * 0.5),
    );
  }
}

/// One of my applications.
class LeaveCard extends StatelessWidget {
  const LeaveCard({super.key, required this.leave, required this.onTap});

  final LeaveRow leave;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = leave;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LeaveTypeIcon(r.type),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        leaveTypeLabel(l, r.type),
                        style: AbgText.bodyStrong.copyWith(fontSize: 15),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      leaveDays(l, r.days),
                      style: AbgText.bodyStrong.copyWith(
                        fontSize: 14,
                        color: AbgColors.navy500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  leaveWhen(l, r.startDate, r.endDate, r.halfDay),
                  style: AbgText.small,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (r.onLeaveNow)
                      ToneBadge(
                        label: l.lvOnLeaveNow,
                        tone: Tone.active,
                        icon: Icons.beach_access_rounded,
                        dense: true,
                      )
                    else
                      LeaveStatusChip(r.status, dense: true),
                    Text(
                      r.referenceNumber,
                      style: AbgText.mono.copyWith(
                        fontSize: 11.5,
                        color: AbgColors.inkSubtle,
                      ),
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

/// An application waiting for my decision.
class LeaveApprovalCard extends StatelessWidget {
  const LeaveApprovalCard({super.key, required this.item, required this.onTap});

  final LeaveApproval item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final a = item;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Avatar(
                initials: a.applicant.name
                    .split(' ')
                    .where((p) => p.isNotEmpty && p != 'Md.')
                    .take(2)
                    .map((p) => p[0])
                    .join(),
                size: 42,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.applicant.name,
                      style: AbgText.bodyStrong.copyWith(fontSize: 15),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (a.applicant.subtitle.isNotEmpty)
                      Text(
                        a.applicant.subtitle,
                        style: AbgText.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              Text(relative(a.createdAt, l), style: AbgText.caption),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              LeaveTypeIcon(a.type, size: 30),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${leaveTypeLabel(l, a.type)} · ${leaveDays(l, a.days)}',
                  style: AbgText.bodyStrong.copyWith(fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 40),
            child: Text(
              leaveWhen(l, a.startDate, a.endDate, a.halfDay),
              style: AbgText.small,
            ),
          ),
          if (a.reason != null && a.reason!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 40, top: 4),
              child: Text(
                '“${a.reason}”',
                style: AbgText.small.copyWith(
                  fontStyle: FontStyle.italic,
                  color: AbgColors.ink,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          const SizedBox(height: 10),
          ToneBadge(
            label: a.awaiting == 'HR' ? l.lvAwaitingHR : l.lvAwaitingHOD,
            tone: Tone.pending,
            icon: Icons.hourglass_top_rounded,
            dense: true,
          ),
        ],
      ),
    );
  }
}

/// The year's balances, one small card per type.
class LeaveBalanceStrip extends StatelessWidget {
  const LeaveBalanceStrip({super.key, required this.balances, this.onApply});

  final List<LeaveBalance> balances;
  final ValueChanged<String>? onApply;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 132,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
        itemCount: balances.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) => _BalanceCard(
          balance: balances[i],
          onTap: onApply == null ? null : () => onApply!(balances[i].type),
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.balance, this.onTap});

  final LeaveBalance balance;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final b = balance;
    final c = leaveTypeColor(b.type);
    final entitled = b.entitled;
    final usedShare = entitled == null || entitled == 0
        ? 0.0
        : (b.used / entitled).clamp(0.0, 1.0);
    final pendingShare = entitled == null || entitled == 0
        ? 0.0
        : (b.pending / entitled).clamp(0.0, 1.0 - usedShare);
    return SizedBox(
      width: 150,
      child: SectionCard(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(leaveTypeIcon(b.type), size: 16, color: c),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    leaveTypeLabel(l, b.type),
                    style: AbgText.caption.copyWith(
                      color: AbgColors.ink,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const Spacer(),
            if (entitled != null) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    leaveNumber(b.available ?? 0),
                    style: AbgText.h1.copyWith(
                      fontSize: 26,
                      color: AbgColors.navy,
                      height: 1,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      '${l.lvLeft} · ${l.lvOfTotal(leaveNumber(entitled))}',
                      style: AbgText.caption,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: SizedBox(
                  height: 6,
                  child: Row(
                    children: [
                      if (usedShare > 0)
                        Expanded(
                          flex: (usedShare * 1000).round(),
                          child: ColoredBox(color: c),
                        ),
                      if (pendingShare > 0)
                        Expanded(
                          flex: (pendingShare * 1000).round(),
                          child: ColoredBox(color: c.withValues(alpha: 0.4)),
                        ),
                      Expanded(
                        flex: ((1 - usedShare - pendingShare) * 1000)
                            .round()
                            .clamp(1, 1000),
                        child: const ColoredBox(color: AbgColors.softSilver),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                b.pending > 0
                    ? l.lvTakenPending(
                        leaveNumber(b.used),
                        leaveNumber(b.pending),
                      )
                    : l.lvTaken(leaveNumber(b.used)),
                style: AbgText.caption.copyWith(fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ] else ...[
              Text(
                l.lvNoLimit,
                style: AbgText.bodyStrong.copyWith(
                  fontSize: 14,
                  color: AbgColors.navy500,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                l.lvTaken(leaveNumber(b.used)),
                style: AbgText.caption.copyWith(fontSize: 11),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
