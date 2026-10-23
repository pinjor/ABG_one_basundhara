import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/formatting.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import '../../widgets/vocab.dart';
import 'fleet_models.dart';

// ── Vocabulary (mirrors packages/shared/src/fleet.ts) ──

String carStatusLabel(L l, String s) => switch (s) {
  'PENDING_HOD' => l.pcStatusPENDING_HOD,
  'PENDING_FLEET' => l.pcStatusPENDING_FLEET,
  'ASSIGNED' => l.pcStatusASSIGNED,
  'IN_PROGRESS' => l.pcStatusIN_PROGRESS,
  'COMPLETED' => l.pcStatusCOMPLETED,
  'REJECTED' => l.pcStatusREJECTED,
  'CANCELLED' => l.pcStatusCANCELLED,
  _ => s,
};

Tone carStatusTone(String s) => switch (s) {
  'PENDING_HOD' || 'PENDING_FLEET' => Tone.pending,
  'ASSIGNED' || 'IN_PROGRESS' => Tone.active,
  'COMPLETED' => Tone.success,
  'REJECTED' => Tone.danger,
  _ => Tone.neutral,
};

IconData carStatusIcon(String s) => switch (s) {
  'PENDING_HOD' => Icons.how_to_reg_outlined,
  'PENDING_FLEET' => Icons.hourglass_top_rounded,
  'ASSIGNED' => Icons.key_rounded,
  'IN_PROGRESS' => Icons.navigation_rounded,
  'COMPLETED' => Icons.task_alt_rounded,
  'REJECTED' => Icons.cancel_outlined,
  'CANCELLED' => Icons.block_rounded,
  _ => Icons.circle_outlined,
};

String tripTypeLabel(L l, String t) => switch (t) {
  'ONE_WAY' => l.pcTripONE_WAY,
  'ROUND_TRIP' => l.pcTripROUND_TRIP,
  'FULL_DAY' => l.pcTripFULL_DAY,
  'AIRPORT' => l.pcTripAIRPORT,
  _ => t,
};

String tripTypeHint(L l, String t) => switch (t) {
  'ONE_WAY' => l.pcTripHintONE_WAY,
  'ROUND_TRIP' => l.pcTripHintROUND_TRIP,
  'FULL_DAY' => l.pcTripHintFULL_DAY,
  _ => l.pcTripHintAIRPORT,
};

IconData tripTypeIcon(String t) => switch (t) {
  'ONE_WAY' => Icons.trending_flat_rounded,
  'ROUND_TRIP' => Icons.sync_alt_rounded,
  'FULL_DAY' => Icons.wb_sunny_outlined,
  _ => Icons.flight_takeoff_rounded,
};

String vehiclePreferenceLabel(L l, String v) => switch (v) {
  'SEDAN' => l.pcVehSEDAN,
  'SUV' => l.pcVehSUV,
  'MICROBUS' => l.pcVehMICROBUS,
  'PICKUP' => l.pcVehPICKUP,
  'COASTER' => l.pcVehCOASTER,
  _ => l.pcVehANY,
};

/// Opens the phone dialler.
Future<void> callNumber(String phone) async {
  await launchUrl(Uri(scheme: 'tel', path: phone.replaceAll(' ', '')));
}

class CarStatusChip extends StatelessWidget {
  const CarStatusChip(this.status, {super.key, this.dense = false});

  final String status;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final label = carStatusLabel(L.of(context), status);
    return Semantics(
      label: 'Status: $label',
      child: ExcludeSemantics(
        child: ToneBadge(
          label: label,
          tone: carStatusTone(status),
          icon: carStatusIcon(status),
          dense: dense,
        ),
      ),
    );
  }
}

class UrgentBadge extends StatelessWidget {
  const UrgentBadge({super.key});

  @override
  Widget build(BuildContext context) => ToneBadge(
    label: L.of(context).pcUrgent,
    tone: Tone.danger,
    icon: Icons.local_fire_department_rounded,
    dense: true,
  );
}

/// Pending HOD → Pending fleet manager → Assigned → In progress → Completed.
class CarPipelineStepper extends StatelessWidget {
  const CarPipelineStepper({
    super.key,
    required this.steps,
    this.outcomeStatus,
  });

  final List<CarPipelineStep> steps;
  final String? outcomeStatus;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    String label(CarPipelineStep s) => s.state == 'HALTED'
        ? carStatusLabel(l, outcomeStatus ?? 'CANCELLED')
        : switch (s.status) {
            'PENDING_HOD' => l.pcStepHod,
            'PENDING_FLEET' => l.pcStepFleet,
            'ASSIGNED' => l.pcStepAssigned,
            'IN_PROGRESS' => l.pcStepOnTrip,
            _ => l.pcStepDone,
          };
    IconData icon(CarPipelineStep s) => s.state == 'HALTED'
        ? (outcomeStatus == 'REJECTED'
              ? Icons.close_rounded
              : Icons.block_rounded)
        : switch (s.status) {
            'PENDING_HOD' => Icons.how_to_reg_rounded,
            'PENDING_FLEET' => Icons.fact_check_outlined,
            'ASSIGNED' => Icons.key_rounded,
            'IN_PROGRESS' => Icons.directions_car_rounded,
            _ => Icons.flag_rounded,
          };
    bool reached(CarPipelineStep s) => s.state != 'UPCOMING';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          Expanded(
            child: Semantics(
              label: '${label(steps[i])}: ${steps[i].state.toLowerCase()}',
              child: ExcludeSemantics(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 2,
                            color: i == 0
                                ? Colors.transparent
                                : reached(steps[i])
                                ? AbgColors.navy
                                : AbgColors.softSilver,
                          ),
                        ),
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: switch (steps[i].state) {
                              'DONE' =>
                                steps[i].status == 'COMPLETED'
                                    ? AbgColors.success
                                    : AbgColors.navy,
                              'HALTED' => AbgColors.danger,
                              _ => AbgColors.white,
                            },
                            border: Border.all(
                              color: switch (steps[i].state) {
                                'CURRENT' => AbgColors.navy,
                                'UPCOMING' => AbgColors.borderStrong,
                                _ => Colors.transparent,
                              },
                              width: 2,
                            ),
                          ),
                          child: Icon(
                            icon(steps[i]),
                            size: 16,
                            color: switch (steps[i].state) {
                              'DONE' || 'HALTED' => Colors.white,
                              'CURRENT' => AbgColors.navy,
                              _ => AbgColors.inkSubtle,
                            },
                          ),
                        ),
                        Expanded(
                          child: Container(
                            height: 2,
                            color: i == steps.length - 1
                                ? Colors.transparent
                                : (i + 1 < steps.length &&
                                      reached(steps[i + 1]))
                                ? AbgColors.navy
                                : AbgColors.softSilver,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      label(steps[i]),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: AbgText.caption.copyWith(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: reached(steps[i])
                            ? AbgColors.navy
                            : AbgColors.inkSubtle,
                      ),
                    ),
                    if (steps[i].at != null && reached(steps[i]))
                      Text(
                        dayAndTime(steps[i].at!, l.localeName),
                        textAlign: TextAlign.center,
                        style: AbgText.caption.copyWith(fontSize: 10),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// A requisition in a list: purpose, reference, trip, status and the car once assigned.
class CarRequestCard extends StatelessWidget {
  const CarRequestCard({
    super.key,
    required this.row,
    required this.onTap,
    this.subtitle,
    this.trailing,
  });

  final CarRow row;
  final VoidCallback onTap;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
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
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: AbgColors.platinumBright,
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                ),
                child: Icon(
                  tripTypeIcon(row.tripType),
                  color: AbgColors.navy500,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.purpose,
                      style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${row.referenceNumber} · ${tripTypeLabel(l, row.tripType)}',
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${dayAndTime(row.pickupAt, l.localeName)} → ${row.dropLocation}',
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            Text(
              subtitle!,
              style: AbgText.small,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              CarStatusChip(row.status, dense: true),
              if (row.urgent) ...[
                const SizedBox(width: 6),
                const UrgentBadge(),
              ],
              const Spacer(),
              trailing ??
                  Text(l.pcPeople(row.passengerCount), style: AbgText.caption),
            ],
          ),
        ],
      ),
    );
  }
}

/// The car and the person driving it, with a one-tap call.
class DriverVehicleCard extends StatelessWidget {
  const DriverVehicleCard({
    super.key,
    required this.vehicle,
    required this.driver,
  });

  final CarVehicle vehicle;
  final CarDriver driver;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Container(
      decoration: BoxDecoration(
        gradient: AbgGradients.hero,
        borderRadius: BorderRadius.circular(AbgRadii.lg),
        boxShadow: AbgShadows.card,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  gradient: AbgGradients.platinum,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.directions_car_filled_rounded,
                  color: AbgColors.navy,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.registrationNumber,
                      style: AbgText.mono.copyWith(
                        color: Colors.white,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      [
                        vehicle.name,
                        vehiclePreferenceLabel(l, vehicle.type),
                        l.pcSeats(vehicle.seats),
                        ?vehicle.colour,
                      ].join(' · '),
                      style: AbgText.caption.copyWith(
                        color: AbgColors.platinum,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 26, color: Colors.white24),
          Row(
            children: [
              Avatar(
                initials: driver.fullName
                    .split(' ')
                    .where((p) => p.isNotEmpty)
                    .take(2)
                    .map((p) => p[0])
                    .join(),
                size: 42,
                dark: true,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.pcDriver,
                      style: AbgText.caption.copyWith(
                        color: AbgColors.platinumDeep,
                      ),
                    ),
                    Text(
                      driver.fullName,
                      style: AbgText.bodyStrong.copyWith(color: Colors.white),
                    ),
                    Text(
                      driver.phone,
                      style: AbgText.mono.copyWith(
                        color: AbgColors.platinum,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AbgColors.platinum,
                  foregroundColor: AbgColors.navy,
                  minimumSize: const Size(0, kMinTap),
                ),
                onPressed: () => callNumber(driver.phone),
                icon: const Icon(Icons.call_rounded, size: 18),
                label: Text(l.call),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
