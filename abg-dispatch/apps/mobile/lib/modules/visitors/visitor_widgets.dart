import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/brand.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'visit_models.dart';

// ── Vocabulary (mirrors VISIT_STATUS_LABEL / TONE and VISIT_PURPOSE_LABEL in shared) ──

String visitStatusLabel(L l, String s) => switch (s) {
  'EXPECTED' => l.visStatusEXPECTED,
  'CHECKED_IN' => l.visStatusCHECKED_IN,
  'CHECKED_OUT' => l.visStatusCHECKED_OUT,
  'CANCELLED' => l.visStatusCANCELLED,
  'EXPIRED' => l.visStatusEXPIRED,
  _ => s,
};

Tone visitStatusTone(String s) => switch (s) {
  'EXPECTED' => Tone.pending,
  'CHECKED_IN' => Tone.active,
  'CHECKED_OUT' => Tone.success,
  _ => Tone.neutral,
};

IconData visitStatusIcon(String s) => switch (s) {
  'EXPECTED' => Icons.event_available_outlined,
  'CHECKED_IN' => Icons.login_rounded,
  'CHECKED_OUT' => Icons.logout_rounded,
  'CANCELLED' => Icons.cancel_outlined,
  'EXPIRED' => Icons.timer_off_outlined,
  _ => Icons.circle_outlined,
};

String visitPurposeLabel(L l, String p) => switch (p) {
  'MEETING' => l.visPurposeMEETING,
  'INTERVIEW' => l.visPurposeINTERVIEW,
  'VENDOR_SUPPLIER' => l.visPurposeVENDOR_SUPPLIER,
  'CONTRACTOR' => l.visPurposeCONTRACTOR,
  'AUDIT_INSPECTION' => l.visPurposeAUDIT_INSPECTION,
  'GOVERNMENT_OFFICIAL' => l.visPurposeGOVERNMENT_OFFICIAL,
  'DELIVERY' => l.visPurposeDELIVERY,
  'PERSONAL' => l.visPurposePERSONAL,
  _ => l.visPurposeOTHER,
};

IconData visitPurposeIcon(String p) => switch (p) {
  'MEETING' => Icons.business_center_outlined,
  'INTERVIEW' => Icons.school_outlined,
  'VENDOR_SUPPLIER' => Icons.handshake_outlined,
  'CONTRACTOR' => Icons.engineering_outlined,
  'AUDIT_INSPECTION' => Icons.fact_check_outlined,
  'GOVERNMENT_OFFICIAL' => Icons.account_balance_outlined,
  'DELIVERY' => Icons.local_shipping_outlined,
  'PERSONAL' => Icons.person_outline_rounded,
  _ => Icons.help_outline_rounded,
};

bool isClosedVisit(String s) =>
    s == 'CHECKED_OUT' || s == 'CANCELLED' || s == 'EXPIRED';

bool isDhakaToday(DateTime t) {
  final a = toDhaka(t);
  final b = toDhaka(DateTime.now());
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

/// "2:30 PM – 4:30 PM", with the day in front when it is not today.
String visitWindow(DateTime from, DateTime? until, String locale) {
  final span = until == null
      ? timeOfDay(from, locale)
      : '${timeOfDay(from, locale)} – ${timeOfDay(until, locale)}';
  return isDhakaToday(from)
      ? span
      : '${dayAndTime(from, locale)}${until == null ? '' : ' – ${timeOfDay(until, locale)}'}';
}

class VisitStatusChip extends StatelessWidget {
  const VisitStatusChip(
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
    final label = visitStatusLabel(L.of(context), status);
    return Semantics(
      label: L.of(context).visStatusSemantics(label),
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: visitStatusTone(status),
          icon: visitStatusIcon(status),
          dense: dense,
          onDark: onDark,
        ),
      ),
    );
  }
}

class _PurposeTile extends StatelessWidget {
  const _PurposeTile({required this.purpose, required this.party});
  final String purpose;
  final int party;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 48,
      height: 48,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AbgColors.platinumBright,
              borderRadius: BorderRadius.circular(AbgRadii.md),
            ),
            child: Icon(visitPurposeIcon(purpose), color: AbgColors.navy500),
          ),
          if (party > 1)
            Positioned(
              right: -6,
              top: -6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: AbgColors.navy,
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: AbgColors.white, width: 2),
                ),
                child: Text(
                  '+${party - 1}',
                  style: AbgText.caption.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 10.5,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// One visitor on a list. With [onAction], a check-in / check-out button for the gate.
class VisitCard extends StatelessWidget {
  const VisitCard({
    super.key,
    required this.visit,
    required this.onTap,
    this.onAction,
    this.busy = false,
  });

  final VisitRow visit;
  final VoidCallback onTap;
  final void Function(String action)? onAction;
  final bool busy;

  String _when(L l) {
    final v = visit;
    return switch (v.status) {
      'CHECKED_IN' when v.checkedInAt != null =>
        '${l.visInSince(timeOfDay(v.checkedInAt!, l.localeName))} · ${duration(Duration(minutes: v.onSiteMinutes ?? 0))}',
      'CHECKED_OUT' when v.checkedOutAt != null => l.visLeftAt(
        timeOfDay(v.checkedOutAt!, l.localeName),
      ),
      'EXPECTED' => l.visExpectedAt(
        visitWindow(v.expectedAt, v.expectedUntil, l.localeName),
      ),
      _ => dayAndTime(v.expectedAt, l.localeName),
    };
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final v = visit;
    final action = onAction == null
        ? null
        : v.actions.contains('CHECK_IN')
        ? 'CHECK_IN'
        : v.actions.contains('CHECK_OUT')
        ? 'CHECK_OUT'
        : null;
    return SectionCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PurposeTile(purpose: v.purpose, party: v.partySize),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      v.visitorName,
                      style: AbgText.bodyStrong.copyWith(fontSize: 15),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      [
                        v.company,
                        visitPurposeLabel(l, v.purpose),
                      ].whereType<String>().join(' · '),
                      style: AbgText.small,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${v.passNumber} · ${l.visHostIs(v.hostName)}',
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    VisitStatusChip(v.status, dense: true),
                    if (v.walkIn)
                      ToneBadge(
                        label: l.visWalkIn,
                        tone: Tone.neutral,
                        icon: Icons.directions_walk_rounded,
                        dense: true,
                      ),
                    if (v.overstay)
                      ToneBadge(
                        label: l.visOverstay,
                        tone: Tone.pending,
                        icon: Icons.timer_off_outlined,
                        dense: true,
                      ),
                    Text(_when(l), style: AbgText.caption),
                  ],
                ),
              ),
              if (action != null) ...[
                const SizedBox(width: 8),
                SizedBox(
                  height: kMinTap,
                  child: action == 'CHECK_IN'
                      ? FilledButton.icon(
                          onPressed: busy ? null : () => onAction!(action),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, kMinTap),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                          ),
                          icon: busy
                              ? const _Spinner(color: Colors.white)
                              : const Icon(Icons.login_rounded, size: 18),
                          label: Text(l.visCheckIn),
                        )
                      : OutlinedButton.icon(
                          onPressed: busy ? null : () => onAction!(action),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, kMinTap),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                          ),
                          icon: busy
                              ? const _Spinner(color: AbgColors.navy)
                              : const Icon(Icons.logout_rounded, size: 18),
                          label: Text(l.visCheckOut),
                        ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _Spinner extends StatelessWidget {
  const _Spinner({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 18,
    height: 18,
    child: CircularProgressIndicator(strokeWidth: 2.2, color: color),
  );
}

class _PassField extends StatelessWidget {
  const _PassField(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: AbgText.overline.copyWith(fontSize: 10),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AbgText.bodyStrong.copyWith(
            fontSize: 13.5,
            color: AbgColors.navy,
            height: 1.3,
          ),
        ),
      ],
    );
  }
}

/// The digital gate pass: an opaque QR link the gate verifies in ABG ONE,
/// the pass number, and what the guard needs to recognise the visitor.
class GatePassCard extends StatelessWidget {
  const GatePassCard({super.key, required this.visit});

  final Visit visit;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final v = visit;
    final closed = isClosedVisit(v.status);
    return Container(
      decoration: BoxDecoration(
        color: AbgColors.white,
        borderRadius: BorderRadius.circular(AbgRadii.xl),
        border: Border.all(color: AbgColors.border),
        boxShadow: AbgShadows.raised,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          HeroBackground(
            showArcs: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              child: Row(
                children: [
                  const AbgLogo(width: 54, markOnly: true),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          l.visPassTitle.toUpperCase(),
                          style: AbgText.overline.copyWith(
                            color: AbgColors.platinum,
                            letterSpacing: 1.8,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          v.branchName,
                          style: AbgText.caption.copyWith(
                            color: AbgColors.platinumDeep,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
            child: Column(
              children: [
                if (v.passPayload != null)
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Semantics(
                        label: l.visQrSemantics(v.passNumber),
                        child: QrImageView(
                          data: v.passPayload!,
                          version: QrVersions.auto,
                          size: 220,
                          errorCorrectionLevel: QrErrorCorrectLevel.M,
                          eyeStyle: const QrEyeStyle(
                            eyeShape: QrEyeShape.square,
                            color: AbgColors.navy,
                          ),
                          dataModuleStyle: const QrDataModuleStyle(
                            dataModuleShape: QrDataModuleShape.square,
                            color: AbgColors.navy,
                          ),
                        ),
                      ),
                      if (closed)
                        Container(
                          width: 220,
                          height: 220,
                          color: Colors.white.withValues(alpha: 0.82),
                          alignment: Alignment.center,
                          child: Transform.rotate(
                            angle: -0.2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: AbgColors.neutral,
                                  width: 2,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                visitStatusLabel(l, v.status).toUpperCase(),
                                style: AbgText.h3.copyWith(
                                  color: AbgColors.neutral,
                                  letterSpacing: 2,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                const SizedBox(height: 14),
                Semantics(
                  button: true,
                  label: l.visCopyPassNumber,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: v.passNumber));
                      showSnack(
                        context,
                        l.visPassNumberCopied,
                        icon: Icons.copy_rounded,
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            v.passNumber,
                            style: AbgText.mono.copyWith(
                              fontSize: 18,
                              color: AbgColors.navy,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.copy_rounded,
                            size: 16,
                            color: AbgColors.inkSubtle,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Text(
                  isDhakaToday(v.expectedAt)
                      ? l.visValidToday
                      : l.visValidOn(dayAndTime(v.expectedAt, l.localeName)),
                  style: AbgText.caption,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Container(height: 2, color: AbgColors.navy),
                const SizedBox(height: 14),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(v.visitorName, style: AbgText.h2),
                      if (v.company != null)
                        Text(v.company!, style: AbgText.small),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _PassGrid(
                  children: [
                    _PassField(l.visHost, v.hostName),
                    _PassField(l.visPurpose, visitPurposeLabel(l, v.purpose)),
                    _PassField(l.visArea, v.locationName ?? v.branchName),
                    _PassField(
                      l.visTime,
                      visitWindow(v.expectedAt, v.expectedUntil, l.localeName),
                    ),
                    _PassField(l.visParty, l.visPartyCount(v.partySize)),
                    _PassField(l.visVehicle, v.vehicleNumber ?? l.visNone),
                  ],
                ),
                if (v.carrying != null) ...[
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _PassField(l.visCarrying, v.carrying!),
                  ),
                ],
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
            color: AbgColors.surface,
            child: Text(l.visPassFooter, style: AbgText.caption),
          ),
        ],
      ),
    );
  }
}

class _PassGrid extends StatelessWidget {
  const _PassGrid({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < children.length; i += 2) ...[
          if (i > 0) const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: children[i]),
              const SizedBox(width: 14),
              Expanded(
                child: i + 1 < children.length
                    ? children[i + 1]
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
