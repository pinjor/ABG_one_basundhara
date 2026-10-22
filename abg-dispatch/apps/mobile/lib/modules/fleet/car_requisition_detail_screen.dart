import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/brand.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'fleet_models.dart';
import 'fleet_widgets.dart';
import 'trip_actions.dart';

/// One requisition: where it stands, the car and driver with a call button,
/// the QR gate pass, and the actions this person may take now.
class CarRequisitionDetailScreen extends StatefulWidget {
  const CarRequisitionDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<CarRequisitionDetailScreen> createState() =>
      _CarRequisitionDetailScreenState();
}

class _CarRequisitionDetailScreenState
    extends State<CarRequisitionDetailScreen> {
  CarRequisition? _r;
  Object? _error;
  bool _busy = false;

  FleetApi get _api => FleetApi(context.read<ApiClient>());

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final r = await _api.get(widget.id);
      if (mounted) setState(() => (_r = r, _error = null));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _run(String path, Map<String, dynamic> body, String done) async {
    setState(() => _busy = true);
    try {
      final next = await _api.act(widget.id, path, body, const Uuid().v4());
      if (!mounted) return;
      setState(() => _r = next);
      showSnack(context, done);
    } on ApiException catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _action(String action) async {
    final l = L.of(context);
    final r = _r!;
    switch (action) {
      case 'APPROVE':
        final note = await askNote(
          context,
          title: l.pcApproveTitle,
          body: l.pcApproveBody,
          label: l.pcCancelReason,
          confirm: l.pcApprove,
        );
        if (note != null) {
          await _run('decision', {
            'decision': 'APPROVE',
            if (note.isNotEmpty) 'note': note,
          }, l.pcApproved);
        }
      case 'REJECT':
        final note = await askNote(
          context,
          title: l.pcRejectTitle,
          body: r.purpose,
          label: l.pcRejectReason,
          confirm: l.pcReject,
          required: true,
          destructive: true,
        );
        if (note != null) {
          await _run('decision', {
            'decision': 'REJECT',
            'note': note,
          }, l.pcRejected);
        }
      case 'CANCEL':
        final note = await askNote(
          context,
          title: l.pcCancelTitle,
          body: l.pcCancelBody,
          label: l.pcCancelReason,
          confirm: l.pcCancelRequest,
          destructive: true,
        );
        if (note != null) {
          await _run('cancel', {
            if (note.isNotEmpty) 'note': note,
          }, l.pcCancelled);
        }
      case 'START' || 'COMPLETE':
        final start = action == 'START';
        final km = await askOdometer(
          context,
          title: start ? l.pcStartTitle : l.pcCompleteTitle,
          confirm: start ? l.pcStart : l.pcComplete,
          hint: start
              ? (r.vehicleKm != null
                    ? l.pcLastOdometer('${r.vehicleKm}')
                    : null)
              : (r.startKm != null ? l.pcLastOdometer('${r.startKm}') : null),
        );
        if (km != null) {
          await _run(start ? 'start' : 'complete', {
            'odometerKm': ?km.value,
          }, start ? l.pcStarted : l.pcCompleted);
        }
      case 'ASSIGN' || 'REASSIGN':
        final next = await showAssignSheet(context, r);
        if (next != null && mounted) setState(() => _r = next);
    }
  }

  void _showPass() {
    final r = _r!;
    unawaited(
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => _FullScreenPass(r: r),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = _r;
    return Scaffold(
      appBar: AppBar(title: Text(r?.referenceNumber ?? l.pcTitle)),
      body: _error != null
          ? Padding(
              padding: const EdgeInsets.all(AbgSpace.gutter),
              child: ErrorPanel(error: _error!, onRetry: _load),
            )
          : r == null
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
                  _Header(r: r),
                  const SizedBox(height: 14),
                  SectionCard(
                    padding: const EdgeInsets.fromLTRB(8, 16, 8, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(left: 8, bottom: 12),
                          child: Text(l.pcProgress, style: AbgText.h3),
                        ),
                        CarPipelineStepper(
                          steps: r.pipeline,
                          outcomeStatus: r.outcomeStatus,
                        ),
                        if (r.status == 'PENDING_HOD' ||
                            r.status == 'PENDING_FLEET' ||
                            r.outcomeNote != null) ...[
                          const SizedBox(height: 12),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Text(
                              r.outcomeNote != null
                                  ? '“${r.outcomeNote}”'
                                  : r.status == 'PENDING_HOD'
                                  ? l.pcWaitingHod(r.approverName)
                                  : l.pcWaitingFleet,
                              style: AbgText.small,
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (r.actions.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _Actions(
                      actions: r.actions,
                      busy: _busy,
                      onAction: _action,
                    ),
                  ],
                  if (r.gatePassPayload != null) ...[
                    const SizedBox(height: 14),
                    _PassTeaser(r: r, onOpen: _showPass),
                  ],
                  const SizedBox(height: 22),
                  SectionTitle(l.pcCarDriver),
                  if (r.vehicle != null && r.driver != null) ...[
                    DriverVehicleCard(vehicle: r.vehicle!, driver: r.driver!),
                    if (r.startKm != null && r.endKm != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        l.pcOdometerRun(
                          '${r.startKm}',
                          '${r.endKm}',
                          '${r.distanceKm ?? 0}',
                        ),
                        style: AbgText.caption,
                      ),
                    ],
                  ] else
                    SectionCard(
                      child: Text(
                        r.status == 'REJECTED' || r.status == 'CANCELLED'
                            ? l.pcNoCar
                            : l.pcNotAssignedYet,
                        style: AbgText.small,
                      ),
                    ),
                  const SizedBox(height: 22),
                  SectionTitle(l.pcTrip),
                  _TripCard(r: r),
                  const SizedBox(height: 22),
                  SectionTitle(l.pcHistory),
                  _History(updates: r.updates),
                ],
              ),
            ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.r});
  final CarRequisition r;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AbgColors.platinumBright,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  tripTypeIcon(r.tripType),
                  color: AbgColors.navy500,
                  size: 21,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  tripTypeLabel(l, r.tripType),
                  style: AbgText.small.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              CarStatusChip(r.status),
            ],
          ),
          const SizedBox(height: 14),
          Text(r.purpose, style: AbgText.h2),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              if (r.urgent) const UrgentBadge(),
              ToneBadge(
                label: l.pcPeople(r.passengerCount),
                tone: Tone.neutral,
                icon: Icons.groups_2_outlined,
                dense: true,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Actions extends StatelessWidget {
  const _Actions({
    required this.actions,
    required this.busy,
    required this.onAction,
  });

  final Set<String> actions;
  final bool busy;
  final ValueChanged<String> onAction;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final primary = <(String, String, IconData)>[
      if (actions.contains('APPROVE'))
        ('APPROVE', l.pcApprove, Icons.check_circle_outline_rounded),
      if (actions.contains('ASSIGN')) ('ASSIGN', l.pcAssign, Icons.key_rounded),
      if (actions.contains('START'))
        ('START', l.pcStart, Icons.play_arrow_rounded),
      if (actions.contains('COMPLETE'))
        ('COMPLETE', l.pcComplete, Icons.flag_rounded),
    ];
    final secondary = <(String, String, IconData)>[
      if (actions.contains('REJECT'))
        ('REJECT', l.pcReject, Icons.cancel_outlined),
      if (actions.contains('REASSIGN'))
        ('REASSIGN', l.pcReassign, Icons.swap_horiz_rounded),
      if (actions.contains('CANCEL'))
        ('CANCEL', l.pcCancelRequest, Icons.block_rounded),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (key, label, icon) in primary) ...[
          FilledButton.icon(
            onPressed: busy ? null : () => onAction(key),
            icon: Icon(icon),
            label: Text(label),
          ),
          const SizedBox(height: 8),
        ],
        if (secondary.isNotEmpty)
          Row(
            children: [
              for (var i = 0; i < secondary.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, kMinTap),
                      foregroundColor: secondary[i].$1 == 'REASSIGN'
                          ? AbgColors.navy
                          : AbgColors.danger,
                    ),
                    onPressed: busy ? null : () => onAction(secondary[i].$1),
                    icon: Icon(secondary[i].$3, size: 18),
                    label: Text(
                      secondary[i].$2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ],
          ),
      ],
    );
  }
}

class _PassTeaser extends StatelessWidget {
  const _PassTeaser({required this.r, required this.onOpen});
  final CarRequisition r;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return SectionCard(
      onTap: onOpen,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AbgColors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AbgColors.border),
            ),
            child: QrImageView(
              data: r.gatePassPayload!,
              size: 72,
              padding: EdgeInsets.zero,
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
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.pcGatePass, style: AbgText.h3),
                const SizedBox(height: 2),
                Text(l.pcPassHint, style: AbgText.caption),
                const SizedBox(height: 6),
                Text(
                  l.pcShowPass,
                  style: AbgText.small.copyWith(
                    color: AbgColors.active,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.fullscreen_rounded, color: AbgColors.navy500),
        ],
      ),
    );
  }
}

/// The pass as security sees it: big QR, plate number, driver. Shown at full brightness-friendly contrast.
class _FullScreenPass extends StatelessWidget {
  const _FullScreenPass({required this.r});
  final CarRequisition r;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Scaffold(
      backgroundColor: AbgColors.midnight,
      appBar: AppBar(
        backgroundColor: AbgColors.midnight,
        foregroundColor: Colors.white,
        title: Text(l.pcGatePass),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AbgSpace.gutter),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Container(
              decoration: BoxDecoration(
                color: AbgColors.white,
                borderRadius: BorderRadius.circular(AbgRadii.xl),
                boxShadow: AbgShadows.raised,
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  HeroBackground(
                    showArcs: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          const AbgLogo(width: 58, markOnly: true),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              l.pcPassTitle.toUpperCase(),
                              style: AbgText.overline.copyWith(
                                color: AbgColors.platinum,
                              ),
                            ),
                          ),
                          Text(
                            r.referenceNumber,
                            style: AbgText.mono.copyWith(
                              color: AbgColors.platinum,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Semantics(
                          label: '${l.pcGatePass} ${r.referenceNumber}',
                          child: QrImageView(
                            data: r.gatePassPayload!,
                            size: 260,
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
                        const SizedBox(height: 14),
                        Text(
                          r.vehicle?.registrationNumber ?? '',
                          style: AbgText.mono.copyWith(fontSize: 20),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          '${r.vehicle?.name ?? ''} · ${r.driver?.fullName ?? ''}',
                          style: AbgText.small,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          fullStamp(r.pickupAt, l.localeName),
                          style: AbgText.caption,
                        ),
                        if (r.passValidFrom != null &&
                            r.passValidUntil != null) ...[
                          const SizedBox(height: 10),
                          ToneBadge(
                            label: l.pcPassValid(
                              dayAndTime(r.passValidFrom!, l.localeName),
                              dayAndTime(r.passValidUntil!, l.localeName),
                            ),
                            tone: Tone.success,
                            icon: Icons.verified_user_outlined,
                            dense: true,
                          ),
                        ],
                        const SizedBox(height: 12),
                        Text(
                          l.pcPassHint,
                          style: AbgText.caption,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.r});
  final CarRequisition r;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoRow(
            icon: Icons.trip_origin_rounded,
            label: '${l.pcPickupFrom} · ${fullStamp(r.pickupAt, l.localeName)}',
            value: r.pickupLocation,
          ),
          InfoRow(
            icon: Icons.place_outlined,
            label: r.returnAt != null
                ? '${l.pcGoingTo} · ${l.pcReturnTime} ${fullStamp(r.returnAt!, l.localeName)}'
                : l.pcGoingTo,
            value: r.dropLocation,
          ),
          InfoRow(
            icon: Icons.airport_shuttle_outlined,
            label: l.pcVehicleWanted,
            value: vehiclePreferenceLabel(l, r.vehiclePreference),
          ),
          InfoRow(
            icon: Icons.person_outline_rounded,
            label: l.pcRequestedBy,
            value: [r.requesterName, ?r.requesterDepartment].join(' · '),
            trailing: !r.isRequester && r.requesterPhone != null
                ? IconButton(
                    tooltip: l.call,
                    onPressed: () => callNumber(r.requesterPhone!),
                    icon: const Icon(Icons.call_outlined),
                  )
                : null,
          ),
          InfoRow(
            icon: Icons.how_to_reg_outlined,
            label: l.pcHod,
            value: r.approverName,
          ),
          if (r.passengers.isNotEmpty) ...[
            const Divider(height: 22),
            Text(l.pcPassengers, style: AbgText.caption),
            const SizedBox(height: 6),
            for (final p in r.passengers)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    const Icon(
                      Icons.person_rounded,
                      size: 16,
                      color: AbgColors.navy500,
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(p.name, style: AbgText.body)),
                    if (p.phone != null)
                      Text(
                        p.phone!,
                        style: AbgText.mono.copyWith(fontSize: 12),
                      ),
                  ],
                ),
              ),
          ],
          if (r.statusNote != null && r.outcomeNote == null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AbgColors.activeSoft,
                borderRadius: BorderRadius.circular(AbgRadii.md),
              ),
              child: Text(
                '“${r.statusNote}”',
                style: AbgText.small.copyWith(color: AbgColors.navy),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _History extends StatelessWidget {
  const _History({required this.updates});
  final List<CarUpdate> updates;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final items = updates.reversed.toList();
    return SectionCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Column(
        children: [
          for (var k = 0; k < items.length; k++) ...[
            if (k > 0) const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    carHistoryIcon(items[k]),
                    size: 20,
                    color: AbgColors.navy500,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          carHistoryLabel(l, items[k]),
                          style: AbgText.bodyStrong.copyWith(fontSize: 14),
                        ),
                        Text(
                          '${items[k].actor} · ${dayAndTime(items[k].at, l.localeName)}',
                          style: AbgText.caption,
                        ),
                        if (items[k].vehicle != null &&
                            (items[k].type == 'ASSIGNED' ||
                                items[k].type == 'REASSIGNED'))
                          Text(
                            '${items[k].vehicle} · ${items[k].driver ?? ''}',
                            style: AbgText.caption,
                          ),
                        if (items[k].note != null &&
                            items[k].note!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            items[k].note!,
                            style: AbgText.small.copyWith(color: AbgColors.ink),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

String carHistoryLabel(L l, CarUpdate u) => switch (u.type) {
  'SUBMITTED' => l.pcEvSubmitted,
  'ASSIGNED' => l.pcEvAssigned,
  'REASSIGNED' => l.pcEvReassigned,
  'GATE_SCANNED' => u.direction == 'RETURN' ? l.pcEvReturn : l.pcEvExit,
  _ => switch (u.toStatus) {
    'PENDING_FLEET' => l.pcEvApproved,
    'REJECTED' => l.pcEvRejected,
    'CANCELLED' => l.pcEvCancelled,
    'IN_PROGRESS' => l.pcEvStarted,
    'COMPLETED' => l.pcEvCompleted,
    _ => carStatusLabel(l, u.toStatus ?? ''),
  },
};

IconData carHistoryIcon(CarUpdate u) => switch (u.type) {
  'SUBMITTED' => Icons.send_rounded,
  'ASSIGNED' => Icons.key_rounded,
  'REASSIGNED' => Icons.swap_horiz_rounded,
  'GATE_SCANNED' =>
    u.direction == 'RETURN' ? Icons.login_rounded : Icons.logout_rounded,
  _ => carStatusIcon(u.toStatus ?? ''),
};
