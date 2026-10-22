import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../core/session.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'fleet_models.dart';
import 'fleet_widgets.dart';

class _PassengerFields {
  _PassengerFields(String name, String phone)
    : name = TextEditingController(text: name),
      phone = TextEditingController(text: phone);
  final TextEditingController name;
  final TextEditingController phone;

  void dispose() {
    name.dispose();
    phone.dispose();
  }
}

/// Ask for a pool car: where, when, who is travelling, and who approves.
class CarRequestFormScreen extends StatefulWidget {
  const CarRequestFormScreen({super.key});

  @override
  State<CarRequestFormScreen> createState() => _CarRequestFormScreenState();
}

class _CarRequestFormScreenState extends State<CarRequestFormScreen> {
  // One key per form: a retried submit can never book the car twice.
  final _idempotencyKey = const Uuid().v4();
  final _purpose = TextEditingController();
  final _pickupPlace = TextEditingController();
  final _dropPlace = TextEditingController();
  final _passengers = <_PassengerFields>[];
  String _tripType = 'ROUND_TRIP';
  String _preference = 'ANY';
  bool _urgent = false;
  int _count = 1;
  late DateTime _pickupAt;
  DateTime? _returnAt;
  CarApproverOption? _approver;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now().add(const Duration(hours: 1));
    _pickupAt = DateTime.fromMillisecondsSinceEpoch(
      (now.millisecondsSinceEpoch ~/ 900000 + 1) * 900000,
    );
    _returnAt = _pickupAt.add(const Duration(hours: 4));
    final profile = context.read<SessionController>().profile;
    final me = profile?.employee;
    _pickupPlace.text = me?.branch ?? '';
    _passengers.add(
      _PassengerFields(profile?.displayName ?? '', me?.phone ?? ''),
    );
    final m = profile?.manager;
    if (m != null) {
      _approver = CarApproverOption(
        employeeId: m.employeeId,
        name: m.fullName,
        designation: m.designation,
        detail: m.designation,
        hasAccount: m.hasAccount,
      );
    }
    for (final c in [_purpose, _pickupPlace, _dropPlace]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    _purpose.dispose();
    _pickupPlace.dispose();
    _dropPlace.dispose();
    for (final p in _passengers) {
      p.dispose();
    }
    super.dispose();
  }

  int get _named =>
      _passengers.where((p) => p.name.text.trim().isNotEmpty).length;

  String? _problem(L l) {
    if (_purpose.text.trim().length < 3) return l.pcPurposeRequired;
    if (_pickupPlace.text.trim().length < 2 ||
        _dropPlace.text.trim().length < 2) {
      return l.pcPlacesRequired;
    }
    if (_pickupAt.isBefore(
      DateTime.now().subtract(const Duration(minutes: 10)),
    )) {
      return l.pcPickupPast;
    }
    if (carTripNeedsReturn(_tripType) && _returnAt == null) {
      return l.pcReturnRequired;
    }
    if (_returnAt != null && !_returnAt!.isAfter(_pickupAt)) {
      return l.pcReturnBeforePickup;
    }
    if (_named > _count) return l.pcTooManyNamed;
    if (_approver == null) return l.pcApproverRequired;
    if (!_approver!.hasAccount) return l.pcApproverNoAccount(_approver!.name);
    return null;
  }

  /// Picks a wall-clock date and time in Asia/Dhaka, whatever the phone's own time zone.
  Future<DateTime?> _pick(DateTime initial) async {
    final d = toDhaka(initial);
    final today = toDhaka(DateTime.now());
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(d.year, d.month, d.day),
      firstDate: DateTime(today.year, today.month, today.day),
      lastDate: DateTime(
        today.year,
        today.month,
        today.day,
      ).add(const Duration(days: 120)),
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: d.hour, minute: d.minute),
    );
    if (time == null) return null;
    return DateTime.utc(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    ).subtract(const Duration(hours: 6)).toLocal();
  }

  void _chooseTrip(String t) {
    setState(() {
      _tripType = t;
      if (t == 'ONE_WAY') {
        _returnAt = null;
      } else {
        _returnAt ??= _pickupAt.add(Duration(hours: t == 'FULL_DAY' ? 9 : 4));
      }
    });
  }

  Future<void> _chooseApprover() async {
    final chosen = await showModalBottomSheet<CarApproverOption>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AbgColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AbgRadii.sheet),
        ),
      ),
      builder: (_) => const _ApproverSearch(),
    );
    if (chosen != null && mounted) setState(() => _approver = chosen);
  }

  Future<void> _submit() async {
    final l = L.of(context);
    final problem = _problem(l);
    if (problem != null) {
      showSnack(context, problem, error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      final r = await FleetApi(context.read<ApiClient>()).create({
        'tripType': _tripType,
        'purpose': _purpose.text.trim(),
        'pickupLocation': _pickupPlace.text.trim(),
        'dropLocation': _dropPlace.text.trim(),
        'pickupAt': _pickupAt.toUtc().toIso8601String(),
        if (_returnAt != null) 'returnAt': _returnAt!.toUtc().toIso8601String(),
        'passengers': [
          for (final p in _passengers)
            if (p.name.text.trim().isNotEmpty)
              {
                'name': p.name.text.trim(),
                if (p.phone.text.trim().isNotEmpty)
                  'phone': p.phone.text.trim(),
              },
        ],
        'passengerCount': _count,
        'urgent': _urgent,
        'vehiclePreference': _preference,
        'approverEmployeeId': _approver!.employeeId,
      }, _idempotencyKey);
      if (!mounted) return;
      showSnack(context, l.pcSent(r.referenceNumber));
      context.pushReplacement('/pool-car/${r.id}');
    } on ApiException catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final needsReturn = carTripNeedsReturn(_tripType);
    return Scaffold(
      appBar: AppBar(title: Text(l.pcFormTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AbgGradients.hero,
              borderRadius: BorderRadius.circular(AbgRadii.lg),
            ),
            child: Row(
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
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    l.pcFormIntro,
                    style: AbgText.small.copyWith(
                      color: AbgColors.platinumBright,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          SectionTitle(l.pcTripKind),
          Row(
            children: [
              for (var i = 0; i < carTripTypes.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: _TripTile(
                    type: carTripTypes[i],
                    selected: _tripType == carTripTypes[i],
                    onTap: () => _chooseTrip(carTripTypes[i]),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _purpose,
            maxLength: 200,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: '${l.pcPurpose} *',
              hintText: l.pcPurposeHint,
            ),
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _pickupPlace,
            maxLength: 200,
            decoration: InputDecoration(
              labelText: '${l.pcPickupFrom} *',
              prefixIcon: const Icon(Icons.trip_origin_rounded),
            ),
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _dropPlace,
            maxLength: 200,
            decoration: InputDecoration(
              labelText: '${l.pcGoingTo} *',
              prefixIcon: const Icon(Icons.place_outlined),
            ),
          ),
          const SizedBox(height: 8),
          _TimeField(
            label: l.pcPickupTime,
            value: _pickupAt,
            icon: Icons.schedule_rounded,
            onTap: () async {
              final t = await _pick(_pickupAt);
              if (t != null && mounted) {
                setState(() {
                  final length = _returnAt?.difference(_pickupAt);
                  _pickupAt = t;
                  if (_returnAt != null && length != null) {
                    _returnAt = t.add(length);
                  }
                });
              }
            },
          ),
          const SizedBox(height: 10),
          _TimeField(
            label: needsReturn ? l.pcReturnTime : l.pcReturnOptional,
            value: _returnAt,
            icon: Icons.keyboard_return_rounded,
            onTap: () async {
              final t = await _pick(
                _returnAt ?? _pickupAt.add(const Duration(hours: 4)),
              );
              if (t != null && mounted) setState(() => _returnAt = t);
            },
            onClear: !needsReturn && _returnAt != null
                ? () => setState(() => _returnAt = null)
                : null,
          ),
          const SizedBox(height: 22),
          SectionTitle(
            l.pcPassengers,
            trailing: TextButton.icon(
              onPressed: _passengers.length >= maxCarPassengers
                  ? null
                  : () => setState(() {
                      _passengers.add(_PassengerFields('', ''));
                      if (_count < _passengers.length) {
                        _count = _passengers.length;
                      }
                    }),
              icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
              label: Text(l.pcAddPassenger),
            ),
          ),
          for (var i = 0; i < _passengers.length; i++)
            Padding(
              key: ObjectKey(_passengers[i]),
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: _passengers[i].name,
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(labelText: l.pcPassengerName),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: _passengers[i].phone,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: l.pcPassengerPhone,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: l.pcRemovePassenger,
                    onPressed: () {
                      final removed = _passengers[i];
                      setState(() => _passengers.removeAt(i));
                      // Dispose once the row that used these controllers is gone.
                      WidgetsBinding.instance.addPostFrameCallback(
                        (_) => removed.dispose(),
                      );
                    },
                    icon: const Icon(Icons.remove_circle_outline_rounded),
                  ),
                ],
              ),
            ),
          SectionCard(
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
            child: Row(
              children: [
                const Icon(Icons.groups_2_outlined, color: AbgColors.navy500),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l.pcPeopleCount,
                        style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                      ),
                      Text(
                        l.pcPeopleCountHint(maxCarPassengers),
                        style: AbgText.caption,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: '−',
                  onPressed: _count > 1 && _count > _named
                      ? () => setState(() => _count--)
                      : null,
                  icon: const Icon(Icons.remove_rounded),
                ),
                SizedBox(
                  width: 28,
                  child: Text(
                    '$_count',
                    textAlign: TextAlign.center,
                    style: AbgText.h3,
                  ),
                ),
                IconButton(
                  tooltip: '+',
                  onPressed: _count < maxCarPassengers
                      ? () => setState(() => _count++)
                      : null,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _preference,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: l.pcVehiclePreference,
              prefixIcon: const Icon(Icons.airport_shuttle_outlined),
            ),
            items: [
              for (final v in carVehiclePreferences)
                DropdownMenuItem(
                  value: v,
                  child: Text(vehiclePreferenceLabel(l, v)),
                ),
            ],
            onChanged: (v) => setState(() => _preference = v ?? 'ANY'),
          ),
          const SizedBox(height: 16),
          SectionCard(
            color: _urgent ? AbgColors.dangerSoft : null,
            padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _urgent,
              onChanged: (v) => setState(() => _urgent = v),
              secondary: Icon(
                Icons.local_fire_department_rounded,
                color: _urgent ? AbgColors.danger : AbgColors.navy500,
              ),
              title: Text(
                l.pcUrgent,
                style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
              ),
              subtitle: Text(l.pcUrgentHint, style: AbgText.caption),
            ),
          ),
          const SizedBox(height: 22),
          SectionTitle(l.pcApprover),
          SectionCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _approver?.hasAccount == false
                        ? AbgColors.pendingSoft
                        : AbgColors.activeSoft,
                  ),
                  child: Icon(
                    Icons.how_to_reg_rounded,
                    color: _approver?.hasAccount == false
                        ? AbgColors.pending
                        : AbgColors.active,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _approver?.name ?? l.pcNoManager,
                        style: _approver == null
                            ? AbgText.small
                            : AbgText.bodyStrong.copyWith(fontSize: 14.5),
                      ),
                      if (_approver != null)
                        Text(
                          _approver!.hasAccount
                              ? (_approver!.detail ?? l.pcApproverHint)
                              : l.pcApproverNoAccount(_approver!.name),
                          style: AbgText.caption,
                        ),
                    ],
                  ),
                ),
                TextButton(onPressed: _chooseApprover, child: Text(l.pcChange)),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: AbgColors.white,
            border: Border(top: BorderSide(color: AbgColors.border)),
          ),
          child: FilledButton.icon(
            onPressed: _busy ? null : _submit,
            icon: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(l.pcSend),
          ),
        ),
      ),
    );
  }
}

class _TripTile extends StatelessWidget {
  const _TripTile({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final String type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Semantics(
      button: true,
      selected: selected,
      label: tripTypeLabel(l, type),
      child: ExcludeSemantics(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          height: 96,
          decoration: BoxDecoration(
            color: selected ? AbgColors.navy : AbgColors.white,
            borderRadius: BorderRadius.circular(AbgRadii.md),
            border: Border.all(
              color: selected ? AbgColors.navy : AbgColors.border,
            ),
            boxShadow: selected ? AbgShadows.card : null,
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(AbgRadii.md),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    tripTypeIcon(type),
                    size: 22,
                    color: selected
                        ? AbgColors.platinumBright
                        : AbgColors.navy500,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    tripTypeLabel(l, type),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AbgText.caption.copyWith(
                      color: selected ? Colors.white : AbgColors.ink,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                    ),
                  ),
                  Text(
                    tripTypeHint(l, type),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AbgText.caption.copyWith(
                      fontSize: 10,
                      color: selected
                          ? AbgColors.platinum
                          : AbgColors.inkSubtle,
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

class _TimeField extends StatelessWidget {
  const _TimeField({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    this.onClear,
  });

  final String label;
  final DateTime? value;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(AbgRadii.md),
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          suffixIcon: onClear != null
              ? IconButton(
                  tooltip: l.pcClearReturn,
                  onPressed: onClear,
                  icon: const Icon(Icons.close_rounded),
                )
              : const Icon(Icons.edit_calendar_outlined),
        ),
        child: Text(
          value == null ? l.pcChooseTime : fullStamp(value!, l.localeName),
          style: value == null
              ? AbgText.body.copyWith(color: AbgColors.inkSubtle)
              : AbgText.body,
        ),
      ),
    );
  }
}

class _ApproverSearch extends StatefulWidget {
  const _ApproverSearch();

  @override
  State<_ApproverSearch> createState() => _ApproverSearchState();
}

class _ApproverSearchState extends State<_ApproverSearch> {
  final _q = TextEditingController();
  Timer? _debounce;
  List<CarApproverOption> _results = [];
  bool _loading = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () async {
      if (text.trim().length < 2) {
        if (mounted) setState(() => _results = []);
        return;
      }
      setState(() => _loading = true);
      try {
        final found = await FleetApi(
          context.read<ApiClient>(),
        ).searchPeople(text.trim());
        if (mounted && _q.text == text) setState(() => _results = found);
      } catch (_) {
        // Keep the previous results; the field stays usable offline.
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
              child: TextField(
                controller: _q,
                autofocus: true,
                onChanged: _changed,
                decoration: InputDecoration(
                  labelText: l.pcSearchApprover,
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _loading
                      ? const Padding(
                          padding: EdgeInsets.all(14),
                          child: SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : null,
                ),
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
                itemCount: _results.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final p = _results[i];
                  return ListTile(
                    minTileHeight: kMinTap,
                    enabled: p.hasAccount,
                    leading: const Icon(Icons.person_outline_rounded),
                    title: Text(p.name),
                    subtitle: Text(
                      p.detail ?? '',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: p.hasAccount
                        ? null
                        : Text(l.pcNoAccount, style: AbgText.caption),
                    onTap: () => Navigator.pop(context, p),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
