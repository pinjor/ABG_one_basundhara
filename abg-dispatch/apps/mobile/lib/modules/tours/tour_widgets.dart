import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'tour_models.dart';

// ── Vocabulary: label, tone and icon together ──

String tourStatusLabel(L l, String s) => switch (s) {
  'PENDING_HOD' => l.tourStatusPENDING_HOD,
  'PENDING_VETTING' => l.tourStatusPENDING_VETTING,
  'PENDING_SANCTION' => l.tourStatusPENDING_SANCTION,
  'APPROVED' => l.tourStatusAPPROVED,
  'ACTIVE' => l.tourStatusACTIVE,
  'COMPLETED' => l.tourStatusCOMPLETED,
  'REJECTED' => l.tourStatusREJECTED,
  'CANCELLED' => l.tourStatusCANCELLED,
  _ => s,
};

Tone tourStatusTone(String s) => switch (s) {
  'PENDING_HOD' || 'PENDING_VETTING' || 'PENDING_SANCTION' => Tone.pending,
  'APPROVED' => Tone.success,
  'ACTIVE' => Tone.active,
  'REJECTED' => Tone.danger,
  _ => Tone.neutral,
};

IconData tourStatusIcon(String s) => switch (s) {
  'PENDING_HOD' => Icons.how_to_reg_outlined,
  'PENDING_VETTING' => Icons.account_balance_wallet_outlined,
  'PENDING_SANCTION' => Icons.approval_outlined,
  'APPROVED' => Icons.verified_outlined,
  'ACTIVE' => Icons.flight_takeoff_rounded,
  'COMPLETED' => Icons.flag_outlined,
  'REJECTED' => Icons.cancel_outlined,
  'CANCELLED' => Icons.block_rounded,
  _ => Icons.circle_outlined,
};

String tourTypeLabel(L l, String t) =>
    t == 'FOREIGN' ? l.tourTypeFOREIGN : l.tourTypeLOCAL;

String tourPurposeLabel(L l, String p) => switch (p) {
  'CONFERENCE' => l.tourPurposeCONFERENCE,
  'TECHNICAL_INSPECTION' => l.tourPurposeTECHNICAL_INSPECTION,
  'VENDOR_AUDIT' => l.tourPurposeVENDOR_AUDIT,
  'TRAINING' => l.tourPurposeTRAINING,
  'CLIENT_MEETING' => l.tourPurposeCLIENT_MEETING,
  'PLANT_VISIT' => l.tourPurposePLANT_VISIT,
  _ => l.tourPurposeOTHER,
};

IconData tourPurposeIcon(String p) => switch (p) {
  'CONFERENCE' => Icons.groups_outlined,
  'TECHNICAL_INSPECTION' => Icons.engineering_outlined,
  'VENDOR_AUDIT' => Icons.fact_check_outlined,
  'TRAINING' => Icons.school_outlined,
  'CLIENT_MEETING' => Icons.handshake_outlined,
  'PLANT_VISIT' => Icons.factory_outlined,
  _ => Icons.more_horiz_rounded,
};

String tourTransportLabel(L l, String t) => switch (t) {
  'AIR' => l.tourTransportAIR,
  'ROAD' => l.tourTransportROAD,
  'RAIL' => l.tourTransportRAIL,
  'WATER' => l.tourTransportWATER,
  'POOL_CAR' => l.tourTransportPOOL_CAR,
  _ => t,
};

IconData tourTransportIcon(String t) => switch (t) {
  'AIR' => Icons.flight_rounded,
  'ROAD' => Icons.directions_bus_rounded,
  'RAIL' => Icons.train_rounded,
  'WATER' => Icons.directions_boat_rounded,
  'POOL_CAR' => Icons.directions_car_rounded,
  _ => Icons.route_rounded,
};

String tourAwaitingLabel(L l, String a) => switch (a) {
  'HOD' => l.tourAwaitingHOD,
  'VETTING' => l.tourAwaitingVETTING,
  _ => l.tourAwaitingSANCTION,
};

String tourStageLabel(L l, String key) => switch (key) {
  'SUBMITTED' => l.tourStageSUBMITTED,
  'PENDING_HOD' => l.tourStagePENDING_HOD,
  'PENDING_VETTING' => l.tourStagePENDING_VETTING,
  'PENDING_SANCTION' => l.tourStagePENDING_SANCTION,
  'APPROVED' => l.tourStageAPPROVED,
  'ACTIVE' => l.tourStageACTIVE,
  'COMPLETED' => l.tourStageCOMPLETED,
  _ => key,
};

IconData tourStageIcon(String key) => switch (key) {
  'SUBMITTED' => Icons.send_rounded,
  'PENDING_HOD' => Icons.how_to_reg_outlined,
  'PENDING_VETTING' => Icons.account_balance_wallet_outlined,
  'PENDING_SANCTION' => Icons.approval_outlined,
  'APPROVED' => Icons.verified_outlined,
  'ACTIVE' => Icons.flight_takeoff_rounded,
  'COMPLETED' => Icons.flag_outlined,
  _ => Icons.circle_outlined,
};

/// "14 Nov 2026" for a calendar date.
String tourDay(DateTime d, String locale) => DateFormat.yMMMd(locale).format(d);

/// "14–18 Nov", "28 Nov – 3 Dec" (year added when it differs from this year).
String tourDateRange(DateTime start, DateTime end, String locale) {
  final thisYear = dhakaToday().year;
  final withYear = start.year != thisYear || end.year != thisYear;
  final md = DateFormat.MMMd(locale);
  final ymd = DateFormat.yMMMd(locale);
  if (start == end) return withYear ? ymd.format(start) : md.format(start);
  if (start.year == end.year && start.month == end.month) {
    final day = DateFormat.d(locale);
    final last = withYear ? ymd.format(end) : md.format(end);
    return '${day.format(start)}–$last';
  }
  return '${md.format(start)} – ${withYear ? ymd.format(end) : md.format(end)}';
}

class TourStatusChip extends StatelessWidget {
  const TourStatusChip(
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
    final label = tourStatusLabel(L.of(context), status);
    return Semantics(
      label: 'Status: $label',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: tourStatusTone(status),
          icon: tourStatusIcon(status),
          dense: dense,
          onDark: onDark,
        ),
      ),
    );
  }
}

/// FOREIGN / LOCAL tag.
class TourTypeTag extends StatelessWidget {
  const TourTypeTag(this.type, {super.key, this.onDark = false});

  final String type;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final foreign = type == 'FOREIGN';
    final bg = onDark
        ? Colors.white.withValues(alpha: 0.12)
        : foreign
        ? AbgColors.navy
        : AbgColors.platinumBright;
    final fg = onDark || foreign ? AbgColors.platinumBright : AbgColors.navy500;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: foreign || onDark
            ? null
            : Border.all(color: AbgColors.borderStrong),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            foreign ? Icons.public_rounded : Icons.place_outlined,
            size: 12,
            color: fg,
          ),
          const SizedBox(width: 4),
          Text(
            tourTypeLabel(L.of(context), type).toUpperCase(),
            style: AbgText.caption.copyWith(
              color: fg,
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

class PassportAlertTag extends StatelessWidget {
  const PassportAlertTag({super.key});

  @override
  Widget build(BuildContext context) => ToneBadge(
    label: L.of(context).tourPassportSection,
    tone: Tone.danger,
    icon: Icons.warning_amber_rounded,
    dense: true,
  );
}

/// One of my requests.
class TourCard extends StatelessWidget {
  const TourCard({super.key, required this.tour, required this.onTap});

  final TourRow tour;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final t = tour;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              TourTypeTag(t.type),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  t.referenceNumber,
                  style: AbgText.mono.copyWith(
                    fontSize: 12,
                    color: AbgColors.inkMuted,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (t.passportAlert) const PassportAlertTag(),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            t.title,
            style: AbgText.bodyStrong.copyWith(fontSize: 15),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          _MetaLine(
            icon: t.isForeign ? Icons.public_rounded : Icons.place_outlined,
            text: t.place,
          ),
          const SizedBox(height: 2),
          _MetaLine(
            icon: Icons.event_outlined,
            text:
                '${tourDateRange(t.startDate, t.endDate, l.localeName)} · ${l.tourDays(tourDays(t.startDate, t.endDate))}',
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Flexible(child: TourStatusChip(t.status, dense: true)),
              const SizedBox(width: 8),
              const Spacer(),
              Text(
                formatTaka(
                  t.sanctionedBudget ?? t.estimatedBudget,
                  l.localeName,
                ),
                style: AbgText.mono.copyWith(
                  fontSize: 13.5,
                  color: t.sanctionedBudget != null
                      ? AbgColors.success
                      : AbgColors.ink,
                ),
              ),
            ],
          ),
          if (t.statusNote != null && t.statusNote!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '“${t.statusNote}”',
              style: AbgText.small.copyWith(
                color: AbgColors.inkMuted,
                fontStyle: FontStyle.italic,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

/// A request waiting for my decision.
class TourApprovalCard extends StatelessWidget {
  const TourApprovalCard({super.key, required this.item, required this.onTap});

  final TourApproval item;
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
              Avatar(initials: _initials(a.traveller.name), size: 38),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.traveller.name,
                      style: AbgText.bodyStrong.copyWith(fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (a.traveller.subtitle.isNotEmpty)
                      Text(
                        a.traveller.subtitle,
                        style: AbgText.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              TourTypeTag(a.type),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            a.title,
            style: AbgText.bodyStrong.copyWith(fontSize: 15),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          _MetaLine(
            icon: a.type == 'FOREIGN'
                ? Icons.public_rounded
                : Icons.place_outlined,
            text: a.destination,
          ),
          const SizedBox(height: 2),
          _MetaLine(
            icon: Icons.event_outlined,
            text:
                '${tourDateRange(a.startDate, a.endDate, l.localeName)} · ${formatTaka(a.estimatedBudget, l.localeName)}',
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Flexible(
                child: ToneBadge(
                  label:
                      '${l.tourYourDecision} · ${tourAwaitingLabel(l, a.awaiting)}',
                  tone: Tone.pending,
                  icon: tourStatusIcon(a.status),
                  dense: true,
                ),
              ),
              const Spacer(),
              Text(
                l.tourReview,
                style: AbgText.small.copyWith(
                  color: AbgColors.active,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: AbgColors.active,
                size: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _initials(String name) {
  final parts = name
      .replaceAll(RegExp(r'^(Md\.|Mohammad|Mohammed)\s+'), '')
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '?';
  return parts.length == 1
      ? parts.first.substring(0, 1).toUpperCase()
      : '${parts.first[0]}${parts.last[0]}'.toUpperCase();
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AbgColors.inkSubtle),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: AbgText.small,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// The approval pipeline as a vertical stepper: who did what, and when.
class TourPipeline extends StatelessWidget {
  const TourPipeline({super.key, required this.stages});

  final List<TourStage> stages;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.tourPipeline, style: AbgText.h3),
          const SizedBox(height: 14),
          for (var i = 0; i < stages.length; i++)
            _StageRow(
              stage: stages[i],
              last: i == stages.length - 1,
              nextReached:
                  i < stages.length - 1 &&
                  !{'upcoming', 'skipped'}.contains(stages[i + 1].state),
            ),
        ],
      ),
    );
  }
}

class _StageRow extends StatelessWidget {
  const _StageRow({
    required this.stage,
    required this.last,
    required this.nextReached,
  });

  final TourStage stage;
  final bool last;
  final bool nextReached;

  String _caption(L l) {
    final s = stage;
    switch (s.state) {
      case 'done':
        return [
          s.by,
          if (s.at != null) dayAndTime(s.at!, l.localeName),
        ].whereType<String>().join(' · ');
      case 'current':
        if (s.waitingFor != null) {
          final who = switch (s.key) {
            'PENDING_VETTING' => l.tourAwaitingVETTING,
            'PENDING_SANCTION' => l.tourAwaitingSANCTION,
            _ => s.waitingFor!,
          };
          return l.tourWaitingFor(who);
        }
        return l.tourStageInProgress;
      case 'rejected':
        return l.tourStageRejectedBy(s.by ?? '—');
      case 'cancelled':
        return l.tourStageCancelled;
      case 'skipped':
        return l.tourStageSkipped;
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final s = stage;
    final (Color bg, Color fg, Color border) = switch (s.state) {
      'done' => (AbgColors.navy, Colors.white, AbgColors.navy),
      'current' => (
        AbgColors.pendingSoft,
        AbgColors.pending,
        AbgColors.pending,
      ),
      'rejected' => (AbgColors.danger, Colors.white, AbgColors.danger),
      'cancelled' => (AbgColors.neutral, Colors.white, AbgColors.neutral),
      _ => (AbgColors.white, AbgColors.inkSubtle, AbgColors.borderStrong),
    };
    final icon = switch (s.state) {
      'current' => Icons.hourglass_top_rounded,
      'rejected' => Icons.close_rounded,
      'cancelled' => Icons.block_rounded,
      'done' => Icons.check_rounded,
      _ => tourStageIcon(s.key),
    };
    final caption = _caption(l);
    final muted = s.state == 'upcoming' || s.state == 'skipped';
    return Semantics(
      label: '${tourStageLabel(l, s.key)}. $caption',
      child: ExcludeSemantics(
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 32,
                child: Column(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: bg,
                        shape: BoxShape.circle,
                        border: Border.all(color: border, width: 2),
                      ),
                      child: Icon(icon, size: 16, color: fg),
                    ),
                    if (!last)
                      Expanded(
                        child: Container(
                          width: 2,
                          margin: const EdgeInsets.symmetric(vertical: 2),
                          color: nextReached
                              ? AbgColors.navy
                              : AbgColors.softSilver,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: 4, bottom: last ? 0 : 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tourStageLabel(l, s.key),
                        style: AbgText.bodyStrong.copyWith(
                          fontSize: 14,
                          color: muted
                              ? AbgColors.inkSubtle
                              : s.state == 'rejected'
                              ? AbgColors.danger
                              : AbgColors.navy,
                        ),
                      ),
                      if (caption.isNotEmpty)
                        Text(
                          caption,
                          style: AbgText.caption.copyWith(
                            color: s.state == 'current'
                                ? AbgColors.pending
                                : AbgColors.inkSubtle,
                            fontWeight: s.state == 'current'
                                ? FontWeight.w700
                                : FontWeight.w500,
                          ),
                        ),
                      if (s.note != null && s.note!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          '“${s.note}”',
                          style: AbgText.small.copyWith(
                            fontStyle: FontStyle.italic,
                            color: AbgColors.inkMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
