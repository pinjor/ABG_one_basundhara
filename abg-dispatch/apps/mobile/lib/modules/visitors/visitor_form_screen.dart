import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/formatting.dart';
import '../../core/session.dart';
import '../../data/repository.dart';
import '../../l10n/app_localizations.dart';
import '../../models/models.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'visit_models.dart';
import 'visitor_widgets.dart';
import 'visitors_api.dart';

/// Invite a visitor (you are the host; they are texted their pass number), or
/// — for the gate — register a walk-in who is checked in at once.
class VisitorFormScreen extends StatefulWidget {
  const VisitorFormScreen({super.key, this.walkIn = false});

  final bool walkIn;

  @override
  State<VisitorFormScreen> createState() => _VisitorFormScreenState();
}

class _VisitorFormScreenState extends State<VisitorFormScreen> {
  // One key per form: a retried submit can never create two passes.
  final _idempotencyKey = const Uuid().v4();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _company = TextEditingController();
  final _detail = TextEditingController();
  final _vehicle = TextEditingController();
  final _carrying = TextEditingController();
  final _idLast4 = TextEditingController();
  final _notes = TextEditingController();
  final _badge = TextEditingController();
  final _hostName = TextEditingController();
  String? _purpose;
  int _party = 1;
  late DateTime _day; // Dhaka calendar day (y, m, d)
  late TimeOfDay _from;
  TimeOfDay? _until;
  String? _branchId;
  String? _locationId;
  List<Option> _branches = [];
  List<Option> _locations = [];
  DirectoryEmployee? _host;
  bool _hostNotListed = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final start = toDhaka(DateTime.now().add(const Duration(minutes: 30)));
    final rounded = start.add(Duration(minutes: (15 - start.minute % 15) % 15));
    _day = DateTime(rounded.year, rounded.month, rounded.day);
    _from = TimeOfDay(hour: rounded.hour, minute: rounded.minute);
    _branchId = context.read<SessionController>().profile?.employee?.branchId;
    unawaited(_loadPlaces());
  }

  @override
  void dispose() {
    for (final c in [
      _name,
      _phone,
      _company,
      _detail,
      _vehicle,
      _carrying,
      _idLast4,
      _notes,
      _badge,
      _hostName,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadPlaces() async {
    final repo = context.read<DispatchRepository>();
    try {
      final branches = widget.walkIn ? <Option>[] : await repo.branches();
      final locations = _branchId == null
          ? <Option>[]
          : await repo.locations(_branchId!);
      if (!mounted) return;
      setState(() {
        _branches = branches;
        _branchId ??= branches.isNotEmpty ? branches.first.id : null;
        _locations = locations;
      });
    } catch (_) {
      // The form still works without the lists; the office defaults to your own.
    }
  }

  Future<void> _changeBranch(String? id) async {
    setState(() {
      _branchId = id;
      _locationId = null;
      _locations = [];
    });
    if (id == null) return;
    final locations = await context.read<DispatchRepository>().locations(id);
    if (mounted && _branchId == id) setState(() => _locations = locations);
  }

  /// The UTC instant of a Dhaka wall-clock time on [_day].
  DateTime _at(TimeOfDay t) => DateTime.utc(
    _day.year,
    _day.month,
    _day.day,
    t.hour,
    t.minute,
  ).subtract(const Duration(hours: 6));

  DateTime _todayAt(TimeOfDay t) {
    final now = toDhaka(DateTime.now());
    return DateTime.utc(
      now.year,
      now.month,
      now.day,
      t.hour,
      t.minute,
    ).subtract(const Duration(hours: 6));
  }

  String? _problem(L l) {
    if (_name.text.trim().length < 2) return l.visNameRequired;
    if (!isBdMobile(_phone.text)) return l.visPhoneInvalid;
    if (_purpose == null) return l.visPurposeRequired;
    final id = _idLast4.text.trim();
    if (id.isNotEmpty && !isIdLast4(id)) return l.visIdLast4Invalid;
    if (widget.walkIn) {
      if (_host == null &&
          !(_hostNotListed && _hostName.text.trim().length >= 2)) {
        return l.visHostRequired;
      }
      if (_until != null && !_todayAt(_until!).isAfter(DateTime.now())) {
        return l.visUntilPassed;
      }
    } else {
      final start = _at(_from);
      if (start.isBefore(
        DateTime.now().subtract(const Duration(minutes: 15)),
      )) {
        return l.visTimePast;
      }
      if (_until != null && !_at(_until!).isAfter(start)) {
        return l.visUntilBeforeStart;
      }
    }
    return null;
  }

  Future<void> _submit() async {
    final l = L.of(context);
    final problem = _problem(l);
    if (problem != null) {
      showSnack(context, problem, error: true);
      return;
    }
    final api = VisitorsApi(context.read<ApiClient>());
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    final body = <String, dynamic>{
      'visitorName': _name.text.trim(),
      'visitorPhone': normalizeBdMobile(_phone.text),
      'company': ?text(_company),
      'purpose': _purpose,
      'purposeDetail': ?text(_detail),
      'partySize': _party,
      'vehicleNumber': ?text(_vehicle),
      'carrying': ?text(_carrying),
      'idLast4': ?text(_idLast4),
      'branchId': ?_branchId,
      'locationId': ?_locationId,
      'notes': ?text(_notes),
    };
    setState(() => _busy = true);
    try {
      if (widget.walkIn) {
        body.remove('branchId');
        final visit = await api.walkIn({
          ...body,
          'hostEmployeeId': ?_host?.id,
          if (_host == null) 'hostName': _hostName.text.trim(),
          'badgeNumber': ?text(_badge),
          if (_until != null)
            'expectedUntil': _todayAt(_until!).toIso8601String(),
        }, idempotencyKey: _idempotencyKey);
        if (!mounted) return;
        showSnack(
          context,
          l.visWalkInDone(visit.visitorName, visit.passNumber),
        );
        Navigator.of(context).pop();
      } else {
        final visit = await api.invite({
          ...body,
          'expectedAt': _at(_from).toIso8601String(),
          if (_until != null) 'expectedUntil': _at(_until!).toIso8601String(),
        }, idempotencyKey: _idempotencyKey);
        if (!mounted) return;
        showSnack(context, l.visPassCreated(visit.passNumber));
        context.pushReplacement('/visitors/${visit.id}');
      }
    } on ApiException catch (e) {
      if (mounted) {
        showSnack(
          context,
          e.isNetwork ? l.errorNetwork : e.message,
          error: true,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDay() async {
    final today = toDhaka(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: DateTime(today.year, today.month, today.day),
      lastDate: DateTime(
        today.year,
        today.month,
        today.day,
      ).add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _day = picked);
  }

  Future<void> _pickTime({required bool until}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: until
          ? (_until ?? _from.replacing(hour: (_from.hour + 1) % 24))
          : _from,
    );
    if (picked == null) return;
    setState(() => until ? _until = picked : _from = picked);
  }

  Future<void> _pickHost() async {
    final chosen = await showModalBottomSheet<DirectoryEmployee>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _HostSearchSheet(),
    );
    if (chosen != null) setState(() => _host = chosen);
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final walkIn = widget.walkIn;
    String fmt(TimeOfDay t) => timeOfDay(_at(t), l.localeName);
    return Scaffold(
      appBar: AppBar(title: Text(walkIn ? l.visWalkInTitle : l.visInvite)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          _Intro(
            icon: walkIn ? Icons.directions_walk_rounded : Icons.badge_outlined,
            text: walkIn ? l.visWalkInHint : l.visInviteHint,
          ),
          const SizedBox(height: 20),
          SectionTitle(l.visVisitorSection),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            maxLength: 120,
            decoration: InputDecoration(
              labelText: '${l.visNameLabel} *',
              prefixIcon: const Icon(Icons.person_outline_rounded),
            ),
          ),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[\d+\s-]')),
            ],
            decoration: InputDecoration(
              labelText: '${l.visPhoneLabel} *',
              hintText: '01711 223344',
              helperText: walkIn ? null : l.visPhoneHelper,
              prefixIcon: const Icon(Icons.phone_iphone_rounded),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _company,
            maxLength: 120,
            decoration: InputDecoration(
              labelText: l.visCompanyLabel,
              hintText: l.visCompanyHint,
              prefixIcon: const Icon(Icons.apartment_rounded),
            ),
          ),
          SectionTitle(l.visPurposeTitle),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in visitPurposes)
                ChoiceChip(
                  avatar: Icon(
                    visitPurposeIcon(p),
                    size: 18,
                    color: _purpose == p ? Colors.white : AbgColors.navy500,
                  ),
                  label: Text(visitPurposeLabel(l, p)),
                  selected: _purpose == p,
                  showCheckmark: false,
                  selectedColor: AbgColors.navy,
                  labelStyle: TextStyle(
                    color: _purpose == p ? Colors.white : AbgColors.ink,
                    fontWeight: FontWeight.w600,
                  ),
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                  onSelected: (_) => setState(() => _purpose = p),
                ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _detail,
            maxLength: 200,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.visDetailLabel,
              hintText: l.visDetailHint,
            ),
          ),
          if (walkIn) ...[
            SectionTitle(
              l.visHereToSee,
              action: _hostNotListed ? l.visSearchDirectory : l.visNotListed,
              onAction: () => setState(() {
                _hostNotListed = !_hostNotListed;
                _host = null;
              }),
            ),
            if (_hostNotListed)
              TextField(
                controller: _hostName,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: l.visHostNameLabel,
                  prefixIcon: const Icon(Icons.person_search_outlined),
                ),
              )
            else
              SectionCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                onTap: _pickHost,
                child: Row(
                  children: [
                    const Icon(
                      Icons.person_search_outlined,
                      color: AbgColors.navy500,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: _host == null
                            ? Text(
                                l.visChooseHost,
                                style: AbgText.body.copyWith(
                                  color: AbgColors.inkMuted,
                                ),
                              )
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_host!.name, style: AbgText.bodyStrong),
                                  Text(
                                    [
                                          _host!.code,
                                          _host!.designation,
                                          _host!.branch,
                                        ]
                                        .whereType<String>()
                                        .where((s) => s.isNotEmpty)
                                        .join(' · '),
                                    style: AbgText.caption,
                                  ),
                                  if (_host!.raw['hasAccount'] != true)
                                    Text(
                                      l.visHostNoAccount,
                                      style: AbgText.caption.copyWith(
                                        color: AbgColors.pending,
                                      ),
                                    ),
                                ],
                              ),
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: AbgColors.inkSubtle,
                    ),
                  ],
                ),
              ),
          ],
          SectionTitle(l.visWhenWhere),
          if (!walkIn) ...[
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: _PickerTile(
                    icon: Icons.calendar_today_outlined,
                    label: l.visDate,
                    value: fullStamp(
                      _at(_from),
                      l.localeName,
                    ).split(' · ').first,
                    onTap: _pickDay,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: _PickerTile(
                    icon: Icons.schedule_rounded,
                    label: l.visFrom,
                    value: fmt(_from),
                    onTap: () => _pickTime(until: false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          _PickerTile(
            icon: Icons.timelapse_rounded,
            label: walkIn ? l.visLeaveBy : l.visUntil,
            value: _until == null ? l.visOptional : fmt(_until!),
            onTap: () => _pickTime(until: true),
            onClear: _until == null
                ? null
                : () => setState(() => _until = null),
          ),
          const SizedBox(height: 14),
          if (!walkIn) ...[
            DropdownButtonFormField<String>(
              initialValue: _branches.any((b) => b.id == _branchId)
                  ? _branchId
                  : null,
              isExpanded: true,
              decoration: InputDecoration(
                labelText: l.visOffice,
                prefixIcon: const Icon(Icons.apartment_rounded),
              ),
              items: [
                for (final b in _branches)
                  DropdownMenuItem(
                    value: b.id,
                    child: Text(b.label, overflow: TextOverflow.ellipsis),
                  ),
              ],
              onChanged: _busy ? null : _changeBranch,
            ),
            const SizedBox(height: 14),
          ],
          DropdownButtonFormField<String?>(
            key: ValueKey('area-$_branchId-${_locations.length}'),
            initialValue: _locationId,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: l.visArea,
              prefixIcon: const Icon(Icons.place_outlined),
            ),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text(
                  l.visAreaAny,
                  style: const TextStyle(color: AbgColors.inkMuted),
                ),
              ),
              for (final loc in _locations)
                DropdownMenuItem<String?>(
                  value: loc.id,
                  child: Text(
                    loc.subtitle ?? loc.label,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: _busy ? null : (v) => setState(() => _locationId = v),
          ),
          const SizedBox(height: 14),
          SectionCard(
            padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
            child: Row(
              children: [
                const Icon(Icons.groups_outlined, color: AbgColors.navy500),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l.visPartyLabel,
                    style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                  ),
                ),
                IconButton(
                  tooltip: l.visPartyFewer,
                  onPressed: _party > 1 ? () => setState(() => _party--) : null,
                  icon: const Icon(Icons.remove_circle_outline_rounded),
                ),
                SizedBox(
                  width: 28,
                  child: Text(
                    '$_party',
                    textAlign: TextAlign.center,
                    style: AbgText.h3,
                  ),
                ),
                IconButton(
                  tooltip: l.visPartyMore,
                  onPressed: _party < maxPartySize
                      ? () => setState(() => _party++)
                      : null,
                  icon: const Icon(Icons.add_circle_outline_rounded),
                ),
              ],
            ),
          ),
          SectionTitle(l.visAtTheGate),
          if (walkIn) ...[
            TextField(
              controller: _badge,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9-]')),
                LengthLimitingTextInputFormatter(20),
              ],
              decoration: InputDecoration(
                labelText: l.visBadgeLabel,
                prefixIcon: const Icon(Icons.badge_outlined),
              ),
            ),
            const SizedBox(height: 14),
          ],
          TextField(
            controller: _vehicle,
            maxLength: 40,
            decoration: InputDecoration(
              labelText: l.visVehicle,
              hintText: 'Dhaka Metro-Ga 25-7781',
              prefixIcon: const Icon(Icons.directions_car_outlined),
            ),
          ),
          TextField(
            controller: _carrying,
            maxLength: 200,
            decoration: InputDecoration(
              labelText: l.visCarrying,
              hintText: l.visCarryingHint,
              prefixIcon: const Icon(Icons.backpack_outlined),
            ),
          ),
          TextField(
            controller: _idLast4,
            textCapitalization: TextCapitalization.characters,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
              LengthLimitingTextInputFormatter(4),
            ],
            decoration: InputDecoration(
              labelText: l.visIdLast4Label,
              helperText: l.visIdLast4Helper,
              prefixIcon: const Icon(Icons.credit_card_outlined),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _notes,
            maxLength: 500,
            minLines: 1,
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.visNotesLabel,
              prefixIcon: const Icon(Icons.sticky_note_2_outlined),
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
                : Icon(walkIn ? Icons.login_rounded : Icons.qr_code_2_rounded),
            label: Text(walkIn ? l.visSubmitWalkIn : l.visSubmitInvite),
          ),
        ),
      ),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
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
            child: Icon(icon, color: AbgColors.navy),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              text,
              style: AbgText.small.copyWith(
                color: AbgColors.platinumBright,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PickerTile extends StatelessWidget {
  const _PickerTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
    this.onClear,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, size: 20, color: AbgColors.navy500),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AbgText.caption),
                Text(
                  value,
                  style: AbgText.bodyStrong.copyWith(fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (onClear != null)
            IconButton(
              tooltip: L.of(context).visClear,
              onPressed: onClear,
              icon: const Icon(Icons.close_rounded, size: 20),
            )
          else
            const SizedBox(width: kMinTap - 8, height: kMinTap - 8),
        ],
      ),
    );
  }
}

/// Search the directory for the person being visited.
class _HostSearchSheet extends StatefulWidget {
  const _HostSearchSheet();

  @override
  State<_HostSearchSheet> createState() => _HostSearchSheetState();
}

class _HostSearchSheetState extends State<_HostSearchSheet> {
  final _q = TextEditingController();
  Timer? _debounce;
  List<DirectoryEmployee> _results = [];
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
      final q = text.trim();
      if (q.length < 2) {
        setState(() => _results = []);
        return;
      }
      setState(() => _loading = true);
      try {
        final found = await context.read<DispatchRepository>().employees(q);
        if (mounted && _q.text.trim() == q) setState(() => _results = found);
      } catch (_) {
        if (mounted) setState(() => _results = []);
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AbgSpace.gutter),
              child: TextField(
                controller: _q,
                autofocus: true,
                onChanged: _changed,
                decoration: InputDecoration(
                  hintText: l.visHostSearchHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Expanded(
              child: ListView.builder(
                itemCount: _results.length,
                itemBuilder: (_, i) {
                  final e = _results[i];
                  return ListTile(
                    minTileHeight: 56,
                    leading: CircleAvatar(
                      backgroundColor: AbgColors.platinumBright,
                      child: Text(
                        e.person.initials,
                        style: AbgText.caption.copyWith(
                          color: AbgColors.navy,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    title: Text(e.name),
                    subtitle: Text(
                      [e.code, e.designation, e.branch]
                          .whereType<String>()
                          .where((s) => s.isNotEmpty)
                          .join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => Navigator.of(context).pop(e),
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
