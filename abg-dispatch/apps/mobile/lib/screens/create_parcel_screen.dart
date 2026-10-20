import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../core/formatting.dart';
import '../core/session.dart';
import '../data/repository.dart';
import '../l10n/app_localizations.dart';
import '../models/models.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import '../widgets/vocab.dart';

const _classifications = [
  'NORMAL',
  'INTERNAL',
  'CONFIDENTIAL',
  'HIGHLY_CONFIDENTIAL',
];
const _priorities = ['NORMAL', 'PRIORITY', 'URGENT', 'CRITICAL'];

/// Four short steps — what, to whom, carrier, review — designed so a busy
/// employee actually uses it. The idempotency key is fixed for the lifetime of
/// the screen, so a double tap or a flaky network can never book twice.
class CreateParcelScreen extends StatefulWidget {
  const CreateParcelScreen({super.key});

  @override
  State<CreateParcelScreen> createState() => _CreateParcelScreenState();
}

class _CreateParcelScreenState extends State<CreateParcelScreen> {
  final _idempotencyKey = const Uuid().v4();
  int _step = 0;
  bool _busy = false;

  // What
  final _title = TextEditingController();
  final _description = TextEditingController();
  String? _categoryId;
  String _classification = 'INTERNAL';
  String _priority = 'NORMAL';

  // To whom
  String _receiverType = 'EMPLOYEE';
  DirectoryEmployee? _receiver;
  Option? _department;
  Option? _branch;
  final _extName = TextEditingController();
  final _extPhone = TextEditingController();
  final _extOrg = TextEditingController();
  final _extAddress = TextEditingController();
  DateTime? _expected;

  // Carrier
  String _carrierType = 'INTERNAL_EMPLOYEE';
  bool _assignLater = false;
  DirectoryEmployee? _courier;
  Option? _provider;
  final _tracking = TextEditingController();
  final _riderName = TextEditingController();
  final _riderPhone = TextEditingController();
  final _guestName = TextEditingController();
  final _guestPhone = TextEditingController();
  final _guestCompany = TextEditingController();
  final _vehicle = TextEditingController();

  List<Option> _categories = [];
  List<Option> _departments = [];
  List<Option> _branches = [];
  List<Option> _providers = [];

  @override
  void initState() {
    super.initState();
    unawaited(_loadReference());
  }

  Future<void> _loadReference() async {
    final repo = context.read<DispatchRepository>();
    try {
      final r = await Future.wait([
        repo.categories(),
        repo.departments(),
        repo.branches(),
        repo.providers(),
      ]);
      if (!mounted) return;
      setState(() {
        _categories = r[0];
        _departments = r[1];
        _branches = r[2];
        _providers = r[3];
        _categoryId ??= _categories.isNotEmpty ? _categories.first.id : null;
      });
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    }
  }

  @override
  void dispose() {
    for (final c in [
      _title,
      _description,
      _extName,
      _extPhone,
      _extOrg,
      _extAddress,
      _tracking,
      _riderName,
      _riderPhone,
      _guestName,
      _guestPhone,
      _guestCompany,
      _vehicle,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _stepValid => switch (_step) {
    0 =>
      _title.text.trim().length >= 3 &&
          _description.text.trim().length >= 3 &&
          _categoryId != null,
    1 => switch (_receiverType) {
      'EMPLOYEE' => _receiver != null,
      'DEPARTMENT' => _department != null,
      'BRANCH' => _branch != null,
      _ =>
        _extName.text.trim().length >= 2 &&
            _extPhone.text.trim().length >= 10 &&
            _extAddress.text.trim().length >= 5,
    },
    2 =>
      _assignLater ||
          switch (_carrierType) {
            'INTERNAL_EMPLOYEE' => _courier != null,
            'EXTERNAL_COURIER' => _provider != null,
            _ =>
              _guestName.text.trim().length >= 2 &&
                  _guestPhone.text.trim().length >= 10,
          },
    _ => true,
  };

  Map<String, dynamic> _payload({bool draft = false}) => {
    'title': _title.text.trim(),
    'description': _description.text.trim(),
    'categoryId': _categoryId,
    'classification': _classification,
    'priority': _priority,
    'deliveryMethod': _carrierType,
    'receiverType': _receiverType,
    if (_receiverType == 'EMPLOYEE') 'receiverEmployeeId': _receiver!.id,
    if (_receiverType == 'DEPARTMENT') 'receiverDepartmentId': _department!.id,
    if (_receiverType == 'BRANCH') 'destinationBranchId': _branch!.id,
    if (_receiverType == 'EXTERNAL')
      'externalReceiver': {
        'name': _extName.text.trim(),
        'phone': _extPhone.text.trim(),
        if (_extOrg.text.trim().isNotEmpty) 'organization': _extOrg.text.trim(),
        'address': _extAddress.text.trim(),
      },
    if (_expected != null)
      'expectedDeliveryAt': _expected!.toUtc().toIso8601String(),
    if (!_assignLater)
      'carrier': {
        'type': _carrierType,
        if (_carrierType == 'INTERNAL_EMPLOYEE') 'employeeId': _courier!.id,
        if (_carrierType == 'EXTERNAL_COURIER')
          'external': {
            'providerId': _provider!.id,
            if (_tracking.text.trim().isNotEmpty)
              'trackingNumber': _tracking.text.trim(),
            if (_riderName.text.trim().isNotEmpty)
              'riderName': _riderName.text.trim(),
            if (_riderPhone.text.trim().isNotEmpty)
              'riderPhone': _riderPhone.text.trim(),
          },
        if (_carrierType == 'GUEST_PERSON')
          'guest': {
            'fullName': _guestName.text.trim(),
            'phone': _guestPhone.text.trim(),
            if (_guestCompany.text.trim().isNotEmpty)
              'company': _guestCompany.text.trim(),
            if (_vehicle.text.trim().isNotEmpty)
              'vehicleNumber': _vehicle.text.trim(),
          },
      },
    if (draft) 'saveAsDraft': true,
  };

  Future<void> _submit({bool draft = false}) async {
    setState(() => _busy = true);
    try {
      final res = await context.read<DispatchRepository>().create(
        _payload(draft: draft),
        draft ? '$_idempotencyKey-draft' : _idempotencyKey,
      );
      if (!mounted) return;
      context.pushReplacement('/booked', extra: res);
    } catch (e) {
      if (mounted) showSnack(context, errorText(context, e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final steps = [l.stepWhat, l.stepWho, l.stepHow, l.stepReview];
    return Scaffold(
      appBar: AppBar(
        title: Text(l.newParcel),
        leading: IconButton(
          tooltip: l.close,
          icon: const Icon(Icons.close_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AbgSpace.gutter,
              4,
              AbgSpace.gutter,
              12,
            ),
            child: Row(
              children: List.generate(steps.length, (i) {
                final done = i < _step;
                final active = i == _step;
                return Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      right: i == steps.length - 1 ? 0 : 8,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          height: 4,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(4),
                            color: done || active
                                ? AbgColors.navy
                                : AbgColors.softSilver,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${i + 1}. ${steps[i]}',
                          style: AbgText.caption.copyWith(
                            color: active
                                ? AbgColors.navy
                                : AbgColors.inkSubtle,
                            fontWeight: active
                                ? FontWeight.w700
                                : FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: ListView(
                key: ValueKey(_step),
                padding: const EdgeInsets.fromLTRB(
                  AbgSpace.gutter,
                  4,
                  AbgSpace.gutter,
                  24,
                ),
                children: [
                  switch (_step) {
                    0 => _whatStep(l),
                    1 => _whoStep(l),
                    2 => _carrierStep(l),
                    _ => _reviewStep(l),
                  },
                ],
              ),
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
          child: Row(
            children: [
              if (_step > 0) ...[
                SizedBox(
                  width: 110,
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => setState(() => _step--),
                    child: Text(l.back),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: FilledButton(
                  onPressed: !_stepValid || _busy
                      ? null
                      : () => _step == 3 ? _submit() : setState(() => _step++),
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: Colors.white,
                          ),
                        )
                      : Text(_step == 3 ? l.bookParcel : l.next),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 10),
    child: Text(
      text,
      style: AbgText.small.copyWith(
        fontWeight: FontWeight.w700,
        color: AbgColors.ink,
      ),
    ),
  );

  Widget _whatStep(L l) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _title,
          textCapitalization: TextCapitalization.sentences,
          maxLength: 140,
          decoration: InputDecoration(
            labelText: '${l.titleLabel} *',
            hintText: l.titleHint,
            counterText: '',
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _description,
          textCapitalization: TextCapitalization.sentences,
          minLines: 3,
          maxLines: 6,
          maxLength: 2000,
          decoration: InputDecoration(
            labelText: '${l.descriptionLabel} *',
            hintText: l.descriptionHint,
            alignLabelWithHint: true,
          ),
          onChanged: (_) => setState(() {}),
        ),
        _label(l.category),
        if (_categories.isEmpty)
          const Skeleton(height: 40)
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _categories
                .map(
                  (c) => ChoiceChip(
                    label: Text(c.label),
                    selected: _categoryId == c.id,
                    showCheckmark: false,
                    labelStyle: AbgText.small.copyWith(
                      color: _categoryId == c.id ? Colors.white : AbgColors.ink,
                      fontWeight: FontWeight.w600,
                    ),
                    onSelected: (_) => setState(() => _categoryId = c.id),
                  ),
                )
                .toList(),
          ),
        _label(l.classification),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.9,
          children: _classifications
              .map(
                (c) => _OptionTile(
                  icon: classificationIcon(c),
                  label: classificationLabel(l, c),
                  selected: _classification == c,
                  onTap: () => setState(() => _classification = c),
                ),
              )
              .toList(),
        ),
        _label(l.priority),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _priorities
              .map(
                (p) => ChoiceChip(
                  avatar: Icon(
                    Icons.bolt_rounded,
                    size: 16,
                    color: _priority == p
                        ? Colors.white
                        : toneColors(priorityTone(p)).fg,
                  ),
                  label: Text(priorityLabel(l, p)),
                  selected: _priority == p,
                  showCheckmark: false,
                  labelStyle: AbgText.small.copyWith(
                    color: _priority == p ? Colors.white : AbgColors.ink,
                    fontWeight: FontWeight.w600,
                  ),
                  onSelected: (_) => setState(() => _priority = p),
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  Widget _whoStep(L l) {
    final types = [
      ('EMPLOYEE', l.receiverEmployee, Icons.person_outline_rounded),
      ('DEPARTMENT', l.receiverDepartment, Icons.account_tree_outlined),
      ('BRANCH', l.receiverBranch, Icons.apartment_rounded),
      ('EXTERNAL', l.receiverExternal, Icons.public_rounded),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ChoiceGrid(
          options: types,
          selected: _receiverType,
          onSelected: (v) => setState(() => _receiverType = v),
        ),
        const SizedBox(height: 16),
        switch (_receiverType) {
          'EMPLOYEE' => _EmployeePicker(
            selected: _receiver,
            onSelected: (e) => setState(() => _receiver = e),
            excludeMe: true,
          ),
          'DEPARTMENT' => _OptionList(
            options: _departments,
            selected: _department,
            onSelected: (o) => setState(() => _department = o),
            icon: Icons.account_tree_outlined,
          ),
          'BRANCH' => _OptionList(
            options: _branches,
            selected: _branch,
            onSelected: (o) => setState(() => _branch = o),
            icon: Icons.apartment_rounded,
          ),
          _ => Column(
            children: [
              TextField(
                controller: _extName,
                decoration: InputDecoration(labelText: '${l.externalName} *'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _extPhone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: '${l.phoneLabel} *',
                  hintText: '01XXXXXXXXX',
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _extOrg,
                decoration: InputDecoration(labelText: l.externalOrg),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _extAddress,
                minLines: 2,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: '${l.externalAddress} *',
                ),
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
        },
        _label(l.expectedDelivery),
        Align(
          alignment: Alignment.centerLeft,
          child: ActionChip(
            avatar: const Icon(Icons.event_outlined, size: 18),
            label: Text(
              _expected == null
                  ? l.noDeadline
                  : fullStamp(_expected!, l.localeName),
            ),
            onPressed: () async {
              final now = DateTime.now();
              final date = await showDatePicker(
                context: context,
                firstDate: now,
                lastDate: now.add(const Duration(days: 30)),
                initialDate: now,
              );
              if (date == null || !mounted) return;
              final time = await showTimePicker(
                context: context,
                initialTime: TimeOfDay.fromDateTime(
                  now.add(const Duration(hours: 2)),
                ),
              );
              if (time == null) return;
              setState(
                () => _expected = DateTime(
                  date.year,
                  date.month,
                  date.day,
                  time.hour,
                  time.minute,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _carrierStep(L l) {
    final types = [
      ('INTERNAL_EMPLOYEE', l.carrierEmployee, Icons.directions_walk_rounded),
      ('EXTERNAL_COURIER', l.carrierCourier, Icons.local_shipping_outlined),
      ('GUEST_PERSON', l.carrierGuest, Icons.badge_outlined),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ChoiceGrid(
          options: types,
          selected: _carrierType,
          onSelected: (v) => setState(() => _carrierType = v),
        ),
        const SizedBox(height: 8),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(
            l.assignLater,
            style: AbgText.bodyStrong.copyWith(fontSize: 14),
          ),
          value: _assignLater,
          onChanged: (v) => setState(() => _assignLater = v),
        ),
        if (!_assignLater)
          switch (_carrierType) {
            'INTERNAL_EMPLOYEE' => _EmployeePicker(
              selected: _courier,
              onSelected: (e) => setState(() => _courier = e),
              initialQuery: 'Dispatch',
            ),
            'EXTERNAL_COURIER' => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _providers
                      .map(
                        (p) => ChoiceChip(
                          avatar: Icon(
                            Icons.local_shipping_outlined,
                            size: 16,
                            color: _provider?.id == p.id
                                ? Colors.white
                                : AbgColors.navy500,
                          ),
                          label: Text(p.label),
                          selected: _provider?.id == p.id,
                          showCheckmark: false,
                          labelStyle: AbgText.small.copyWith(
                            color: _provider?.id == p.id
                                ? Colors.white
                                : AbgColors.ink,
                            fontWeight: FontWeight.w600,
                          ),
                          onSelected: (_) => setState(() => _provider = p),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _tracking,
                  decoration: InputDecoration(
                    labelText: l.trackingNumberLabel,
                    prefixIcon: const Icon(Icons.confirmation_number_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _riderName,
                  decoration: InputDecoration(labelText: l.riderName),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _riderPhone,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(labelText: l.riderPhone),
                ),
              ],
            ),
            _ => Column(
              children: [
                TextField(
                  controller: _guestName,
                  decoration: InputDecoration(labelText: '${l.guestName} *'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _guestPhone,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: '${l.phoneLabel} *',
                    hintText: '01XXXXXXXXX',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _guestCompany,
                  decoration: InputDecoration(labelText: l.guestCompany),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _vehicle,
                  decoration: InputDecoration(labelText: l.vehicleNumber),
                ),
              ],
            ),
          },
      ],
    );
  }

  Widget _reviewStep(L l) {
    final me = context.read<SessionController>().profile;
    final category =
        _categories
            .where((c) => c.id == _categoryId)
            .map((c) => c.label)
            .firstOrNull ??
        '';
    final to = switch (_receiverType) {
      'EMPLOYEE' => '${_receiver?.name} · ${_receiver?.code}',
      'DEPARTMENT' => '${_department?.label} · ${_department?.subtitle ?? ''}',
      'BRANCH' => _branch?.label ?? '',
      _ => '${_extName.text} · ${_extOrg.text}',
    };
    final destination = switch (_receiverType) {
      'EMPLOYEE' => _receiver?.location ?? _receiver?.branch ?? '',
      'DEPARTMENT' => _department?.subtitle ?? '',
      'BRANCH' => _branch?.label ?? '',
      _ => _extAddress.text,
    };
    final carrier = _assignLater
        ? l.assignLater
        : switch (_carrierType) {
            'INTERNAL_EMPLOYEE' => '${_courier?.name} · ${_courier?.code}',
            'EXTERNAL_COURIER' =>
              '${_provider?.label}${_tracking.text.isNotEmpty ? ' · ${_tracking.text}' : ''}',
            _ => '${_guestName.text} · ${_guestPhone.text}',
          };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_title.text, style: AbgText.h2),
              const SizedBox(height: 6),
              Text(
                _description.text,
                style: AbgText.body.copyWith(
                  color: AbgColors.inkMuted,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ToneBadge(
                    label: category,
                    tone: Tone.neutral,
                    icon: Icons.folder_outlined,
                  ),
                  ToneBadge(
                    label: classificationLabel(l, _classification),
                    tone: _classification.contains('CONFIDENTIAL')
                        ? Tone.pending
                        : Tone.neutral,
                    icon: classificationIcon(_classification),
                  ),
                  ToneBadge(
                    label: priorityLabel(l, _priority),
                    tone: priorityTone(_priority),
                    icon: Icons.bolt_rounded,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          child: Column(
            children: [
              InfoRow(
                icon: Icons.north_east_rounded,
                label: l.from,
                value:
                    '${me?.employee?.name ?? ''} · ${me?.employee?.branch ?? ''}',
              ),
              InfoRow(icon: Icons.south_west_rounded, label: l.to, value: to),
              InfoRow(
                icon: Icons.place_outlined,
                label: l.destination,
                value: destination,
              ),
              InfoRow(
                icon: carrierTypeIcon(_carrierType),
                label: l.carrier,
                value: carrier,
              ),
              if (_expected != null)
                InfoRow(
                  icon: Icons.event_outlined,
                  label: l.expectedDelivery,
                  value: fullStamp(_expected!, l.localeName),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.verified_user_outlined,
              size: 18,
              color: AbgColors.navy500,
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(l.reviewNotice, style: AbgText.small)),
          ],
        ),
        const SizedBox(height: 18),
        OutlinedButton.icon(
          onPressed: _busy ? null : () => _submit(draft: true),
          icon: const Icon(Icons.edit_note_rounded),
          label: Text(l.saveDraft),
        ),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      label: label,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        decoration: BoxDecoration(
          color: selected ? AbgColors.navy : AbgColors.white,
          borderRadius: BorderRadius.circular(AbgRadii.md),
          border: Border.all(
            color: selected ? AbgColors.navy : AbgColors.border,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AbgRadii.md),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: selected
                      ? AbgColors.platinumBright
                      : AbgColors.navy500,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 2,
                    style: AbgText.small.copyWith(
                      color: selected ? Colors.white : AbgColors.ink,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OptionList extends StatelessWidget {
  const _OptionList({
    required this.options,
    required this.selected,
    required this.onSelected,
    required this.icon,
  });

  final List<Option> options;
  final Option? selected;
  final ValueChanged<Option> onSelected;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    if (options.isEmpty) return const SkeletonCard();
    return SectionCard(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: options
            .map(
              (o) => ListTile(
                selected: selected?.id == o.id,
                selectedTileColor: AbgColors.activeSoft,
                onTap: () => onSelected(o),
                leading: Icon(icon, color: AbgColors.navy500),
                title: Text(
                  o.label,
                  style: AbgText.bodyStrong.copyWith(fontSize: 14),
                ),
                subtitle: o.subtitle == null
                    ? null
                    : Text(o.subtitle!, style: AbgText.caption),
                trailing: Icon(
                  selected?.id == o.id
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_off_rounded,
                  color: selected?.id == o.id
                      ? AbgColors.active
                      : AbgColors.borderStrong,
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

/// Search the employee directory by name, ID, phone or department.
class _EmployeePicker extends StatefulWidget {
  const _EmployeePicker({
    required this.selected,
    required this.onSelected,
    this.excludeMe = false,
    this.initialQuery = '',
  });

  final DirectoryEmployee? selected;
  final ValueChanged<DirectoryEmployee> onSelected;
  final bool excludeMe;
  final String initialQuery;

  @override
  State<_EmployeePicker> createState() => _EmployeePickerState();
}

class _EmployeePickerState extends State<_EmployeePicker> {
  late final _q = TextEditingController(
    text: widget.selected == null ? widget.initialQuery : '',
  );
  List<DirectoryEmployee> _results = [];
  Timer? _debounce;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (_q.text.isNotEmpty) unawaited(_search(_q.text));
  }

  @override
  void dispose() {
    _q.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _search(String q) async {
    setState(() => _loading = true);
    try {
      final r = await context.read<DispatchRepository>().employees(q);
      if (mounted) {
        setState(
          () =>
              _results = r.where((e) => !(widget.excludeMe && e.isMe)).toList(),
        );
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L.of(context);
    final s = widget.selected;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (s != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AbgColors.activeSoft,
              borderRadius: BorderRadius.circular(AbgRadii.md),
              border: Border.all(
                color: AbgColors.active.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                Avatar(initials: s.person.initials, size: 42),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.name, style: AbgText.bodyStrong),
                      Text(
                        [
                          s.code,
                          s.designation,
                          s.department,
                        ].whereType<String>().join(' · '),
                        style: AbgText.caption,
                      ),
                      Text(s.location ?? s.branch, style: AbgText.caption),
                    ],
                  ),
                ),
                const Icon(Icons.check_circle_rounded, color: AbgColors.active),
              ],
            ),
          ),
        TextField(
          controller: _q,
          decoration: InputDecoration(
            hintText: l.searchEmployee,
            prefixIcon: const Icon(Icons.person_search_outlined),
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
          onChanged: (v) {
            _debounce?.cancel();
            _debounce = Timer(
              const Duration(milliseconds: 300),
              () => _search(v),
            );
          },
        ),
        const SizedBox(height: 10),
        ..._results
            .take(8)
            .map(
              (e) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: SectionCard(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  onTap: () => widget.onSelected(e),
                  child: Row(
                    children: [
                      Avatar(initials: e.person.initials, size: 38),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              e.name,
                              style: AbgText.bodyStrong.copyWith(fontSize: 14),
                            ),
                            Text(
                              '${e.code} · ${e.department ?? ''} · ${e.branch}',
                              style: AbgText.caption,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      if (widget.selected?.id == e.id)
                        const Icon(
                          Icons.check_circle_rounded,
                          color: AbgColors.active,
                        )
                      else
                        const Icon(
                          Icons.add_circle_outline_rounded,
                          color: AbgColors.borderStrong,
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

/// Big, labelled choice tiles: icon over text, never truncated to "Em…".
class _ChoiceGrid extends StatelessWidget {
  const _ChoiceGrid({
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final List<(String, String, IconData)> options;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: Semantics(
              button: true,
              selected: options[i].$1 == selected,
              label: options[i].$2,
              child: ExcludeSemantics(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  height: 76,
                  decoration: BoxDecoration(
                    color: options[i].$1 == selected
                        ? AbgColors.navy
                        : AbgColors.white,
                    borderRadius: BorderRadius.circular(AbgRadii.md),
                    border: Border.all(
                      color: options[i].$1 == selected
                          ? AbgColors.navy
                          : AbgColors.border,
                    ),
                    boxShadow: options[i].$1 == selected
                        ? AbgShadows.card
                        : null,
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AbgRadii.md),
                    onTap: () => onSelected(options[i].$1),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          options[i].$3,
                          size: 22,
                          color: options[i].$1 == selected
                              ? AbgColors.platinumBright
                              : AbgColors.navy500,
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(
                            options[i].$2,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            style: AbgText.caption.copyWith(
                              color: options[i].$1 == selected
                                  ? Colors.white
                                  : AbgColors.ink,
                              fontWeight: FontWeight.w700,
                              height: 1.15,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
