import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'visit_models.dart';
import 'visitor_widgets.dart';
import 'visitors_api.dart';

/// One visit: the digital gate pass (QR), where the visit stands, and the
/// actions this person may take (cancel; check in / out for the gate).
class VisitDetailScreen extends StatefulWidget {
  const VisitDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<VisitDetailScreen> createState() => _VisitDetailScreenState();
}

class _VisitDetailScreenState extends State<VisitDetailScreen> {
  Visit? _visit;
  Object? _error;
  bool _busy = false;

  VisitorsApi get _api => VisitorsApi(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final v = await _api.get(widget.id);
      if (mounted) setState(() => (_visit = v, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _run(
    Future<Visit> Function() action,
    String Function(Visit) done,
  ) async {
    setState(() => _busy = true);
    try {
      final v = await action();
      if (!mounted) return;
      setState(() => _visit = v);
      showSnack(context, done(v));
    } on ApiException catch (e) {
      if (!mounted) return;
      showSnack(
        context,
        e.isNetwork ? L.of(context).errorNetwork : e.message,
        error: true,
      );
      unawaited(_load());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _ask({
    required String title,
    required String body,
    required String field,
    required String confirm,
    bool destructive = false,
    bool badge = false,
  }) async {
    final l = L.of(context);
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AbgColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AbgRadii.xl),
        ),
        title: Text(title, style: AbgText.h2),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(body, style: AbgText.body.copyWith(color: AbgColors.inkMuted)),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              autofocus: true,
              textCapitalization: badge
                  ? TextCapitalization.characters
                  : TextCapitalization.sentences,
              inputFormatters: badge
                  ? [
                      FilteringTextInputFormatter.allow(
                        RegExp(r'[A-Za-z0-9-]'),
                      ),
                      LengthLimitingTextInputFormatter(20),
                    ]
                  : [LengthLimitingTextInputFormatter(500)],
              decoration: InputDecoration(labelText: field),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size(120, 48),
              backgroundColor: destructive ? AbgColors.danger : AbgColors.navy,
            ),
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: Text(confirm),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<void> _checkIn(Visit v) async {
    final l = L.of(context);
    final badge = await _ask(
      title: l.visCheckInTitle(v.visitorName),
      body: v.idLast4 == null
          ? l.visCheckInBody
          : l.visCheckInBodyId(v.idLast4!),
      field: l.visBadgeLabel,
      confirm: l.visCheckIn,
      badge: true,
    );
    if (badge == null) return;
    await _run(
      () => _api.checkIn(v.id, badge: badge),
      (n) => l.visCheckedIn(n.visitorName),
    );
  }

  Future<void> _checkOut(Visit v) async {
    final l = L.of(context);
    final ok = await confirmDialog(
      context,
      title: l.visCheckOutTitle(v.visitorName),
      body: v.badgeNumber == null
          ? l.visCheckOutBody
          : l.visCheckOutBodyBadge(v.badgeNumber!),
      confirm: l.visCheckOut,
    );
    if (!ok) return;
    await _run(
      () => _api.checkOut(v.id),
      (n) => l.visCheckedOut(n.visitorName),
    );
  }

  Future<void> _cancel(Visit v) async {
    final l = L.of(context);
    final reason = await _ask(
      title: l.visCancelTitle,
      body: l.visCancelBody(v.visitorName),
      field: l.visCancelReason,
      confirm: l.visCancelPass,
      destructive: true,
    );
    if (reason == null) return;
    await _run(() => _api.cancel(v.id, reason: reason), (_) => l.visCancelled);
  }

  Future<void> _sendSms(Visit v) async {
    final l = L.of(context);
    final text = l.visSmsText(
      v.passNumber,
      v.branchName,
      visitWindow(v.expectedAt, v.expectedUntil, l.localeName),
      v.hostName,
    );
    final uri = Uri(
      scheme: 'sms',
      path: v.visitorPhone,
      query: 'body=${Uri.encodeComponent(text)}',
    );
    var opened = false;
    try {
      opened = await launchUrl(uri);
    } catch (_) {
      opened = false;
    }
    if (opened) return;
    // No SMS app (tablet, desktop): copy the text to paste anywhere instead.
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      showSnack(context, l.visDetailsCopied, icon: Icons.copy_rounded);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final v = _visit;
    return Scaffold(
      appBar: AppBar(title: Text(v?.passNumber ?? l.visTitle)),
      body: _error != null && v == null
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: ErrorPanel(error: _error!, onRetry: _load),
            )
          : v == null
          ? ListView(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              children: const [
                SkeletonCard(),
                SizedBox(height: 12),
                SkeletonCard(),
              ],
            )
          : RefreshIndicator(
              color: AbgColors.navy,
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  AbgSpace.gutter,
                  8,
                  AbgSpace.gutter,
                  32,
                ),
                children: [
                  Row(
                    children: [
                      VisitStatusChip(v.status),
                      if (v.walkIn) ...[
                        const SizedBox(width: 6),
                        ToneBadge(
                          label: l.visWalkIn,
                          tone: Tone.neutral,
                          icon: Icons.directions_walk_rounded,
                        ),
                      ],
                      if (v.overstay) ...[
                        const SizedBox(width: 6),
                        ToneBadge(
                          label: l.visOverstay,
                          tone: Tone.pending,
                          icon: Icons.timer_off_outlined,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (v.passPayload != null) ...[
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: GatePassCard(visit: v),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Clipboard.setData(
                                ClipboardData(text: v.passNumber),
                              );
                              showSnack(
                                context,
                                l.visPassNumberCopied,
                                icon: Icons.copy_rounded,
                              );
                            },
                            icon: const Icon(Icons.copy_rounded),
                            label: Text(l.visCopy),
                          ),
                        ),
                        if (v.visitorPhone != null &&
                            !v.visitorPhone!.contains('•')) ...[
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _sendSms(v),
                              icon: const Icon(Icons.sms_outlined),
                              label: Text(l.visSendSms),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ] else
                    SectionCard(
                      child: Row(
                        children: [
                          const Icon(
                            Icons.visibility_off_outlined,
                            color: AbgColors.neutral,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(l.visPassHidden, style: AbgText.small),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 20),
                  SectionTitle(l.visProgress),
                  _Progress(visit: v),
                  const SizedBox(height: 20),
                  SectionTitle(l.visDetails),
                  SectionCard(
                    child: Column(
                      children: [
                        InfoRow(
                          icon: Icons.person_outline_rounded,
                          label: l.visVisitor,
                          value: [
                            v.visitorName,
                            v.company,
                          ].whereType<String>().join(' · '),
                        ),
                        if (v.visitorPhone != null)
                          InfoRow(
                            icon: Icons.phone_iphone_rounded,
                            label: l.visPhoneLabel,
                            value: v.visitorPhone!,
                          ),
                        InfoRow(
                          icon: visitPurposeIcon(v.purpose),
                          label: l.visPurpose,
                          value: [
                            visitPurposeLabel(l, v.purpose),
                            v.purposeDetail,
                          ].whereType<String>().join(' — '),
                        ),
                        InfoRow(
                          icon: Icons.place_outlined,
                          label: l.visOffice,
                          value:
                              [
                                    v.branchName,
                                    v.locationPath
                                        ?.split(' › ')
                                        .skip(1)
                                        .join(' › '),
                                  ]
                                  .whereType<String>()
                                  .where((s) => s.isNotEmpty)
                                  .join(' · '),
                        ),
                        InfoRow(
                          icon: Icons.schedule_rounded,
                          label: l.visTime,
                          value: visitWindow(
                            v.expectedAt,
                            v.expectedUntil,
                            l.localeName,
                          ),
                        ),
                        InfoRow(
                          icon: Icons.badge_outlined,
                          label: l.visHost,
                          value:
                              [
                                v.hostName,
                                v.hostDesignation,
                              ].whereType<String>().join(' · ') +
                              (v.hostHasAccount
                                  ? ''
                                  : ' · ${l.visHostNoAccount}'),
                        ),
                        InfoRow(
                          icon: Icons.groups_outlined,
                          label: l.visParty,
                          value: l.visPartyCount(v.partySize),
                        ),
                        if (v.idLast4 != null)
                          InfoRow(
                            icon: Icons.credit_card_outlined,
                            label: l.visIdLast4Label,
                            value: '•••• ${v.idLast4}',
                          ),
                        if (v.vehicleNumber != null)
                          InfoRow(
                            icon: Icons.directions_car_outlined,
                            label: l.visVehicle,
                            value: v.vehicleNumber!,
                          ),
                        if (v.carrying != null)
                          InfoRow(
                            icon: Icons.backpack_outlined,
                            label: l.visCarrying,
                            value: v.carrying!,
                          ),
                        if (v.badgeNumber != null)
                          InfoRow(
                            icon: Icons.contact_mail_outlined,
                            label: l.visBadgeLabel,
                            value: v.badgeNumber!,
                          ),
                        if (v.notes != null)
                          InfoRow(
                            icon: Icons.sticky_note_2_outlined,
                            label: l.visNotesLabel,
                            value: v.notes!,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
      bottomNavigationBar: v == null || v.actions.isEmpty
          ? null
          : SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(
                  color: AbgColors.white,
                  border: Border(top: BorderSide(color: AbgColors.border)),
                ),
                child: Row(
                  children: [
                    if (v.actions.contains('CANCEL'))
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AbgColors.danger,
                            side: const BorderSide(color: AbgColors.danger),
                            minimumSize: const Size(0, 52),
                          ),
                          onPressed: _busy ? null : () => _cancel(v),
                          icon: const Icon(Icons.cancel_outlined),
                          label: Text(l.visCancelPass),
                        ),
                      ),
                    if (v.actions.contains('CANCEL') &&
                        (v.actions.contains('CHECK_IN') ||
                            v.actions.contains('CHECK_OUT')))
                      const SizedBox(width: 10),
                    if (v.actions.contains('CHECK_IN') ||
                        v.actions.contains('CHECK_OUT'))
                      Expanded(
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 52),
                          ),
                          onPressed: _busy
                              ? null
                              : () => v.actions.contains('CHECK_IN')
                                    ? _checkIn(v)
                                    : _checkOut(v),
                          icon: _busy
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.4,
                                    color: Colors.white,
                                  ),
                                )
                              : Icon(
                                  v.actions.contains('CHECK_IN')
                                      ? Icons.login_rounded
                                      : Icons.logout_rounded,
                                ),
                          label: Text(
                            v.actions.contains('CHECK_IN')
                                ? l.visCheckIn
                                : l.visCheckOut,
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

/// Expected → On site → Checked out, or where it stopped (cancelled, did not arrive).
class _Progress extends StatelessWidget {
  const _Progress({required this.visit});
  final Visit visit;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final v = visit;
    final loc = l.localeName;
    String at(DateTime? t) => t == null ? '' : dayAndTime(t, loc);
    final steps = <(String, String, String?, bool, IconData, Color)>[
      (
        v.walkIn ? l.visStepWalkIn : l.visStepExpected,
        at(v.expectedAt),
        v.walkIn
            ? (v.checkedInBy == null ? null : l.visBy(v.checkedInBy!))
            : null,
        true,
        Icons.event_available_outlined,
        AbgColors.navy,
      ),
      if (v.status == 'CANCELLED')
        (
          l.visStepCancelled,
          at(v.cancelledAt),
          [
            if (v.cancelledBy != null) l.visBy(v.cancelledBy!),
            v.cancelReason,
          ].whereType<String>().join(' — '),
          true,
          Icons.cancel_outlined,
          AbgColors.neutral,
        )
      else if (v.status == 'EXPIRED')
        (
          l.visStepExpired,
          at(v.expiredAt),
          l.visStepExpiredHint,
          true,
          Icons.timer_off_outlined,
          AbgColors.neutral,
        )
      else ...[
        (
          l.visStepOnSite,
          at(v.checkedInAt),
          v.checkedInAt == null
              ? null
              : [
                  v.checkInPoint?.split(' › ').last,
                  if (v.checkedInBy != null) l.visBy(v.checkedInBy!),
                ].whereType<String>().join(' · '),
          v.checkedInAt != null,
          Icons.login_rounded,
          AbgColors.active,
        ),
        (
          l.visStepOut,
          at(v.checkedOutAt),
          v.checkedOutAt == null
              ? null
              : l.visOnSiteFor(
                  duration(Duration(minutes: v.onSiteMinutes ?? 0)),
                ),
          v.checkedOutAt != null,
          Icons.logout_rounded,
          AbgColors.success,
        ),
      ],
    ];
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Column(
        children: [
          for (var i = 0; i < steps.length; i++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: steps[i].$4 ? steps[i].$6 : AbgColors.white,
                      border: Border.all(
                        color: steps[i].$4
                            ? Colors.transparent
                            : AbgColors.borderStrong,
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      steps[i].$5,
                      size: 17,
                      color: steps[i].$4 ? Colors.white : AbgColors.inkSubtle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                steps[i].$1,
                                style: AbgText.bodyStrong.copyWith(
                                  fontSize: 14,
                                  color: steps[i].$4
                                      ? AbgColors.ink
                                      : AbgColors.inkSubtle,
                                ),
                              ),
                            ),
                            Text(steps[i].$2, style: AbgText.caption),
                          ],
                        ),
                        if (steps[i].$3 != null && steps[i].$3!.isNotEmpty)
                          Text(steps[i].$3!, style: AbgText.caption),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
