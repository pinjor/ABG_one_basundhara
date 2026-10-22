import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'fleet_models.dart';

/// Asks for an optional odometer reading. Returns null when dismissed;
/// otherwise a record whose value may be null (no reading given).
Future<({int? value})?> askOdometer(
  BuildContext context, {
  required String title,
  required String confirm,
  String? hint,
}) async {
  final l = L.of(context);
  final controller = TextEditingController();
  final result = await showDialog<({int? value})>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AbgColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.xl),
      ),
      title: Text(title, style: AbgText.h2),
      content: TextField(
        controller: controller,
        autofocus: true,
        keyboardType: TextInputType.number,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        decoration: InputDecoration(
          labelText: l.pcOdometer,
          helperText: hint,
          prefixIcon: const Icon(Icons.speed_rounded),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(120, kMinTap)),
          onPressed: () =>
              Navigator.pop(ctx, (value: int.tryParse(controller.text.trim()))),
          child: Text(confirm),
        ),
      ],
    ),
  );
  controller.dispose();
  return result;
}

/// Asks for a note. Returns null when dismissed, otherwise the trimmed text (may be empty unless [required]).
Future<String?> askNote(
  BuildContext context, {
  required String title,
  required String body,
  required String label,
  required String confirm,
  bool required = false,
  bool destructive = false,
}) async {
  final l = L.of(context);
  final controller = TextEditingController();
  final result = await showDialog<String>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) {
        final ok = !required || controller.text.trim().length >= 3;
        return AlertDialog(
          backgroundColor: AbgColors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AbgRadii.xl),
          ),
          title: Text(title, style: AbgText.h2),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                body,
                style: AbgText.body.copyWith(color: AbgColors.inkMuted),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                autofocus: true,
                minLines: 2,
                maxLines: 4,
                maxLength: 1000,
                textCapitalization: TextCapitalization.sentences,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: label,
                  helperText: required && !ok ? l.pcReasonRequired : null,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(l.back),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                minimumSize: const Size(120, kMinTap),
                backgroundColor: destructive
                    ? AbgColors.danger
                    : AbgColors.navy,
              ),
              onPressed: ok
                  ? () => Navigator.pop(ctx, controller.text.trim())
                  : null,
              child: Text(confirm),
            ),
          ],
        );
      },
    ),
  );
  controller.dispose();
  return result;
}

/// The fleet manager's assign / reassign sheet: every vehicle and driver,
/// with whether they are free for this trip.
Future<CarRequisition?> showAssignSheet(
  BuildContext context,
  CarRequisition r,
) => showModalBottomSheet<CarRequisition>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: AbgColors.surface,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(AbgRadii.sheet)),
  ),
  builder: (_) => _AssignSheet(r: r),
);

class _AssignSheet extends StatefulWidget {
  const _AssignSheet({required this.r});
  final CarRequisition r;

  @override
  State<_AssignSheet> createState() => _AssignSheetState();
}

class _AssignSheetState extends State<_AssignSheet> {
  final _key = const Uuid().v4();
  List<CarVehicle>? _vehicles;
  List<CarDriver>? _drivers;
  String? _vehicleId;
  String? _driverId;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _vehicleId = widget.r.vehicle?.id;
    _driverId = widget.r.driver?.id;
    unawaited(_load());
  }

  Future<void> _load() async {
    final api = FleetApi(context.read<ApiClient>());
    try {
      final v = await api.vehiclesFor(widget.r.id);
      final d = await api.driversFor(widget.r.id);
      v.sort(
        (a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) != 0
            ? (b.available ? 1 : 0) - (a.available ? 1 : 0)
            : (b.matchesPreference ? 1 : 0) - (a.matchesPreference ? 1 : 0),
      );
      d.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));
      if (mounted) setState(() => (_vehicles = v, _drivers = d));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _submit() async {
    final l = L.of(context);
    setState(() => _busy = true);
    try {
      final next = await FleetApi(context.read<ApiClient>()).act(
        widget.r.id,
        'assign',
        {'vehicleId': _vehicleId, 'driverId': _driverId},
        _key,
      );
      if (!mounted) return;
      showSnack(context, l.pcAssigned);
      Navigator.pop(context, next);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showSnack(context, errorText(context, e), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final r = widget.r;
    final reassign = r.status == 'ASSIGNED';
    final unchanged =
        reassign && _vehicleId == r.vehicle?.id && _driverId == r.driver?.id;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      builder: (context, controller) => Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AbgColors.borderStrong,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    reassign ? l.pcReassign : l.pcAssign,
                    style: AbgText.h2,
                  ),
                ),
                Text(l.pcPeople(r.passengerCount), style: AbgText.small),
              ],
            ),
          ),
          Expanded(
            child: _error != null
                ? ErrorPanel(error: _error!, onRetry: _load)
                : _vehicles == null || _drivers == null
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    controller: controller,
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                    children: [
                      SectionTitle(l.pcChooseVehicle),
                      for (final v in _vehicles!)
                        _Option(
                          selected: _vehicleId == v.id,
                          enabled: v.available || v.id == r.vehicle?.id,
                          icon: Icons.directions_car_filled_outlined,
                          title: v.registrationNumber,
                          subtitle:
                              '${v.name} · ${l.pcSeats(v.seats)} · ${v.branchCode ?? ''}',
                          status: v.available
                              ? (v.matchesPreference
                                    ? '${l.pcFreeForTrip} · ${l.pcMatchesRequest}'
                                    : l.pcFreeForTrip)
                              : v.reason ?? '',
                          ok: v.available,
                          onTap: () => setState(() => _vehicleId = v.id),
                        ),
                      const SizedBox(height: 12),
                      SectionTitle(l.pcChooseDriver),
                      for (final d in _drivers!)
                        _Option(
                          selected: _driverId == d.id,
                          enabled: d.available || d.id == r.driver?.id,
                          icon: Icons.badge_outlined,
                          title: d.fullName,
                          subtitle: '${d.phone} · ${d.branchCode ?? ''}',
                          status: d.available
                              ? l.pcFreeForTrip
                              : d.reason ?? '',
                          ok: d.available,
                          onTap: () => setState(() => _driverId = d.id),
                        ),
                      if (reassign) ...[
                        const SizedBox(height: 8),
                        Text(l.pcReassignNote, style: AbgText.caption),
                      ],
                    ],
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: FilledButton.icon(
                onPressed:
                    _busy ||
                        _vehicleId == null ||
                        _driverId == null ||
                        unchanged
                    ? null
                    : _submit,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.key_rounded),
                label: Text(reassign ? l.pcReassign : l.pcAssign),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({
    required this.selected,
    required this.enabled,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.ok,
    required this.onTap,
  });

  final bool selected;
  final bool enabled;
  final IconData icon;
  final String title;
  final String subtitle;
  final String status;
  final bool ok;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Opacity(
        opacity: enabled ? 1 : 0.55,
        child: Semantics(
          selected: selected,
          button: true,
          enabled: enabled,
          child: Material(
            color: selected ? AbgColors.activeSoft : AbgColors.white,
            borderRadius: BorderRadius.circular(AbgRadii.md),
            child: InkWell(
              borderRadius: BorderRadius.circular(AbgRadii.md),
              onTap: enabled ? onTap : null,
              child: Container(
                constraints: const BoxConstraints(minHeight: kMinTap),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                  border: Border.all(
                    color: selected ? AbgColors.navy : AbgColors.border,
                    width: selected ? 1.6 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(icon, color: AbgColors.navy500),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: AbgText.bodyStrong.copyWith(fontSize: 14),
                          ),
                          Text(subtitle, style: AbgText.caption),
                          Text(
                            status,
                            style: AbgText.caption.copyWith(
                              fontWeight: FontWeight.w700,
                              color: ok ? AbgColors.success : AbgColors.danger,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      selected
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_off_rounded,
                      color: selected ? AbgColors.navy : AbgColors.inkSubtle,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
