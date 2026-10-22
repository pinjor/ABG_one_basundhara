import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'visit_models.dart';
import 'visitor_widgets.dart';
import 'visitors_api.dart';

/// Opened when the scanner reads a visitor's QR pass (`…/g/v/<token>`): a
/// big verdict, the details to compare with the person at the gate, and the
/// one action that fits.
class VisitorPassScreen extends StatefulWidget {
  const VisitorPassScreen({super.key, required this.token});

  final String token;

  @override
  State<VisitorPassScreen> createState() => _VisitorPassScreenState();
}

class _VisitorPassScreenState extends State<VisitorPassScreen> {
  GatePassView? _pass;
  Object? _error;
  bool _busy = false;
  final _badge = TextEditingController();

  VisitorsApi get _api => VisitorsApi(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    _badge.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final p = await _api.pass(widget.token);
      if (mounted) setState(() => (_pass = p, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _act(String action) async {
    final l = L.of(context);
    setState(() => _busy = true);
    try {
      final p = action == 'CHECK_IN'
          ? await _api.passCheckIn(widget.token, badge: _badge.text.trim())
          : await _api.passCheckOut(widget.token);
      if (!mounted) return;
      _badge.clear();
      setState(() => _pass = p);
      unawaited(HapticFeedback.mediumImpact());
      showSnack(
        context,
        action == 'CHECK_IN'
            ? l.visCheckedIn(p.visitorName)
            : l.visCheckedOut(p.visitorName),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      showSnack(context, e.isNetwork ? l.errorNetwork : e.message, error: true);
      unawaited(_load());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = _pass;
    final notFound =
        _error is ApiException && (_error as ApiException).status == 404;
    return Scaffold(
      appBar: AppBar(title: Text(l.visPassTitle)),
      body: p == null && _error == null
          ? ListView(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              children: const [
                SkeletonCard(),
                SizedBox(height: 12),
                SkeletonCard(),
              ],
            )
          : p == null
          ? ListView(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              children: [
                if (notFound)
                  _Verdict(
                    color: AbgColors.danger,
                    icon: Icons.gpp_bad_outlined,
                    title: l.visPassNotFound,
                    message:
                        '${(_error as ApiException).message} ${l.visPassNotFoundHint}',
                  )
                else
                  ErrorPanel(error: _error!, onRetry: _load),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () => context.pushReplacement('/scan'),
                  icon: const Icon(Icons.qr_code_scanner_rounded),
                  label: Text(l.visScanAnother),
                ),
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
                  _verdictFor(l, p),
                  for (final w in p.warnings.where((w) => !w.blocking)) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AbgColors.pendingSoft,
                        borderRadius: BorderRadius.circular(AbgRadii.md),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.warning_amber_rounded,
                            color: AbgColors.pending,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              w.message,
                              style: AbgText.small.copyWith(
                                color: AbgColors.pending,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AbgColors.platinumBright,
                                borderRadius: BorderRadius.circular(
                                  AbgRadii.md,
                                ),
                              ),
                              child: Icon(
                                visitPurposeIcon(p.purpose),
                                color: AbgColors.navy500,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.visitorName, style: AbgText.h2),
                                  Text(
                                    [
                                      p.company,
                                      visitPurposeLabel(l, p.purpose),
                                    ].whereType<String>().join(' · '),
                                    style: AbgText.small,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            VisitStatusChip(p.status, dense: true),
                            const SizedBox(width: 8),
                            Text(
                              p.passNumber,
                              style: AbgText.mono.copyWith(
                                color: AbgColors.inkMuted,
                              ),
                            ),
                          ],
                        ),
                        if (p.idLast4 != null) ...[
                          const SizedBox(height: 14),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AbgColors.surface,
                              borderRadius: BorderRadius.circular(AbgRadii.md),
                              border: Border.all(color: AbgColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l.visIdCompare, style: AbgText.caption),
                                Text(
                                  '•••• ${p.idLast4}',
                                  style: AbgText.mono.copyWith(
                                    fontSize: 22,
                                    color: AbgColors.navy,
                                    letterSpacing: 3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const Divider(height: 26),
                        InfoRow(
                          icon: Icons.badge_outlined,
                          label: l.visHost,
                          value: p.hostName,
                        ),
                        InfoRow(
                          icon: Icons.schedule_rounded,
                          label: l.visTime,
                          value: visitWindow(
                            p.expectedAt,
                            p.expectedUntil,
                            l.localeName,
                          ),
                        ),
                        InfoRow(
                          icon: Icons.place_outlined,
                          label: l.visOffice,
                          value: p.location ?? p.branchName,
                        ),
                        InfoRow(
                          icon: Icons.groups_outlined,
                          label: l.visParty,
                          value: l.visPartyCount(p.partySize),
                        ),
                        if (p.phone != null)
                          InfoRow(
                            icon: Icons.phone_iphone_rounded,
                            label: l.visPhoneLabel,
                            value: p.phone!,
                          ),
                        if (p.vehicleNumber != null)
                          InfoRow(
                            icon: Icons.directions_car_outlined,
                            label: l.visVehicle,
                            value: p.vehicleNumber!,
                          ),
                        if (p.carrying != null)
                          InfoRow(
                            icon: Icons.backpack_outlined,
                            label: l.visCarrying,
                            value: p.carrying!,
                          ),
                        if (p.checkedInAt != null)
                          InfoRow(
                            icon: Icons.login_rounded,
                            label: l.visStepOnSite,
                            value: [
                              dayAndTime(p.checkedInAt!, l.localeName),
                              if (p.badgeNumber != null) p.badgeNumber!,
                            ].join(' · '),
                          ),
                      ],
                    ),
                  ),
                  if (p.allowed.contains('CHECK_IN')) ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _badge,
                      textCapitalization: TextCapitalization.characters,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(r'[A-Za-z0-9-]'),
                        ),
                        LengthLimitingTextInputFormatter(20),
                      ],
                      decoration: InputDecoration(
                        labelText: l.visBadgeLabel,
                        hintText: '${p.branchCode}-V15',
                        prefixIcon: const Icon(Icons.badge_outlined),
                      ),
                    ),
                  ],
                  if (p.visitId != null) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: () => context.push('/visitors/${p.visitId}'),
                        icon: const Icon(Icons.open_in_new_rounded, size: 18),
                        label: Text(l.visOpenVisit),
                      ),
                    ),
                  ],
                ],
              ),
            ),
      bottomNavigationBar: p == null
          ? null
          : SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(
                  color: AbgColors.white,
                  border: Border(top: BorderSide(color: AbgColors.border)),
                ),
                child: p.allowed.isEmpty
                    ? OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(52),
                        ),
                        onPressed: () => context.pushReplacement('/scan'),
                        icon: const Icon(Icons.qr_code_scanner_rounded),
                        label: Text(l.visScanAnother),
                      )
                    : FilledButton.icon(
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(56),
                        ),
                        onPressed: _busy ? null : () => _act(p.allowed.first),
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
                                p.allowed.first == 'CHECK_IN'
                                    ? Icons.login_rounded
                                    : Icons.logout_rounded,
                              ),
                        label: Text(
                          p.allowed.first == 'CHECK_IN'
                              ? l.visCheckIn
                              : l.visCheckOut,
                        ),
                      ),
              ),
            ),
    );
  }

  Widget _verdictFor(L l, GatePassView p) {
    final block = p.blocking;
    if (block != null) {
      return _Verdict(
        color: AbgColors.danger,
        icon: Icons.gpp_bad_outlined,
        title: switch (block.code) {
          'WRONG_OFFICE' => l.visBlockWrongOffice,
          'WRONG_DAY' => l.visBlockWrongDay,
          'CANCELLED' => l.visBlockCancelled,
          'EXPIRED' => l.visBlockExpired,
          'ALREADY_OUT' => l.visBlockAlreadyOut,
          _ => l.visBlockGeneric,
        },
        message: block.message,
        footer: p.passNumber,
      );
    }
    if (p.allowed.contains('CHECK_IN')) {
      return _Verdict(
        color: AbgColors.success,
        icon: Icons.verified_user_outlined,
        title: l.visVerdictValid,
        message: l.visVerdictValidBody(
          visitWindow(p.expectedAt, p.expectedUntil, l.localeName),
          p.hostName,
        ),
        footer: p.passNumber,
      );
    }
    if (p.allowed.contains('CHECK_OUT')) {
      return _Verdict(
        color: AbgColors.active,
        icon: Icons.meeting_room_outlined,
        title: l.visVerdictOnSite,
        message: l.visVerdictOnSiteBody(
          p.checkedInAt == null ? '—' : timeOfDay(p.checkedInAt!, l.localeName),
        ),
        footer: p.passNumber,
      );
    }
    return _Verdict(
      color: AbgColors.navy,
      icon: Icons.verified_outlined,
      title: l.visVerdictGenuine,
      message: l.visVerdictGenuineBody,
      footer: p.passNumber,
    );
  }
}

class _Verdict extends StatelessWidget {
  const _Verdict({
    required this.color,
    required this.icon,
    required this.title,
    required this.message,
    this.footer,
  });

  final Color color;
  final IconData icon;
  final String title;
  final String message;
  final String? footer;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(AbgRadii.xl),
          boxShadow: AbgShadows.raised,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: Colors.white, size: 44),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: AbgText.h1.copyWith(color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          message,
                          style: AbgText.small.copyWith(
                            color: Colors.white.withValues(alpha: 0.92),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (footer != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                color: Colors.black.withValues(alpha: 0.12),
                child: Text(
                  footer!,
                  style: AbgText.mono.copyWith(
                    color: Colors.white,
                    letterSpacing: 1,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
