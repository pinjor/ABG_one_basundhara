import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/api_client.dart';
import '../../core/session.dart';
import '../../data/repository.dart';
import '../../l10n/app_localizations.dart';
import '../../models/models.dart';
import '../../theme/theme.dart';
import '../../theme/tokens.dart';
import '../../widgets/common.dart';
import 'tour_api.dart';
import 'tour_models.dart';
import 'tour_widgets.dart';

class _Approver {
  const _Approver(this.employeeId, this.name, this.designation);
  final String employeeId;
  final String name;
  final String? designation;
}

/// Apply for an official tour: local or overseas, dates, budget, passport,
/// co-travellers, and who approves first.
class TourFormScreen extends StatefulWidget {
  const TourFormScreen({super.key});

  @override
  State<TourFormScreen> createState() => _TourFormScreenState();
}

class _TourFormScreenState extends State<TourFormScreen> {
  // One key per form: a retried submit can never file the request twice.
  final _idempotencyKey = const Uuid().v4();
  final _title = TextEditingController();
  final _destination = TextEditingController();
  final _country = TextEditingController();
  final _budget = TextEditingController();
  final _advance = TextEditingController();
  final _passport = TextEditingController();
  final _description = TextEditingController();
  final _coTraveller = TextEditingController();
  String _type = 'LOCAL';
  String _purpose = 'PLANT_VISIT';
  String _transport = 'AIR';
  DateTimeRange? _dates;
  DateTime? _passportExpiry;
  final _coTravellers = <String>[];
  _Approver? _approver;
  String? _managerProblem;
  bool _busy = false;

  bool get _foreign => _type == 'FOREIGN';

  @override
  void initState() {
    super.initState();
    final manager = context.read<SessionController>().profile?.manager;
    if (manager != null && manager.hasAccount) {
      _approver = _Approver(
        manager.employeeId,
        manager.fullName,
        manager.designation,
      );
    } else if (manager != null) {
      _managerProblem = manager.fullName;
    }
    for (final c in [
      _title,
      _destination,
      _country,
      _budget,
      _advance,
      _passport,
    ]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final c in [
      _title,
      _destination,
      _country,
      _budget,
      _advance,
      _passport,
      _description,
      _coTraveller,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  int? _taka(TextEditingController c) {
    final digits = c.text.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.isEmpty ? null : int.parse(digits);
  }

  String get _passportNumber =>
      _passport.text.replaceAll(RegExp(r'\s+'), '').toUpperCase();

  bool get _passportExpired =>
      _foreign &&
      _dates != null &&
      _passportExpiry != null &&
      !_passportExpiry!.isAfter(_dateOnly(_dates!.end));

  bool get _passportWarning =>
      _foreign &&
      _dates != null &&
      _passportExpiry != null &&
      !_passportExpired &&
      passportNeedsRenewal(_passportExpiry, _dateOnly(_dates!.end));

  DateTime _dateOnly(DateTime d) => DateTime.utc(d.year, d.month, d.day);

  /// The first thing stopping a submit, or null when the form is complete.
  String? _problem(L l) {
    if (_title.text.trim().length < TourLimits.titleMin) return l.tourErrTitle;
    if (_destination.text.trim().length < 2) return l.tourErrDestination;
    if (_foreign && _country.text.trim().length < 2) return l.tourErrCountry;
    if (_dates == null) return l.tourErrDates;
    final budget = _taka(_budget);
    if (budget == null) return l.tourErrBudget;
    if ((_taka(_advance) ?? 0) > budget) return l.tourErrAdvance;
    if (_foreign &&
        (!passportNumberPattern.hasMatch(_passportNumber) ||
            _passportExpiry == null)) {
      return l.tourErrPassport;
    }
    if (_passportExpired) return l.tourPassportExpired;
    if (_approver == null) return l.tourErrApprover;
    return null;
  }

  Future<void> _pickDates() async {
    final today = dhakaToday();
    final first = DateTime(today.year, today.month, today.day);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: first,
      lastDate: first.add(const Duration(days: TourLimits.maxLeadDays)),
      initialDateRange: _dates,
      helpText: L.of(context).tourPickDates,
    );
    if (picked != null && mounted) setState(() => _dates = picked);
  }

  Future<void> _pickExpiry() async {
    final today = dhakaToday();
    final first = DateTime(today.year, today.month, today.day);
    final picked = await showDatePicker(
      context: context,
      firstDate: first,
      lastDate: DateTime(today.year + 12),
      initialDate: _passportExpiry != null
          ? DateTime(
              _passportExpiry!.year,
              _passportExpiry!.month,
              _passportExpiry!.day,
            )
          : DateTime(today.year + 2, today.month, today.day),
      helpText: L.of(context).tourPassportExpiry,
    );
    if (picked != null && mounted) {
      setState(() => _passportExpiry = _dateOnly(picked));
    }
  }

  void _addCoTraveller() {
    final name = _coTraveller.text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (name.length >= 2 &&
        _coTravellers.length < TourLimits.maxCoTravellers &&
        !_coTravellers.any((c) => c.toLowerCase() == name.toLowerCase())) {
      setState(() => _coTravellers.add(name));
    }
    _coTraveller.clear();
  }

  Future<void> _chooseApprover() async {
    final picked = await showModalBottomSheet<_Approver>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AbgColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AbgRadii.sheet),
        ),
      ),
      builder: (_) => const _ApproverPicker(),
    );
    if (picked != null && mounted) setState(() => _approver = picked);
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
      final tour = await ToursApi(context.read<ApiClient>()).create({
        'type': _type,
        'purpose': _purpose,
        'title': _title.text.trim(),
        if (_description.text.trim().isNotEmpty)
          'description': _description.text.trim(),
        'destination': _destination.text.trim(),
        if (_foreign) 'country': _country.text.trim(),
        'startDate': isoDay(_dates!.start),
        'endDate': isoDay(_dates!.end),
        'transportMode': _transport,
        'coTravellers': _coTravellers,
        'estimatedBudget': _taka(_budget),
        'advanceRequested': _taka(_advance) ?? 0,
        if (_foreign) 'passportNumber': _passportNumber,
        if (_foreign) 'passportExpiry': isoDay(_passportExpiry!),
        'approverEmployeeId': _approver!.employeeId,
      }, _idempotencyKey);
      if (!mounted) return;
      showSnack(context, l.tourSubmitted(tour.referenceNumber));
      context.pushReplacement('/tours/${tour.id}');
    } on ApiException catch (e) {
      if (mounted) {
        showSnack(
          context,
          e.isNetwork ? l.tourOfflineNotice : e.message,
          error: true,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final locale = l.localeName;
    final budget = _taka(_budget);
    final advance = _taka(_advance);
    final transports = tourTransportModes
        .where((t) => !_foreign || t != 'POOL_CAR')
        .toList();
    return Scaffold(
      appBar: AppBar(title: Text(l.tourApply)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AbgSpace.gutter,
          8,
          AbgSpace.gutter,
          32,
        ),
        children: [
          _Intro(text: l.tourFormIntro),
          const SizedBox(height: 22),
          SectionTitle(l.tourWhere),
          _TypeChoice(
            selected: _type,
            onSelected: (t) => setState(() {
              _type = t;
              if (_foreign && _transport == 'POOL_CAR') _transport = 'AIR';
            }),
          ),
          const SizedBox(height: 22),
          SectionTitle(l.tourPurposeLabel),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in tourPurposes)
                ChoiceChip(
                  avatar: Icon(
                    tourPurposeIcon(p),
                    size: 18,
                    color: _purpose == p ? Colors.white : AbgColors.navy500,
                  ),
                  label: Text(tourPurposeLabel(l, p)),
                  selected: _purpose == p,
                  showCheckmark: false,
                  selectedColor: AbgColors.navy,
                  labelStyle: AbgText.small.copyWith(
                    color: _purpose == p ? Colors.white : AbgColors.ink,
                    fontWeight: FontWeight.w600,
                  ),
                  onSelected: (_) => setState(() => _purpose = p),
                ),
            ],
          ),
          const SizedBox(height: 22),
          TextField(
            controller: _title,
            maxLength: TourLimits.titleMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: '${l.tourTitleLabel} *',
              hintText: l.tourTitleHint,
            ),
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _destination,
            maxLength: TourLimits.destinationMax,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText:
                  '${_foreign ? l.tourCityLabel : l.tourDestinationLabel} *',
              hintText: _foreign ? null : l.tourDestinationHint,
              prefixIcon: const Icon(Icons.place_outlined),
            ),
          ),
          if (_foreign) ...[
            const SizedBox(height: 4),
            TextField(
              key: const ValueKey('tour-country'),
              controller: _country,
              maxLength: TourLimits.countryMax,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(
                labelText: '${l.tourCountryLabel} *',
                prefixIcon: const Icon(Icons.public_rounded),
              ),
            ),
          ],
          const SizedBox(height: 8),
          SectionTitle(l.tourDatesLabel),
          _PickerTile(
            icon: Icons.date_range_rounded,
            label: _dates == null
                ? l.tourPickDates
                : tourDateRange(
                    _dateOnly(_dates!.start),
                    _dateOnly(_dates!.end),
                    locale,
                  ),
            trailing: _dates == null
                ? null
                : l.tourDays(
                    tourDays(_dateOnly(_dates!.start), _dateOnly(_dates!.end)),
                  ),
            onTap: _busy ? null : _pickDates,
          ),
          const SizedBox(height: 22),
          SectionTitle(l.tourTransportLabel),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final t in transports)
                ChoiceChip(
                  avatar: Icon(
                    tourTransportIcon(t),
                    size: 18,
                    color: _transport == t ? Colors.white : AbgColors.navy500,
                  ),
                  label: Text(tourTransportLabel(l, t)),
                  selected: _transport == t,
                  showCheckmark: false,
                  selectedColor: AbgColors.navy,
                  labelStyle: AbgText.small.copyWith(
                    color: _transport == t ? Colors.white : AbgColors.ink,
                    fontWeight: FontWeight.w600,
                  ),
                  onSelected: (_) => setState(() => _transport = t),
                ),
            ],
          ),
          const SizedBox(height: 22),
          SectionTitle(l.tourCoTravellers),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _coTraveller,
                  maxLength: TourLimits.coTravellerNameMax,
                  textCapitalization: TextCapitalization.words,
                  onSubmitted: (_) => _addCoTraveller(),
                  decoration: InputDecoration(
                    hintText: l.tourCoTravellerHint,
                    counterText: '',
                    prefixIcon: const Icon(Icons.group_add_outlined),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                tooltip: l.tourCoTravellerAdd,
                constraints: const BoxConstraints(
                  minWidth: kMinTap,
                  minHeight: kMinTap,
                ),
                onPressed: _coTravellers.length >= TourLimits.maxCoTravellers
                    ? null
                    : _addCoTraveller,
                icon: const Icon(Icons.add_rounded),
              ),
            ],
          ),
          if (_coTravellers.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in _coTravellers)
                  InputChip(
                    label: Text(c),
                    deleteButtonTooltipMessage: l.tourRemove(c),
                    onDeleted: () => setState(() => _coTravellers.remove(c)),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 22),
          SectionTitle(l.tourBudgetSection),
          TextField(
            controller: _budget,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: '${l.tourEstimatedBudget} *',
              helperText: budget != null
                  ? formatTaka(budget, locale)
                  : l.tourBudgetHint,
              prefixIcon: const Icon(Icons.account_balance_wallet_outlined),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _advance,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: l.tourAdvance,
              helperText: advance != null ? formatTaka(advance, locale) : null,
              errorText: advance != null && budget != null && advance > budget
                  ? l.tourErrAdvance
                  : null,
              prefixIcon: const Icon(Icons.payments_outlined),
            ),
          ),
          if (_foreign) ...[
            const SizedBox(height: 22),
            SectionTitle(l.tourPassportSection),
            TextField(
              key: const ValueKey('tour-passport'),
              controller: _passport,
              textCapitalization: TextCapitalization.characters,
              maxLength: 20,
              decoration: InputDecoration(
                labelText: '${l.tourPassportNumber} *',
                hintText: 'A01234567',
                counterText: '',
                prefixIcon: const Icon(Icons.badge_outlined),
              ),
            ),
            const SizedBox(height: 12),
            _PickerTile(
              icon: Icons.event_available_outlined,
              label: _passportExpiry == null
                  ? l.tourPassportExpiry
                  : '${l.tourValidUntil}: ${tourDay(_passportExpiry!, locale)}',
              onTap: _busy ? null : _pickExpiry,
            ),
            if (_passportWarning || _passportExpired) ...[
              const SizedBox(height: 10),
              _Warning(
                text: _passportExpired
                    ? l.tourPassportExpired
                    : l.tourPassportWarning,
                severe: _passportExpired,
              ),
            ],
          ],
          const SizedBox(height: 22),
          SectionTitle(l.tourApprover),
          SectionCard(
            padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
            child: Row(
              children: [
                const Icon(Icons.how_to_reg_outlined, color: AbgColors.navy500),
                const SizedBox(width: 12),
                Expanded(
                  child: _approver != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _approver!.name,
                              style: AbgText.bodyStrong.copyWith(
                                fontSize: 14.5,
                              ),
                            ),
                            Text(
                              _approver!.designation ?? l.tourApproverHint,
                              style: AbgText.caption,
                            ),
                          ],
                        )
                      : Text(
                          _managerProblem != null
                              ? l.tourManagerNoAccount(_managerProblem!)
                              : l.tourNoManager,
                          style: AbgText.small,
                        ),
                ),
                TextButton(
                  onPressed: _busy ? null : _chooseApprover,
                  style: TextButton.styleFrom(
                    minimumSize: const Size(kMinTap, kMinTap),
                  ),
                  child: Text(
                    _approver != null ? l.tourChange : l.tourChooseApprover,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          TextField(
            controller: _description,
            minLines: 3,
            maxLines: 6,
            maxLength: TourLimits.descriptionMax,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l.tourDescriptionLabel,
              hintText: l.tourDescriptionHint,
              alignLabelWithHint: true,
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
            label: Text(l.tourSubmit),
          ),
        ),
      ),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.text});
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
            child: const Icon(
              Icons.flight_takeoff_rounded,
              color: AbgColors.navy,
            ),
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

/// Local / Foreign as two large segments.
class _TypeChoice extends StatelessWidget {
  const _TypeChoice({required this.selected, required this.onSelected});

  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    Widget option(String value, IconData icon, String title, String hint) {
      final on = selected == value;
      return Expanded(
        child: Semantics(
          button: true,
          selected: on,
          label: title,
          child: ExcludeSemantics(
            child: InkWell(
              borderRadius: BorderRadius.circular(AbgRadii.md),
              onTap: () => onSelected(value),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: on ? AbgGradients.hero : null,
                  color: on ? null : AbgColors.white,
                  borderRadius: BorderRadius.circular(AbgRadii.md),
                  border: Border.all(
                    color: on ? AbgColors.navy : AbgColors.border,
                  ),
                  boxShadow: on ? AbgShadows.card : null,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      icon,
                      color: on ? AbgColors.platinum : AbgColors.navy500,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      title,
                      style: AbgText.h3.copyWith(
                        color: on ? Colors.white : AbgColors.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hint,
                      style: AbgText.caption.copyWith(
                        color: on
                            ? AbgColors.platinumDeep
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

    return Row(
      children: [
        option('LOCAL', Icons.place_outlined, l.tourTypeLOCAL, l.tourLocalHint),
        const SizedBox(width: 10),
        option(
          'FOREIGN',
          Icons.public_rounded,
          l.tourTypeFOREIGN,
          l.tourForeignHint,
        ),
      ],
    );
  }
}

class _PickerTile extends StatelessWidget {
  const _PickerTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AbgColors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AbgRadii.md),
        side: const BorderSide(color: AbgColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AbgRadii.md),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Icon(icon, color: AbgColors.inkSubtle),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: AbgText.body.copyWith(fontSize: 14.5),
                  ),
                ),
                if (trailing != null)
                  Text(
                    trailing!,
                    style: AbgText.caption.copyWith(
                      color: AbgColors.navy500,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AbgColors.inkSubtle,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Warning extends StatelessWidget {
  const _Warning({required this.text, this.severe = false});
  final String text;
  final bool severe;

  @override
  Widget build(BuildContext context) {
    final fg = severe ? AbgColors.danger : AbgColors.pending;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: severe ? AbgColors.dangerSoft : AbgColors.pendingSoft,
        borderRadius: BorderRadius.circular(AbgRadii.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, size: 20, color: fg),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: AbgText.small.copyWith(color: fg)),
          ),
        ],
      ),
    );
  }
}

/// Directory search for a different approver; only people who can sign in.
class _ApproverPicker extends StatefulWidget {
  const _ApproverPicker();

  @override
  State<_ApproverPicker> createState() => _ApproverPickerState();
}

class _ApproverPickerState extends State<_ApproverPicker> {
  final _query = TextEditingController();
  Timer? _debounce;
  List<DirectoryEmployee> _results = [];
  bool _loading = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _changed(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 280), () => _search(q));
  }

  Future<void> _search(String q) async {
    if (q.trim().length < 2) {
      setState(() => _results = []);
      return;
    }
    setState(() => _loading = true);
    try {
      final rows = await context.read<DispatchRepository>().employees(q.trim());
      if (mounted) {
        setState(() => _results = rows.where((e) => !e.isMe).toList());
      }
    } catch (_) {
      if (mounted) setState(() => _results = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.tourChooseApprover, style: AbgText.h2),
                  const SizedBox(height: 4),
                  Text(l.tourApproverHint, style: AbgText.small),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _query,
                    autofocus: true,
                    onChanged: _changed,
                    decoration: InputDecoration(
                      hintText: l.tourSearchPeople,
                      prefixIcon: const Icon(Icons.search_rounded),
                    ),
                  ),
                ],
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 24),
                itemCount: _results.length,
                separatorBuilder: (_, _) => const SizedBox(height: 2),
                itemBuilder: (_, i) {
                  final e = _results[i];
                  final hasAccount = e.raw['hasAccount'] == true;
                  return ListTile(
                    enabled: hasAccount,
                    minTileHeight: kMinTap + 8,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AbgRadii.md),
                    ),
                    leading: Avatar(initials: e.person.initials, size: 38),
                    title: Text(
                      e.name,
                      style: AbgText.bodyStrong.copyWith(fontSize: 14.5),
                    ),
                    subtitle: Text(
                      [e.designation, e.department, e.branch]
                          .whereType<String>()
                          .where((s) => s.isNotEmpty)
                          .join(' · '),
                      style: AbgText.caption,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: hasAccount
                        ? null
                        : Text(l.tourNoAccount, style: AbgText.caption),
                    onTap: () => Navigator.pop(
                      context,
                      _Approver(e.id, e.name, e.designation),
                    ),
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
