import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'fleet_models.dart';
import 'fleet_widgets.dart';
import 'trip_actions.dart';

/// Opened when security or the front desk scans a vehicle gate pass
/// (`…/g/c/<token>`): a big valid / not valid answer, the plate and driver to
/// check, and Exit / Return.
class VehiclePassScreen extends StatefulWidget {
  const VehiclePassScreen({super.key, required this.token});

  final String token;

  @override
  State<VehiclePassScreen> createState() => _VehiclePassScreenState();
}

class _VehiclePassScreenState extends State<VehiclePassScreen> {
  GatePassView? _pass;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final p = await FleetApi(context.read<ApiClient>()).pass(widget.token);
      if (mounted) setState(() => (_pass = p, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _scan(String direction) async {
    final l = L.of(context);
    final exit = direction == 'EXIT';
    final km = await askOdometer(
      context,
      title: exit ? l.pcRecordExit : l.pcRecordReturn,
      confirm: exit ? l.pcRecordExit : l.pcRecordReturn,
    );
    if (km == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final next = await FleetApi(
        context.read<ApiClient>(),
      ).scan(widget.token, direction, km.value, const Uuid().v4());
      if (!mounted) return;
      setState(() => _pass = next);
      showSnack(context, exit ? l.pcExitRecorded : l.pcReturnRecorded);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = _pass;
    final e = _error;
    final invalid = e is ApiException && e.status == 404;
    final forbidden = e is ApiException && e.status == 403;
    return Scaffold(
      appBar: AppBar(title: Text(l.pcPassTitle)),
      body: e != null && !invalid
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: forbidden
                  ? EmptyState(
                      icon: Icons.lock_outline_rounded,
                      title: l.pcPassTitle,
                      message: l.pcPassNotAllowed,
                    )
                  : ErrorPanel(error: e, onRetry: _load),
            )
          : p == null && !invalid
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
                  40,
                ),
                children: [
                  PassVerdict(pass: invalid ? null : p),
                  if (p != null) ...[
                    const SizedBox(height: 14),
                    if (p.allowed.isNotEmpty)
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton.icon(
                              style: FilledButton.styleFrom(
                                minimumSize: const Size(0, 56),
                              ),
                              onPressed: _busy || !p.allowed.contains('EXIT')
                                  ? null
                                  : () => _scan('EXIT'),
                              icon: const Icon(Icons.logout_rounded),
                              label: Text(l.pcRecordExit),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton.icon(
                              style: FilledButton.styleFrom(
                                minimumSize: const Size(0, 56),
                                backgroundColor: AbgColors.success,
                              ),
                              onPressed: _busy || !p.allowed.contains('RETURN')
                                  ? null
                                  : () => _scan('RETURN'),
                              icon: const Icon(Icons.login_rounded),
                              label: Text(l.pcRecordReturn),
                            ),
                          ),
                        ],
                      )
                    else if (p.scanNote != null)
                      SectionCard(
                        child: Row(
                          children: [
                            const Icon(
                              Icons.info_outline_rounded,
                              color: AbgColors.pending,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(p.scanNote!, style: AbgText.small),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 18),
                    SectionTitle(l.pcTrip),
                    SectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  p.referenceNumber,
                                  style: AbgText.mono.copyWith(fontSize: 13.5),
                                ),
                              ),
                              CarStatusChip(p.status, dense: true),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(p.purpose, style: AbgText.bodyStrong),
                          const SizedBox(height: 8),
                          InfoRow(
                            icon: Icons.trip_origin_rounded,
                            label: p.pickupAt != null
                                ? '${l.pcPickupFrom} · ${fullStamp(p.pickupAt!, l.localeName)}'
                                : l.pcPickupFrom,
                            value: p.pickupLocation,
                          ),
                          InfoRow(
                            icon: Icons.place_outlined,
                            label: p.returnAt != null
                                ? '${l.pcGoingTo} · ${l.pcReturnTime} ${fullStamp(p.returnAt!, l.localeName)}'
                                : '${l.pcGoingTo} · ${tripTypeLabel(l, p.tripType)}',
                            value: p.dropLocation,
                          ),
                          if (p.validFrom != null && p.validUntil != null)
                            InfoRow(
                              icon: Icons.verified_user_outlined,
                              label: l.pcValidity,
                              value:
                                  '${dayAndTime(p.validFrom!, l.localeName)} – ${dayAndTime(p.validUntil!, l.localeName)}',
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    SectionTitle(l.pcPassengers),
                    SectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          InfoRow(
                            icon: Icons.person_outline_rounded,
                            label:
                                '${l.pcRequester} · ${l.pcTravelling(p.passengerCount)}',
                            value: p.requesterName,
                            trailing: p.requesterPhone != null
                                ? IconButton(
                                    tooltip: l.call,
                                    onPressed: () =>
                                        callNumber(p.requesterPhone!),
                                    icon: const Icon(Icons.call_outlined),
                                  )
                                : null,
                          ),
                          for (final x in p.passengers)
                            Padding(
                              padding: const EdgeInsets.only(left: 46, top: 4),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(x.name, style: AbgText.body),
                                  ),
                                  if (x.phone != null)
                                    Text(
                                      x.phone!,
                                      style: AbgText.mono.copyWith(
                                        fontSize: 12,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (p.scans.isNotEmpty) ...[
                      const SizedBox(height: 18),
                      SectionTitle(l.pcGateRecord),
                      SectionCard(
                        child: Column(
                          children: [
                            for (final s in p.scans)
                              InfoRow(
                                icon: s.direction == 'RETURN'
                                    ? Icons.login_rounded
                                    : Icons.logout_rounded,
                                label:
                                    '${s.by} · ${fullStamp(s.at, l.localeName)}',
                                value: s.direction == 'RETURN'
                                    ? l.pcReturned
                                    : l.pcLeftGate,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
    );
  }
}

/// The answer security needs first: may this car go? Plate and driver to check against.
class PassVerdict extends StatelessWidget {
  const PassVerdict({super.key, required this.pass});

  /// Null when the code is not a pass ABG ONE issued (or it was replaced).
  final GatePassView? pass;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final p = pass;
    final state = p?.state ?? 'INVALID';
    final (Color bg, IconData icon, String title) = switch (state) {
      'VALID' => (
        AbgColors.success,
        Icons.verified_user_rounded,
        l.pcPassVALID,
      ),
      'OUT' => (
        AbgColors.active,
        Icons.directions_car_filled_rounded,
        l.pcPassOUT,
      ),
      'USED' => (AbgColors.neutral, Icons.task_alt_rounded, l.pcPassUSED),
      'NOT_YET_VALID' => (
        AbgColors.pending,
        Icons.schedule_rounded,
        l.pcPassNOT_YET_VALID,
      ),
      'EXPIRED' => (AbgColors.danger, Icons.gpp_bad_rounded, l.pcPassEXPIRED),
      'CANCELLED' => (
        AbgColors.danger,
        Icons.gpp_bad_rounded,
        l.pcPassCANCELLED,
      ),
      _ => (AbgColors.danger, Icons.gpp_bad_rounded, l.pcPassINVALID),
    };
    return Semantics(
      liveRegion: true,
      label: title,
      child: Container(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(AbgRadii.lg),
          boxShadow: AbgShadows.raised,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(icon, color: Colors.white, size: 34),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: AbgText.h2.copyWith(color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          p?.message ?? l.pcPassInvalidBody,
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
            if (p?.vehicle != null)
              Container(
                color: Colors.black.withValues(alpha: 0.14),
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p!.vehicle!.registrationNumber,
                            style: AbgText.mono.copyWith(
                              color: Colors.white,
                              fontSize: 19,
                            ),
                          ),
                          Text(
                            [p.vehicle!.name, ?p.vehicle!.colour].join(' · '),
                            style: AbgText.caption.copyWith(
                              color: Colors.white.withValues(alpha: 0.85),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (p.driver != null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            p.driver!.fullName,
                            style: AbgText.bodyStrong.copyWith(
                              color: Colors.white,
                              fontSize: 14,
                            ),
                          ),
                          InkWell(
                            onTap: () => callNumber(p.driver!.phone),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.call_rounded,
                                    size: 14,
                                    color: Colors.white,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    p.driver!.phone,
                                    style: AbgText.mono.copyWith(
                                      color: Colors.white,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (p.driver!.licenseNumber != null)
                            Text(
                              l.pcLicence(p.driver!.licenseNumber!),
                              style: AbgText.caption.copyWith(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
