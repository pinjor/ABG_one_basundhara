import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'licence_models.dart';

// ── Vocabulary (mirrors packages/shared/src/licences.ts) ──

String licenceCountdownLabel(L l, int daysLeft) {
  if (daysLeft == 0) return l.licExpiresToday;
  if (daysLeft > 0) return l.licDaysLeft(daysLeft);
  return l.licExpiredAgo(-daysLeft);
}

String licenceStateLabel(L l, String state) => switch (state) {
  'VALID' => l.licStateVALID,
  'DUE_SOON' => l.licStateDUE_SOON,
  'EXPIRING' => l.licStateEXPIRING,
  'EXPIRED' => l.licStateEXPIRED,
  _ => state,
};

Tone licenceStateTone(String state) => switch (state) {
  'VALID' => Tone.success,
  'DUE_SOON' => Tone.pending,
  'EXPIRING' || 'EXPIRED' => Tone.danger,
  _ => Tone.neutral,
};

IconData licenceStateIcon(String state, int daysLeft) {
  if (state == 'EXPIRED') return Icons.event_busy_rounded;
  if (daysLeft == 0) return Icons.alarm_rounded;
  return switch (state) {
    'VALID' => Icons.event_available_rounded,
    'DUE_SOON' => Icons.event_note_rounded,
    'EXPIRING' => Icons.hourglass_bottom_rounded,
    _ => Icons.event_rounded,
  };
}

String renewalStageLabel(L l, String stage) => switch (stage) {
  'NOT_STARTED' => l.licStageNOT_STARTED,
  'DOCUMENTS_PREPARED' => l.licStageDOCUMENTS_PREPARED,
  'APPLICATION_SUBMITTED' => l.licStageAPPLICATION_SUBMITTED,
  'INSPECTION_SCHEDULED' => l.licStageINSPECTION_SCHEDULED,
  'FEE_PAID' => l.licStageFEE_PAID,
  'RENEWED' => l.licStageRENEWED,
  _ => stage,
};

String licenceCategoryLabel(L l, String category) => switch (category) {
  'TRADE' => l.licCatTRADE,
  'FACTORY' => l.licCatFACTORY,
  'ENVIRONMENT' => l.licCatENVIRONMENT,
  'FIRE_SAFETY' => l.licCatFIRE_SAFETY,
  'ENERGY_REGULATORY' => l.licCatENERGY_REGULATORY,
  'EXPLOSIVES' => l.licCatEXPLOSIVES,
  'BOILER' => l.licCatBOILER,
  'IMPORT_EXPORT' => l.licCatIMPORT_EXPORT,
  'STANDARDS' => l.licCatSTANDARDS,
  _ => l.licCatOTHER,
};

IconData licenceCategoryIcon(String category) => switch (category) {
  'TRADE' => Icons.storefront_outlined,
  'FACTORY' => Icons.factory_outlined,
  'ENVIRONMENT' => Icons.eco_outlined,
  'FIRE_SAFETY' => Icons.local_fire_department_outlined,
  'ENERGY_REGULATORY' => Icons.bolt_outlined,
  'EXPLOSIVES' => Icons.propane_tank_outlined,
  'BOILER' => Icons.thermostat_outlined,
  'IMPORT_EXPORT' => Icons.local_shipping_outlined,
  'STANDARDS' => Icons.verified_outlined,
  _ => Icons.description_outlined,
};

// ── Widgets ──

/// "12 days left", "Expires today", "Expired 5 days ago" — icon, words and colour together.
class LicenceCountdownBadge extends StatelessWidget {
  const LicenceCountdownBadge({
    super.key,
    required this.daysLeft,
    required this.state,
    this.active = true,
    this.dense = false,
  });

  final int daysLeft;
  final String state;
  final bool active;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final label = active ? licenceCountdownLabel(l, daysLeft) : l.licRetired;
    final tone = !active
        ? Tone.neutral
        : (daysLeft == 0 ? Tone.danger : licenceStateTone(state));
    return Semantics(
      label: active ? '$label, ${licenceStateLabel(l, state)}' : label,
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: tone,
          icon: active
              ? licenceStateIcon(state, daysLeft)
              : Icons.archive_outlined,
          dense: dense,
        ),
      ),
    );
  }
}

/// Five segments — documents, application, inspection, fee, renewed — filled up to the current stage.
class RenewalProgressBar extends StatelessWidget {
  const RenewalProgressBar({
    super.key,
    required this.stage,
    required this.progress,
    this.onDark = false,
  });

  final String stage;
  final int progress;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final reached = licenceRenewalStages.indexOf(stage);
    final label = renewalStageLabel(l, stage);
    final started = reached > 0;
    final labelColor = onDark
        ? AbgColors.platinumBright
        : (started ? AbgColors.active : AbgColors.inkMuted);
    return Semantics(
      label: '${l.licRenewal}: $label',
      value: '$progress%',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                if (started) ...[
                  Icon(Icons.autorenew_rounded, size: 14, color: labelColor),
                  const SizedBox(width: 4),
                ],
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AbgText.caption.copyWith(
                      color: labelColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text(
                  '$progress%',
                  style: AbgText.caption.copyWith(
                    color: onDark
                        ? AbgColors.platinumDeep
                        : AbgColors.inkSubtle,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                for (var i = 1; i < licenceRenewalStages.length; i++) ...[
                  if (i > 1) const SizedBox(width: 4),
                  Expanded(
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(99),
                        color: i <= reached
                            ? (onDark ? AbgColors.platinum : AbgColors.active)
                            : (onDark
                                  ? Colors.white.withValues(alpha: 0.15)
                                  : AbgColors.platinumBright),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// One licence in the register list.
class LicenceCard extends StatelessWidget {
  const LicenceCard({super.key, required this.item, required this.onTap});

  final LicenceRow item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AbgColors.platinumBright,
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                ),
                child: Icon(
                  licenceCategoryIcon(item.category),
                  color: AbgColors.navy500,
                  size: 21,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            item.name,
                            style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (item.hasDocument) ...[
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.description_outlined,
                            size: 15,
                            color: AbgColors.navy500,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.licenceNumber,
                      style: AbgText.mono.copyWith(
                        fontSize: 12,
                        color: AbgColors.inkMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '${item.branchName} · ${item.issuingAuthority}',
            style: AbgText.small,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              LicenceCountdownBadge(
                daysLeft: item.daysLeft,
                state: item.state,
                active: item.active,
                dense: true,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: RenewalProgressBar(
                  stage: item.renewalStage,
                  progress: item.renewalProgress,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
